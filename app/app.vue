<script setup lang="ts">
import { computed, watch } from 'vue';
import { authClient } from './lib/auth-client';


const { session, fetchSession } = useSession();
const appConfig = useAppConfig() as any;


// 1. Theme and Typography Persistence Sync
// Watch the session and apply user-specific colors and fonts from DB
watch(() => session.value?.user, (user: any) => {
  if (user) {
    if (user.themePrimary) {
      appConfig.ui.colors.primary = user.themePrimary;
    }
    if (user.themeNeutral) {
      appConfig.ui.colors.neutral = user.themeNeutral === 'neutral' ? 'slate' : user.themeNeutral;
    }
    
    // Apply Typography if on client
    if (import.meta.client) {
      const family = user.fontFamily || 'font-sans';
      const size = user.fontSize || 'text-base';
      
      document.documentElement.className = document.documentElement.className
        .replace(/font-\w+|text-(sm|base|lg|xl)/g, '')
        .trim();
        
      document.documentElement.classList.add(family, size);
    }
  }
}, { immediate: true });


// 2. Impersonation handling
const isImpersonating = computed(() => {
  if (!session.value?.session) return false;
  // Better Auth stores impersonator ID in various fields depending on plugin version
  return !!(session.value.session.impersonatedBy || session.value.session.impersonatorUserId);
});
const nuxtApp = useNuxtApp();

const stopImpersonating = async () => {
  try {
    await authClient.admin.stopImpersonating();
    console.log('[ADMIN] Stopping impersonation, returning to original session...');
    
    // We DON'T call clearSession() here to avoid triggering reactive loops 
    // before the window reload. We just trigger the hard reload.
    
    setTimeout(() => {
      window.location.href = '/dashboard/users';
    }, 1000); 
  } catch (e) {
    console.error('[ADMIN] Stop impersonation failed:', e);
    window.location.reload();
  }
};
</script>

<template>
  <UApp :class="{ 'impersonation-active': isImpersonating }">
    <AppSearch />
    
    <!-- Impersonation Overlay -->
    <ClientOnly>
      <Transition
        enter-active-class="transition duration-300 ease-out"
        enter-from-class="transform translate-y-4 opacity-0"
        enter-to-class="transform translate-y-0 opacity-100"
        leave-active-class="transition duration-200 ease-in"
        leave-from-class="transform translate-y-0 opacity-100"
        leave-to-class="transform translate-y-4 opacity-0"
      >
        <div v-if="isImpersonating" class="fixed bottom-6 right-6 z-[999]">
          <div class="bg-primary/90 hover:bg-primary backdrop-blur-md text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-white/20 ring-4 ring-primary/10 transition-all group animate-pulse hover:animate-none">
            <div class="flex flex-col">
              <span class="text-[10px] uppercase font-black tracking-widest opacity-70">Mode Imitation</span>
              <span class="text-xs font-bold leading-none">Vous agissez en tant que {{ session?.user?.name }}</span>
            </div>
            <UButton 
              size="xs" 
              color="neutral" 
              variant="solid" 
              icon="i-lucide-user-minus"
              class="rounded-xl bg-white text-primary hover:bg-white/90 border-none"
              @click="stopImpersonating"
            >
              Quitter
            </UButton>
          </div>
        </div>
      </Transition>
    </ClientOnly>

    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>

<style>
/* Global aesthetics for the impersonation state */
.impersonation-active {
  box-shadow: inset 0 0 0 4px rgb(var(--color-primary-500) / 0.3);
}
</style>
