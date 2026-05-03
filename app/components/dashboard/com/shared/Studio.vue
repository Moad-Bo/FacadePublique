<script setup lang="ts">
import { computed } from 'vue'
const { composerForm, composerStep, isComposerLoading, closeComposer, saveCampaign, saveLayout } = useComposer()
const { currentModeConfig } = useStudioConfig()
const notify = useNotify()
const config = useRuntimeConfig()
const router = useRouter()

// --- SENDER CONTEXTS ---
// mailSenderLabels est une liste de labels (ex: "Support,Newsletter,Système")
// Les adresses email réelles sont résolues côté serveur via MAILGUN_SENDER_CONTEXTS
const senderOptions = computed(() => {
  const raw = config.public.mailSenderLabels || 'Support,Newsletter,Système'
  return raw.split(',').filter(Boolean).map(label => ({
    label: label.trim(),
    value: label.trim()
  }))
})

const props = defineProps<{
  layouts: any[],
  isFullscreen?: boolean
}>()

const emit = defineEmits(['toggle-fullscreen'])

// --- NAVIGATION ---
const totalSteps = computed(() => currentModeConfig.value.steps.length)

const scrollToDestinataire = () => {
  const el = document.getElementById('forge-header')
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    const input = el.querySelector('input')
    if (input) input.focus()
  } else {
    notify.info('Note', 'Le champ destinataire est accessible dans la phase de configuration.')
  }
}
const currentStep = computed(() => currentModeConfig.value.steps[composerStep.value - 1])

const nextStep = () => {
    // Validation logic (generic but adaptable)
    if (composerStep.value === 1 && currentModeConfig.value.label === 'Webmailing' && !composerForm.value.layoutId) {
       return notify.warning('Veuillez choisir un design')
    }
    
    if (composerStep.value < totalSteps.value) {
        composerStep.value++
    }
}

// --- FINAL ACTIONS ---
const handleSave = async () => {
  const mode = currentModeConfig.value.label
  if (mode === 'Design Studio') {
    const res = await saveLayout()
    if (res) closeComposer()
  } else if (mode === 'Campagnes Studio') {
    // Nouvelle campagne via stepper campagne/
    const res = await saveCampaign('publish')
    if (res) closeComposer()
  } else if (mode === 'Modèles Studio') {
    // Nouveau modèle via stepper modele/
    try {
      isComposerLoading.value = true
      const res = await $fetch<any>('/api/campaign/templates', {
        method: 'POST',
        body: {
          id: composerForm.value.id || undefined,
          name: composerForm.value.name,
          description: composerForm.value.description,
          subject: composerForm.value.subject,
          content: composerForm.value.body,
          icon: (composerForm.value as any).icon || 'i-lucide:mail',
          layoutId: composerForm.value.layoutId || 'campaign',
        }
      })
      if (res.success) {
        notify.success('Modèle enregistré', `"${composerForm.value.name}" a été créé.`)
        closeComposer()
      }
    } catch (e: any) {
      notify.error('Erreur modèle', e.message)
    } finally {
      isComposerLoading.value = false
    }
  } else if (mode === 'Campagnes' || mode === 'Webmailing') {
    const res = await saveCampaign('publish')
    if (res) closeComposer()
  } else {
    notify.info('Finalisation...', 'Action en cours de traitement.')
  }
}

const getActionLabel = computed(() => {
  const mode = currentModeConfig.value.label
  if (mode === 'Campagnes Studio') return 'Lancer la Campagne'
  if (mode === 'Modèles Studio') return 'Enregistrer le Modèle'
  if (mode === 'Campagnes') return 'Lancer la Campagne'
  if (mode === 'Design Studio') return 'Enregistrer Design'
  if (mode === 'Configuration') return 'Appliquer'
  return 'Envoyer le Message'
})

const getNextLabel = computed(() => {
  const mode = currentModeConfig.value.label
  if (mode === 'Configuration' && composerStep.value === 1) return 'Gestion Contacts'
  if (mode === 'Campagnes Studio') {
    if (composerStep.value === 1) return 'Composer'
    if (composerStep.value === 2) return 'Planifier'
  }
  if (mode === 'Modèles Studio' && composerStep.value === 1) return 'Contenu'
  return 'Continuer'
})
</script>

<template>
  <div class="h-full flex flex-col bg-white dark:bg-neutral-900 overflow-hidden relative">
    
    <!-- 1. HEADER (Stepper & Identity) -->
    <div class="px-8 py-6 border-b border-default bg-neutral-50/50 dark:bg-neutral-900/50 flex items-center justify-between shrink-0 relative z-20 shadow-sm">
      <!-- Left: Mode Icon -->
      <div class="flex items-center gap-4">
        <div class="size-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-sm border border-primary/20">
          <UIcon :name="currentStep.icon" class="size-5" />
        </div>
        <div class="hidden sm:block">
           <span class="text-[9px] font-black uppercase text-dimmed tracking-widest opacity-60">{{ currentModeConfig.label }}</span>
           <h3 class="text-xs font-black uppercase italic tracking-tighter">{{ currentStep.title }}</h3>
        </div>

        <!-- SENDER SELECTOR (New) -->
        <div v-if="currentModeConfig.label === 'Webmailing' || currentModeConfig.label === 'Campagnes'" class="ml-4 flex items-center gap-2 px-3 py-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl border border-default animate-in fade-in zoom-in duration-500">
           <span class="text-[10px] font-bold uppercase tracking-tighter text-dimmed">De :</span>
           <USelect 
             v-model="composerForm.fromContext" 
             :items="senderOptions" 
             variant="ghost" 
             size="xs" 
             class="min-w-32 font-bold" 
           />
        </div>

        <!-- DESTINATAIRE BUTTON (New) -->
        <UButton
          v-if="['Webmailing', 'Campagnes', 'Modèles Studio'].includes(currentModeConfig.label)"
          label="Destinataire"
          icon="i-lucide:users"
          variant="soft"
          color="primary"
          size="xs"
          class="ml-2 font-black uppercase text-[9px] rounded-xl"
          @click="scrollToDestinataire"
        />
      </div>

      <!-- Center Focus: Stepper Progress -->
      <div class="absolute left-1/2 -translate-x-1/2 flex flex-col items-center">
          <div class="flex items-center gap-1.5 mb-2">
             <template v-for="i in totalSteps" :key="i">
                <div class="h-1.5 rounded-full transition-all duration-500" :class="[i <= composerStep ? 'bg-primary' : 'bg-neutral-200 dark:bg-neutral-800', i === composerStep ? 'w-10' : 'w-4']" />
             </template>
          </div>
          <span class="text-[9px] font-black uppercase text-dimmed tracking-tighter opacity-40">Étape {{ composerStep }} sur {{ totalSteps }}</span>
      </div>

      <!-- Right: Global Actions -->
      <div class="flex items-center gap-2">
        <UButton 
          type="button"
          variant="ghost" 
          color="neutral" 
          size="sm" 
          :icon="isFullscreen ? 'i-lucide:minimize-2' : 'i-lucide:maximize-2'" 
          @click.stop="emit('toggle-fullscreen')" 
          class="hidden sm:inline-flex"
        />
        <UButton type="button" variant="ghost" color="neutral" size="sm" icon="i-lucide:x" @click.stop="closeComposer" />
</div>
    </div>

    <!-- 2. MAIN WORKSPACE (Dynamic Step Content) -->
    <div class="flex-1 overflow-hidden flex bg-white dark:bg-neutral-900 relative">
      <!-- SIDEBAR (Optional) -->
      <aside v-if="currentModeConfig.hasSidebar" class="w-64 border-r border-default p-6 bg-neutral-50/50 dark:bg-neutral-800/20 flex flex-col gap-8 shrink-0 animate-in slide-in-from-left-4 duration-500">
          <div class="flex flex-col gap-0.5">
            <h1 class="text-2xl font-black tracking-tighter uppercase leading-none text-default">Paramètres</h1>
            <p class="text-[9px] text-primary font-black uppercase tracking-[0.2em] mt-1 opacity-80">{{ currentModeConfig.label }}</p>
          </div>
          
          <nav class="flex flex-col gap-2 flex-1">
            <UButton 
              v-for="(step, index) in currentModeConfig.steps"
              :key="step.id"
              :label="step.title" 
              :icon="step.icon" 
              :variant="composerStep === index + 1 ? 'soft' : 'ghost'" 
              :color="composerStep === index + 1 ? 'primary' : 'neutral'" 
              class="w-full justify-start rounded-xl group transition-all"
              :class="composerStep === index + 1 ? 'font-bold' : ''"
              @click="composerStep = index + 1"
            />
          </nav>
      </aside>

      <!-- CONTENT AREA -->
      <div class="flex-1 flex flex-col overflow-hidden relative">
        <Suspense>
          <template #default>
            <component 
              :is="currentStep.component" 
              v-if="currentStep"
              :key="currentStep.id"
              v-model="composerForm" 
              :layouts="layouts"
            />
          </template>
          <template #fallback>
            <div class="flex-1 h-full flex flex-col items-center justify-center gap-6 p-12 text-center animate-pulse">
               <div class="size-20 rounded-3xl bg-primary/5 flex items-center justify-center border border-primary/10">
                  <UIcon name="i-lucide:sparkles" class="size-10 text-primary opacity-20" />
               </div>
               <div class="space-y-2">
                  <p class="text-xs uppercase tracking-[0.3em] font-black text-primary opacity-60">Initialisation</p>
                  <p class="text-sm font-bold italic opacity-40">Chargement de votre espace de travail...</p>
               </div>
            </div>
          </template>
        </Suspense>
      </div>
    </div>

    <!-- 3. FOOTER NAVIGATION -->
    <div class="px-8 py-5 border-t border-default bg-neutral-50/50 dark:bg-neutral-900/50 flex items-center justify-center shrink-0 relative z-20">
        <!-- NAVIGATION ARROWS -->
        <div class="flex items-center gap-8">
           <div class="flex items-center gap-2">
              <UButton 
                type="button"
                :disabled="composerStep === 1" 
                icon="i-lucide:chevron-left" 
                variant="ghost" 
                color="neutral" 
                class="rounded-full size-12 flex items-center justify-center" 
                :class="{ 'opacity-10 scale-90': composerStep === 1 }"
                @click.stop="composerStep > 1 ? composerStep-- : null" 
              />
              <span class="text-[9px] font-black text-dimmed uppercase tracking-widest px-2" v-if="composerStep > 1">Retour</span>
           </div>
           
           <div class="h-6 w-px bg-default mx-4 opacity-30" />
           
           <div class="flex items-center gap-2">
              <span class="text-[9px] font-black text-primary uppercase tracking-widest px-2" v-if="composerStep < totalSteps">{{ getNextLabel }}</span>
              <UButton 
                type="button"
                v-if="composerStep < totalSteps"
                icon="i-lucide:chevron-right" 
                variant="solid" 
                color="primary" 
                class="rounded-full size-12 flex items-center justify-center shadow-lg shadow-primary/20 hover:scale-110 active:scale-95 transition-all" 
                @click.stop="nextStep" 
              />
              <div v-else class="size-12" />
           </div>
        </div>

        <!-- FINAL ACTION (Right Side) -->
        <div class="absolute right-8">
           <UButton 
              type="button"
              v-if="composerStep === totalSteps"
              :label="getActionLabel"
              :icon="getActionLabel.includes('Envoyer') ? 'i-lucide:send' : 'i-lucide:check'"
              size="xl" 
              color="primary" 
              class="rounded-2xl px-12 font-black italic uppercase tracking-tighter shadow-2xl shadow-primary/30 animate-in fade-in slide-in-from-right-8 duration-700"
              :loading="isComposerLoading"
              @click.stop="handleSave"
           />
        </div>
    </div>
  </div>
</template>
