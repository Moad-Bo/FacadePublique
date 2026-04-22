import { defineEventHandler, getHeaders, sendRedirect } from "h3";
import { requireUserSession } from "../utils/auth";
import { auth } from "../lib/auth";

/**
 * Global Server Middleware (Nitro)
 * Protects specific paths at the server level before Nuxt hydration.
 */
export default defineEventHandler(async (event) => {
    const path = event.path;
    
    // Diagnostic log
    console.log(`[AUTH-SERVER] Middleware hit: ${path}`);

    // 1. Universal Session Resolution (Non-blocking)
    try {
        const session = await auth.api.getSession({
            headers: getHeaders(event) as any
        });
        if (session) {
            console.log(`[AUTH-SERVER] Session found for: ${path} | User: ${session.user.email}`);
            event.context.session = session;
        } else {
            console.log(`[AUTH-SERVER] No session found for: ${path}`);
        }
    } catch (e: any) {
        console.warn(`[AUTH-SERVER] Universal session resolution failed for ${path}:`, e.message);
    }

    // 2. Strict Protection for Dashboard UI routes
    if (path.startsWith('/dashboard')) {
        // A. Check if session exists
        if (!event.context.session) {
            console.warn(`[AUTH-SERVER] Access denied to dashboard route: ${path}, redirecting to /login`);
            return sendRedirect(event, '/login');
        }

        // B. Check if role is authorized (Staff only)
        // Note: better-auth puts the user object in session.user
        const user = event.context.session.user;
        const userRole = user.role;
        const isStaff = userRole === 'admin' || userRole === 'moderator';

        if (!isStaff) {
            console.error(`[AUTH-SERVER] RBAC Denied: User ${user.email} (role: ${userRole}) attempted to access dashboard.`);
            // Redirect unauthorized members to the front office home
            return sendRedirect(event, '/');
        }
    }


    // 3. Strict Protection for Admin/Roles API routes
    if (path.startsWith('/api/admin') || path.startsWith('/api/roles')) {
        // Use the utility to check permissions (it will reuse event.context.session if present)
        try {
            await requireUserSession(event, { permission: 'manage_roles' });
        } catch (e: any) {
            console.error(`[AUTH-SERVER] API protection check failed for ${path}:`, e.message);
            throw e; // Bubble up the 401/403
        }
    }
});
