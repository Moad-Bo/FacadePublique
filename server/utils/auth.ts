import { auth } from "../lib/auth";
import { H3Event, createError, getHeaders } from "h3";
import { db } from "./db";
import { role as roleTable } from "../../drizzle/src/db/schema";
import { eq } from "drizzle-orm";

export type SessionWithUser = {
    user: {
        id: string;
        email: string;
        name: string;
        role?: string;
        [key: string]: any;
    };
    session: any;
};

/**
 * Verify session and optional role/permission on the server-side.
 * Throws a 401/403 error if unauthorized.
 * 
 * Supports DYNAMIC permission resolution: looks up role permissions in DB.
 */
export const requireUserSession = async (event: H3Event, options?: { role?: string | string[], permission?: string | string[] }) => {
    const startTime = Date.now();
    console.log(`[AUTH] Checking session for: ${event.path} | OPTIONS: ${JSON.stringify(options || {})}`);
    
    let session;
    try {
        session = await auth.api.getSession({
            headers: getHeaders(event)
        });
        const duration = Date.now() - startTime;
        console.log(`[AUTH] Session resolved in ${duration}ms: ${session ? 'Found' : 'Not Found'}`);
    } catch (e: any) {
        console.error(`[AUTH] getSession error after ${Date.now() - startTime}ms:`, e.message);
        throw createError({
            statusCode: 500,
            statusMessage: "Internal Server Error during session verify",
        });
    }

    if (!session) {
        throw createError({
            statusCode: 401,
            statusMessage: "Unauthorized: No valid session found.",
        });
    }

    const { user } = session;

    // 1. Role Check (Quick exit for admins)
    if (user.role === 'admin') {
        console.log(`[AUTH] Admin bypass granted for ${user.email}`);
        return session as SessionWithUser;
    }

    if (options?.role) {
        const userRole = user.role;
        const allowedRoles = Array.isArray(options.role) ? options.role : [options.role];
        console.log(`[AUTH] Role check: user=${userRole}, allowed=${allowedRoles}`);
        
        if (!allowedRoles.includes(userRole || '')) {
            console.warn(`[AUTH] Role check failed for ${user.email}: needed ${allowedRoles}, got ${userRole}`);
            throw createError({
                statusCode: 403,
                statusMessage: `Forbidden: You do not have the required role. (Wanted ${allowedRoles}, Got ${userRole})`,
            });
        }
    }

    // 2. Permission Check (Using pre-resolved permissions from session cache)
    if (options?.permission) {
        const resolvedPermissions = (user.permissions || "").split(",").filter(Boolean);
        const requiredPermissions = Array.isArray(options.permission) ? options.permission : [options.permission];
        console.log(`[AUTH] Permission check: userHas=[${resolvedPermissions}], needed=[${requiredPermissions}]`);
        
        if (!requiredPermissions.some(p => resolvedPermissions.includes(p))) {
            console.warn(`[AUTH] Permission check failed for ${user.email}: needed ${requiredPermissions}, got [${resolvedPermissions}]`);
            throw createError({
                statusCode: 403,
                statusMessage: "Forbidden: Missing required permissions.",
            });
        }
    }

    return session as SessionWithUser;
};
