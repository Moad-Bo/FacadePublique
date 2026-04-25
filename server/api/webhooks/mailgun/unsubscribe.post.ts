/**
 * server/api/webhooks/mailgun/unsubscribe.post.ts
 *
 * 🔕 POST /api/webhooks/mailgun/unsubscribe
 *
 * Endpoint "One-Click Unsubscribe" — conforme à la RFC 8058 et aux exigences Gmail 2024.
 *
 * Ce handler est appelé de DEUX façons :
 * 1. Par Gmail/Outlook nativement (bouton "Se désabonner" en haut de l'email)
 *    → Corps : application/x-www-form-urlencoded ou JSON avec { email }
 * 2. Par le clic sur le lien dans le footer de l'email (fallback manuel)
 *    → Paramètre : ?email=xxx&token=yyy
 *
 * Il met à jour les booléens dans la table `audience` et retourne un 200 immédiat.
 *
 * Usage dans les emails : Ajouter l'en-tête suivant à TOUS les envois marketing :
 *   List-Unsubscribe: <https://ton-domaine.com/api/webhooks/mailgun/unsubscribe?email=EMAIL>
 *   List-Unsubscribe-Post: List-Unsubscribe=One-Click
 */

import { defineEventHandler, readBody, getQuery, getHeader, createError } from 'h3';
import { db } from '../../../utils/db';
import { audience } from '../../../../drizzle/src/db/schema';
import { eq } from 'drizzle-orm';
import { createHmac } from 'crypto';

// ─── Validation du token de désabonnement ─────────────────────────────────────

/**
 * Vérifie qu'un token de désabonnement est authentique (évite les désabonnements forcés par tiers).
 * Le token est généré dans email-builder.ts via generateUnsubscribeToken(email).
 */
function isValidUnsubToken(email: string, token: string): boolean {
  const secret = process.env.BETTER_AUTH_SECRET || 'fallback-secret';
  const expected = createHmac('sha256', secret).update(email).digest('hex').substring(0, 16);
  return token === expected;
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export default defineEventHandler(async (event) => {
  let email: string | undefined;
  let token: string | undefined;
  let skipTokenCheck = false;

  const contentType = getHeader(event, 'content-type') || '';
  const query = getQuery(event);

  // ── 1. Récupération de l'email selon le format de la requête ───────────────

  // Cas A : Appel direct du client mail (One-Click POST RFC 8058)
  // Le corps contient "List-Unsubscribe=One-Click" et pas forcément l'email
  if (contentType.includes('application/x-www-form-urlencoded')) {
    const body = await readBody(event);
    email = body?.email || (query.email as string);
    token = body?.token || (query.token as string);
    
    // Si le corps contient exactement "List-Unsubscribe=One-Click", c'est un appel RFC 8058
    // → pas de vérification de token, l'email vient du query param
    if (body?.['List-Unsubscribe'] === 'One-Click') {
      skipTokenCheck = true;
    }
  }

  // Cas B : Appel JSON (depuis le frontend ou API)
  if (contentType.includes('application/json')) {
    const body = await readBody(event);
    email = body?.email;
    token = body?.token;
  }

  // Cas C : Lien de désabonnement dans le footer (GET converti en POST ou query params)
  if (!email) {
    email = query.email as string;
    token = query.token as string;
  }

  if (!email) {
    throw createError({ statusCode: 400, statusMessage: 'Email requis' });
  }

  // ── 2. Vérification du token (sauf si appel RFC 8058 natif) ───────────────
  if (!skipTokenCheck && token) {
    if (!isValidUnsubToken(email, token)) {
      console.warn(`[UNSUB] Token invalide pour: ${email}`);
      // On renvoie 200 pour ne pas révéler d'info, mais on n'applique pas le désabonnement
      return { success: false };
    }
  }

  // ── 3. Mise à jour en BDD ─────────────────────────────────────────────────
  try {
    await db.update(audience)
      .set({
        optInNewsletter: false,
        optInMarketing: false,
        unsubscribedAt: new Date(),
      })
      .where(eq(audience.email, email.toLowerCase()));

    console.info(`[UNSUB] ✅ Désabonnement appliqué pour: ${email}`);
    return { success: true };
  } catch (e: any) {
    console.error(`[UNSUB] Erreur BDD pour ${email}:`, e.message);
    // Retourner 200 quand même pour Gmail (ne pas bloquer)
    return { success: false };
  }
});
