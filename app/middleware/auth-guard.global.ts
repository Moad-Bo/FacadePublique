// Global route guard using Nuxt 4 recommended pattern.
// Pages declare their auth requirement via definePageMeta:
//   requiresAuth: true  → redirect to /login if not connected
//   guestOnly: true     → redirect to /dashboard if already connected

export default defineNuxtRouteMiddleware(async (to) => {
  const path = to.path;
  const localePath = useLocalePath();

  // 1. PERFORMANCE: Skip auth guard for non-page routes and assets
  // This drastically reduces fetchSession spam and prevents rate-limit hits
  if (
    path.includes('.') || 
    path.startsWith('/_nuxt') || 
    path.startsWith('/__nuxt_content') ||
    path.includes('/api/_nuxt_icon')
  ) {
    return;
  }

  console.log(`[AUTH-GUARD] Executing for ${path} (${process.server ? 'Server' : 'Client'})`);
  const { session, fetchSession, isAdmin } = useSession();
  const nuxtApp = useNuxtApp();
  
  // 2. SESSION RESOLUTION: Ensure session is loaded
  if (!session.value || (process.client && (nuxtApp as any)._authPromise)) {
    try {
      await fetchSession();
    } catch (e) {
      console.error(`[AUTH-GUARD] fetchSession failed:`, e);
    }
  }

  // 3. RBAC PROTECTION: Dashboard & Settings Routes
  const isDashboardRoute = path.startsWith('/dashboard');
  const isSettingsRoute = path.startsWith('/settings');

  if (isDashboardRoute || isSettingsRoute) {
    // If NO session → Login
    if (!session.value) {
      console.warn(`[AUTH-GUARD] No session, redirecting to /login`);
      return navigateTo(localePath('/login'));
    }

    // specific RBAC for Dashboard (Staff only)
    if (isDashboardRoute) {
      const userRole = session.value.user?.role;
      const isStaff = userRole === 'admin' || userRole === 'moderator';

      if (!isStaff) {
        console.error(`[AUTH-GUARD] RBAC Denied: User ${session.value.user.email} (role: ${userRole}) attempted to access dashboard.`);
        return navigateTo(localePath('/'));
      }
    }
  }


  // 4. GUEST ONLY PROTECTION: Redirect authenticated users away from login/register
  if (to.meta.guestOnly && session.value) {
    const userRole = session.value.user?.role;
    const isStaff = userRole === 'admin' || userRole === 'moderator';
    
    // Non-staff go to home, Staff go to dashboard
    return navigateTo(localePath(isStaff ? '/dashboard' : '/'));
  }
});


