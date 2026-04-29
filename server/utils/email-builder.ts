import { createHmac } from 'crypto';
import { db } from './db';
import { emailLayout } from '../../drizzle/src/db/schema';
import { eq } from 'drizzle-orm';
import sanitizeHtml from 'sanitize-html';

/**
 * Sanitize HTML for email delivery.
 * Strips dangerous tags like <script>, <iframe>, but allows standard layout and images.
 */
export function sanitizeEmailHtml(html: string): string {
    return sanitizeHtml(html, {
        allowedTags: [
            'address', 'article', 'aside', 'footer', 'header', 'h1', 'h2', 'h3', 'h4',
            'h5', 'h6', 'hgroup', 'main', 'nav', 'section', 'blockquote', 'dd', 'div',
            'dl', 'dt', 'figcaption', 'figure', 'hr', 'li', 'main', 'ol', 'p', 'pre',
            'ul', 'a', 'abbr', 'b', 'bdi', 'bdo', 'br', 'cite', 'code', 'data', 'dfn',
            'em', 'i', 'kbd', 'mark', 'q', 'rb', 'rp', 'rt', 'rtc', 'ruby', 's', 'samp',
            'small', 'span', 'strong', 'sub', 'sup', 'time', 'u', 'var', 'wbr', 'caption',
            'col', 'colgroup', 'table', 'tbody', 'td', 'tfoot', 'th', 'thead', 'tr', 'img'
        ],
        allowedAttributes: {
            'a': ['href', 'name', 'target', 'style', 'class'],
            'img': ['src', 'srcset', 'alt', 'title', 'width', 'height', 'loading', 'style', 'class'],
            '*': ['style', 'class', 'id']
        },
        allowedStyles: {
            '*': {
                'color': [/^#(0x)?[0-9a-f]+$/i, /^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/],
                'text-align': [/^left$/, /^right$/, /^center$/],
                'font-size': [/^\d+(?:px|em|%)$/],
                'font-weight': [/^\d+$/, /^bold$/, /^normal$/],
                'margin': [/^\d+(?:px|em|%)?(?:\s+\d+(?:px|em|%)?){0,3}$/],
                'padding': [/^\d+(?:px|em|%)?(?:\s+\d+(?:px|em|%)?){0,3}$/],
                'background-color': [/^#(0x)?[0-9a-f]+$/i, /^transparent$/],
                'width': [/^\d+(?:px|em|%)$/],
                'height': [/^\d+(?:px|em|%)$/],
                'border': [/^.+$/],
                'border-radius': [/^\d+(?:px|em|%)$/],
                'display': [/^block$/, /^inline-block$/, /^inline$/, /^none$/],
                'vertical-align': [/^top$/, /^middle$/, /^bottom$/]
            }
        }
    });
}

/**
 * Atomic Brand & Style Configuration.
 * Centralizing these values ensures they are injected into any layout (DB or fallback).
 */
const BRAND_CONFIG = {
    name: 'Techknè Group',
    logoText: 'TECHKNÈ',
    logoAccent: 'GROUP',
    primaryColor: '#6366f1',
    footerText: 'Techknè - Plateforme de Communication Agnostique',
    supportUrl: 'https://support.techkne.com',
    baseUrl: process.env.BETTER_AUTH_URL || 'http://localhost:3000'
};

/**
 * Injects global brand CSS variables into the layout <head>.
 */
function injectGlobalStyles(html: string) {
    const styleTags = `
    <style id="techkne-brand-styles">
        :root { --primary: ${BRAND_CONFIG.primaryColor}; }
        .tk-primary { color: ${BRAND_CONFIG.primaryColor} !important; }
        .tk-bg-primary { background-color: ${BRAND_CONFIG.primaryColor} !important; }
        .tk-btn { display: inline-block; padding: 10px 20px; background-color: ${BRAND_CONFIG.primaryColor}; color: #fff !important; text-decoration: none; border-radius: 8px; font-weight: bold; }
    </style>
    `;

    if (html.includes('</head>')) {
        return html.replace('</head>', `${styleTags}</head>`);
    }
    return `${styleTags}${html}`;
}

/**
 * Ensures that the layout has a body placeholder.
 * If missing, it appends it to ensure content is never lost.
 */
function ensureBodyPlaceholder(shell: string): string {
    if (shell.includes('{{{body}}}') || shell.includes('{{body}}')) {
        return shell;
    }
    console.warn('[EMAIL-BUILDER] Layout missing {{{body}}} placeholder. Automatic recovery initiated.');
    // If it's a full HTML without placeholder, inject before footer or at the end
    if (shell.includes('</body>')) {
        return shell.replace('</body>', '{{{body}}}</body>');
    }
    return `${shell}\n{{{body}}}`;
}

/**
 * Default professional fallback layout.
 */
function getDefaultLayout(subject: string, baseUrl: string, type: string, unsubLink: string) {
    return `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${subject}</title>
    <style>
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f9f9f9; color: #333; line-height: 1.6; }
        .container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #eef0f2; box-shadow: 0 4px 6px rgba(0,0,0,0.02); }
        .header { padding: 30px; text-align: center; border-bottom: 1px solid #f0f2f5; }
        .logo { font-size: 24px; font-weight: 800; color: #000; letter-spacing: -0.5px; text-decoration: none; }
        .content { padding: 40px 30px; font-size: 16px; color: #444; }
        .footer { padding: 30px; text-align: center; background-color: #fcfdfe; border-top: 1px solid #f0f2f5; font-size: 12px; color: #888; }
        .footer a { color: #888; text-decoration: underline; margin: 0 10px; }
        .btn-contact { display: inline-block; padding: 10px 20px; background-color: ${BRAND_CONFIG.primaryColor}; color: #fff; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
        .unsub-btn { color: #f43f5e !important; font-weight: bold; }
        .preheader { display: none; max-height: 0px; overflow: hidden; mso-hide: all; }
        @media only screen and (max-width: 600px) {
            .container { margin: 0; border-radius: 0; }
            .content { padding: 30px 20px; }
        }
    </style>
</head>
<body>
    <span class="preheader">${subject}</span>
    <div class="container">
        <div class="header">
            <a href="${baseUrl}" class="logo">${BRAND_CONFIG.logoText} <span style="color: ${BRAND_CONFIG.primaryColor};">${BRAND_CONFIG.logoAccent}</span></a>
        </div>
        <div class="content">
            {{{body}}}
        </div>
        <div class="footer">
            <div style="margin-bottom: 20px;">
                <a href="${baseUrl}/contact" class="btn-contact">Nous Contacter</a>
            </div>
            <p>${BRAND_CONFIG.footerText}</p>
            <p>&copy; ${new Date().getFullYear()} ${BRAND_CONFIG.name}. Tous droits réservés.</p>
            ${(type === 'newsletter' || type === 'campaign') ? `<div style="margin-top: 20px;"><a href="${unsubLink}" class="unsub-btn">Se désabonner</a></div>` : ''}
        </div>
    </div>
</body>
</html>`;
}

/**
 * Generate a secure unsubscribe token.
 */
export function generateUnsubscribeToken(email: string): string {
    const secret = process.env.BETTER_AUTH_SECRET || 'techkne-secret-fallback';
    return createHmac('sha256', secret).update(email).digest('hex').substring(0, 16);
}

/**
 * Wrap the email content in a professional global layout.
 */
export async function wrapEmailContent(content: string, options: { 
    recipient: string, 
    subject: string, 
    type?: string,
    layoutId?: string,
    userName?: string,
    alias?: string,      // The display name of the sender context
    logId?: string,      // Track individual email opens
    campaignId?: string  // Track campaign-wide opens
}) {
    const { recipient, subject, type = 'system', layoutId, userName = 'Utilisateur', alias = 'Techknè', logId, campaignId } = options;
    
    // 1. Prepare Variables
    const dateStr = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    const unsubToken = generateUnsubscribeToken(recipient);
    const baseUrl = BRAND_CONFIG.baseUrl;
    const unsubLink = `${baseUrl}/api/campaign/unsubscribe?email=${encodeURIComponent(recipient)}&token=${unsubToken}`;

    // 2. Fetch Layout
    let shell = '';
    const targetLayoutId = layoutId || type; // Fallback to type if no explicit layoutId

    const [dbLayout] = await db.select()
        .from(emailLayout)
        .where(eq(emailLayout.id, targetLayoutId));

    if (dbLayout) {
        shell = dbLayout.html;
    } else {
        // Ultimate fallback to legacy hardcoded design
        shell = getDefaultLayout(subject, baseUrl, type, unsubLink);
    }

    // Structural enforcement
    shell = ensureBodyPlaceholder(shell);
    shell = injectGlobalStyles(shell);

    // 3. Process Content (Inner body)
    let processedContent = content
        .replace(/\{user\}/g, userName)
        .replace(/\{\{ name \}\}/g, userName)
        .replace(/\{date\}/g, dateStr)
        .replace(/\{alias\}/g, alias)
        .replace(/\{company_name\}/g, BRAND_CONFIG.name)
        .replace(/\{primary_color\}/g, BRAND_CONFIG.primaryColor)
        .replace(/\{unsubscribe_link\}/g, unsubLink);

    let cleanBody = sanitizeEmailHtml(processedContent);

    // 4. Inject Tracking Pixel (if tracking is enabled)
    if (logId) {
        const trackingUrl = `${baseUrl}/api/mails/track?id=${logId}${campaignId ? `&cid=${campaignId}` : ''}`;
        cleanBody += `\n<img src="${trackingUrl}" width="1" height="1" style="display:none !important; visibility:hidden !important; opacity:0 !important;" alt="" />`;
    }

    // 5. Inject into Layout (Shell)
    return shell
        .replace(/\{\{\{body\}\}\}/g, cleanBody)
        .replace(/\{\{body\}\}/g, cleanBody)
        .replace(/\{user\}/g, userName)
        .replace(/\{date\}/g, dateStr)
        .replace(/\{alias\}/g, alias)
        .replace(/\{primary_color\}/g, BRAND_CONFIG.primaryColor)
        .replace(/\{company_name\}/g, BRAND_CONFIG.name)
        .replace(/\{unsubscribe_link\}/g, unsubLink)
        .replace(/\{support_url\}/g, BRAND_CONFIG.supportUrl);
}
