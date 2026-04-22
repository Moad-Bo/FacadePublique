import { db } from "./db";
import { emailQueue } from "../../drizzle/src/db/schema";
import { eq, and, sql, lte, or, lt } from "drizzle-orm";
import { randomUUID } from "crypto";
import { sendEmail } from "./email";
import { addDays, addWeeks, addMonths, setHours, setMinutes, setSeconds, format } from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";

export interface ScheduleOptions {
    recipient: string;
    subject: string;
    cc?: string;
    bcc?: string;
    timezone?: string;
    layoutId?: string;
    fromContext?: string;
}

/**
 * Agnostic function to schedule an email or recurrence.
 */
export async function scheduleEmail(options: ScheduleOptions) {
    const { 
        recipient, subject, cc, bcc, html, type = "manual", 
        template, scheduledAt, recurrence = "none", 
        recurrenceValue, timezone = "Europe/Paris",
        layoutId, fromContext
    } = options;

    const id = randomUUID();
    
    await db.insert(emailQueue).values({
        id,
        recipient,
        subject,
        cc,
        bcc,
        html,
        type,
        fromContext,
        template,
        status: "pending",
        scheduledAt,
        recurrence,
        recurrenceValue,
        timezone,
        layoutId,
        createdAt: new Date(),
        updatedAt: new Date()
    });

    return id;
}

/**
 * Calculates the next scheduled date based on recurrence rules.
 */
function calculateNextRun(current: Date, recurrence: string, value?: string, tz: string = "Europe/Paris"): Date | null {
    const zoned = toZonedTime(current, tz);
    let nextZoned: Date;

    switch (recurrence) {
        case "daily":
            const dayInterval = parseInt(value || "1");
            nextZoned = addDays(zoned, dayInterval);
            break;
        case "weekly":
            // Simple weekly: +7 days
            nextZoned = addWeeks(zoned, 1);
            
            // If value contains a specific time "@HH:mm"
            if (value && value.includes('@')) {
                const [dayPart, timePart] = value.split('@');
                const [hours, minutes] = timePart.trim().split(':').map(Number);
                nextZoned = setHours(nextZoned, hours);
                nextZoned = setMinutes(nextZoned, minutes);
                nextZoned = setSeconds(nextZoned, 0);
            }
            break;
        case "monthly":
            nextZoned = addMonths(zoned, 1);
            break;
        default:
            return null;
    }

    return fromZonedTime(nextZoned, tz);
}

/**
 * Background worker logic: processes pending emails.
 */
export async function processQueue() {
    // 1. Select pending emails that are not currently locked
    // or were locked more than 5 minutes ago (zombie jobs)
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60000);

    const pending = await db.select()
        .from(emailQueue)
        .where(
            and(
                lte(emailQueue.scheduledAt, now),
                or(
                    eq(emailQueue.status, "pending"),
                    and(eq(emailQueue.status, "locked"), lte(emailQueue.lockedAt, fiveMinutesAgo))
                ),
                lt(emailQueue.retryCount, 3)
            )
        )
        .limit(50);

    for (const item of pending) {
        try {
            // 2. Lock the job
            await db.update(emailQueue)
                .set({ status: "locked", lockedAt: new Date(), updatedAt: new Date() })
                .where(eq(emailQueue.id, item.id));

            console.log(`[Scheduler] Processing email ${item.id} to ${item.recipient} (Retry: ${item.retryCount})`);

            // 3. Optional: Pre-send check for system emails
            if (item.type === "system") {
                const isValid = await checkSystemCondition(item);
                if (!isValid) {
                    await db.update(emailQueue)
                        .set({ status: "cancelled", updatedAt: new Date(), lockedAt: null })
                        .where(eq(emailQueue.id, item.id));
                    console.log(`[Scheduler] Cancelled irrelevant system email ${item.id}`);
                    continue;
                }
            }

            // 4. Send the email with a timeout
            const res = await Promise.race([
                sendEmail({
                    recipient: item.recipient,
                    subject: item.subject,
                    cc: item.cc || undefined,
                    bcc: item.bcc || undefined,
                    html: item.html,
                    type: item.type as any,
                    template: item.template || undefined,
                    fromContext: item.fromContext || undefined
                }),
                new Promise((_, reject) => setTimeout(() => reject(new Error("Send timeout")), 15000))
            ]) as any;

            if (res.success) {
                // 5. Mark as sent
                await db.update(emailQueue)
                    .set({ status: "sent", updatedAt: new Date(), lockedAt: null })
                    .where(eq(emailQueue.id, item.id));

                // 6. Intelligent Background Update: Update Campaign Progress
                if (item.type === "newsletter" && item.template) {
                    const { newsletterCampaign } = await import("../../drizzle/src/db/schema");
                    await db.update(newsletterCampaign)
                        .set({ 
                            sentAt: new Date(),
                            totalRecipients: sql`${newsletterCampaign.totalRecipients} + 1` 
                        })
                        .where(eq(newsletterCampaign.id, item.template));
                }

                // 7. Handle recurrence
                if (item.recurrence && item.recurrence !== "none") {
                    const nextRun = calculateNextRun(item.scheduledAt, item.recurrence, item.recurrenceValue || undefined, item.timezone || "Europe/Paris");
                    if (nextRun) {
                        await scheduleEmail({
                            recipient: item.recipient,
                            subject: item.subject,
                            cc: item.cc || undefined,
                            bcc: item.bcc || undefined,
                            html: item.html,
                            template: item.template || undefined,
                            scheduledAt: nextRun,
                            recurrence: item.recurrence as any,
                            recurrenceValue: item.recurrenceValue || undefined,
                            timezone: item.timezone || "Europe/Paris",
                            fromContext: item.fromContext || undefined
                        });
                        console.log(`[Scheduler] Rescheduled recurring email for ${format(nextRun, 'yyyy-MM-dd HH:mm:ss')} (${item.timezone})`);
                    }
                }
            } else {
                throw new Error(res.error || "Unknown send failure");
            }
        } catch (error: any) {
            console.error(`[Scheduler] Failed to process email ${item.id}:`, error);
            
            const newRetryCount = (item.retryCount || 0) + 1;
            const isPermanentError = error.message?.includes('invalid') || error.message?.includes('reaceable') || error.message?.includes('bounce');
            const newStatus = (newRetryCount >= 3 || isPermanentError) ? "failed" : "pending";

            // If newsletter and permanent error, mark subscriber in audience
            if (item.type === 'newsletter' && isPermanentError) {
                const { audience } = await import("../../drizzle/src/db/schema");
                await db.update(audience)
                    .set({ optInNewsletter: false, unsubscribedAt: new Date() })
                    .where(eq(audience.email, item.recipient));
                console.log(`[Scheduler] Disabled ${item.recipient} in audience due to permanent error.`);
            }

            await db.update(emailQueue)
                .set({ 
                    status: newStatus, 
                    retryCount: newRetryCount,
                    errorMessage: error.message,
                    updatedAt: new Date(),
                    lockedAt: null 
                })
                .where(eq(emailQueue.id, item.id));
        }
    }
}

/**
 * Checks if a system email is still relevant before sending.
 */
async function checkSystemCondition(item: any): Promise<boolean> {
    const { user } = await import("../../drizzle/src/db/schema");
    
    if (item.template === "verification_reminder") {
        const u = await db.select({ emailVerified: user.emailVerified })
            .from(user)
            .where(eq(user.email, item.recipient))
            .limit(1);
        
        // If user not found or already verified, return false to cancel email
        if (!u[0] || u[0].emailVerified) return false;
    }

    // Add other system checks here (e.g. password reminder logic)
    
    return true;
}
