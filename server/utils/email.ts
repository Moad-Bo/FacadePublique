import FormData from "form-data";
import Mailgun from "mailgun.js";
import { simpleParser } from "mailparser";
import MailComposer from "nodemailer/lib/mail-composer/index.js";
import nodemailer from "nodemailer";
import { db } from "./db";
import { emailLog, settings } from "../../drizzle/src/db/schema";
import { randomUUID } from "crypto";
import { sql, gt } from "drizzle-orm";
import { getFromS3 } from "./r2"; // Gardé pour compatibilité de nommage
import { emailRouter, EmailContext, CAMPAIGN_CONTEXT_CONFIG } from "./email-router";
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
        const currentUsage = parseInt(settingsMap.comm_quota_used || '0');

        if (currentUsage >= limit) {
            return { allowed: false, error: `Quota exceeded: ${currentUsage}/${limit} messages.` };
        }

        return { allowed: true };
    } catch (e) {
        console.error("Quota check failed:", e);
        return { allowed: true }; // Fallback to allowed if check fails to avoid blocking system
    }
}

async function incrementQuota() {
    try {
        await db.insert(settings)
            .values({ key: 'comm_quota_used', value: '1' })
            .onDuplicateKeyUpdate({ set: { value: sql`CAST(value AS UNSIGNED) + 1` } });
    } catch (e) {
        console.error("Failed to increment quota", e);
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
    type?: "system" | "newsletter" | "contact" | "notification" | "mod-forum" | "staff" | "campaign" | "marketing",
    attachments?: { filename: string, s3Key: string, contentType: string }[],
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
      campaign: EmailContext.CAMPAIGN_NEWSLETTER, // Mapping par défaut pour campagne générique
      newsletter: EmailContext.CAMPAIGN_NEWSLETTER,
      notification: EmailContext.COMMUNITY_TX,
      'mod-forum': EmailContext.MODERATION,
      moderation: EmailContext.MODERATION,
      staff: EmailContext.WEBMAILER,
      support: EmailContext.WEBMAILER,
      marketing: EmailContext.CAMPAIGN_PROMO,
      contact: EmailContext.BLOG_TX,
      changelog: EmailContext.CAMPAIGN_CHANGELOG
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

        // Wrap content with global layout and inject tracking pixel
        const finalHtml = html ? await wrapEmailContent(html, { 
            recipient, 
            subject, 
            type: type as string,
            logId, // For tracking
            alias: fromDisplayName,
            campaignId: campaignId || (((type as string) === 'newsletter' || (type as string) === 'campaign') ? template : undefined)
        }) : '';

        // 3. Validate Deliverability (Stop-Gate / Advice)
        const validation = await validateEmailContent(finalHtml);
        
        // Block only if NOT staff/system/campaign AND score is critical
        // Block only if NOT staff/system/campaign AND score is critical
        if (type !== 'staff' && type !== 'system' && (type as string) !== 'campaign' && !validation.valid) {
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
                    const stream = await getFromS3(att.s3Key);
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

            await incrementQuota();

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
        
        if ((type as string) === 'campaign' || type === 'newsletter' || type === 'notification') {
            const { generateUnsubscribeToken } = await import("./email-builder");
            const baseUrl = config.public.authBaseUrl || 'http://localhost:3000';
            const unsubToken = generateUnsubscribeToken(recipient);
            // URL utilisée pour le lien footer (GET classique)
            const unsubUrl = `${baseUrl}/api/campaign/unsubscribe?email=${encodeURIComponent(recipient)}&token=${unsubToken}`;
            // URL utilisée pour le One-Click POST (RFC 8058 — Gmail/Outlook natif)
            const unsubPostUrl = `${baseUrl}/api/webhooks/mailgun/unsubscribe`;
            composerOptions.headers = {
                // RFC 2369 — lien cliquable dans les clients mail (fallback)
                'List-Unsubscribe': `<${unsubUrl}>, <mailto:unsubscribe@support.techkne.com?subject=unsubscribe>`,
                // RFC 8058 — bouton natif "Se désabonner" dans Gmail & Outlook (One-Click POST)
                'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
                'X-List-Unsubscribe-Post-URL': unsubPostUrl,
                'X-Mailgun-Tag': campaignId || template || type,
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

        await incrementQuota();

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

// ─── Batch Campaign Send ──────────────────────────────────────────────────────

/** Taille max d'un batch Mailgun (limite API officielle) */
const MAILGUN_BATCH_SIZE = 1000;

/**
 * Envoie une campagne en mode batch via Mailgun Recipient Variables.
 *
 * Avantages vs boucle for :
 *  - 1 seule requête HTTP par chunk de 1000 destinataires
 *  - Le rendu HTML par destinataire est délégué à Mailgun (%recipient.name%)
 *  - Aucune adresse email codée en dur — tout vient du runtimeConfig (.env)
 *  - Filtrage opt-in intégré avant l'envoi
 *
 * @param context  - Un des EmailContext.CAMPAIGN_* (newsletter, changelog, promo)
 * @param subject  - Sujet de l'email
 * @param htmlTemplate - HTML avec placeholders Mailgun (%recipient.name%, %recipient.token%)
 * @param subscribers  - Liste des abonnés (email + nom optionnel + champs opt-in)
 * @param campaignId   - ID de campagne pour le tracking (optionnel)
 */
export async function sendBatchCampaign(options: {
  context: string;
  subject: string;
  htmlTemplate: string;
  subscribers: { email: string; name?: string; optInNewsletter?: boolean; optInMarketing?: boolean }[];
  campaignId?: string;
}): Promise<{ success: boolean; sent: number; chunks: number; mailgunMessageId?: string; error?: string }> {
  const { context, subject, htmlTemplate, subscribers, campaignId } = options;
  const rConfig = useRuntimeConfig();

  if (!mg) {
    return { success: false, sent: 0, chunks: 0, error: 'Mailgun non configuré.' };
  }

  // 1. Résolution de la configuration depuis la table agnostique
  const conf = CAMPAIGN_CONTEXT_CONFIG[context];
  if (!conf) {
    return { success: false, sent: 0, chunks: 0, error: `Contexte de campagne inconnu: ${context}` };
  }

  const fromAddress = (rConfig as any)[conf.envKey] as string | undefined;
  if (!fromAddress) {
    return { success: false, sent: 0, chunks: 0, error: `Variable .env manquante pour la clé: ${conf.envKey}` };
  }

  const domain = fromAddress.split('@').pop()!;
  const from   = `${conf.alias} <${fromAddress}>`;

  // 2. Filtrage opt-in — ne jamais envoyer sans consentement
  const eligible = subscribers.filter(sub => sub[conf.optInField] === true);

  if (eligible.length === 0) {
    console.warn(`[BATCH] Aucun abonné éligible pour le contexte "${context}" (opt-in: ${conf.optInField})`);
    return { success: true, sent: 0, chunks: 0 };
  }

  const { generateUnsubscribeToken } = await import('./email-builder');
  const baseUrl = rConfig.public.authBaseUrl || 'http://localhost:3000';

  // 3. Chunking automatique (limite API Mailgun = 1000 par requête)
  const chunks: typeof eligible[] = [];
  for (let i = 0; i < eligible.length; i += MAILGUN_BATCH_SIZE) {
    chunks.push(eligible.slice(i, i + MAILGUN_BATCH_SIZE));
  }

  let totalSent = 0;
  let firstMailgunMessageId: string | undefined;
  const batchLogId = randomUUID(); // parent log id
  let parentInserted = false;

  for (const chunk of chunks) {
    // Construction des recipient-variables : 1 objet JSON par destinataire
    const recipientVariables: Record<string, object> = {};
    for (const sub of chunk) {
      const unsubToken = generateUnsubscribeToken(sub.email);
      recipientVariables[sub.email] = {
        name:        sub.name || 'Utilisateur',
        token:       unsubToken,
        alias:       conf.alias,
        unsub_link:  `${baseUrl}/api/webhooks/mailgun/unsubscribe?email=${encodeURIComponent(sub.email)}&token=${unsubToken}`,
      };
    }

    try {
      const result = await mg.messages.create(domain, {
        from,
        to:      Object.keys(recipientVariables),
        subject,
        html:    htmlTemplate,  // Mailgun remplace %recipient.name%, %recipient.token%, etc.
        'recipient-variables': JSON.stringify(recipientVariables),
        // Headers conformes RFC 8058 (One-Click unsubscribe Gmail/Outlook)
        'h:List-Unsubscribe':      `<${baseUrl}/api/webhooks/mailgun/unsubscribe>`,
        'h:List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        'h:X-Mailgun-Tag':         campaignId || context,
      }) as any;

      // Capture du Message-ID Mailgun pour l'idempotence (anti-double-envoi au retry)
      const mailgunId = result?.id?.replace(/[<>]/g, '') || '';
      if (mailgunId && !firstMailgunMessageId) {
        firstMailgunMessageId = mailgunId;
      }

      totalSent += chunk.length;
      console.info(`[BATCH] ✅ Chunk envoyé: ${chunk.length} destinataires via ${fromAddress} (contexte: ${context}) | MG-ID: ${mailgunId}`);

      // Insert parent batch log if not done yet
      if (!parentInserted) {
        await db.insert(emailLog).values({
          id: batchLogId,
          recipient: '__batch__',
          fromAlias: fromAddress,
          subject: subject,
          template: 'batch',
          type: 'campaign_batch', // Special type for parent row
          status: 'sent',
          messageId: mailgunId,
          campaignId: campaignId || context, // Used to link children logs
          sentAt: new Date()
        });
        parentInserted = true;
      }
    } catch (chunkErr: any) {
      console.error(`[BATCH] ❌ Échec chunk (${chunk.length} destinataires):`, chunkErr.message);
      // On continue avec les autres chunks même si un échoue
    }
  }

  return { success: true, sent: totalSent, chunks: chunks.length, mailgunMessageId: firstMailgunMessageId };
}
