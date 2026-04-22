<script setup lang="ts">
/**
 * Shared Settings Layout (Public Profile)
 * Consolidated to single URL /settings with tabbed navigation.
 * Uses a persistent origin tracker to ensure 'Close' button exits settings completely.
 */
const route = useRoute();
const router = useRouter();

// Track where the user came from before entering settings
const settingsOrigin = useState('settingsOrigin', () => '/');

onMounted(() => {
  const backPath = useRouter().options.history.state?.back;
  // Ensure we only store valid string paths and avoid infinite settings loops
  if (typeof backPath === 'string' && !backPath.includes('/settings')) {
    settingsOrigin.value = backPath;
  }
});


const navigation = [
  { label: 'Identité', icon: 'i-lucide-user', tab: 'identity' },
  { label: 'Apparence', icon: 'i-lucide-palette', tab: 'appearance' },
  { label: 'Notifications', icon: 'i-lucide-bell', tab: 'notifications' },
  { label: 'Sécurité', icon: 'i-lucide-shield-check', tab: 'security' }
];

const activeTab = computed(() => (route.query.tab as string) || 'identity');

const handleTabChange = (tab: string) => {
  // Use replace to avoid polluting history with sub-settings tabs
  router.replace({ path: '/settings', query: { tab } });
};

const handleClose = () => {
    // Jump directly to the origin page
    router.push(settingsOrigin.value);
};
</script>


<template>
  <UContainer class="py-12 relative">
    <!-- Close Button (Top Right) -->
    <div class="absolute right-4 top-4 z-10">
        <UButton 
            icon="i-lucide-x" 
            color="neutral" 
            variant="ghost" 
            size="lg" 
            class="rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            @click="handleClose"
        />
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-4 gap-12">
      <!-- Sidebar Navigation (Stable) -->
      <SettingsSidebar 
        class="lg:col-span-1"
        :active-tab="activeTab" 
        base-path="/settings"
        @tab-change="handleTabChange"
      />

      <!-- Main Content Area -->
      <main class="lg:col-span-3">
        <slot :active-tab="activeTab" />
      </main>
    </div>

  </UContainer>
</template>

