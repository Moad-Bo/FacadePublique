import { computed, defineAsyncComponent } from 'vue'

export const useStudioConfig = () => {
  const { composerMode, isReplyMode } = useComposer()

  // ─── STEP COMPONENTS (Direct Async Imports) ───────────────────────────────
  const NewMessageStep1 = defineAsyncComponent(() => import('@/components/dashboard/com/composer/steps/new_message/Step1Design.vue'))
  const NewMessageStep2 = defineAsyncComponent(() => import('@/components/dashboard/com/composer/steps/new_message/Step2Forge.vue'))
  const NewMessageStep3 = defineAsyncComponent(() => import('@/components/dashboard/com/composer/steps/new_message/Step3Final.vue'))

  const ReplyStep1 = defineAsyncComponent(() => import('@/components/dashboard/com/composer/steps/reply/Step1Forge.vue'))
  const ReplyStep2 = defineAsyncComponent(() => import('@/components/dashboard/com/composer/steps/reply/Step2Final.vue'))

  const LayoutStep1 = defineAsyncComponent(() => import('@/components/dashboard/com/composer/steps/layout/new-layout/Step1Identity.vue'))
  const LayoutStep2 = defineAsyncComponent(() => import('@/components/dashboard/com/composer/steps/layout/new-layout/Step2Forge.vue'))
  
  // Settings Management (Import/Export & Blacklist)
  const EmlImportExport = defineAsyncComponent(() => import('@/components/dashboard/com/webmailer/EmlFileSystem.vue'))
  const BlacklistMgmt = defineAsyncComponent(() => import('@/components/dashboard/com/webmailer/BlacklistManager.vue'))

  // ─── CAMPAGNE STEPS ───────────────────────────────────────────────────────
  const CampagneStep1 = defineAsyncComponent(() => import('@/components/dashboard/com/composer/steps/campagne/Step1TypeAlias.vue'))
  const CampagneStep2 = defineAsyncComponent(() => import('@/components/dashboard/com/composer/steps/campagne/Step2Contenu.vue'))
  const CampagneStep3 = defineAsyncComponent(() => import('@/components/dashboard/com/composer/steps/campagne/Step3Planification.vue'))

  // ─── MODÈLE STEPS ─────────────────────────────────────────────────────────
  const ModeleStep1 = defineAsyncComponent(() => import('@/components/dashboard/com/composer/steps/modele/Step1Identite.vue'))
  const ModeleStep2 = defineAsyncComponent(() => import('@/components/dashboard/com/composer/steps/modele/Step2Contenu.vue'))

  // ─── STEP DEFINITIONS ──────────────────────────────────────────────────────
  const NEW_MESSAGE_STEPS = [
    { id: 'config', title: 'Architecture', icon: 'i-lucide:layout', component: NewMessageStep1 },
    { id: 'forge', title: 'Composition', icon: 'i-lucide:hammer', component: NewMessageStep2 },
    { id: 'final', title: 'Revue', icon: 'i-lucide:eye', component: NewMessageStep3 },
  ]

  const REPLY_STEPS = [
    { id: 'forge', title: 'Réponse', icon: 'i-lucide:reply', component: ReplyStep1 },
    { id: 'final', title: 'Validation', icon: 'i-lucide:check-circle', component: ReplyStep2 },
  ]


  const LAYOUT_STEPS = [
    { id: 'identity', title: 'Identité', icon: 'i-lucide:id-card', component: LayoutStep1 },
    { id: 'forge', title: 'Design', icon: 'i-lucide:palette', component: LayoutStep2 },
  ]

  const SETTINGS_STEPS = [
    { id: 'import_export', title: 'Import / Export', icon: 'i-lucide:package-2', component: EmlImportExport },
    { id: 'blacklist', title: 'Gestion Contacts', icon: 'i-lucide:shield-ban', component: BlacklistMgmt },
  ]

  const CAMPAGNE_STEPS = [
    { id: 'type_alias', title: 'Type & Expéditeur', icon: 'i-lucide:settings-2', component: CampagneStep1 },
    { id: 'contenu', title: 'Composition', icon: 'i-lucide:pencil', component: CampagneStep2 },
    { id: 'planification', title: 'Planification', icon: 'i-lucide:calendar-clock', component: CampagneStep3 },
  ]

  const NEWSLETTER_STEPS = CAMPAGNE_STEPS

  const MODELE_STEPS = [
    { id: 'identite', title: 'Identité', icon: 'i-lucide:tag', component: ModeleStep1 },
    { id: 'contenu', title: 'Contenu', icon: 'i-lucide:pencil', component: ModeleStep2 },
  ]


  // ─── RESOLVER ──────────────────────────────────────────────────────────────
  const currentModeConfig = computed(() => {
    const mode = composerMode.value
    
    // Priority: Reply Mode (Webmailer)
    if (isReplyMode.value) {
      return { 
        steps: REPLY_STEPS, 
        label: 'Réponse Rapide' 
      }
    }

    if (mode === 'newsletter') return { steps: NEWSLETTER_STEPS, label: 'Campagnes' }
    if (mode === 'layout') return { steps: LAYOUT_STEPS, label: 'Design Studio' }
    if (mode === 'automation') return { steps: NEW_MESSAGE_STEPS, label: 'Automations' }
    if (mode === 'campagne') return { steps: CAMPAGNE_STEPS, label: 'Campagnes Studio' }
    if (mode === 'modele') return { steps: MODELE_STEPS, label: 'Modèles Studio' }
    if (mode === 'import_export' || mode === 'blacklist_mgmt') {
      return { 
        steps: SETTINGS_STEPS, 
        label: 'Configuration',
        hasSidebar: true 
      }
    }
    
    return { steps: NEW_MESSAGE_STEPS, label: 'Webmailing' }
  })

  return {
    NEW_MESSAGE_STEPS,
    REPLY_STEPS,
    NEWSLETTER_STEPS,
    LAYOUT_STEPS,
    CAMPAGNE_STEPS,
    MODELE_STEPS,
    currentModeConfig
  }
}
