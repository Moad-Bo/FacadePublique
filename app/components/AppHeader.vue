<script setup lang="ts">
import { ref, computed } from 'vue';

const localePath = useLocalePath();
const { session, handleSignOut } = useSession();
const { t, locale } = useI18n();
const route = useRoute();

// ── Hub Definitions ──────────────────────────────────────
const SOLUTIONS_LEFT = computed(() => [
  { label: 'BASIS', to: '/solutions/basis', section: 'basis' },
  { label: 'KHORA', to: '/solutions/khora', section: 'khora' },
  { label: 'KERYX', to: '/solutions/keryx', section: 'keryx' },
]);
const SOLUTIONS_RIGHT = computed(() => [
  { label: 'ARGOS', to: '/solutions/argos', section: 'argos' },
]);
const SERVICES_LINKS = computed(() => [
  { label: 'SYN', to: '/services/syn', section: 'syn' },
  { label: 'TALOS', to: '/services/talos', section: 'talos' },
]);
const SIMPLE_HUBS = computed(() => [
  { label: t('nav.docs'), to: '/docs/', section: 'ressources' },
  { label: t('nav.resources'), to: '/ressources', section: 'ressources_page' },
  { label: t('nav.blog'), to: '/blog', section: 'blog' },
]);

// ── Level-2 contextual sub-links per hub ─────────────────
const SUB_LINKS = computed(() => ({
  basis: [
    { label: t('nav.basis_doc'), to: '/docs/basis-core' },
    { label: t('nav.features'), to: '/solutions/basis' },
  ],
  khora: [
    { label: t('nav.khora_doc'), to: '/docs/khora-cloud' },
    { label: t('nav.features'), to: '/solutions/khora' },
  ],
  keryx: [
    { label: t('nav.keryx_doc'), to: '/docs/keryx-mail' },
    { label: t('nav.features'), to: '/solutions/keryx' },
  ],
  argos: [
    { label: t('nav.argos_doc'), to: '/docs/argos-ia' },
    { label: t('nav.models'), to: '/solutions/argos' },
  ],
  syn: [
    { label: t('nav.syn_doc'), to: '/docs/syn-expertise' },
    { label: t('nav.expertise'),  to: '/services/syn' },
  ],
  talos: [
    { label: t('nav.talos_doc'), to: '/docs/talos-infra' },
    { label: t('nav.infra'), to: '/services/talos' },
  ],
  ressources: [ // For /docs and /faq
    { label: t('nav.global_doc'), to: '/docs/bienvenue' },
    { label: t('nav.help_center'), to: '/faq' },
  ],
  ressources_page: [ // For /ressources
    { label: t('nav.partners'), to: '/ressources#partenaires' },
    { label: t('nav.socials'), to: '/ressources#reseaux-sociaux' },
    { label: t('nav.changelog'), to: '/ressources#changelog' },
  ],
  blog: [
    { label: t('nav.all_articles'), to: '/blog' },
    { label: t('nav.tech_news'),   to: '/blog#tech' },
  ]
}));

// ── Active hub detection ──────────────────────────────────
const currentHubSection = computed(() => {
  const path = route.path.replace(/^\/(fr|en)/, '');
  if (path.startsWith('/solutions/basis')) return 'basis';
  if (path.startsWith('/solutions/khora')) return 'khora';
  if (path.startsWith('/solutions/keryx')) return 'keryx';
  if (path.startsWith('/solutions/argos')) return 'argos';
  if (path.startsWith('/services/syn')) return 'syn';
  if (path.startsWith('/services/talos')) return 'talos';
  if (path.startsWith('/blog')) return 'blog';
  if (path.startsWith('/docs') || path.startsWith('/faq')) return 'ressources';
  if (path.startsWith('/ressources')) return 'ressources_page';
  return 'kosmos';
});

const currentSubLinks = computed(() => SUB_LINKS.value[currentHubSection.value] ?? []);

const hasSubnav = useState('has-subnav', () => false);
watchEffect(() => {
  hasSubnav.value = currentSubLinks.value.length > 0;
});

// ── Main Navigation Items for UNavigationMenu ────────────
const navItems = computed(() => [
  {
    label: t('nav.solutions'),
    slot: 'solutions',
    active: ['basis', 'khora', 'keryx', 'argos'].includes(currentHubSection.value)
  },
  {
    label: t('nav.services'),
    children: SERVICES_LINKS.value.map(l => ({ label: l.label, to: localePath(l.to) })),
    active: ['syn', 'talos'].includes(currentHubSection.value)
  },
  ...SIMPLE_HUBS.value.map(h => ({
    label: h.label,
    to: localePath(h.to),
    active: currentHubSection.value === h.section
  }))
]);

// ── Auth dropdown items ──────────────────────────────────
const userMenuItems = computed(() => {
  if (!session.value) return [];
  
  const items: any[][] = [
    [{ 
      label: session.value.user.name ?? t('nav.my_account'), 
      slot: 'account',
      disabled: true
    }]
  ];

  const mainLinks = [
    { 
      label: 'Dashboard', 
      icon: 'i-lucide-layout-dashboard', 
      to: localePath('/dashboard') 
    },
    { 
      label: t('nav.profile') || 'Mon Profil', 
      icon: 'i-lucide-user', 
      to: localePath('/dashboard/settings/profile') 
    }
  ];

  items.push(mainLinks);
  
  items.push([
    { 
      label: t('nav.logout') || 'Déconnexion', 
      icon: 'i-lucide-log-out', 
      onSelect: handleSignOut 
    }
  ]);

  return items;
});

const openSearch = () => {
  window.dispatchEvent(new CustomEvent('search:open'));
};

const openDocSidebar = () => {
  window.dispatchEvent(new CustomEvent('sidebar:open'));
};

const isDocPage = computed(() => {
  const segments = route.path.replace(/^\//, '').split('/').filter(Boolean);
  return segments[0] === 'docs' || segments[1] === 'docs';
});
</script>

<template>
  <UHeader
    :to="localePath('/')"
    title="KOSMOS"
    :ui="{
      root: 'fixed top-0 z-[60] w-full bg-white/95 dark:bg-neutral-950/95 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800 shadow-sm',
      container: 'container mx-auto px-4 md:px-6 h-12',
      left: 'flex items-center gap-2 font-black text-[15px] tracking-tighter uppercase shrink-0 hover:text-primary-500 transition-colors',
      center: 'hidden md:flex flex-1 justify-center'
    }"
  >
    <template #left>
      <UButton
        v-if="isDocPage"
        square
        variant="ghost"
        color="neutral"
        icon="i-lucide-panel-left"
        size="sm"
        class="lg:hidden shrink-0"
        @click="openDocSidebar"
      />
      <NuxtLink :to="localePath('/')" class="flex items-center gap-2">
        <UIcon name="i-lucide-orbit" class="w-5 h-5 text-primary-500" />
        <span class="hidden sm:inline">KOSMOS</span>
      </NuxtLink>
    </template>

    <!-- Desktop Navigation -->
    <UNavigationMenu :items="navItems" :variant="'pill'" :highlight="true">
      <template #solutions-content="{ close }: any">
        <div class="w-72 sm:w-80 flex flex-col p-2 bg-white dark:bg-neutral-900 rounded-lg shadow-xl ring-1 ring-neutral-200 dark:ring-neutral-800">
          <div class="flex flex-col sm:flex-row">
            <!-- Left Side -->
            <div class="flex-1 flex flex-col gap-1 pr-2">
              <ULink
                v-for="link in SOLUTIONS_LEFT"
                :key="link.label"
                :to="localePath(link.to)"
                class="px-3 py-2 text-sm font-semibold rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                @click="close"
              >
                {{ link.label }}
              </ULink>
            </div>
            <!-- Separator -->
            <div class="hidden sm:block w-px bg-neutral-200 dark:bg-neutral-800 my-1 mx-2" />
            <div class="sm:hidden h-px bg-neutral-200 dark:bg-neutral-800 mx-1 my-2" />
            <!-- Right Side -->
            <div class="flex-1 flex flex-col gap-1 pl-2">
              <div class="px-3 py-1 text-xs font-black uppercase text-neutral-400">IA</div>
              <ULink
                v-for="link in SOLUTIONS_RIGHT"
                :key="link.label"
                :to="localePath(link.to)"
                class="px-3 py-2 text-sm font-semibold rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                @click="close"
              >
                {{ link.label }}
              </ULink>
            </div>
          </div>
          <!-- Footer Menu -->
          <div class="mt-2 pt-2 border-t border-neutral-200 dark:border-neutral-800 text-center">
            <span class="text-[10px] font-black tracking-[0.2em] text-primary-500/80">TALOS POWERED</span>
          </div>
        </div>
      </template>
    </UNavigationMenu>

    <template #right>
      <div class="flex items-center gap-1 shrink-0">
        <LanguageSwitcher />
        <ColorModeSwitcher />

        <UButton
          square
          variant="ghost"
          color="neutral"
          icon="i-lucide-search"
          size="sm"
          @click="openSearch"
        />

        <div class="h-5 w-px bg-neutral-200 dark:bg-neutral-800 mx-1" />

        <!-- Auth — ClientOnly évite le mismatch SSR/client (session absente côté serveur) -->
        <ClientOnly>
          <template v-if="session">
            <UserProfileMenu />
          </template>
          <template v-else>
            <UButton
              :to="localePath('/login')"
              :label="t('nav.login') || 'Sign In'"
              variant="ghost"
              color="neutral"
              size="sm"
              icon="i-lucide-user"
              class="font-bold text-[10px] uppercase tracking-widest hover:text-primary-500"
            />
          </template>
          <template #fallback>
            <!-- Placeholder pendant le chargement côté client -->
            <div class="h-6 w-6 rounded-full bg-neutral-100 dark:bg-neutral-800 animate-pulse" />
          </template>
        </ClientOnly>

      </div>
    </template>

    <!-- Contextual Tier 2 Navigation -->
    <template #bottom>
      <Transition
        enter-active-class="transition-all duration-200 ease-out"
        enter-from-class="opacity-0 -translate-y-1"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition-all duration-150 ease-in"
        leave-from-class="opacity-100 translate-y-0"
        leave-to-class="opacity-0 -translate-y-1"
      >
        <div
          v-if="currentSubLinks.length"
          class="h-8 border-t border-neutral-100 dark:border-neutral-900 bg-neutral-50/80 dark:bg-neutral-950/80"
        >
          <div class="container mx-auto px-4 md:px-6 h-full flex items-center gap-6 overflow-x-auto no-scrollbar">
            <ULink
              v-for="link in currentSubLinks"
              :key="link.label"
              :to="localePath(link.to)"
              class="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 hover:text-primary-500 dark:hover:text-primary-400 whitespace-nowrap transition-colors"
              active-class="text-primary-600 dark:text-primary-400"
            >
              {{ link.label }}
            </ULink>
          </div>
        </div>
      </Transition>
    </template>

    <!-- Mobile Menu Content -->
    <template #content="{ close }: any">
      <div class="flex flex-col h-full bg-white dark:bg-neutral-950">
        <div class="flex items-center justify-between p-4 border-b border-neutral-100 dark:border-neutral-900 overflow-hidden">
          <span class="text-[10px] font-black tracking-widest uppercase text-dimmed">Menu Navigation</span>
          <UButton
            icon="i-lucide-x"
            variant="ghost"
            color="neutral"
            size="sm"
            @click="close"
          />
        </div>
        <div class="flex flex-col gap-4 p-4 overflow-y-auto">
          <UNavigationMenu
            orientation="vertical"
            :items="navItems"
            @click="close"
          >
          </UNavigationMenu>
        </div>
      </div>
    </template>
  </UHeader>
</template>

<style scoped>
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
</style>
