/**
 * server/plugins/scheduler-boot.ts
 *
 * Plugin Nitro — Récupération des jobs zombie au démarrage du serveur.
 *
 * Phase 3 — Circuit Breaker (boot recovery) :
 *   Si le serveur a crashé alors qu'un job était en status "locked",
 *   ce job resterait bloqué indéfiniment sans intervention.
 *   Ce plugin remet tous les jobs "locked" en "pending" au démarrage,
 *   garantissant qu'aucun email ne reste bloqué après un redémarrage.
 *
 * Note : Ce reset est sûr car un job "locked" ne peut être traité
 *   que par le worker courant, et à ce stade il n'y a aucun worker actif.
 */

import { db } from '../utils/db';
import { emailQueue } from '../../drizzle/src/db/schema';
import { eq } from 'drizzle-orm';

export default defineNitroPlugin(async () => {
  try {
    const result = await db.update(emailQueue)
      .set({
        status:   'pending',
        lockedAt: null,
        updatedAt: new Date()
      })
      .where(eq(emailQueue.status, 'locked'));

    // Drizzle MySQL retourne rowsAffected dans result[0]
    const recovered = (result as any)?.[0]?.affectedRows ?? 0;

    if (recovered > 0) {
      console.warn(`[SCHEDULER BOOT] ⚠️ ${recovered} job(s) zombie récupéré(s) et remis en file d'attente.`);
    } else {
      console.info('[SCHEDULER BOOT] ✅ Aucun job zombie détecté au démarrage.');
    }
  } catch (err: any) {
    // Non bloquant : le serveur doit démarrer même si la DB est indisponible
    console.error('[SCHEDULER BOOT] ❌ Impossible de récupérer les jobs zombie:', err.message);
  }
});
