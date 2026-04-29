/**
 * server/plugins/tracking.ts
 *
 * Plugin Nitro — Flush périodique du buffer de tracking email.
 *
 * Déclenche flushTrackingBuffer() toutes les FLUSH_INTERVAL_MS (15s)
 * afin de persister les ouvertures d'emails collectées en mémoire
 * via une seule requête UPDATE groupée vers TiDB.
 */

import { flushTrackingBuffer, FLUSH_INTERVAL_MS } from '../utils/tracking-buffer';

export default defineNitroPlugin(() => {
  const interval = setInterval(async () => {
    try {
      await flushTrackingBuffer();
    } catch (err: any) {
      console.error('[TRACKING PLUGIN] Erreur lors du flush périodique:', err.message);
    }
  }, FLUSH_INTERVAL_MS);

  // Nettoyage propre à l'arrêt du serveur
  // @ts-ignore — hook Nitro non typé
  if (typeof process !== 'undefined') {
    process.once('exit', () => clearInterval(interval));
    process.once('SIGTERM', () => clearInterval(interval));
  }

  console.info(`[TRACKING PLUGIN] Buffer de tracking activé (flush toutes les ${FLUSH_INTERVAL_MS / 1000}s)`);
});
