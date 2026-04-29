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
    envKey:      'mailDomainCampaignNewsletter',
    optInField:  'optInNewsletter',
    alias:       'Techknè Newsletter',
    description: 'Newsletter éditoriale régulière',
  },
  [EmailContext.CAMPAIGN_CHANGELOG]: {
    envKey:      'mailDomainCampaignChangelog',
    optInField:  'optInNewsletter',
    alias:       'Techknè Changelog',
    description: 'Notes de mise à jour produit',
  },
  [EmailContext.CAMPAIGN_PROMO]: {
    envKey:      'mailDomainCampaignPromo',
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
}

/**
 * Service de routage intelligent des emails
 */
export const emailRouter = {
  async getRouting(context: EmailContext, recipient: string): Promise<EmailRoutingResult> {
    const config = useRuntimeConfig();
    const email = recipient.toLowerCase();

    // 1. Détermination du domaine par défaut
    let domain = config.mailDomainSystem || 'techkne.com';
    let method: "api" | "smtp" = "api";

    // 2. Logique spécifique par contexte
    switch (context) {
      case EmailContext.SYSTEM:
        return { allowed: true, domain: config.mailDomainSystem, method: "api" };

      case EmailContext.COMMUNITY_TX:
      case EmailContext.BLOG_TX:
        const audienceForum = await this._getAudience(email);
        if (audienceForum && !audienceForum.optInForum) {
          return { allowed: false, domain, method, reason: "Opt-out forum" };
        }
        return { allowed: true, domain: config.mailDomainSystem, method: "api" };

      case EmailContext.CAMPAIGN_NEWSLETTER:
      case EmailContext.CAMPAIGN_CHANGELOG:
      case EmailContext.CAMPAIGN_PROMO:
        const conf = CAMPAIGN_CONTEXT_CONFIG[context];
        const audienceCamp = await this._getAudience(email);
        if (!audienceCamp || !audienceCamp[conf.optInField]) {
          return { allowed: false, domain: (config as any)[conf.envKey]?.split('@').pop() || domain, method, reason: `No ${conf.optInField} opt-in` };
        }
        return { allowed: true, domain: (config as any)[conf.envKey]?.split('@').pop() || domain, method: "api" };

      case EmailContext.WEBMAILER:
        return { allowed: true, domain: config.mailDomainSupport, method: "smtp" };

      case EmailContext.MODERATION:
        const modDomain = config.mailEmailMod?.split('@').pop() || config.mailDomainSupport;
        return { allowed: true, domain: modDomain, method: "smtp" };

      default:
        return { allowed: true, domain, method };
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
