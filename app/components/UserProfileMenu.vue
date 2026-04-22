<script setup lang="ts">
/**
 * Unified User Profile Menu
 * Provides access to Dashboard (Staff only), Profile, Settings, and Themes.
 */
import type { DropdownMenuItem } from '@nuxt/ui'

const props = defineProps<{
  size?: 'xs' | 'sm' | 'md'
}>()

const { session, handleSignOut, fetchSession } = useSession()
const localePath = useLocalePath()
const appConfig = useAppConfig() as any
const { t } = useI18n()

// Theme options borrowed from dashboard logic
const colors = ['red', 'orange', 'amber', 'yellow', 'lime', 'green', 'emerald', 'teal', 'cyan', 'sky', 'blue', 'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose']
const neutrals = ['slate', 'gray', 'zinc', 'neutral', 'stone']

const user = computed(() => ({
  name: session.value?.user?.name || 'Utilisateur',
  email: session.value?.user?.email || '',
  avatar: {
    src: session.value?.user?.image || undefined,
    alt: session.value?.user?.name || 'Utilisateur'
  }
}))

const items = computed<DropdownMenuItem[][]>(() => {
  if (!session.value) return []

  const userRole = session.value.user?.role
  const isStaff = userRole === 'admin' || userRole === 'moderator'

  const menuItems: DropdownMenuItem[][] = []

  // 1. Account Label
  menuItems.push([{
    type: 'label',
    label: user.value.name,
    avatar: user.value.avatar
  }])

  // 2. Main Navigation Links
  const mainLinks: any[] = []
  
  // RBAC: Show Dashboard only for Staff
  if (isStaff) {
    mainLinks.push({
      label: 'Dashboard',
      icon: 'i-lucide-layout-dashboard',
      to: localePath('/dashboard')
    })
  }

  mainLinks.push({
    label: t('nav.settings') || 'Paramètres',
    icon: 'i-lucide-settings',
    to: localePath('/settings')
  })

  menuItems.push(mainLinks)



  // 4. Logout
  menuItems.push([{
    label: t('nav.logout') || 'Déconnexion',
    icon: 'i-lucide-log-out',
    onSelect: handleSignOut
  }])

  return menuItems
})
</script>

<template>
  <div class="user-profile-menu">
    <UDropdownMenu
      v-if="session"
      :items="items"
      :content="{ align: 'end', side: 'bottom', collisionPadding: 16 }"
      class="z-[100]"
    >
      <UAvatar
        :src="user.avatar.src"
        :alt="user.avatar.alt"
        :size="size || 'xs'"
        class="cursor-pointer ring-2 ring-offset-1 ring-transparent hover:ring-primary-500 dark:ring-offset-neutral-950 transition-all select-none"
      />

      <!-- Custom slots for theme chips -->
      <template #chip-leading="{ item }">
        <div class="inline-flex items-center justify-center shrink-0 size-5">
           <span
             class="rounded-full ring ring-bg bg-(--chip-light) dark:bg-(--chip-dark) size-2"
             :style="{
               '--chip-light': `var(--color-${(item as any).chip}-500)`,
               '--chip-dark': `var(--color-${(item as any).chip}-400)`
             }"
           />
        </div>
      </template>

      <template #label-leading="{ item }">
         <UAvatar v-if="(item as any).avatar" v-bind="(item as any).avatar" size="sm" />
      </template>
    </UDropdownMenu>
    
    <div v-else class="h-6 w-6 rounded-full bg-neutral-200 dark:bg-neutral-800 animate-pulse" />
  </div>
</template>
