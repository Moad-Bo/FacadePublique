import { db } from "./db";
import { audience } from "../../drizzle/src/db/schema";
import { eq } from "drizzle-orm";
import { useRuntimeConfig } from "#imports";

export enum EmailContext {
  SYSTEM = "system",
  FORUM_TX = "forum_tx",
  BLOG_TX = "blog_tx",
  MARKETING_BATCH = "marketing_batch",
  BLOG_BATCH = "blog_batch",
  WEBMAILER = "webmailer"
}

export interface EmailRoutingResult {
  allowed: boolean;
  domain: string;
  method: "api" | "smtp";
  reason?: string;
}

/**
 * Service de routage intelligent des emails
 * Gère l'isolation des domaines et les vérifications d'opt-in
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

      case EmailContext.FORUM_TX:
      case EmailContext.BLOG_TX:
        const audienceForum = await this._getAudience(email);
        if (audienceForum && !audienceForum.optInForum) {
          return { allowed: false, domain, method, reason: "Opt-out forum" };
        }
        return { allowed: true, domain: config.mailDomainSystem, method: "api" };

      case EmailContext.MARKETING_BATCH:
        const audienceMkt = await this._getAudience(email);
        if (!audienceMkt || (!audienceMkt.optInMarketing && !audienceMkt.optInNewsletter)) {
          return { allowed: false, domain: config.mailDomainMarketing, method, reason: "No marketing opt-in" };
        }
        return { allowed: true, domain: config.mailDomainMarketing, method: "api" };

      case EmailContext.BLOG_BATCH:
        const audienceBlog = await this._getAudience(email);
        if (!audienceBlog || !audienceBlog.optInNewsletter) {
          return { allowed: false, domain: config.mailDomainMarketing, method, reason: "No newsletter opt-in" };
        }
        return { allowed: true, domain: config.mailDomainMarketing, method: "api" };

      case EmailContext.WEBMAILER:
        return { allowed: true, domain: config.mailDomainSupport, method: "smtp" };

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
