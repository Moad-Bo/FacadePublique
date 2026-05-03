/**
 * Nitro Plugin : Asset Lifecycle Cleanup Job
 * 
 * Tourne toutes les heures pour purger les assets expirés :
 * - `expires_at` dépassé → suppression S3 + DB
 * - `lifecycle_status = 'pending'` depuis plus de 24h → suppression S3 + DB (orphelins)
 * 
 * Ce job complète la Lifecycle Policy S3/R2 côté bucket (dernier filet de sécurité).
 */

import { db } from '../utils/db';
import { asset } from '../../drizzle/src/db/schema';
import { lte, and, eq, or } from 'drizzle-orm';
import { deleteFromS3 } from '../utils/r2';

const CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // 1 heure

export default defineNitroPlugin(() => {
  const runCleanup = async () => {
    try {
      const now = new Date();
      // 24h TTL pour les orphelins "pending"
      const pendingCutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const toDelete = await db.select({ id: asset.id, s3Key: asset.s3Key, lifecycleStatus: asset.lifecycleStatus })
        .from(asset)
        .where(
          or(
            // Assets avec date d'expiration dépassée
            and(
              lte(asset.expiresAt, now),
            ),
            // Assets "pending" orphelins depuis plus de 24h
            and(
              eq(asset.lifecycleStatus, 'pending'),
              lte(asset.createdAt, pendingCutoff),
            )
          )
        )
        .limit(100); // Process in batches

      if (toDelete.length === 0) {
        console.info('[ASSET CLEANUP] Aucun asset expiré trouvé.');
        return;
      }

      console.info(`[ASSET CLEANUP] ${toDelete.length} asset(s) à purger...`);

      const results = await Promise.allSettled(
        toDelete.map(async (rec) => {
          try {
            await deleteFromS3(rec.s3Key);
            await db.delete(asset).where(eq(asset.id, rec.id));
            console.info(`[ASSET CLEANUP] ✅ Purgé: ${rec.id} (${rec.s3Key})`);
          } catch (e: any) {
            console.error(`[ASSET CLEANUP] ❌ Échec purge ${rec.id}: ${e.message}`);
            throw e;
          }
        })
      );

      const failed = results.filter(r => r.status === 'rejected').length;
      console.info(`[ASSET CLEANUP] ✅ ${toDelete.length - failed} purgés, ❌ ${failed} en erreur`);

    } catch (err: any) {
      console.error('[ASSET CLEANUP] Erreur critique:', err.message);
    }
  };

  // Lancement initial avec délai de 2 min (laisser le serveur démarrer)
  setTimeout(runCleanup, 2 * 60 * 1000);
  
  // Planification récurrente
  setInterval(runCleanup, CLEANUP_INTERVAL_MS);

  console.info('[ASSET CLEANUP] 🧹 Plugin de cleanup des assets activé (toutes les heures).');
});
