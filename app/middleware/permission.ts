export default defineNuxtRouteMiddleware(async (to) => {
  if (process.server) return;
  const { session, fetchSession, hasPermission } = useSession();
  
  // 1. Ensure session is loaded (on server or client)
  if (!session.value) {
    await fetchSession();
  }

  // 2. If STILL no session, the global auth-guard will handle redirect to /login
  if (!session.value) return;

  // 3. Resolve required permission from page meta
  const requiredPermission = to.meta.requiredPermission as string | string[] | undefined;

  // 4. Default check: if no specific permission is required, we just allow authenticated users
  if (!requiredPermission) return;

  // 5. Evaluate permission
  if (!hasPermission(requiredPermission)) {
    console.warn(`[SECURITY] Access denied to ${to.path}. Missing permission: ${requiredPermission}`);
    
    // Use a toast if available, otherwise just redirect
    const notify = useNotify();
    if (notify) {
      notify.error(
        'Accès Refusé',
        "Vous n'avez pas les droits nécessaires pour accéder à cette zone."
      );
    }

    // Redirect to landing page as requested by user
    return navigateTo(useLocalePath()('/'));
  }
});
