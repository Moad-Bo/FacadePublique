<script setup lang="ts">
import { ref, computed } from 'vue'

const props = defineProps<{
  folders?: any[]
  systemFolders?: any[]
}>()

const emit = defineEmits(['refresh'])
const notify = useNotify()

const { 
  pendingMails, 
  parseEmlOnServer 
} = useComposer()

// --- DATA FETCHING (Fallback if not provided as props) ---
const { data: webmailerData, refresh: refreshFolders } = await useFetch<any>('/api/mails/settings', {
  lazy: true,
  server: false
})

const localFolders = computed(() => props.folders || webmailerData.value?.folders || [])
const localSystemFolders = computed(() => props.systemFolders || webmailerData.value?.systemFolders || [])

// ─── EML IMPORT MAGIC ────────────────────────────────────────────────────────
const selectedPendingIds = ref<string[]>([])
const importLoading = ref(false)

interface DestinationOption {
    label: string
    value: string | null
    icon: string | null
    disabled: boolean
}

const allDestinations = computed<DestinationOption[]>(() => {
    return [
        { label: '-- Dossiers Système --', disabled: true, value: null, icon: null },
        ...localSystemFolders.value.map((f: any) => ({ label: (f.label || f.name) as string, value: f.id as string, icon: f.icon as string, disabled: false } as DestinationOption)),
        { label: '-- Mes Dossiers --', disabled: true, value: null, icon: null },
        ...localFolders.value.map((f: any) => ({ label: f.name as string, value: f.id as string, icon: 'i-lucide:folder', disabled: false } as DestinationOption))
    ]
})

const handleEmlUpload = async (e: any) => {
    const files = Array.from(e.target.files) as File[]
    if (!files.length) return
    importLoading.value = true
    await parseEmlOnServer(files)
    importLoading.value = false
}

const batchFolder = ref<DestinationOption | null>(null)
const associateSelected = () => {
    if (!batchFolder.value?.value) return
    pendingMails.value.forEach(m => {
        if (selectedPendingIds.value.includes(m.id)) {
            m.folderId = batchFolder.value!.value
        }
    })
    selectedPendingIds.value = []
    batchFolder.value = null
}

const finalStepMails = computed(() => pendingMails.value.filter(m => m.folderId))
const unmappedCount = computed(() => pendingMails.value.filter(m => !m.folderId).length)

const finalizeImport = async () => {
    if (finalStepMails.value.length === 0) return
    importLoading.value = true
    try {
        const payload = finalStepMails.value.map(m => ({
            subject: m.subject,
            body: m.body,
            fromEmail: m.from.email,
            fromName: m.from.name,
            date: m.date,
            folderId: m.folderId
        }))
        await $fetch('/api/mails/import', { method: 'POST', body: { mails: payload } })
        notify.success(`${payload.length} mails importés avec succès`)
        pendingMails.value = pendingMails.value.filter(m => !m.folderId)
        emit('refresh')
        refreshFolders()
    } catch (e: any) {
        notify.error('Erreur import', e.message)
    } finally {
        importLoading.value = false
    }
}

// ─── FOLDER EXPORT ──────────────────────────────────────────────────────────
const selectedExportFolders = ref<string[]>([])
const exportFoldersLoading = ref(false)

const exportSelectedFolders = async () => {
    if (selectedExportFolders.value.length === 0) return
    exportFoldersLoading.value = true
    try {
        const blob = await $fetch<Blob>('/api/mails/export', {
            method: 'POST',
            body: { folderIds: selectedExportFolders.value },
            responseType: 'blob'
        })
        const url = window.URL.createObjectURL(new Blob([blob]))
        const link = document.createElement('a')
        link.href = url
        link.setAttribute('download', `export_dossiers_${Date.now()}.zip`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)
        notify.success('Exportation terminée')
    } catch (e: any) {
        notify.error('Erreur export', e.message)
    } finally {
        exportFoldersLoading.value = false
    }
}
</script>

<template>
  <div class="space-y-8 animate-in fade-in slide-in-from-bottom-2">
    <div class="space-y-1">
      <h2 class="text-xl font-bold tracking-tight">Importation & Exportation</h2>
      <p class="text-xs text-dimmed">Gérez vos archives d'e-mails et réintégrez vos fichiers .eml.</p>
    </div>

    <!-- EXPORT SECTION -->
    <div class="space-y-4">
        <h4 class="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
          <UIcon name="i-lucide:download" class="size-4" />
          Exporter des dossiers complets
        </h4>
        <div class="grid grid-cols-2 lg:grid-cols-3 gap-2">
          <div v-for="dest in allDestinations.filter(d => !d.disabled)" :key="dest.value" 
            class="flex items-center gap-3 p-3 rounded-xl border border-default cursor-pointer transition-all hover:border-primary/50"
            :class="[selectedExportFolders.includes(dest.value as string) ? 'bg-primary/5 border-primary shadow-sm' : 'bg-white dark:bg-neutral-900']"
            @click="selectedExportFolders.includes(dest.value as string) ? selectedExportFolders.splice(selectedExportFolders.indexOf(dest.value as string), 1) : selectedExportFolders.push(dest.value as string)"
          >
              <UIcon :name="dest.icon || 'i-lucide:folder'" class="size-4 shrink-0" :class="selectedExportFolders.includes(dest.value as string) ? 'text-primary' : 'text-dimmed'" />
              <span class="text-[11px] font-bold truncate">{{ dest.label }}</span>
          </div>
        </div>
        <div class="flex justify-end pt-2">
          <UButton :loading="exportFoldersLoading" label="Générer l'archive (.zip)" color="primary" variant="solid" icon="i-lucide:archive" :disabled="selectedExportFolders.length === 0" @click="exportSelectedFolders" />
        </div>
    </div>

    <div class="h-px bg-neutral-100 dark:bg-neutral-800" />

    <!-- IMPORT SECTION -->
    <div class="flex-1 flex flex-col space-y-4 overflow-hidden">
        <h4 class="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
          <UIcon name="i-lucide:upload" class="size-4" />
          Importer des fichiers (.eml)
        </h4>
        
        <div v-if="pendingMails.length === 0" class="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-default rounded-3xl p-12 opacity-40 hover:opacity-100 hover:border-primary/50 transition-all cursor-pointer relative group">
          <input type="file" multiple accept=".eml" class="absolute inset-0 opacity-0 cursor-pointer" @change="handleEmlUpload" />
          <div class="size-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <UIcon name="i-lucide:file-plus" class="size-8 text-primary" />
          </div>
          <p class="text-sm font-bold">Cliquez ou glissez vos fichiers .eml ici</p>
          <p class="text-[10px] mt-1 italic">Les dossiers seront reconstruits selon vos choix.</p>
        </div>

        <div v-else class="flex-1 flex flex-col overflow-hidden space-y-4">
          <!-- Toolbar Mapping -->
          <div class="p-3 bg-neutral-100 dark:bg-neutral-800/80 rounded-2xl border border-default flex items-center justify-between gap-4 shadow-sm">
              <div class="flex items-center gap-3">
                <UCheckbox :model-value="selectedPendingIds.length === unmappedCount && unmappedCount > 0" :indeterminate="selectedPendingIds.length > 0 && selectedPendingIds.length < unmappedCount" @update:model-value="(v) => v ? selectedPendingIds = pendingMails.filter(m => !m.folderId).map(m => m.id) : selectedPendingIds = []" />
                <span class="text-[10px] font-black uppercase text-primary tracking-tight">{{ selectedPendingIds.length }} sélectionnés</span>
              </div>
              <div class="flex items-center gap-2 flex-1 max-w-xs">
                <USelectMenu v-model="batchFolder" :items="allDestinations" placeholder="Choisir destination..." class="flex-1" size="xs">
                  <template #leading>
                    <UIcon :name="allDestinations.find(d => d.value === batchFolder?.value)?.icon || 'i-lucide:folder-plus'" class="size-3" />
                  </template>
                </USelectMenu>
                <UButton label="Associer" color="primary" size="xs" :disabled="!batchFolder?.value || selectedPendingIds.length === 0" icon="i-lucide:link" @click="associateSelected" />
              </div>
          </div>

          <!-- Scrollable List -->
          <div class="max-h-[300px] overflow-y-auto divide-y divide-default border border-default rounded-2xl bg-white dark:bg-neutral-900 shadow-inner">
              <div v-for="mail in pendingMails" :key="mail.id" class="p-3 flex items-center gap-3 bg-white dark:bg-neutral-900 group">
                <UCheckbox v-if="!mail.folderId" :model-value="selectedPendingIds.includes(mail.id)" @update:model-value="(v) => v ? selectedPendingIds.push(mail.id) : selectedPendingIds.splice(selectedPendingIds.indexOf(mail.id), 1)" />
                <UIcon v-else name="i-lucide:check-circle-2" class="size-4 text-success shrink-0" />
                
                <div class="min-w-0 flex-1 text-xs">
                  <p class="font-bold truncate">{{ mail.subject }}</p>
                  <p class="text-[10px] text-dimmed truncate">{{ mail.from.name }} &lt;{{ mail.from.email }}&gt;</p>
                </div>

                <div v-if="mail.folderId" class="shrink-0 flex items-center gap-1.5 px-3 py-1 rounded-full bg-success/10 text-success text-[10px] font-bold border border-success/20">
                    {{ allDestinations.find(d => d.value === mail.folderId)?.label || 'Dossier' }}
                    <UButton icon="i-lucide:x" variant="ghost" color="error" class="size-5 p-0 scale-75 hover:bg-success/20" @click="mail.folderId = null" />
                </div>
                <UButton v-else icon="i-lucide:trash-2" color="error" variant="ghost" size="xs" class="opacity-0 group-hover:opacity-100" @click="pendingMails = pendingMails.filter(m => m.id !== mail.id)" />
              </div>
          </div>

          <div class="flex items-center justify-between pt-2">
              <p class="text-[10px] text-dimmed font-medium">
                <span class="font-bold text-primary">{{ finalStepMails.length }}</span> mails prêts.
              </p>
              <div class="flex gap-2">
                <UButton label="Reset" variant="ghost" color="neutral" size="sm" @click="pendingMails = []" />
                <UButton :loading="importLoading" label="Finaliser" color="primary" icon="i-lucide:check-circle" :disabled="finalStepMails.length === 0" @click="finalizeImport" />
              </div>
          </div>
        </div>
    </div>
  </div>
</template>
