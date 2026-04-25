<script setup lang="ts">
const props = defineProps<{
    open: boolean,
    exportType: 'journal' | 'queue' | 'archive'
}>()

const emit = defineEmits(['update:open'])

const contexts = [
    { label: '-- Webmailer --', disabled: true },
    { label: 'contact', value: 'contact', icon: 'i-lucide:user' },
    { label: 'moderation', value: 'moderation', icon: 'i-lucide:shield' },
    { label: 'support', value: 'support', icon: 'i-lucide:life-buoy' },
    { label: 'system', value: 'system', icon: 'i-lucide:cpu' },
    { label: '-- Campagnes --', disabled: true },
    { label: 'marketing', value: 'marketing', icon: 'i-lucide:megaphone' },
    { label: 'newsletter', value: 'newsletter', icon: 'i-lucide:mail-open' },
    { label: 'changelog', value: 'changelog', icon: 'i-lucide:history' }
]

const selectedExportContexts = ref<string[]>([])
const exportLoading = ref(false)

const exportData = async () => {
    if (selectedExportContexts.value.length === 0) return
    exportLoading.value = true
    try {
        const response = await $fetch<any>('/api/mails/export', {
            method: 'POST',
            body: { 
                contexts: selectedExportContexts.value,
                exportType: props.exportType,
                format: 'csv' 
            },
            responseType: 'blob'
        })
        
        const blob = new Blob([response], { type: 'text/csv; charset=utf-8' })
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        
        const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '')
        const typeSlug = props.exportType === 'queue' ? 'Prog' : props.exportType === 'archive' ? 'Arch' : 'Log'
        const ctxSlug = selectedExportContexts.value.length > 2 
            ? 'Multi' 
            : selectedExportContexts.value.map(c => c.charAt(0).toUpperCase() + c.slice(1)).join('_')
            
        link.setAttribute('download', `Exp${typeSlug}_${ctxSlug}_${dateStr}.csv`)
        
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)
        
        emit('update:open', false)
    } catch (e: any) {
        console.error('Export error', e)
    } finally {
        exportLoading.value = false
    }
}
</script>

<template>
  <UModal :model-value="open" @update:model-value="val => emit('update:open', val)" :ui="{ content: 'max-w-xl' }">
    <UCard class="flex flex-col" :ui="{ body: 'p-0', header: 'px-6 py-4 border-b border-default', footer: 'px-6 py-4 border-t border-default' }">
      <template #header>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
             <div class="size-9 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                <UIcon name="i-lucide:download" class="size-5 text-primary" />
             </div>
             <div>
                <h3 class="font-black text-sm uppercase tracking-widest text-highlighted">Exportation {{ exportType === 'queue' ? 'Programmation' : exportType === 'archive' ? 'Archives' : 'Journal' }}</h3>
                <p class="text-[10px] text-dimmed font-medium">Configurez votre fichier CSV haute fidélité</p>
             </div>
          </div>
          <UButton icon="i-lucide:x" variant="ghost" color="neutral" size="sm" @click="emit('update:open', false)" />
        </div>
      </template>

      <div class="p-6 space-y-6">
        <div>
           <div class="flex items-center justify-between mb-4">
              <span class="text-[10px] font-black uppercase text-highlighted tracking-widest">Périmètre de données</span>
              <UButton v-if="selectedExportContexts.length > 0" label="Réinitialiser" variant="link" color="neutral" size="xs" @click="selectedExportContexts = []" />
           </div>
           <div class="grid grid-cols-2 gap-2.5">
            <template v-for="ctx in contexts" :key="ctx.label">
               <div v-if="ctx.disabled" class="col-span-2 pt-4 first:pt-0">
                  <span class="text-[9px] font-black uppercase tracking-[0.2em] text-primary/60 border-b border-primary/20 pb-0.5 block">{{ ctx.label }}</span>
               </div>
               <div v-else
               class="group flex items-center gap-3 p-2.5 rounded-xl border border-default cursor-pointer transition-all hover:border-primary/40"
               :class="[selectedExportContexts.includes(ctx.value!) ? 'bg-primary/5 border-primary/60 shadow-sm' : 'bg-neutral-50/50 dark:bg-neutral-900/40']"
               @click="selectedExportContexts.includes(ctx.value!) ? selectedExportContexts.splice(selectedExportContexts.indexOf(ctx.value!), 1) : selectedExportContexts.push(ctx.value!)"
               >
               <div class="size-8 flex items-center justify-center rounded-lg bg-white dark:bg-neutral-800 border border-default group-hover:border-primary/30 transition-colors shadow-sm">
                  <UIcon :name="ctx.icon || 'i-lucide:tag'" class="size-4" :class="selectedExportContexts.includes(ctx.value!) ? 'text-primary' : 'text-dimmed'" />
               </div>
               <span class="text-xs font-bold" :class="selectedExportContexts.includes(ctx.value!) ? 'text-primary' : 'text-default'">{{ ctx.label }}</span>
               <UIcon v-if="selectedExportContexts.includes(ctx.value!)" name="i-lucide:check" class="size-4 ml-auto text-primary" />
               </div>
            </template>
           </div>
        </div>

        <div class="p-4 bg-primary/5 border border-primary/20 rounded-2xl flex gap-4">
          <div class="size-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <UIcon name="i-lucide:file-spreadsheet" class="size-4 text-primary" />
          </div>
          <div>
            <p class="text-xs font-bold text-primary mb-0.5">Format Universel</p>
            <p class="text-[10px] leading-relaxed text-primary/70 font-medium italic">
                L'export inclura l'en-tête de conformité, les horodatages précis et les métadonnées de statut pour le mode <b>{{ exportType.toUpperCase() }}</b>.
            </p>
          </div>
        </div>
      </div>

      <template #footer>
        <div class="flex items-center justify-between">
           <span class="text-[10px] font-black uppercase tracking-tighter text-dimmed">
              {{ selectedExportContexts.length }} selection(s)
           </span>
           <div class="flex gap-2">
              <UButton label="Annuler" variant="ghost" color="neutral" size="sm" class="font-bold" @click="emit('update:open', false)" />
              <UButton 
                :loading="exportLoading" 
                label="Générer CSV" 
                color="primary" 
                variant="solid" 
                icon="i-lucide:sparkles" 
                size="sm"
                class="font-black uppercase tracking-widest text-[10px] px-6"
                :disabled="selectedExportContexts.length === 0" 
                @click="exportData" 
              />
           </div>
        </div>
      </template>
    </UCard>
  </UModal>
</template>


