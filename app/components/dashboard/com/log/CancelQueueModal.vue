<script setup lang="ts">
const props = defineProps<{
  open: boolean
  items: Array<{ id: string; recipient: string; subject: string; scheduledAt?: string | null }>
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'confirmed': []
}>()

const withExport = ref(true) // coché par défaut — protecteur
const isLoading = ref(false)
const notify = useNotify()

const formatDate = (d: string | null | undefined) => {
  if (!d) return '—'
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit', month: 'short',
    hour: '2-digit', minute: '2-digit'
  }).format(new Date(d))
}

const downloadCSV = () => {
  const headers = ['ID', 'Destinataire', 'Sujet', 'Date Prévue']
  const rows = props.items.map(i => [
    `"${i.id}"`,
    `"${i.recipient}"`,
    `"${(i.subject || '').replace(/"/g, '""')}"`,
    `"${formatDate(i.scheduledAt)}"`
  ])
  const csv = [headers, ...rows].map(r => r.join(';')).join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `backup-queue-${Date.now()}.csv`
  a.click()
  URL.revokeObjectURL(url)
  notify.success('Sauvegarde CSV générée')
}

const confirm = async () => {
  if (withExport.value) {
    downloadCSV()
    // petit délai pour laisser le browser télécharger
    await new Promise(r => setTimeout(r, 300))
  }
  emit('confirmed')
  emit('update:open', false)
}
</script>

<template>
  <UModal
    :model-value="open"
    @update:model-value="val => emit('update:open', val)"
    :ui="{ content: 'max-w-lg' }"
  >
    <UCard
      class="flex flex-col"
      :ui="{ body: 'p-0', header: 'px-6 py-4 border-b border-default', footer: 'px-6 py-4 border-t border-default' }"
    >
      <!-- HEADER -->
      <template #header>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="size-10 rounded-xl bg-error/10 flex items-center justify-center border border-error/20 shrink-0">
              <UIcon name="i-lucide:calendar-x-2" class="size-5 text-error" />
            </div>
            <div>
              <h3 class="font-black text-sm uppercase tracking-widest text-highlighted">
                Annuler {{ items.length }} programmation{{ items.length > 1 ? 's' : '' }}
              </h3>
              <p class="text-[10px] text-dimmed font-medium mt-0.5">
                Cette action supprime les envois de la file d'attente Nitro
              </p>
            </div>
          </div>
          <UButton icon="i-lucide:x" variant="ghost" color="neutral" size="xs" @click="emit('update:open', false)" />
        </div>
      </template>

      <!-- BODY -->
      <div class="p-6 space-y-5">
        <!-- Récapitulatif des items -->
        <div class="rounded-2xl border border-default overflow-hidden">
          <div class="px-4 py-2.5 bg-neutral-50 dark:bg-neutral-900 border-b border-default">
            <span class="text-[9px] font-black uppercase tracking-[0.2em] text-dimmed">
              Envois concernés ({{ items.length }})
            </span>
          </div>
          <div class="divide-y divide-default max-h-48 overflow-y-auto">
            <div
              v-for="item in items"
              :key="item.id"
              class="flex items-center gap-3 px-4 py-2.5"
            >
              <UIcon name="i-lucide:mail" class="size-4 text-error/70 shrink-0" />
              <div class="flex-1 min-w-0">
                <p class="text-xs font-bold text-highlighted truncate">{{ item.subject || '(Sans objet)' }}</p>
                <p class="text-[10px] text-dimmed truncate">{{ item.recipient }}</p>
              </div>
              <span class="text-[10px] text-dimmed whitespace-nowrap font-mono">{{ formatDate(item.scheduledAt) }}</span>
            </div>
          </div>
        </div>

        <!-- Option export CSV -->
        <div
          class="flex items-start gap-3 p-4 rounded-2xl cursor-pointer transition-all"
          :class="withExport
            ? 'bg-primary/5 border border-primary/30'
            : 'bg-neutral-50/80 dark:bg-neutral-900/40 border border-default hover:border-primary/20'"
          @click="withExport = !withExport"
        >
          <UCheckbox :model-value="withExport" @change="withExport = !withExport" class="mt-0.5 shrink-0" />
          <div>
            <p class="text-xs font-black text-highlighted">
              <UIcon name="i-lucide:download" class="size-3.5 inline mr-1 align-middle" />
              Exporter une sauvegarde CSV
            </p>
            <p class="text-[10px] text-dimmed leading-relaxed mt-0.5">
              Recommandé — génère un fichier de récupération avant la suppression définitive.
            </p>
          </div>
        </div>

        <!-- Avertissement -->
        <div class="flex items-start gap-3 p-3 bg-error/5 border border-error/20 rounded-xl">
          <UIcon name="i-lucide:alert-triangle" class="size-4 text-error shrink-0 mt-0.5" />
          <p class="text-[10px] text-error/80 font-medium leading-relaxed">
            Les emails annulés <strong>ne seront pas envoyés</strong> et ne peuvent pas être récupérés sans la sauvegarde CSV.
          </p>
        </div>
      </div>

      <!-- FOOTER -->
      <template #footer>
        <div class="flex items-center justify-between">
          <span class="text-[10px] font-black uppercase tracking-tighter text-dimmed">
            {{ items.length }} envoi{{ items.length > 1 ? 's' : '' }} à supprimer
          </span>
          <div class="flex gap-2">
            <UButton
              label="Annuler"
              variant="ghost"
              color="neutral"
              size="sm"
              class="font-bold"
              @click="emit('update:open', false)"
            />
            <UButton
              :loading="isLoading"
              :label="withExport ? 'Exporter & Annuler' : 'Confirmer l\'annulation'"
              color="error"
              variant="solid"
              :icon="withExport ? 'i-lucide:download' : 'i-lucide:trash-2'"
              size="sm"
              class="font-black uppercase tracking-widest text-[10px] px-5"
              @click="confirm"
            />
          </div>
        </div>
      </template>
    </UCard>
  </UModal>
</template>
