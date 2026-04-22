<script setup lang="ts">
/**
 * Dashboard User Menu
 * Refactored to expand upwards inside the sidebar instead of a floating dropdown.
 */
defineProps<{
  collapsed?: boolean
}>();

const localePath = useLocalePath();
const { session, handleSignOut } = useSession();

const isOpen = ref(false);

const user = computed(() => ({
  name: session.value?.user?.name || 'Utilisateur',
  email: session.value?.user?.email || '',
  avatar: {
    src: session.value?.user?.image || undefined,
    alt: session.value?.user?.name || 'Utilisateur'
  }
}));

const toggleMenu = () => {
    isOpen.value = !isOpen.value;
};
</script>

<template>
  <div class="flex flex-col w-full">
    <!-- Inline Expansion Area (Upwards) -->
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="transform scale-95 opacity-0 -translate-y-2"
      enter-to-class="transform scale-100 opacity-100 translate-y-0"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="transform scale-100 opacity-100 translate-y-0"
      leave-to-class="transform scale-95 opacity-0 -translate-y-2"
    >
        <div v-if="isOpen" class="mb-2 space-y-1 px-1">
            <UButton
                :label="collapsed ? undefined : 'Settings'"
                icon="i-lucide-settings"
                color="neutral"
                variant="ghost"
                block
                :square="collapsed"
                class="justify-start rounded-xl font-medium"
                :to="localePath('/dashboard/settings')"
            />
            <UButton
                :label="collapsed ? undefined : 'Log out'"
                icon="i-lucide-log-out"
                color="neutral"
                variant="ghost"
                block
                :square="collapsed"
                class="justify-start rounded-xl font-medium text-error-500 hover:text-error-600"
                @click="handleSignOut"
            />
        </div>
    </Transition>

    <!-- Main Profile Toggle Button -->
    <UButton
      v-bind="{
        ...user,
        label: collapsed ? undefined : user?.name,
        trailingIcon: collapsed ? undefined : (isOpen ? 'i-lucide-chevron-down' : 'i-lucide-chevron-up')
      }"
      color="neutral"
      variant="ghost"
      block
      :square="collapsed"
      class="transition-colors rounded-xl overflow-hidden"
      :class="isOpen ? 'bg-neutral-100 dark:bg-neutral-800' : ''"
      :ui="{
        label: 'truncate font-bold',
        trailingIcon: 'text-neutral-400 shrink-0'
      }"
      @click="toggleMenu"
    />
  </div>
</template>

