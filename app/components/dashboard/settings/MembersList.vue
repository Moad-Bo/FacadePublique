<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
// Using any to avoid type mismatch with the new newsletter-based member structure
// import type { Member } from '~/types/dashboard' 

defineProps<{
  members: any[]
}>()

const items = [{
  label: 'Edit member',
  onSelect: () => console.log('Edit member')
}, {
  label: 'Remove member',
  color: 'error' as const,
  onSelect: () => console.log('Remove member')
}] satisfies DropdownMenuItem[]
</script>

<template>
  <ul role="list" class="divide-y divide-default">
    <li
      v-for="(member, index) in members"
      :key="index"
      class="flex items-center justify-between gap-3 py-3 px-4 sm:px-6"
    >
      <div class="flex items-center gap-3 min-w-0">
        <UAvatar
          v-bind="member.avatar"
          size="md"
        />

        <div class="text-sm min-w-0">
          <p class="text-highlighted font-medium truncate">
            {{ member.name }}
          </p>
          <p class="text-muted truncate">
            {{ member.email }}
          </p>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <UBadge 
          :label="member.status" 
          size="xs" 
          variant="soft" 
          :color="member.status === 'subscribed' ? 'success' : 'neutral'"
          class="capitalize"
        />

        <UDropdownMenu :items="items" :content="{ align: 'end' }">
          <UButton
            icon="i-lucide-ellipsis-vertical"
            color="neutral"
            variant="ghost"
          />
        </UDropdownMenu>
      </div>
    </li>
  </ul>
</template>
