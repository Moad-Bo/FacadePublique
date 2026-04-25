<script setup lang="ts">
const localePath = useLocalePath();
const { session, handleSignOut } = useSession();
const { t } = useI18n();
const route = useRoute();

const forumNavItems = computed(() => [
  {
    label: 'Discussions',
    icon: 'i-lucide-message-square',
    to: localePath('/forum')
  },
  {
    label: 'Catégories',
    icon: 'i-lucide-layout-grid',
    to: localePath('/forum#categories')
  },
  {
    label: 'Règles',
    icon: 'i-lucide-scroll',
    to: localePath('/forum/rules')
  },
  {
    label: 'Membres',
    icon: 'i-lucide-users',
    to: localePath('/forum/members')
  }
]);

const openSearch = () => {
  window.dispatchEvent(new CustomEvent('forum:search'));
};
</script>

<template>
  <UHeader
    sticky
    :ui="{
      root: 'z-[50] w-full bg-white/80 dark:bg-neutral-950/80 backdrop-blur-xl border-b border-neutral-200/50 dark:border-neutral-800/50',
      container: 'container mx-auto px-4 h-14',
      left: 'flex items-center gap-4',
      center: 'hidden md:flex flex-1 justify-center'
    }"
  >
    <template #left>
      <NuxtLink :to="localePath('/forum')" class="flex items-center gap-2 group">
        <div class="p-1.5 rounded-lg bg-primary-500/10 text-primary-500 group-hover:scale-110 transition-transform">
          <UIcon name="i-lucide-users-round" class="w-5 h-5" />
        </div>
        <div class="flex flex-col leading-none">
          <span class="font-black text-sm tracking-tighter uppercase">Community</span>
          <span class="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">Help Center</span>
        </div>
      </NuxtLink>
    </template>

    <UNavigationMenu :items="forumNavItems" variant="link" />

    <template #right>
      <div class="flex items-center gap-2">
        <UButton
          icon="i-lucide-search"
          color="neutral"
          variant="ghost"
          size="sm"
          @click="openSearch"
        />

        <UButton
          to="/community/new"
          label="Poser une question"
          icon="i-lucide-plus"
          size="sm"
          class="hidden sm:flex"
        />

        <div class="h-4 w-px bg-neutral-200 dark:bg-neutral-800 mx-1" />

        <ClientOnly>
          <template v-if="session">
            <UserProfileMenu size="sm" />
          </template>
          <template v-else>
            <UButton
              :to="localePath('/login')"
              label="Connexion"
              variant="ghost"
              color="neutral"
              size="sm"
              class="text-[10px] font-black uppercase tracking-widest"
            />
          </template>
          <template #fallback>
            <div class="h-6 w-6 rounded-full bg-neutral-100 dark:bg-neutral-800 animate-pulse" />
          </template>
        </ClientOnly>

      </div>
    </template>
  </UHeader>
</template>
