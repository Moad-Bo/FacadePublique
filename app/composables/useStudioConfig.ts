import { computed, defineAsyncComponent } from 'vue'

export const useStudioConfig = () => {
  const { composerMode, isReplyMode } = useComposer()

  // ─── STEP COMPONENTS (Direct Async Imports) ───────────────────────────────
  const NewMessageStep1 = defineAsyncComponent(() => import('@/components/dashboard/com/composer/steps/new_message/Step1Design.vue'))
  const NewMessageStep2 = defineAsyncComponent(() => import('@/components/dashboard/com/composer/steps/new_message/Step2Forge.vue'))
  const NewMessageStep3 = defineAsyncComponent(() => import('@/components/dashboard/com/composer/steps/new_message/Step3Final.vue'))

  const ReplyStep1 = defineAsyncComponent(() => import('@/components/dashboard/com/composer/steps/reply/Step1Forge.vue'))
  const ReplyStep2 = defineAsyncComponent(() => import('@/components/dashboard/com/composer/steps/reply/Step2Final.vue'))

  const NewsletterStep1 = defineAsyncComponent(() => import('@/components/dashboard/com/composer/steps/newsletter/modele/Step1Planning.vue'))
  const NewsletterStep2 = defineAsyncComponent(() => import('@/components/dashboard/com/composer/steps/newsletter/modele/Step2Architecture.vue'))
  const NewsletterStep3 = defineAsyncComponent(() => import('@/components/dashboard/com/composer/steps/newsletter/modele/Step3Forge.vue'))

  const LayoutStep1 = defineAsyncComponent(() => import('@/components/dashboard/com/composer/steps/layout/new-layout/Step1Identity.vue'))
  const LayoutStep2 = defineAsyncComponent(() => import('@/components/dashboard/com/composer/steps/layout/new-layout/Step2Forge.vue'))
  
  // Settings Management (Import/Export & Blacklist)
  const EmlImportExport = defineAsyncComponent(() => import('@/components/dashboard/com/webmailer/EmlFileSystem.vue'))
  const BlacklistMgmt = defineAsyncComponent(() => import('@/components/dashboard/com/webmailer/BlacklistManager.vue'))

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

  const NEWSLETTER_STEPS = [
    { id: 'planning', title: 'Planning', icon: 'i-lucide:calendar-range', component: NewsletterStep1 },
    { id: 'architecture', title: 'Structure', icon: 'i-lucide:layers', component: NewsletterStep2 },
    { id: 'forge', title: 'Composition', icon: 'i-lucide:hammer', component: NewsletterStep3 },
  ]

  const LAYOUT_STEPS = [
    { id: 'identity', title: 'Identité', icon: 'i-lucide:id-card', component: LayoutStep1 },
    { id: 'forge', title: 'Design', icon: 'i-lucide:palette', component: LayoutStep2 },
  ]

  const SETTINGS_STEPS = [
    { id: 'import_export', title: 'Import / Export', icon: 'i-lucide:package-2', component: EmlImportExport },
    { id: 'blacklist', title: 'Gestion Contacts', icon: 'i-lucide:shield-ban', component: BlacklistMgmt },
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
    currentModeConfig
  }
}
