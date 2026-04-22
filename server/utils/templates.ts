import { db } from "./db";
import { systemTemplate } from "../../drizzle/src/db/schema";
import { eq } from "drizzle-orm";

/**
 * Simple HTML escape to prevent XSS in placeholders
 */
function escapeHtml(unsafe: string): string {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

/**
 * Fetches a template from the database and replaces placeholders.
 */
export async function getDynamicTemplate(templateId: string, placeholders: Record<string, string> = {}): Promise<{ subject: string; html: string }> {
    try {
        const t = await db.select()
            .from(systemTemplate)
            .where(eq(systemTemplate.id, templateId))
            .limit(1);

        if (t.length > 0) {
            let html = t[0].content;
            let subject = t[0].subject;

            // Replace {{key}} with ESCAPED value
            for (const [key, value] of Object.entries(placeholders)) {
                const escapedValue = escapeHtml(String(value));
                const regex = new RegExp(`{{${key}}}`, 'g');
                html = html.replace(regex, escapedValue);
                subject = subject.replace(regex, value); // Subject usually doesn't need HTML escape but can't hurt
            }

            return { subject, html };
        }
    } catch (e) {
        console.error(`Error fetching dynamic template ${templateId}:`, e);
    }

    // Hardcoded Fallbacks (Safety First)
    return getFallbackTemplate(templateId, placeholders);
}

function getFallbackTemplate(id: string, p: Record<string, string>): { subject: string; html: string } {
    switch (id) {
        case 'verify_email':
            return { subject: 'Vérifiez votre e-mail', html: `<p>Bienvenue ! Cliquez <a href="${p.url || '#'}">ici</a> pour vérifier votre compte.</p>` };
        case 'reset_password':
            return { subject: 'Réinitialisation de mot de passe', html: `<p>Cliquez <a href="${p.url || '#'}">ici</a> pour réinitialiser votre mot de passe.</p>` };
        default:
            return { subject: 'Techknè Notification', html: `<p>Une notification vous attend sur la plateforme.</p>` };
    }
}

// Keep legacy exports for transition if needed, but they should now ideally use getDynamicTemplate
export const getChangelogTemplate = (title: string, updates: string[]) => `<h2>🚀 ${title}</h2><ul>${updates.map(u => `<li>${u}</li>`).join('')}</ul>`;
export const getBlogTemplate = (title: string, summary: string, url: string) => `<h2>📖 ${title}</h2><p>${summary}</p><a href="${url}">Lire la suite</a>`;
export const getSystemTemplate = (title: string, message: string) => `<h2>🔔 ${title}</h2><p>${message}</p>`;

export const getVerificationReminderTemplate = (url: string) => 
    `<h2>Action Requise</h2><p>Veuillez vérifier votre compte : <a href="${url}">${url}</a></p>`;

export const getPasswordReminderTemplate = (url: string) => 
    `<h2>Sécurité</h2><p>Il est temps de changer votre mot de passe : <a href="${url}">${url}</a></p>`;

export const getPasswordResetTemplate = (url: string) => 
    `<h2>Réinitialisation</h2><p>Lien : <a href="${url}">${url}</a></p>`;

export const getEmailVerificationTemplate = (url: string) => 
    `<h2>Bienvenue</h2><p>Confirmez votre email : <a href="${url}">${url}</a></p>`;
