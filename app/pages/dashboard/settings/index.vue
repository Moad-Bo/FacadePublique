<script setup lang="ts">
/**
 * Unified Dashboard Settings
 * Refactored to a full-page modal aesthetic.
 */
definePageMeta({
  layout: false // Custom full-screen experience
});

const route = useRoute();
const router = useRouter();
const localePath = useLocalePath();
const activeTab = computed(() => (route.query.tab as string) || 'identity');

const handleTabChange = (tab: string) => {
  router.replace({ path: localePath('/dashboard/settings'), query: { tab } });
};

const closeSettings = () => {
    // Navigate back or to dashboard
    if (window.history.length > 1) {
        router.back();
    } else {
        navigateTo(localePath('/dashboard'));
    }
};

const tabTitles: Record<string, string> = {
  identity: 'Identité',
  appearance: 'Apparence & Thème',
  community: 'Espace Communautaire',
  notifications: 'Gestion des Notifications',
  security: 'Sécurité du Compte'
};
</script>

<template>
  <div class="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 md:p-10 overflow-hidden">
    <!-- BACKDROP -->
    <div class="absolute inset-0 bg-neutral-950/40 backdrop-blur-sm transition-opacity" @click="closeSettings"></div>
    
    <!-- MODAL CARD -->
    <div class="relative w-full max-w-6xl h-full max-h-[900px] bg-white dark:bg-neutral-900 rounded-[2.5rem] shadow-2xl border border-default flex flex-col overflow-hidden animate-in fade-in zoom-in duration-300">
        
        <!-- HEADER / CLOSE -->
        <div class="absolute top-6 right-6 z-10">
            <UButton 
                icon="i-lucide:x" 
                color="neutral" 
                variant="subtle" 
                size="xl" 
                class="rounded-full hover:scale-110 active:scale-95 transition-all shadow-lg border border-default bg-white dark:bg-neutral-800"
                @click="closeSettings" 
            />
        </div>

        <div class="flex-1 flex flex-col lg:flex-row overflow-hidden">
            <!-- Sidebar Area -->
            <div class="w-full lg:w-80 bg-neutral-50 dark:bg-neutral-800/20 border-r border-default p-8 lg:p-10 shrink-0 overflow-y-auto">
                <SettingsSidebar 
                    :active-tab="activeTab" 
                    base-path="/dashboard/settings"
                    @tab-change="handleTabChange"
                />
            </div>

            <!-- Content Area -->
            <div class="flex-1 overflow-y-auto p-8 lg:p-12 scroll-smooth">
                <div class="max-w-3xl mx-auto">
                    <header class="mb-10 lg:hidden">
                         <h2 class="text-3xl font-black tracking-tighter uppercase text-primary">{{ tabTitles[activeTab] }}</h2>
                    </header>

                    <div class="transition-all duration-300 animate-in fade-in slide-in-from-bottom-4">
                        <LazySettingsIdentitySettings v-if="activeTab === 'identity'" />
                        <LazySettingsAppearanceSettings v-else-if="activeTab === 'appearance'" />
                        <LazySettingsCommunitySettings v-else-if="activeTab === 'community'" />
                        <LazySettingsNotificationSettings v-else-if="activeTab === 'notifications'" />
                        <LazySettingsSecuritySettings v-else-if="activeTab === 'security'" />
                    </div>
                </div>
            </div>
        </div>
    </div>
  </div>
</template>

<style scoped>
.animate-in {
    animation-fill-mode: forwards;
}
</style>

