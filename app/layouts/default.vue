<script setup lang="ts">
import { computed } from 'vue';

const config = useRuntimeConfig();
const route = useRoute();

const hasSubnav = useState('has-subnav', () => false);

// Only show the docs sidebar on /[locale]/docs/* routes
const isDocPage = computed(() => {
  const segments = route.path.replace(/^\//, '').split('/').filter(Boolean);
  return segments[0] === 'docs' || segments[1] === 'docs';
});
</script>

<template>
  <div class="min-h-screen bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 font-sans selection:bg-primary-500/30">
    <!-- Fixed header — base 48px; sub-bar is rendered inside AppHeader -->
    <AppHeader />

    <!-- Spacer: matches header (h-12 base, h-20 with subnav) -->
    <div :class="hasSubnav ? 'h-20' : 'h-12'" class="transition-all duration-300" aria-hidden="true"></div>

    <div class="flex min-h-[calc(100vh-3rem)]">
      <!-- Docs sidebar — only on /docs/* routes -->
      <AppSidebar v-if="isDocPage" />

      <!-- Main content -->
      <main
        class="flex-1 w-full min-w-0 transition-all duration-300"
        :class="isDocPage ? 'lg:pl-64' : ''"
      >
        <div
          class="px-4 py-10 mx-auto md:px-8 xl:px-12"
          :class="isDocPage ? 'max-w-5xl' : 'max-w-7xl'"
        >
          <slot />
        </div>
      </main>
    </div>

    <!-- IA Assistant (optional module) -->
    <AssistantChat v-if="config.public.assistant?.enabled" />
  </div>
</template>

<style>
/* ── Global scrollbar ───────────────────────────────── */
html { scroll-behavior: smooth; scrollbar-width: thin; }
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 10px; }
.dark ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); }

/* ── Prose reset ─────────────────────────────────────── */
.prose { max-width: none; }
</style>
