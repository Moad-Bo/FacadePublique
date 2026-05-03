import { db } from "./db";
import { audience } from "../../drizzle/src/db/schema";
import { eq } from "drizzle-orm";
import { useRuntimeConfig } from "#imports";

export enum EmailContext {
  SYSTEM = "system",
  COMMUNITY_TX = "forum_tx",
  BLOG_TX = "blog_tx",
  WEBMAILER = "webmailer",
  MODERATION = "moderation",
  // Nouveaux contextes campagne typés
  CAMPAIGN_NEWSLETTER = "campaign_newsletter",
  CAMPAIGN_CHANGELOG  = "campaign_changelog",
  CAMPAIGN_PROMO      = "campaign_promo",
}

/**
 * Table de configuration agnostique des campagnes.
 */
export const CAMPAIGN_CONTEXT_CONFIG: Record<string, {
  envKey: string;
  optInField: 'optInNewsletter' | 'optInMarketing';
  alias: string;
  description: string;
}> = {
  [EmailContext.CAMPAIGN_NEWSLETTER]: {
    envKey:      'mailSenderNewsletter',
    optInField:  'optInNewsletter',
    alias:       'Techknè Newsletter',
    description: 'Newsletter éditoriale régulière',
  },
  [EmailContext.CAMPAIGN_CHANGELOG]: {
    envKey:      'mailSenderChangelog',
    optInField:  'optInNewsletter',
    alias:       'Techknè Changelog',
    description: 'Notes de mise à jour produit',
  },
  [EmailContext.CAMPAIGN_PROMO]: {
    envKey:      'mailSenderPromo',
    optInField:  'optInMarketing',
    alias:       'Techknè Offres',
    description: 'Communications promotionnelles et offres',
  },
};

export interface EmailRoutingResult {
  allowed: boolean;
  domain: string;
  method: "api" | "smtp";
  reason?: string;
  senderAlias?: string;
}

/**
 * Service de routage intelligent des emails
 */
export const emailRouter = {
  async getRouting(context: EmailContext, recipient: string): Promise<EmailRoutingResult> {
    const config = useRuntimeConfig();
    const email = recipient.toLowerCase();

    // 1. Détermination du domaine d'API par défaut
    let apiDomain = config.mailgunApiDomain || 'techkne.com';
    let method: "api" | "smtp" = "api";

    // 2. Logique spécifique par contexte
    switch (context) {
      case EmailContext.SYSTEM:
        return { allowed: true, domain: apiDomain, method: "api", senderAlias: config.mailSenderSystem };

      case EmailContext.COMMUNITY_TX:
      case EmailContext.BLOG_TX:
        const audienceForum = await this._getAudience(email);
        if (audienceForum && !audienceForum.optInForum) {
          return { allowed: false, domain: apiDomain, method, reason: "Opt-out forum", senderAlias: config.mailSenderSystem };
        }
        return { allowed: true, domain: apiDomain, method: "api", senderAlias: config.mailSenderSystem };

      case EmailContext.CAMPAIGN_NEWSLETTER:
      case EmailContext.CAMPAIGN_CHANGELOG:
      case EmailContext.CAMPAIGN_PROMO:
        const conf = CAMPAIGN_CONTEXT_CONFIG[context];
        const audienceCamp = await this._getAudience(email);
        const sender = (config as any)[conf.envKey] || config.mailSenderSystem;
        if (!audienceCamp || !audienceCamp[conf.optInField]) {
          return { allowed: false, domain: apiDomain, method, reason: `No ${conf.optInField} opt-in`, senderAlias: sender };
        }
        return { allowed: true, domain: apiDomain, method: "api", senderAlias: sender };

      case EmailContext.WEBMAILER:
        return { allowed: true, domain: config.mailSenderSupport?.split('@').pop() || apiDomain, method: "smtp", senderAlias: config.mailSenderSupport };

      case EmailContext.MODERATION:
        const modDomain = config.mailSenderModeration?.split('@').pop() || config.mailSenderSupport?.split('@').pop() || apiDomain;
        return { allowed: true, domain: modDomain, method: "smtp", senderAlias: config.mailSenderModeration || config.mailSenderSupport };

      default:
        return { allowed: true, domain: apiDomain, method, senderAlias: config.mailSenderSystem };
    }
  },

  async _getAudience(email: string) {
    try {
      return await db.query.audience.findFirst({
        where: eq(audience.email, email)
      });
    } catch (e) {
      console.error("[EMAIL_ROUTER] Error fetching audience:", e);
      return null;
    }
  }
};
