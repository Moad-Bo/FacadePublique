import { authClient } from '../lib/auth-client';
import { ref } from 'vue';

export const useSession = () => {
  const session = useState<any>('auth:session', () => null);
  const loading = useState('auth:loading', () => true);
  const nuxtApp = useNuxtApp();

  const fetchSession = async () => {
    // SWR Optimization: If we already have a session and aren't in SSR, 
    // we can proceed with stale data while revalidating.
    if (!process.server && session.value && !(nuxtApp as any)._authPromise) {
        console.log(`[SESSION] fetchSession SWR: Using stale data while revalidating`);
        // Trigger background refresh without blocking the caller
        backgroundFetchSession();
        return Promise.resolve();
    }

    if ((nuxtApp as any)._authPromise) return (nuxtApp as any)._authPromise;

    console.log(`[SESSION] fetchSession START (${process.server ? 'Server' : 'Client'})`);
    loading.value = true;
    
    (nuxtApp as any)._authPromise = (async () => {
      try {
        // 1. SSR Optimization: Use the session already resolved by Nitro middleware
        if (process.server) {
            const event = useRequestEvent();
            const contextSession = event?.context.session;
            
            if (contextSession) {
                console.log(`[SESSION] fetchSession SUCCESS (Context): ${contextSession.user?.email}`);
                session.value = contextSession;
                (nuxtApp as any)._authPromise = null;
                return;
            }
            
            console.warn('[SESSION] fetchSession: No session found in Nitro context during SSR');
            session.value = null;
            loading.value = false;
            (nuxtApp as any)._authPromise = null;
            return;
        }

        // 2. Client-side fetching (with timeout protection)
        const timeout = new Promise((_, reject) => 
          setTimeout(() => reject(new Error("Session Timeout")), 5000)
        );
        
        const getSession = authClient.getSession();
        const response: any = await Promise.race([getSession, timeout]);
        
        const { data, error } = response;
        
        if (error) {
          console.error('[SESSION] fetchSession ERROR:', error);
          session.value = null;
        } else {
          session.value = data;
          console.log('[SESSION] fetchSession SUCCESS:', data?.user?.email);
        }
      } catch (e: any) {
        console.error('[SESSION] fetchSession EXCEPTION:', e.message);
        session.value = null;
      } finally {
        loading.value = false;
        (nuxtApp as any)._authPromise = null;
        console.log('[SESSION] fetchSession FINISHED');
      }
    })();

    return (nuxtApp as any)._authPromise;
  };

  /**
   * Background revalidation for SWR
   */
  const backgroundFetchSession = async () => {
    try {
        const { data } = await authClient.getSession();
        if (data) session.value = data;
    } catch (e) { /* silent background failure */ }
  };

  const handleSignOut = async () => {
    await authClient.signOut();
    clearSession();
    navigateTo('/login');
  };

  const permissions = computed(() => {
    if (!session.value?.user?.permissions) return [];
    return session.value.user.permissions.split(',').filter(Boolean);
  });

  const isAdmin = computed(() => session.value?.user?.role === 'admin');

  /**
   * Check if the user has a specific permission or any of the provided permissions.
   * Admins always return true.
   */
  const hasPermission = (p: string | string[]) => {
    if (isAdmin.value) return true;
    const required = Array.isArray(p) ? p : [p];
    return required.some(perm => permissions.value.includes(perm));
  };

  return {
    session,
    loading,
    permissions,
    isAdmin,
    fetchSession,
    handleSignOut,
    hasPermission
  };
};

/**
 * Helper to clear session state on logout
 */
export const clearSession = () => {
  const session = useState('auth:session');
  session.value = null;
};
