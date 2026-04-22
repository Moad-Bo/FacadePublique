import FormData from "form-data";
import Mailgun from "mailgun.js";
import { simpleParser } from "mailparser";
import MailComposer from "nodemailer/lib/mail-composer";
import nodemailer from "nodemailer";
import { db } from "./db";
import { emailLog, settings } from "../../drizzle/src/db/schema";
import { randomUUID } from "crypto";
import { sql, gt } from "drizzle-orm";
import { getFromS3 } from "./r2"; // Gardé pour compatibilité de nommage
import { emailRouter, EmailContext } from "./email-router";
import { useRuntimeConfig } from "#imports";

const config = useRuntimeConfig();
const MAILGUN_KEY = config.mailgunApiKey;

const mailgun = new Mailgun(FormData as any);
const mg = MAILGUN_KEY ? mailgun.client({
    username: "api",
    key: MAILGUN_KEY,
    url: 'https://api.eu.mailgun.net'
}) : null;

/**
 * Crée un transporteur SMTP dynamique pour le domaine spécifié
 */
function createSmtpTransporter(domain: string) {
    return nodemailer.createTransport({
        host: config.smtpHost || 'smtp.eu.mailgun.org',
        port: config.smtpPort || 587,
        secure: false,
        auth: {
            user: config.smtpUser || `postmaster@${domain}`,
            pass: config.smtpPass || MAILGUN_KEY,
        },
    });
}

/**
 * Internal helper to check if we are within the sending quota.
 */
/**
 * Validate Text/Image ratio and overall quality to prevent SPAM.
 * Returns a score from 0 to 100.
 */
async function validateEmailContent(html: string): Promise<{ 
    valid: boolean; 
    score: number; 
    advice: string[]; 
    error?: string 
}> {
    const parsed = await simpleParser(html);
    const textLength = parsed.text?.length || 0;
    const advice: string[] = [];
    let score = 100;

    // 1. Ratio Texte/Image
    const imgCount = (html.match(/<img/g) || []).length;
    if (imgCount > 0) {
        const ratio = textLength / imgCount;
        if (ratio < 200) {
            score -= 30;
            advice.push(`Ratio Texte/Image trop faible (${textLength} chars pour ${imgCount} images). Ajoutez plus de texte descriptif.`);
        }
    }

    // 2. Vérification du Shell/Layout
    if (!html.includes('techkne-group-shell') && !html.includes('id="email-layout"')) {
        score -= 20;
        advice.push("Aucun layout structurel (Shell) détecté. L'email pourrait s'afficher mal sur certains clients.");
    }

    // 3. Présence d'images lourdes (heuristique simple sur data:image ou base64)
    if (html.includes('data:image/') && html.length > 500000) {
        score -= 15;
        advice.push("Images encodées en Base64 détectées, ce qui alourdit considérablement l'email. Préférez l'hébergement S3.");
    }

    // 4. Liens suspects ou manquants
    if (!html.includes('unsubscribe') && !html.includes('désabonner')) {
        // Optionnel pour les mails système, mais recommandé
        score -= 5;
        advice.push("Aucun lien de désabonnement explicite trouvé dans le corps du message.");
    }

    const isCritical = score < 40;

    return { 
        valid: !isCritical, 
        score: Math.max(0, score),
        advice,
        error: isCritical ? `Score de délivrabilité critique: ${score}%` : undefined
    };
}

async function checkQuota(): Promise<{ allowed: boolean; error?: string }> {
    try {
        const allSettings = await db.select().from(settings).catch(() => []);
        const settingsMap: Record<string, string> = {};
        allSettings.forEach(s => settingsMap[s.key] = s.value);

        const limit = parseInt(settingsMap.comm_quota_limit || '3000');
        const periodDays = parseInt(settingsMap.comm_quota_period || '30');

        const dateLimit = new Date();
        dateLimit.setDate(dateLimit.getDate() - periodDays);

        const usageResult = await db.select({ 
            count: sql<number>`count(*)` 
        })
        .from(emailLog)
        .where(gt(emailLog.sentAt, dateLimit));

        const currentUsage = Number(usageResult[0]?.count || 0);

        if (currentUsage >= limit) {
            return { allowed: false, error: `Quota exceeded: ${currentUsage}/${limit} messages in the last ${periodDays} days.` };
        }

        return { allowed: true };
    } catch (e) {
        console.error("Quota check failed:", e);
        return { allowed: true }; // Fallback to allowed if check fails to avoid blocking system
    }
}

export const sendEmail = async ({ 
    recipient, 
    subject, 
    cc,
    bcc,
    html, 
    text, 
    template,
    campaignId,
    type = "system",
    attachments = [],
    fromContext = ""
}: { 
    recipient: string, 
    subject: string, 
    cc?: string,
    bcc?: string,
    html?: string, 
    text?: string,
    template?: string,
    campaignId?: string,
    type?: "system" | "newsletter" | "contact" | "notification" | "mod-forum" | "staff",
    attachments?: { filename: string, r2Key: string, contentType: string }[],
    fromContext?: string
}) => {
    const logId = randomUUID();

    if (!MAILGUN_KEY || !mg) {
        console.error("Mailgun configuration missing.");
        return { success: false, error: "Email service not configured." };
    }

    // 1. ROUTING & OPT-IN CHECK
    const contextMap: Record<string, EmailContext> = {
      system: EmailContext.SYSTEM,
      newsletter: EmailContext.MARKETING_BATCH,
      notification: EmailContext.FORUM_TX,
      'mod-forum': EmailContext.FORUM_TX,
      staff: EmailContext.WEBMAILER,
      contact: EmailContext.BLOG_TX
    };

    const routing = await emailRouter.getRouting(contextMap[type] || EmailContext.SYSTEM, recipient);
    if (!routing.allowed) {
      console.warn(`[Email] Blocked by routing for ${recipient}: ${routing.reason}`);
      return { success: false, error: routing.reason };
    }

    // 2. Enforce Quota
    console.log(`[Email] Checking quota for ${recipient}...`);
    const quota = await checkQuota();
    if (!quota.allowed) {
        console.warn(`[Email] Quota exceeded for ${recipient}: ${quota.error}`);
        return { success: false, error: quota.error };
    }
    
    try {
        console.log(`[Email] Preparing content for ${recipient}...`);
        const { wrapEmailContent } = await import("./email-builder");
        
        // Wrap content with global layout and inject tracking pixel
        const finalHtml = html ? await wrapEmailContent(html, { 
            recipient, 
            subject, 
            type,
            logId, // For tracking
            campaignId: campaignId || (type === 'newsletter' ? template : undefined) // Use template as fallback campaignId for legacy
        }) : '';

        // 3. Validate Deliverability (Stop-Gate / Advice)
        const validation = await validateEmailContent(finalHtml);
        
        // Block only if NOT staff/system AND score is critical
        if (type !== 'staff' && type !== 'system' && !validation.valid) {
            console.warn(`[Email] Delivery blocked: ${validation.error}`);
            await db.insert(emailLog).values({
                id: logId,
                recipient,
                subject,
                template,
                type,
                status: "failed",
                errorMessage: `${validation.error} | Conseils: ${validation.advice.join(' ')}`,
                sentAt: new Date()
            });
            return { success: false, error: validation.error, advice: validation.advice };
        }

        // For Staff/System or low score (but not critical), we just log/warn
        if (validation.score < 80) {
            console.warn(`[Email] Weak deliverability score for ${recipient}: ${validation.score}%. Advice: ${validation.advice.join(' ')}`);
        }

        // Resolve 'from' address using configurable contexts from .env
        const contextsStr = (config.mailgunSenderContexts as string) || '';
        const contextEntries = Object.fromEntries(
            contextsStr.split(',').filter(Boolean).map(s => {
                const parts = s.split(':');
                return [parts[0].toLowerCase(), parts.slice(1).join(':')];
            })
        );

        let resolvedFromEmail = contextEntries[fromContext?.toLowerCase()] || contextEntries[type.toLowerCase()] || `postmaster@${routing.domain}`;
        let fromDisplayName = fromContext || type.charAt(0).toUpperCase() + type.slice(1);
        
        const from = `Techknè ${fromDisplayName} <${resolvedFromEmail}>`;

        // 4. ROUTING STRATEGY
        
        // --- SMTP Flow (Stream S3) ---
        if (routing.method === 'smtp') {
            console.log(`[Email][SMTP] Routing via SMTP + S3 Streaming for ${recipient}`);
            const transporter = createSmtpTransporter(routing.domain);
            
            const mailOptions: any = {
                from,
                to: recipient,
                subject,
                html: finalHtml,
                text: text || (await simpleParser(finalHtml)).text || "Version texte non disponible."
            };

            if (cc) mailOptions.cc = cc;
            if (bcc) mailOptions.bcc = bcc;

            // Stream attachments from R2/S3
            if (attachments && attachments.length > 0) {
                mailOptions.attachments = await Promise.all(attachments.map(async (att) => {
                    const stream = await getFromS3(att.r2Key);
                    return {
                        filename: att.filename,
                        content: stream,
                        contentType: att.contentType
                    };
                }));
            }

            const info = await transporter.sendMail(mailOptions);
            const messageId = info.messageId.replace(/[<>]/g, '');

            await db.insert(emailLog).values({
                id: logId,
                recipient,
                subject,
                template,
                type,
                status: "sent",
                messageId,
                sentAt: new Date()
            });

            return { success: true, data: info };
        }

        // --- API Flow ---
        console.log(`[Email][API] Routing via API HTTP for ${recipient}`);

        // Build EML for API delivery to guarantee encoding
        const composerOptions: any = {
            from,
            to: recipient,
            subject,
            html: finalHtml,
            text: text || (await simpleParser(finalHtml)).text || "Version texte non disponible."
        };

        if (cc) composerOptions.cc = cc;
        if (bcc) composerOptions.bcc = bcc;
        
        if (type === 'newsletter') {
            const { generateUnsubscribeToken } = await import("./email-builder");
            const baseUrl = config.public.authBaseUrl || 'http://localhost:3000';
            const unsubToken = generateUnsubscribeToken(recipient);
            const unsubUrl = `${baseUrl}/api/newsletter/unsubscribe?email=${encodeURIComponent(recipient)}&token=${unsubToken}`;
            composerOptions.headers = {
                'List-Unsubscribe': `<${unsubUrl}>`,
                'X-Mailgun-Tag': campaignId || template || 'newsletter'
            };
        }

        const composer = new MailComposer(composerOptions);
        const buffer = await composer.compile().build();
        
        const mailData = {
            from,
            to: [recipient],
            message: buffer
        };

        const result = await Promise.race([
            mg.messages.create(routing.domain, mailData),
            new Promise((_, reject) => setTimeout(() => reject(new Error("Mailgun timeout (15s)")), 15000))
        ]) as any;

        const mailgunMessageId = result.id?.replace(/[<>]/g, ''); 
        console.log(`[Email] Mailgun success for ${recipient}: ${mailgunMessageId}`);

        // Log to database
        await db.insert(emailLog).values({
            id: logId,
            recipient,
            subject,
            template,
            type,
            status: "sent",
            messageId: mailgunMessageId,
            campaignId: campaignId || (type === 'newsletter' ? template : undefined),
            sentAt: new Date()
        });

        return { success: true, data: result };
    } catch (error: any) {
        console.error(`[Email] Failed to send to ${recipient}:`, error.message || error);
        
        // Log failure
        await db.insert(emailLog).values({
            id: logId,
            recipient,
            subject,
            template,
            type,
            status: "failed",
            campaignId: campaignId || (type === 'newsletter' ? template : undefined),
            errorMessage: error.message || "Unknown error",
            sentAt: new Date()
        });

        return { success: false, error: error.message || "Email delivery failed" };
    }
};
