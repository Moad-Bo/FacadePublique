<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  ids: string[]
  senders: string[]
}>()

const emit = defineEmits(['confirm', 'cancel'])

const blacklistEnabled = ref(true)
const isProcessing = ref(false)
const isSuccess = ref(false)

const handleConfirm = async () => {
  isProcessing.value = true
  emit('confirm', { blacklist: blacklistEnabled.value })
  // We don't close immediately, we show the success message first
  isSuccess.value = true
  
  // Auto-dismiss after 5 seconds
  setTimeout(() => {
    emit('cancel')
  }, 5000)
}
</script>

<template>
  <div class="fixed bottom-6 right-6 z-[100] w-80 pointer-events-auto">
    <Transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="translate-y-10 opacity-0 scale-95"
      enter-to-class="translate-y-0 opacity-100 scale-100"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95"
    >
      <div v-if="!isSuccess" class="bg-white dark:bg-neutral-900 rounded-2xl border-2 border-primary shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4">
        <div class="p-4 bg-primary/5 border-b border-primary/10 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide:shield-ban" class="size-5 text-primary" />
            <span class="font-black text-xs uppercase tracking-wider text-primary">Marquer comme Spam</span>
          </div>
          <UButton icon="i-lucide:x" variant="ghost" color="neutral" size="xs" @click="emit('cancel')" />
        </div>

        <div class="p-4 space-y-4">
          <div class="space-y-1">
            <p class="text-[10px] text-dimmed font-black uppercase tracking-tight">Expéditeurs concernés</p>
            <div class="max-h-20 overflow-y-auto scrollbar-thin space-y-1 mt-1">
              <div v-for="email in senders" :key="email" class="text-[11px] font-bold truncate bg-neutral-100 dark:bg-neutral-800 p-1 px-2 rounded-md">
                {{ email }}
              </div>
            </div>
          </div>

          <div class="flex items-start gap-3 p-3 rounded-xl bg-orange-500/5 border border-orange-500/20">
            <UCheckbox v-model="blacklistEnabled" color="primary" class="mt-0.5" />
            <div class="flex-1">
              <p class="text-[11px] font-bold text-default leading-tight">Ajouter à la liste noire (indésirable)</p>
              <p class="text-[9px] text-dimmed mt-0.5">Les futurs e-mails de ces adresses iront directement en spam.</p>
            </div>
          </div>

          <div class="flex items-center gap-2 pt-2">
            <UButton label="Annuler" variant="ghost" color="neutral" block @click="emit('cancel')" />
            <UButton :loading="isProcessing" label="Confirmer" color="primary" block @click="handleConfirm" />
          </div>
        </div>
      </div>

      <div v-else class="bg-success-600 dark:bg-success-500 rounded-2xl shadow-2xl p-4 text-white flex gap-3 items-center border border-white/20">
        <div class="size-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
          <UIcon name="i-lucide:check-circle" class="size-6" />
        </div>
        <div class="flex-1">
          <p class="text-xs font-bold leading-snug">
            C'est fait ! Tous les messages en provenance de ces expéditeurs seront renvoyés vers les spam et n'apparaîtront plus dans la boîte de réception.
          </p>
        </div>
        <UButton icon="i-lucide:x" variant="ghost" color="neutral" size="xs" @click="emit('cancel')" />
      </div>
    </Transition>
  </div>
</template>
