<script setup lang="ts">
import { computed } from 'vue'

const { isComposerOpen, composerStep } = useComposer()
const props = defineProps<{
  isActive?: boolean
}>()

const active = computed(() => props.isActive || (isComposerOpen.value && composerStep.value === 2))

const notify = useNotify()

// ─── BLACKLIST MANAGEMENT ──────────────────────────────────────────────────
const { data: blacklistData, refresh: refreshBlacklist } = await useFetch<any>('/api/mails/blacklists', {
    lazy: true,
    server: false,
    watch: [active]
})

const blacklist = computed(() => blacklistData.value?.blacklist || [])

const deleteFromBlacklist = async (id: string) => {
    try {
        await $fetch(`/api/mails/blacklists`, {
            method: 'DELETE',
            body: { id }
        })
        notify.success('Adresse retirée de la liste noire')
        refreshBlacklist()
    } catch (e: any) {
        notify.error('Erreur', e.message)
    }
}

const exportBlacklist = async () => {
    window.open('/api/mails/blacklist-export', '_blank')
}

const triggerImportBlacklist = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e: any) => {
        const file = e.target.files[0]
        if (!file) return
        const reader = new FileReader()
        reader.onload = async (event: any) => {
            try {
                const list = JSON.parse(event.target.result)
                await $fetch('/api/mails/blacklist-import', { method: 'POST', body: { list } })
                notify.success('Liste noire importée')
                refreshBlacklist()
            } catch (err: any) {
                notify.error('Erreur import', err.message)
            }
        }
        reader.readAsText(file)
    }
    input.click()
}
</script>

<template>
  <div class="space-y-8 animate-in fade-in slide-in-from-bottom-2">
    <div class="space-y-1">
      <h2 class="text-xl font-bold tracking-tight">Liste Noire & Spam</h2>
      <p class="text-xs text-dimmed">Gérez vos filtres d'emails indésirables et sécurisez votre boîte.</p>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div class="p-6 rounded-2xl border border-default bg-neutral-50 dark:bg-neutral-800/50 flex flex-col items-center text-center gap-4 hover:border-primary/30 transition-all cursor-pointer group" @click="exportBlacklist">
          <div class="size-16 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
            <UIcon name="i-lucide:file-json" class="size-8" />
          </div>
          <div>
            <h5 class="font-bold text-sm">Exporter (.json)</h5>
            <p class="text-[10px] text-dimmed mt-1">Sauvegardez vos filtres actuels.</p>
          </div>
          <UButton label="Exporter" color="primary" variant="soft" class="mt-auto w-full rounded-xl" />
      </div>

      <div class="p-6 rounded-2xl border border-default bg-neutral-50 dark:bg-neutral-800/50 flex flex-col items-center text-center gap-4 hover:border-primary/30 transition-all cursor-pointer group" @click="triggerImportBlacklist">
          <div class="size-16 rounded-full bg-warning/10 flex items-center justify-center text-warning group-hover:scale-110 transition-transform">
            <UIcon name="i-lucide:file-up" class="size-8" />
          </div>
          <div>
            <h5 class="font-bold text-sm">Importer (.json)</h5>
            <p class="text-[10px] text-dimmed mt-1">Restaurez une liste existante.</p>
          </div>
          <UButton label="Importer" color="warning" variant="soft" class="mt-auto w-full rounded-xl" />
      </div>
    </div>

    <div class="bg-primary/5 p-4 rounded-xl border border-primary/10 flex gap-3 shadow-sm">
      <UIcon name="i-lucide:info" class="size-5 text-primary shrink-0" />
      <p class="text-[11px] leading-relaxed text-toned">
        <strong>Note :</strong> Les messages arrivant de ces adresses seront automatiquement envoyés en Spam.
      </p>
    </div>

    <!-- VISUAL BLACKLIST -->
    <div class="space-y-4">
      <div class="flex items-center justify-between border-b border-default pb-2">
        <h4 class="text-[10px] font-black uppercase tracking-[0.2em] text-dimmed">Adresses bloquées ({{ blacklist.length }})</h4>
        <UButton icon="i-lucide:refresh-cw" variant="ghost" color="neutral" size="xs" @click="() => refreshBlacklist()" />
      </div>
      
      <div v-if="blacklist.length === 0" class="p-12 border-2 border-dashed border-default rounded-3xl flex flex-col items-center justify-center opacity-30 mt-2">
          <UIcon name="i-lucide:shield-check" class="size-10 mb-3" />
          <p class="text-xs font-bold text-default">Votre boîte est saine.</p>
          <p class="text-[10px] mt-1 text-center">Aucune adresse détectée dans la liste noire.</p>
      </div>

      <div v-else class="border border-default rounded-2xl divide-y divide-default bg-white dark:bg-neutral-900 shadow-xl overflow-hidden">
          <div v-for="item in blacklist" :key="item.id" class="p-4 flex items-center justify-between group hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-all">
            <div class="flex items-center gap-4 min-w-0">
                <div class="size-10 rounded-xl bg-orange-100 dark:bg-orange-950/30 flex items-center justify-center text-orange-600 dark:text-orange-400 shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                  <UIcon name="i-lucide:mail-x" class="size-5" />
                </div>
                <div class="min-w-0">
                  <p class="text-xs font-black truncate text-default tracking-tight">{{ item.email }}</p>
                  <p class="text-[10px] text-dimmed font-medium uppercase tracking-wider">Bloqué le {{ new Date(item.createdAt).toLocaleDateString() }} • {{ item.reason || 'Manuel' }}</p>
                </div>
            </div>
            <UButton icon="i-lucide:trash-2" color="error" variant="soft" size="xs" class="opacity-0 group-hover:opacity-100 rounded-lg scale-90" @click="deleteFromBlacklist(item.id)" />
          </div>
      </div>
    </div>
  </div>
</template>
