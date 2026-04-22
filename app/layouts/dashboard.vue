<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const route = useRoute()
const notify = useNotify()
const localePath = useLocalePath()
const { session, hasPermission } = useSession()
const { t } = useI18n()
const nuxtApp = useNuxtApp()

const { isNotificationsSlideoverOpen } = useDashboard()
const isSidebarCollapsed = ref(false)

const breadcrumbs = computed(() => {
  const pathPrefix = localePath('/dashboard')
  if (!route.path.startsWith('/dashboard')) return []
  
  const pathStr = route.path.replace(/^\/+/, '')
  const parts = pathStr.split('/')
  
  return parts.map((part, index) => {
    const isLast = index === parts.length - 1
    const p = '/' + parts.slice(0, index + 1).join('/')
    let label = part.charAt(0).toUpperCase() + part.slice(1)
    
    // Custom label mappings
    if (part === 'dashboard') label = 'Accueil'
    if (part === 'com') label = 'Centre de Com'
    if (part === 'monitoring') label = 'Monitoring'
    
    return {
      label,
      to: isLast ? undefined : localePath(p), // Disable navigation directly if it's the current page
    }
  })
})

const links = computed<NavigationMenuItem[][]>(() => {
  const principal: NavigationMenuItem[] = [
    {
      label: t('nav.home') || 'Accueil',
      icon: 'i-lucide-house',
      to: localePath('/dashboard')
    }
  ]

  const communication: NavigationMenuItem[] = []
  if (hasPermission(['manage_mail', 'manage_newsletter'])) {
    communication.push({
      label: 'KPI',
      icon: 'i-lucide-activity',
      to: localePath('/dashboard/com/monitoring'),
    })
  }
  if (hasPermission('manage_mail')) {
    communication.push({
      label: 'Webmailer',
      icon: 'i-lucide-inbox',
      to: localePath('/dashboard/com/webmailer'),
      badge: '4'
    })
  }
  if (hasPermission('manage_newsletter')) {
    communication.push({
       label: 'Newsletter',
       icon: 'i-lucide-megaphone',
       to: localePath('/dashboard/com/newsletter')
    })
  }
  if (hasPermission(['manage_mail', 'manage_newsletter'])) {
    communication.push({
       label: 'Communication',
       icon: 'i-lucide-layout-template',
       to: localePath('/dashboard/com/layout')
    })
  }

  const administration: NavigationMenuItem[] = []
  if (hasPermission(['manage_roles', 'manage_users'])) {
    administration.push({
      label: t('nav.user_management') || 'Utilisateurs',
      icon: 'i-lucide-shield-check',
      to: localePath('/dashboard/users')
    })
  }

  const footerLinks: NavigationMenuItem[] = [
    {
      label: t('nav.help_support') || 'Aide & Support',
      icon: 'i-lucide-info',
      to: localePath('/faq')
    }
  ]


  return [principal, communication, administration, footerLinks]
})

const groups = computed(() => [{
  id: 'links',
  label: 'Go to',
  items: (links.value.flat() as any[])
    .filter(link => link && link.label)
    .map(link => ({
      ...link,
      id: link.label,
      chip: typeof link.chip === 'boolean' ? undefined : link.chip
    }))
}])

onMounted(async () => {
  const cookie = useCookie('cookie-consent')
  if (cookie.value === 'accepted') {
    return
  }

  notify.info(
    t('cookie.consent_title') || 'Nous utilisons des cookies pour améliorer votre expérience.',
    undefined,
    0,
    {
      close: false,
      actions: [{
        label: t('common.accept') || 'Accepter',
        color: 'neutral',
        variant: 'outline',
        onClick: () => {
          cookie.value = 'accepted'
        }
      }, {
        label: t('common.refuse') || 'Refuser',
        color: 'neutral',
        variant: 'ghost'
      }]
    }
  )
})

const dashboardTheme = {
  card: {
    root: 'bg-elevated/40 backdrop-blur-md border border-default shadow-sm sm:rounded-xl'
  },
  pageCard: {
    root: 'bg-elevated/40 backdrop-blur-md border border-default shadow-sm sm:rounded-xl'
  }
}
</script>

<template>
  <UTheme :ui="dashboardTheme">
    <UDashboardGroup unit="rem" class="flex-nowrap overflow-hidden">
    <!-- SIDEBAR -->
    <UDashboardSidebar
      id="default"
      v-model:collapsed="isSidebarCollapsed"
      collapsible
      resizable
      class="bg-elevated/25 border-r border-default relative"
      :ui="{ footer: 'lg:border-t lg:border-default pt-2' }"
    >
      <template #header="{ collapsed }">
        <NuxtLink :to="localePath('/dashboard')" class="flex items-center gap-2 px-3 py-2 shrink-0">
          <UIcon name="i-lucide:rocket" class="size-6 text-primary" />
          <span v-if="!collapsed" class="font-black text-xl tracking-tighter select-none italic uppercase">Techknè</span>
        </NuxtLink>
        <DashboardTeamsMenu :collapsed="collapsed" />
      </template>

      <!-- Sidebar Toggle Handle (Desktop only) -->
      <template #default="{ collapsed }">
        <div 
          class="hidden lg:flex absolute -right-3 top-1/2 -translate-y-1/2 z-50 items-center justify-center pointer-events-auto"
        >
          <UButton
            :icon="collapsed ? 'i-lucide-chevron-right' : 'i-lucide-chevron-left'"
            size="xs"
            color="neutral"
            variant="solid"
            class="rounded-full shadow-lg border border-default bg-background hover:bg-muted"
            @click="isSidebarCollapsed = !isSidebarCollapsed"
          />
        </div>

        <UDashboardSearchButton :collapsed="collapsed" class="bg-transparent ring-default mb-4" />
        
          <!-- MAIN NAVIGATION -->
          <div class="space-y-6">
            <div>
              <div v-if="!collapsed" class="px-3 mb-2 text-[10px] font-bold text-dimmed uppercase tracking-widest">Principal</div>
              <UNavigationMenu
                :collapsed="collapsed"
                :items="links[0]"
                orientation="vertical"
                tooltip
                popover
              />
            </div>

            <div v-if="hasPermission(['manage_mail', 'manage_newsletter', 'manage_membre'])">
              <div v-if="!collapsed" class="px-3 mb-2 text-[10px] font-bold text-dimmed uppercase tracking-widest">Centre de Com</div>
              <UNavigationMenu
                :collapsed="collapsed"
                :items="links[1]"
                orientation="vertical"
                tooltip
              />
            </div>

            <div v-if="hasPermission(['manage_roles', 'manage_users'])">
              <div v-if="!collapsed" class="px-3 mb-2 text-[10px] font-bold text-dimmed uppercase tracking-widest">Administration</div>
              <UNavigationMenu
                :collapsed="collapsed"
                :items="links[2]"
                orientation="vertical"
                tooltip
              />
            </div>
          </div>

          <UNavigationMenu
            :collapsed="collapsed"
            :items="links[3]"
            orientation="vertical"
            tooltip
            class="mt-auto"
          />
      </template>

      <template #footer="{ collapsed }">
        <div class="flex flex-col w-full gap-2 px-2 py-1">
          <!-- Translation & Theme (Unified) -->
          <div class="flex items-center justify-between w-full gap-1 border-b border-default/50 pb-2 mb-1">
            <ClientOnly>
              <UButton
                size="xs"
                variant="ghost"
                color="neutral"
                class="hover:bg-primary/5 transition-colors font-bold"
                @click="$i18n.setLocale($i18n.locale === 'fr' ? 'en' : 'fr')"
              >
                <template #leading>
                  <span class="text-base">{{ $i18n.locale === 'fr' ? '🇫🇷' : '🇺🇸' }}</span>
                </template>
                <span v-if="!collapsed">{{ $i18n.locale.toUpperCase() }}</span>
              </UButton>

              <UButton
                :icon="$colorMode.value === 'dark' ? 'i-lucide:moon' : 'i-lucide:sun'"
                size="xs"
                variant="ghost"
                color="neutral"
                class="hover:bg-primary/5"
                @click="$colorMode.preference = $colorMode.value === 'dark' ? 'light' : 'dark'"
              />
            </ClientOnly>
          </div>
          
          <DashboardUserMenu :collapsed="collapsed" />
        </div>
      </template>
    </UDashboardSidebar>

    <UDashboardPanel grow class="min-w-0 flex flex-col min-h-0 overflow-hidden">
      <UDashboardNavbar :title="(route.meta.title as string) || 'Dashboard'" class="border-b border-default shrink-0">
        <template #leading>
          <UDashboardSidebarCollapse class="lg:hidden" />
          <UBreadcrumb :links="breadcrumbs" class="ml-2" />
        </template>

        <template #right>
          <UButton
            color="neutral"
            variant="ghost"
            square
            @click="isNotificationsSlideoverOpen = true"
          >
            <UChip color="error" inset>
              <UIcon name="i-lucide:bell" class="size-5" />
            </UChip>
          </UButton>
        </template>
      </UDashboardNavbar>

      <div class="flex-1 overflow-y-auto p-0 min-h-0 flex flex-col">
        <slot />
      </div>
    </UDashboardPanel>

    <UDashboardSearch :groups="groups" />
    <DashboardNotificationsSlideover />
    <DashboardComComposerShell />
  </UDashboardGroup>
  </UTheme>
</template>

<style scoped>
:deep([data-radix-scroll-area-viewport]) {
  overflow: visible !important;
}
.bg-elevated {
  background: rgba(var(--color-neutral-900), 0.05);
}
.dark .bg-elevated {
  background: rgba(255, 255, 255, 0.05);
}
</style>
