/**
 * server/utils/tracking-buffer.ts
 *
 * 📊 BUFFER D'OUVERTURES EMAIL — Optimisation des écritures DB
 *
 * Problème résolu :
 *   Sans buffer, chaque ouverture d'email (pixel 1x1) déclenche un UPDATE immédiat
 *   en base de données. Lors d'une campagne envoyée à 5000 personnes, cela peut
 *   générer 5000 écritures simultanées et saturer le pool de connexions TiDB (30 max).
 *
 * Solution :
 *   Les IDs d'ouvertures sont collectés en mémoire vive (Set).
 *   Un flush périodique (toutes les FLUSH_INTERVAL_MS) exécute une seule requête
 *   UPDATE ... WHERE id IN (...) pour tous les IDs accumulés.
 *
 * Usage :
 *   - Appeler bufferOpen(logId, campaignId?) depuis track.get.ts
 *   - Le flush est déclenché automatiquement via le plugin Nitro (plugins/tracking.ts)
 */

import { db } from './db';
import { emailLog, campaign } from '../../drizzle/src/db/schema';
import { inArray, sql } from 'drizzle-orm';

/** Intervalle entre chaque flush (5 secondes — perte max 5s de stats en cas de crash) */
export const FLUSH_INTERVAL_MS = 5_000;

/** Buffer des ouvertures individuelles : logId → campaignId (optionnel) */
const pendingOpens = new Map<string, string | undefined>();

/**
 * Ajoute un ID d'ouverture au buffer en mémoire.
 * Opération O(1), non bloquante.
 */
export function bufferOpen(logId: string, campaignId?: string): void {
  if (!logId) return;
  // Si l'ID est déjà dans le buffer, on ne l'écrase pas (idempotent)
  if (!pendingOpens.has(logId)) {
    pendingOpens.set(logId, campaignId);
  }
}

/**
 * Vide le buffer et persiste toutes les ouvertures en une seule requête DB.
 * Appelé périodiquement par le plugin Nitro.
 */
export async function flushTrackingBuffer(): Promise<void> {
  if (pendingOpens.size === 0) return;

  // Snapshot atomique + vidage immédiat pour ne pas bloquer les nouvelles entrées
  const snapshot = new Map(pendingOpens);
  pendingOpens.clear();

  const logIds = [...snapshot.keys()];

  try {
    // 1. Mise à jour de tous les emailLog en une seule requête
    await db.update(emailLog)
      .set({
        openCount: sql`${emailLog.openCount} + 1`,
        openedAt:  new Date(),
      })
      .where(inArray(emailLog.id, logIds));

    // 2. Mise à jour des métriques de campagne (groupé par campaignId)
    const campaignIds = [...new Set(
      [...snapshot.values()].filter((cid): cid is string => !!cid)
    )];

    if (campaignIds.length > 0) {
      for (const cid of campaignIds) {
        // Compte combien d'ouvertures appartiennent à cette campagne
        const openCount = [...snapshot.entries()]
          .filter(([, id]) => id === cid).length;

        await db.update(campaign)
          .set({ openedCount: sql`${campaign.openedCount} + ${openCount}` })
          .where(inArray(campaign.id, [cid]));
      }
    }

    console.info(`[TRACKING] ✅ Flush: ${logIds.length} ouverture(s) persistée(s) en 1 requête DB.`);
  } catch (err: any) {
    console.error('[TRACKING] ❌ Échec du flush tracking buffer:', err.message);
    // On remet les IDs dans le buffer pour le prochain cycle (best-effort recovery)
    for (const [id, cid] of snapshot) {
      if (!pendingOpens.has(id)) pendingOpens.set(id, cid);
    }
  }
}
