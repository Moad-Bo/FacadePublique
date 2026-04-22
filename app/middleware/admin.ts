export default defineNuxtRouteMiddleware(async () => {
  if (process.server) return;

  const { session, fetchSession, isAdmin } = useSession();
  if (!session.value) {
    await fetchSession();
  }

  if (!isAdmin.value) {
    return navigateTo(useLocalePath()('/'));
  }
});
