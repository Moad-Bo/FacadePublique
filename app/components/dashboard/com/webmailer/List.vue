<script setup lang="ts">
import { format, isToday } from 'date-fns'
import type { Mail } from '../../../../types/dashboard'

const props = defineProps<{
  mails: any[]
}>()

const mailsRefs = ref<Record<string, Element | null>>({})

const selectedMail = defineModel<any | null>()
const selectedIds = defineModel<string[]>('selectedIds', { default: () => [] })

const emits = defineEmits<{
  (e: 'toggle-attribute', id: string, attribute: 'starred' | 'pinned' | 'important' | 'unread'): void
}>()

watch(selectedMail, () => {
  if (!selectedMail.value) {
    return
  }
  const ref = mailsRefs.value[selectedMail.value.id]
  if (ref) {
    ref.scrollIntoView({ block: 'nearest' })
  }
})

defineShortcuts({
  arrowdown: () => {
    const index = props.mails.findIndex((mail: any) => mail.id === selectedMail.value?.id)

    if (index === -1) {
      selectedMail.value = props.mails[0]
    } else if (index < props.mails.length - 1) {
      selectedMail.value = props.mails[index + 1]
    }
  },
  arrowup: () => {
    const index = props.mails.findIndex((mail: any) => mail.id === selectedMail.value?.id)

    if (index === -1) {
      selectedMail.value = props.mails[props.mails.length - 1]
    } else if (index > 0) {
      selectedMail.value = props.mails[index - 1]
    }
  }
})

function formatDate(dateStr: string) {
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return 'Date inconnue'
  return isToday(date) ? format(date, 'HH:mm') : format(date, 'dd MMM')
}

const toggleSelection = (id: string) => {
    const index = selectedIds.value.indexOf(id)
    if (index > -1) {
        selectedIds.value.splice(index, 1)
    } else {
        selectedIds.value.push(id)
    }
}

/** Retire toutes les balises HTML pour afficher un texte propre dans le snippet */
const stripHtml = (html: string): string => {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}
</script>

<template>
  <div class="overflow-y-auto divide-y divide-default">
    <div
      v-for="(mail, index) in mails"
      :key="mail.id"
      :ref="(el) => { mailsRefs[mail.id] = el as Element | null }"
    >
      <div
        class="p-4 sm:px-6 text-sm cursor-pointer border-l-2 transition-colors relative group/item"
        :class="[
          mail.unread ? 'text-highlighted' : 'text-toned',
          selectedMail && selectedMail.id === mail.id
            ? 'border-primary bg-primary/10'
            : 'border-bg hover:border-primary hover:bg-primary/5',
          selectedIds.includes(mail.id) ? 'bg-primary/5' : ''
        ]"
        @click="selectedMail = mail"
      >
        <div class="flex items-center gap-3 mb-1">
            <!-- CHECKBOX FOR MULTI-SELECT -->
            <UCheckbox 
                :model-value="selectedIds.includes(mail.id)" 
                @update:model-value="toggleSelection(mail.id)"
                @click.stop
                size="sm"
                class="transition-opacity"
                :class="[selectedIds.includes(mail.id) ? 'opacity-100' : 'opacity-0 group-hover/item:opacity-100']"
            />

            <div class="flex-1 flex items-center justify-between gap-2 overflow-hidden" :class="[mail.unread && 'font-semibold']">
              <div class="flex items-center gap-1.5 truncate">
                <span class="truncate">{{ mail.from?.name || mail.fromName || 'Inconnu' }}</span>
                <UTooltip v-if="mail.deletedUserRef" :text="`from user deleted = ${mail.deletedUserRef}`">
                  <UIcon name="i-lucide:alert-triangle" class="size-3.5 text-warning-500 cursor-help shrink-0" />
                </UTooltip>
              </div>
              <span class="shrink-0 text-[10px] text-dimmed font-mono">{{ formatDate(mail.date) }}</span>
            </div>
        </div>

        <div class="flex items-start gap-3">
            <!-- PLACEHOLDER FOR SYNC WITH CHECKBOX ALIGNMENT -->
            <div class="w-4 shrink-0" />

            <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between gap-2">
                    <p class="truncate text-xs font-bold" :class="[mail.unread && 'text-primary']">
                      {{ mail.subject }}
                    </p>

                    <div class="flex items-center gap-1.5 shrink-0">
                       <UIcon
                         v-if="mail.starred"
                         name="i-lucide:star"
                         class="size-3 text-yellow-500 fill-yellow-500/20"
                         @click.stop="emits('toggle-attribute', mail.id, 'starred')"
                       />
                       <UChip v-if="mail.unread" size="xs" @click.stop="emits('toggle-attribute', mail.id, 'unread')" />
                    </div>
                </div>

                <p class="text-dimmed line-clamp-1 text-[11px] mt-0.5">
                  {{ mail.isHtml ? stripHtml(mail.body) : mail.body }}
                </p>
            </div>
        </div>
      </div>
    </div>
  </div>
</template>
