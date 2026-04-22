import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../utils/db";
import { eq } from "drizzle-orm";
import { admin } from "better-auth/plugins";
import { ac, roles } from "../../app/lib/permissions";
import { sendEmail } from "../utils/email";
import { scheduleEmail } from "../utils/scheduler";
import { getEmailVerificationTemplate, getPasswordResetTemplate, getVerificationReminderTemplate, getPasswordReminderTemplate } from "../utils/templates";
import { addDays, addMonths } from "date-fns";
import { role as roleTable, securityEvent, ipBan, settings as settingsTable } from "../../drizzle/src/db/schema";
import { createAuthMiddleware } from "better-auth/api";
import { audienceService } from "../services/audience.service";

import { LRUCache } from "lru-cache";

// Cache definitions
export const roleCache = new LRUCache<string, string>({
    max: 100,
    ttl: 1000 * 60 * 5, // 5 minutes cache
});

// Cache for tracking login attempts (failure counts)
const loginAttemptsCache = new LRUCache<string, number>({
    max: 1000,
    ttl: 1000 * 60 * 60, // 1 hour window
});

export const clearRoleCache = (roleName?: string) => {
    if (roleName) {
        roleCache.delete(roleName);
    } else {
        roleCache.clear();
    }
};

export const auth = betterAuth({
    baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:3000',
    trustedOrigins: [
        'http://localhost:3000',
        process.env.BETTER_AUTH_URL || 'http://localhost:3000',
    ].filter((v, i, a) => a.indexOf(v) === i),
    database: drizzleAdapter(db, {
        provider: "mysql",
    }),
    user: {
        deleteUser: {
            enabled: true,
        },
        additionalFields: {
            permissions: {
                type: "string",
                required: false,
            },
            themePrimary: {
                type: "string",
                required: false,
            },
            themeNeutral: {
                type: "string",
                required: false,
            },
            fontFamily: {
                type: "string",
                required: false,
            },
            fontSize: {
                type: "string",
                required: false,
            },
            bio: {
                type: "string",
                required: false,
            },
            quote: {
                type: "string",
                required: false,
            },
            metadata: {
                type: "string", // Better-auth handles JSON as string if not careful, but database is json
                required: false,
            }
        }

    },
    databaseHooks: {
        user: {
            create: {
                after: async (user) => {
                    // Sync to Audience (Single Source of Truth)
                    await audienceService.syncFromAuth(user, false);

                    await scheduleEmail({
                        recipient: user.email,
                        subject: "N'oubliez pas de vérifier votre compte Techknè",
                        html: getVerificationReminderTemplate(`https://techkne.com/auth/verify?token=REMINDER`),
                        type: "system",
                        template: "verification_reminder",
                        scheduledAt: addDays(new Date(), 2),
                    });
                },
            },
        },
    },
    emailAndPassword: {
        enabled: true,
        async sendResetPassword({ user, url }) {
            await sendEmail({
                recipient: user.email,
                subject: "Reset your password",
                html: getPasswordResetTemplate(url),
            });
        },
    },
    emailVerification: {
        sendOnSignUp: true,
        async sendVerificationEmail({ user, url }) {
            await sendEmail({
                recipient: user.email,
                subject: "Verify your email",
                html: getEmailVerificationTemplate(url),
            });
        },
    },
    plugins: [
        admin({
            ac,
            roles,
            impersonation: {
                enabled: true
            }
        }),
    ],
    hooks: {
        after: createAuthMiddleware(async (ctx) => {
            const startTime = Date.now();
            const path = ctx.path;
            const res = ctx.context.returned as any;

            // 1. Security & Brute Force Protection (Handle Sign-In Failures)
            if (path === "/sign-in/email" && res && res.error) {
                try {
                    const body = await ctx.body as any;
                    const email = body?.email;
                    const headers = ctx.headers;
                    const ip = headers.get('cf-connecting-ip') 
                               || headers.get('x-forwarded-for')?.split(',')[0] 
                               || 'unknown';

                    const attemptKey = `fail:${ip}:${email}`;
                    const failCount = (loginAttemptsCache.get(attemptKey) || 0) + 1;
                    loginAttemptsCache.set(attemptKey, failCount);

                    console.warn(`[SECURITY] Login failure ${failCount} for ${email} from ${ip}`);

                    // Audit Log Entry
                    await db.insert(securityEvent).values({
                        id: crypto.randomUUID(),
                        type: 'LOGIN_FAILURE',
                        ipAddress: ip,
                        email: email,
                        userAgent: ctx.headers.get('user-agent'),
                        details: JSON.stringify({ count: failCount }),
                    });

                    // Fetch thresholds from settings (with defaults)
                    const limitRes = await db.select().from(settingsTable).where(eq(settingsTable.key, 'security_max_attempts')).limit(1);
                    const warnRes = await db.select().from(settingsTable).where(eq(settingsTable.key, 'security_warning_threshold')).limit(1);
                    
                    const MAX_ATTEMPTS = parseInt(limitRes[0]?.value || '5');
                    const WARN_THRESHOLD = parseInt(warnRes[0]?.value || '3');

                    // BAN if count exceeds limit
                    if (failCount >= MAX_ATTEMPTS) {
                        console.error(`[SECURITY] IP ${ip} BANNED after ${failCount} failures on ${email}`);
                        await db.insert(ipBan).values({
                            ipAddress: ip,
                            reason: `Brute-force: ${failCount} failures on account ${email}`,
                        }).onDuplicateKeyUpdate({ set: { reason: `Repeated: ${failCount} failures` } } as any);
                        
                        await db.insert(securityEvent).values({
                            id: crypto.randomUUID(),
                            type: 'BAN_TRIGGER',
                            ipAddress: ip,
                            email: email,
                            details: "Automatic permanent ban due to brute-force.",
                        });
                    }

                    // SUGGEST PASSWORD RESET
                    if (failCount >= WARN_THRESHOLD && failCount < MAX_ATTEMPTS) {
                        res.error.message = "Trop d'échecs consécutifs. Pensez à réinitialiser votre mot de passe.";
                    }
                } catch (e) {
                    console.error("[SECURITY] Failed to process security hook:", e);
                }
            }

            // 2. Session Enrichment (Enrich success with roles/permissions)
            const sessionEndpoints = ["/session", "/get-session", "/sign-in/email"];
            const isSessionRelevant = sessionEndpoints.some(e => path === e);

            if (isSessionRelevant && res && res.user && !res.error) {
                const user = res.user;
                console.log(`[AUTH] Enriching session for ${user.email} (role: ${user.role})`);

                try {
                    const enrichmentTimeout = new Promise((_, reject) => 
                        setTimeout(() => reject(new Error("Enrichment Timeout")), 4000)
                    );

                    const performEnrichment = (async () => {
                        // Admin already has all permissions conceptually
                        if (user.role === 'admin') {
                            res.user.permissions = "*";
                            return;
                        }

                        // Resolve permissions dynamically from cache or DB
                        let permsFromDb = "";
                        if (user.role) {
                            const cached = roleCache.get(user.role);
                            if (cached !== undefined) {
                                permsFromDb = cached;
                            } else {
                                const roleData = await db.select({ permissions: roleTable.permissions })
                                    .from(roleTable)
                                    .where(eq(roleTable.name, user.role))
                                    .limit(1) as any;
                                
                                permsFromDb = roleData[0]?.permissions || "";
                                roleCache.set(user.role, permsFromDb);
                            }
                        }

                        const userPerms = (user.permissions || "").split(",").filter(Boolean);
                        const rolePerms = permsFromDb.split(",").filter(Boolean);
                        const merged = Array.from(new Set([...userPerms, ...rolePerms]));
                        res.user.permissions = merged.join(',');
                    })();

                    await Promise.race([performEnrichment, enrichmentTimeout]);
                } catch (e: any) {
                    console.error(`[AUTH] Enrichment Error for ${user?.email}:`, e.message);
                } finally {
                    console.log(`[AUTH] Hook total duration: ${Date.now() - startTime}ms`);
                }
            }
        })
    }
});
