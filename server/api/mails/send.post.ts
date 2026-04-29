import { defineEventHandler, readValidatedBody, createError } from 'h3'
import { requireUserSession } from "../../utils/auth";
import { sendEmail } from "../../utils/email";
import { scheduleEmail } from "../../utils/scheduler";
import { getDynamicTemplate } from "../../utils/templates";
import { SendMailSchema } from "../../utils/schemas";

export default defineEventHandler(async (event) => {
    await requireUserSession(event, { permission: "manage_mail" });
    
    // Validation du corps de la requête via Zod
    const body = await readValidatedBody(event, SendMailSchema.parse);
    const { to, cc, bcc, subject, message, type, templateId, scheduledAt, recurrence, recurrenceValue, timezone, fromContext } = body;
    
    console.log(`[API Mails Send] Validated request for ${to} (Template: ${templateId})`);

    let finalSubject = subject;
    let finalHtml = message;

    // Handle DB Templates
    if (templateId && templateId !== 'none') {
        const t = await getDynamicTemplate(templateId, {
            url: message || 'https://techkne.com',
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
