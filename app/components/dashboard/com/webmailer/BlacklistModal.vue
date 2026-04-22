<script setup lang="ts">
import { ref, onMounted } from 'vue'

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits(['update:open'])

const blacklist = ref<any[]>([])
const loading = ref(false)
const notify = useNotify()

const fetchBlacklist = async () => {
  loading.value = true
  try {
    const res = await $fetch<any>('/api/mails/blacklists')
    if (res.success) {
      blacklist.value = res.blacklist
    }
  } catch (e: any) {
    notify.error('Erreur', e.message)
  } finally {
    loading.value = false
  }
}

const removeSender = async (id: string) => {
  try {
    const res = await $fetch<any>('/api/mails/blacklists', {
      method: 'DELETE',
      body: { id }
    })
    if (res.success) {
      blacklist.value = blacklist.value.filter(b => b.id !== id)
      notify.success('Expéditeur débloqué')
    }
  } catch (e: any) {
    notify.error('Erreur', e.message)
  }
}

watch(() => props.open, (newVal) => {
  if (newVal) fetchBlacklist()
})
</script>

<template>
  <UModal :open="open" @update:open="(v) => emit('update:open', v)" title="Liste Noire Spam" description="Gérez les adresses e-mail dont les messages sont automatiquement envoyés en Spam.">
    <template #content>
      <div class="p-4 space-y-4">
        <div v-if="loading" class="flex justify-center p-8">
          <UIcon name="i-lucide:refresh-cw" class="size-6 animate-spin text-primary" />
        </div>
        
        <div v-else-if="blacklist.length === 0" class="text-center py-12 opacity-40 italic flex flex-col items-center gap-3">
          <UIcon name="i-lucide:shield-check" class="size-12" />
          <p>Aucun expéditeur bloqué pour le moment.</p>
        </div>

        <div v-else class="space-y-2 max-h-[400px] overflow-y-auto pr-1">
          <div v-for="item in blacklist" :key="item.id" class="flex items-center justify-between p-3 rounded-lg border border-default bg-neutral-50 dark:bg-neutral-800/50 group hover:shadow-sm transition-all">
            <div class="min-w-0">
              <p class="text-sm font-bold truncate">{{ item.email }}</p>
              <p class="text-[10px] text-dimmed">Bloqué le {{ new Date(item.createdAt).toLocaleDateString('fr-FR') }}</p>
            </div>
            <UButton icon="i-lucide:trash-2" size="xs" variant="ghost" color="error" class="opacity-0 group-hover:opacity-100 transition-opacity" @click="removeSender(item.id)" />
          </div>
        </div>

        <div class="pt-4 border-t border-default flex justify-end">
          <UButton label="Fermer" color="neutral" variant="soft" @click="emit('update:open', false)" />
        </div>
      </div>
    </template>
  </UModal>
</template>
