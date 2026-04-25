<script setup lang="ts">
/**
 * Unified Settings Page
 * Manages Identity, Appearance, Notifications, and Security via tabs.
 */
definePageMeta({
  layout: 'settings'
});

const route = useRoute();
const activeTab = computed(() => (route.query.tab as string) || 'identity');
</script>

<template>
  <div class="transition-all duration-300">
    <LazySettingsIdentitySettings v-if="activeTab === 'identity'" />
    <LazySettingsAppearanceSettings v-else-if="activeTab === 'appearance'" />
    <LazySettingsCommunitySettings v-else-if="activeTab === 'community'" />
    <LazySettingsCommunicationPreferences v-else-if="activeTab === 'notifications'" />
    <LazySettingsSecuritySettings v-else-if="activeTab === 'security'" />
  </div>

</template>

