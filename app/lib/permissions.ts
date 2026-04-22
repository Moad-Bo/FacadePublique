import { createAccessControl } from "better-auth/plugins/access";
import { defaultStatements, adminAc } from "better-auth/plugins/admin/access";

/**
 * All Available Permissions (UI & API)
 */
export const ALL_PERMISSIONS = [
  { label: '📚 Docs Internes', value: 'docs:internal' },
  { label: '👥 Gestion Clients', value: 'manager:customers' },
  { label: '🏢 Gestion Membres', value: 'manager:members' },
  { label: '💬 Support Chat', value: 'support:chat' },
  { label: '📧 Gestion Mails', value: 'manage_mail' },
  { label: '📣 Gestion Newsletter', value: 'manage_newsletter' },
  { label: '🛡️ Gestion Rôles', value: 'manage_roles' },
  { label: '🔒 Gestion Sécurité', value: 'manage_security' },
  { label: '👥 Gestion Membres', value: 'manage_membre' },
  { label: '💬 Accès Communauté', value: 'community-access' },
  { label: '[Legacy] Gestion Mails Globale', value: 'manage_mails' },
] as const;

/**
 * Access Control Statements
 * Define resources and their available actions.
 */
export const statement = {
    ...defaultStatements,
    // Add custom resources here if needed, for example:
    // project: ["create", "share", "update", "delete"],
} as const;

export const ac = createAccessControl(statement);

/**
 * Role Definitions
 * Combine permissions to form logical roles.
 */
export const roles = {
    // Admin has full control over all resources
    admin: ac.newRole({
        ...adminAc.statements,
    }),

    // Paid customers - have full access to their dashboard and services
    customer: ac.newRole({
        // Add specific customer permissions here
    }),

    // Members (e.g. newsletter subscribers) - basic access
    membre: ac.newRole({
        user: ["community-access" as any]
    }),


    // Moderator can manage users (list, ban) but maybe not delete
    moderator: ac.newRole({
        user: ["list", "ban"],
        session: ["list"],
    }),
    
    // Editor can list users but not modify them
    editor: ac.newRole({
        user: ["list"],
    }),

    // Management role with extended permissions but not full admin
    // This allows native Better Auth admin functions to work correctly.
    testallperm: ac.newRole({
        user: ["list", "ban", "impersonate", "set-password", "update", "create"],
        session: ["list", "revoke"],
    }),
    
    // Standard user has no administrative permissions
    user: ac.newRole({}),
};
