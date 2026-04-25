<script setup lang="ts">
/**
 * Shared Settings Navigation Sidebar
 * Support for both public and dashboard settings via props.
 */
const props = defineProps<{
  activeTab: string;
  basePath: string;
}>();

const emit = defineEmits(['tab-change']);

const navigation = [
  { label: 'Mon Profil', icon: 'i-lucide-user', tab: 'identity' },
  { label: 'Personnalisation', icon: 'i-lucide-palette', tab: 'appearance' },
  { label: 'Communauté', icon: 'i-lucide-users', tab: 'community' },
  { label: 'Communication', icon: 'i-lucide-bell', tab: 'notifications' },
  { label: 'Sécurité', icon: 'i-lucide-shield-check', tab: 'security' }
];

const handleTabClick = (tab: string) => {
  emit('tab-change', tab);
};
</script>

<template>
  <aside class="space-y-6">
    <div class="flex flex-col gap-1">
      <h1 class="text-2xl font-black tracking-tighter uppercase">Paramètres</h1>
      <p class="text-sm text-neutral-500 font-medium">Gérez votre compte et vos préférences.</p>
    </div>
    
    <nav class="flex flex-col gap-1">
        <template v-for="item in navigation" :key="item.tab">
            <UButton
                :label="item.label"
                :icon="item.icon"
                :variant="activeTab === item.tab ? 'soft' : 'ghost'"
                :color="activeTab === item.tab ? 'primary' : 'neutral'"
                class="w-full justify-start rounded-xl font-medium transition-all duration-200"
                :class="activeTab === item.tab ? 'font-bold' : ''"
                @click="handleTabClick(item.tab)"
            />
        </template>
    </nav>
  </aside>
</template>
