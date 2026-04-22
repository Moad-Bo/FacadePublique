import { requireUserSession } from "../../utils/auth";
import { sendEmail } from "../../utils/email";
import { scheduleEmail } from "../../utils/scheduler";
import { getDynamicTemplate } from "../../utils/templates";

export default defineEventHandler(async (event) => {
    await requireUserSession(event, { permission: "manage_mail" });
    
    const body = await readBody(event);
    const { to, cc, bcc, subject, message, type, templateId, scheduledAt, recurrence, recurrenceValue, timezone, fromContext } = body;
    
    console.log(`[API Mails Send] Received request for ${to} (Template: ${templateId})`);

    // Basic email validation regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!to) throw createError({ statusCode: 400, statusMessage: "Missing recipient" });
    if (!emailRegex.test(to)) throw createError({ statusCode: 400, statusMessage: "Invalid email" });

    let finalSubject = subject;
    let finalHtml = message;

    // Handle DB Templates
    if (templateId && templateId !== 'none') {
        const t = await getDynamicTemplate(templateId, {
            url: message || 'https://techkne.com', // fallback for URL if provided in message
            message: message || '',
            name: to.split('@')[0]
        });
        finalSubject = subject || t.subject;
        finalHtml = t.html;
    }

    if (!finalSubject || !finalHtml) {
        throw createError({ statusCode: 400, statusMessage: "Empty subject or content" });
    }

    // 1. If scheduledAt is provided, queue the email
    if (scheduledAt) {
        console.log(`[API Mails Send] Queueing email for ${scheduledAt}`);
        const id = await scheduleEmail({
            recipient: to,
            cc,
            bcc,
            subject: finalSubject,
            html: finalHtml,
            type: type || "manual",
            template: templateId,
            scheduledAt: new Date(scheduledAt),
            recurrence: recurrence || "none",
            recurrenceValue,
            timezone: timezone || "Europe/Paris",
            fromContext
        });
        return { success: true, scheduled: true, id };
    }

    // 2. Otherwise send immediately
    console.log(`[API Mails Send] Dispatching immediate send to ${to}`);
    const result = await sendEmail({
        recipient: to,
        cc,
        bcc,
        subject: finalSubject,
        html: finalHtml,
        type: type || "contact",
        template: templateId,
        fromContext
    });
    
    return result;
});
