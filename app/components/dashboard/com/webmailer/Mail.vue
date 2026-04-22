<script setup lang="ts">
import { format } from 'date-fns'

const props = withDefaults(defineProps<{
  mail: any
  hideReplyCard?: boolean
}>(), {
  hideReplyCard: false
})

const emits = defineEmits(['close', 'toggle-attribute', 'action', 'reply', 'edit'])

const dropdownItems = computed(() => [[{
  label: props.mail.unread ? 'Marquer comme lu' : 'Marquer comme non lu',
  icon: props.mail.unread ? 'i-lucide:check-circle-2' : 'i-lucide:check-circle',
  onSelect: () => emits('toggle-attribute', 'unread')
}, {
  label: props.mail.important ? 'Retirer des importants' : 'Marquer comme important',
  icon: 'i-lucide:triangle-alert',
  onSelect: () => emits('toggle-attribute', 'important')
}], [{
  label: props.mail.isSpam ? 'Ce n\'est pas du spam' : 'Signaler comme spam',
  icon: props.mail.isSpam ? 'i-lucide:shield-check' : 'i-lucide:shield-ban',
  onSelect: () => emits('action', props.mail.isSpam ? 'unspam' : 'spam')
}, {
  label: props.mail.starred ? 'Retirer des favoris' : 'Ajouter aux favoris',
  icon: 'i-lucide:star',
  onSelect: () => emits('toggle-attribute', 'starred')
}, {
  label: props.mail.pinned ? 'Dépingler' : 'Épingler',
  icon: 'i-lucide:pin',
  onSelect: () => emits('toggle-attribute', 'pinned')
}], [{
    label: 'Supprimer le message',
    icon: 'i-lucide:trash-2',
    color: 'error' as const,
    onSelect: () => emits('action', 'trash')
}]])

const notify = useNotify()

const reply = ref('')
const loading = ref(false)

function onSubmit() {
  loading.value = true

  setTimeout(() => {
    reply.value = ''

    notify.success('Email sent', 'Your email has been sent successfully')

    loading.value = false
  }, 1000)
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return 'Date inconnue'
  return format(date, 'dd MMM HH:mm')
}
</script>

<template>
  <UDashboardPanel id="inbox-2">
    <!-- Unified Toolbar -->
    <div class="flex items-center justify-between p-2 px-4 border-b border-default bg-white dark:bg-neutral-900 shrink-0 sticky top-0 z-10 min-h-[48px]">
      <div class="flex items-center gap-1">
        <UButton
          icon="i-lucide:x"
          color="neutral"
          variant="ghost"
          size="sm"
          class="-ms-1"
          @click="emits('close')"
        />
        <div class="h-4 w-px bg-neutral-200 dark:bg-neutral-700 mx-1" />
        <h2 class="text-xs font-bold truncate max-w-[200px] sm:max-w-md hidden sm:block opacity-70">
          {{ mail.subject || 'Sans sujet' }}
        </h2>
      </div>

      <div class="flex items-center gap-1">
        <UTooltip :text="mail.pinned ? 'Dépingler' : 'Épingler'">
          <UButton
            icon="i-lucide:pin"
            :color="mail.pinned ? 'primary' : 'neutral'"
            variant="ghost"
            size="sm"
            @click="emits('toggle-attribute', 'pinned')"
          />
        </UTooltip>

        <UTooltip :text="mail.unread ? 'Marquer comme lu' : 'Marquer comme non lu'">
          <UButton
            :icon="mail.unread ? 'i-lucide:check-circle' : 'i-lucide:check-circle-2'"
            color="neutral"
            variant="ghost"
            size="sm"
            @click="emits('toggle-attribute', 'unread')" 
          />
        </UTooltip>

        <div class="h-4 w-px bg-neutral-200 dark:bg-neutral-700 mx-1" />

        <UTooltip text="Transférer">
          <UButton
            icon="i-lucide:arrow-right-from-line"
            color="neutral"
            variant="ghost"
            size="sm"
            @click="emits('reply', true)" 
          />
        </UTooltip>

        <UTooltip :text="mail.isSpam ? 'Pas du spam' : 'Signaler comme spam'">
          <UButton
            :icon="mail.isSpam ? 'i-lucide:shield-check' : 'i-lucide:shield-ban'"
            color="neutral"
            variant="ghost"
            size="sm"
            @click="emits('action', mail.isSpam ? 'unspam' : 'spam')"
          />
        </UTooltip>

        <UTooltip text="Archiver">
          <UButton
            icon="i-lucide:archive"
            color="neutral"
            variant="ghost"
            size="sm"
            @click="emits('action', 'archive')"
          />
        </UTooltip>

        <UTooltip text="Supprimer">
          <UButton
            icon="i-lucide:trash-2"
            color="error"
            variant="ghost"
            size="sm"
            @click="emits('action', 'trash')"
          />
        </UTooltip>

        <div class="h-4 w-px bg-neutral-200 dark:bg-neutral-700 mx-1" />

        <UTooltip v-if="mail.category === 'draft'" text="Éditer le brouillon">
          <UButton icon="i-lucide:edit-3" color="primary" variant="ghost" size="sm" @click="emits('edit')" />
        </UTooltip>
        <UTooltip v-else text="Répondre">
          <UButton icon="i-lucide:reply" color="primary" variant="ghost" size="sm" @click="emits('reply', false)" />
        </UTooltip>

        <UDropdownMenu :items="dropdownItems">
          <UButton
            icon="i-lucide:ellipsis-vertical"
            color="neutral"
            variant="ghost"
            size="sm"
          />
        </UDropdownMenu>
      </div>
    </div>

    <div class="flex flex-col sm:flex-row justify-between gap-1 p-4 sm:px-6 border-b border-default">
      <div class="flex items-start gap-4 sm:my-1.5">
        <UAvatar
          v-bind="mail.from?.avatar"
          :alt="mail.from?.name || mail.fromName"
          size="3xl"
        />

        <div class="min-w-0">
          <p class="font-semibold text-highlighted">
            {{ mail.from?.name || mail.fromName || 'Inconnu' }}
          </p>
          <p class="text-muted">
            {{ mail.from?.email || mail.fromEmail || 'Pas d\'email' }}
          </p>
        </div>
      </div>

      <p class="max-sm:pl-16 text-muted text-sm sm:mt-2 font-mono">
        {{ formatDate(mail.date) }}
      </p>
    </div>

    <div class="flex-1 p-4 sm:p-6 overflow-y-auto">
      <div class="whitespace-pre-wrap text-sm leading-relaxed mb-8">
        {{ mail.body }}
      </div>

      <!-- Attachments Section -->
      <div v-if="mail.attachments?.length" class="mt-8 pt-6 border-t border-default">
        <h3 class="text-xs font-bold uppercase text-dimmed tracking-wider mb-3 flex items-center gap-2">
          <UIcon name="i-lucide:paperclip" class="size-3.5" />
          Pièces jointes ({{ mail.attachments.length }})
        </h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div
            v-for="att in mail.attachments"
            :key="att.id"
            class="flex items-center gap-3 p-3 rounded-xl border border-default bg-neutral-50 dark:bg-neutral-800/50 hover:bg-white dark:hover:bg-neutral-800 transition-all group/att"
          >
            <div class="size-10 rounded-lg bg-white dark:bg-neutral-900 border border-default flex items-center justify-center shrink-0 shadow-sm">
              <UIcon :name="att.mimeType?.includes('image') ? 'i-lucide:image' : 'i-lucide:file-text'" class="size-5 text-primary" />
            </div>
            <div class="min-w-0 flex-1">
              <p class="text-xs font-bold truncate tracking-tight">{{ att.filename }}</p>
              <p class="text-[10px] text-dimmed">{{ (att.size / 1024).toFixed(1) }} KB</p>
            </div>
            <UButton
              icon="i-lucide:download"
              variant="ghost"
              color="neutral"
              size="sm"
              class="shrink-0 opacity-0 group-hover/att:opacity-100 transition-opacity"
              :to="att.url"
              target="_blank"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Reply section removed as requested - using modal instead -->
    <div class="p-6 pt-0 shrink-0 flex justify-center">
       <UButton 
         v-if="mail.category !== 'draft'"
         label="Répondre à ce message" 
         icon="i-lucide:reply" 
         color="primary" 
         variant="subtle" 
         class="rounded-full px-8 shadow-sm" 
         @click="emits('reply', false)" 
       />
       <UButton 
         v-else
         label="Éditer le brouillon" 
         icon="i-lucide:edit-3" 
         color="primary" 
         variant="solid" 
         class="rounded-full px-8 shadow-sm" 
         @click="emits('edit')" 
       />
    </div>
  </UDashboardPanel>
</template>
