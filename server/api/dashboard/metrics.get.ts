import { defineEventHandler } from 'h3';
import { db } from '../../utils/db';
import { emailLog } from '../../../drizzle/src/db/schema';
import { eq, sql, and, gte, inArray } from 'drizzle-orm';
import { subDays } from 'date-fns';

export default defineEventHandler(async (event) => {
  // Obtenir la date d'il y a 7 jours
  const sevenDaysAgo = subDays(new Date(), 7);

  // Stats Campagnes (sur les 7 derniers jours par exemple)
  const statsCampagnesRaw = await db
    .select({
      totalEnvoyes: sql<number>`count(*)`,
      totalOuverts: sql<number>`sum(case when ${emailLog.openCount} > 0 then 1 else 0 end)`,
      totalCliques: sql<number>`0`, // Mocker les clics si non traqués
      status: emailLog.status
    })
    .from(emailLog)
    .where(
      and(
        inArray(emailLog.type, ['campaign_newsletter', 'campaign_changelog', 'campaign_promo', 'campaign']),
        gte(emailLog.sentAt, sevenDaysAgo)
      )
    );

  // Stats globales pour la "Santé Campagne"
  const totalAPIStats = await db
    .select({
      total: sql<number>`count(*)`,
      success: sql<number>`sum(case when ${emailLog.status} = 'sent' or ${emailLog.status} = 'delivered' then 1 else 0 end)`
    })
    .from(emailLog);

  const totalLogs = Number(totalAPIStats[0]?.total || 0);
  const successLogs = Number(totalAPIStats[0]?.success || 0);
  const delivRate = totalLogs > 0 ? ((successLogs / totalLogs) * 100).toFixed(1) : '100';

  return {
    campaignData: {
      envoyes: Number(statsCampagnesRaw[0]?.totalEnvoyes || 0),
      ouverts: Number(statsCampagnesRaw[0]?.totalOuverts || 0),
      cliques: Number(statsCampagnesRaw[0]?.totalCliques || 0)
    },
    globalMetrics: {
      delivrability: delivRate
    }
  };
});
