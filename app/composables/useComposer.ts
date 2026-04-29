import { ref, watch, onMounted } from 'vue'
import type { CampaignTypeId } from './useCampaigns'
import { useSessionStorage } from '@vueuse/core'

export const useComposer = () => {
  const notify = useNotify()

  // ─── ÉTATS PERSISTANTS (Légers) ─────────────────────────────────────────────
  const isComposerOpen = useSessionStorage('composer-open', false)
  const composerMode = useSessionStorage<'new_message' | 'layout' | 'automation' | 'newsletter' | 'import_export' | 'blacklist_mgmt' | 'campagne' | 'modele'>('composer-mode', 'new_message')
  const composerStep = useSessionStorage('composer-step', 1)
  const isReplyMode = useSessionStorage('composer-is-reply', false)
  
  // ─── ÉTATS EN MÉMOIRE (Potentiellement lourds) ──────────────────────────────
  const isComposerLoading = useState('composer-loading', () => false)
  const pendingMails = useState<any[]>('composer-pending-mails', () => [])

  // Universal Form
  const composerForm = useState('composer-form', () => ({
    id: '',                    // Mail ID, Draft ID, Layout ID, Template ID
    to: '',
    cc: '',
    bcc: '',
    subject: '',
    body: '',                  // HTML or Plain text (NON PERSISTÉ DANS STORAGE)
    name: '',                  // For Layouts / Campaigns
    description: '',           // For Layouts
    category: 'contact',       // For Layouts
    layoutId: 'inbox',         // Frame (Shell)
    contentLayoutId: '',       // Body structure
    templateId: '',            // Base Model
    attachments: [] as any[],
    showCcBcc: false,
    scheduledAt: '',
    recurrence: 'none' as 'none' | 'daily' | 'weekly' | 'monthly',
    recurrenceValue: '',
    timezone: 'Europe/Paris',
    fromContext: 'Newsletter',
    campaignType: 'campaign_newsletter' as CampaignTypeId,
  }))

  // ─── LOGIQUE DE PERSISTANCE SÉLECTIVE ───────────────────────────────────────
  // On ne persiste que les métadonnées pour éviter les lags de sérialisation JSON
  // sur de gros corps de messages (plusieurs Mo).
  if (import.meta.client) {
    onMounted(() => {
      const saved = sessionStorage.getItem('composer-form-meta')
      if (saved) {
        try {
          const meta = JSON.parse(saved)
          // On fusionne les métadonnées en préservant le body s'il existe déjà
          Object.assign(composerForm.value, { ...meta, body: composerForm.value.body })
        } catch (e) {
          console.warn('[Composer] Échec de restauration des métadonnées')
        }
      }
    })

    // Watcher pour sauvegarder les métadonnées (debouncé implicitement par la boucle d'event)
    watch(composerForm, (val) => {
      const { body, ...meta } = val
      sessionStorage.setItem('composer-form-meta', JSON.stringify(meta))
    }, { deep: true })
  }

  const resetComposer = () => {
    composerForm.value = {
      id: '', to: '', cc: '', bcc: '', subject: '', body: '',
      name: '', description: '', category: 'contact',
      layoutId: 'inbox', contentLayoutId: '', templateId: '',
      attachments: [], showCcBcc: false,
      scheduledAt: '', recurrence: 'none', recurrenceValue: '',
      timezone: 'Europe/Paris',
      fromContext: 'Newsletter',
      campaignType: 'campaign_newsletter' as CampaignTypeId,
    }
    composerStep.value = 1
    isReplyMode.value = false
    pendingMails.value = []
    if (import.meta.client) sessionStorage.removeItem('composer-form-meta')
  }

  const openComposer = (opts: { 
    mode: 'new_message' | 'layout' | 'automation' | 'newsletter' | 'import_export' | 'blacklist_mgmt' | 'campagne' | 'modele',
    isCreation?: boolean,
    id?: string,
    to?: string,
    cc?: string,
    bcc?: string,
    subject?: string,
    body?: string,
    name?: string,
    description?: string,
    category?: string,
    layoutId?: string,
    templateId?: string,
    contentLayoutId?: string,
    scheduledAt?: string,
    recurrence?: any,
    isReply?: boolean,
    attachments?: any[]
  }) => {
    resetComposer()
    composerMode.value = opts.mode
    isReplyMode.value = opts.isReply || false
    
    composerStep.value = (opts.isCreation) ? 1 : 2

    // Remplissage du formulaire
    if (opts.id) composerForm.value.id = opts.id
    if (opts.to) composerForm.value.to = opts.to
    if (opts.cc) composerForm.value.cc = opts.cc
    if (opts.bcc) composerForm.value.bcc = opts.bcc
    if (opts.subject) composerForm.value.subject = opts.subject
    if (opts.body) composerForm.value.body = opts.body
    if (opts.name) composerForm.value.name = opts.name
    if (opts.description) composerForm.value.description = opts.description
    if (opts.category) composerForm.value.category = opts.category
    if (opts.layoutId) composerForm.value.layoutId = opts.layoutId
    if (opts.templateId) composerForm.value.templateId = opts.templateId
    if (opts.contentLayoutId) composerForm.value.contentLayoutId = opts.contentLayoutId
    if (opts.scheduledAt) composerForm.value.scheduledAt = opts.scheduledAt
    if (opts.recurrence) composerForm.value.recurrence = opts.recurrence
    if (opts.attachments) composerForm.value.attachments = [...opts.attachments]

    isComposerOpen.value = true
  }

  const closeComposer = () => {
    isComposerOpen.value = false
    resetComposer()
  }

  // ─── ACTIONS ────────────────────────────────────────────────────────────────
  const saveLayout = async () => {
    isComposerLoading.value = true
    try {
      const res = await $fetch<any>('/api/mails/layouts', {
        method: 'POST',
        body: {
          action: composerForm.value.id ? 'update' : 'create',
          id: composerForm.value.id,
          name: composerForm.value.name,
          category: composerForm.value.category,
          description: composerForm.value.description,
          html: composerForm.value.body
        }
      })
      if (res.success) {
        notify.success('Layout enregistré')
        return true
      }
    } catch (e: any) {
      notify.error('Erreur Layout', e.message)
    } finally {
      isComposerLoading.value = false
    }
    return false
  }

  const saveCampaign = async (action: 'publish' | 'draft' = 'publish') => {
    isComposerLoading.value = true
    try {
      const res = await $fetch<any>('/api/campaign/campaigns', {
        method: 'POST',
        body: {
          ...composerForm.value,
          content: composerForm.value.body,
          action
        }
      })
      if (res.success) {
        notify.success(action === 'publish' ? 'Campagne publiée' : 'Brouillon enregistré')
        return true
      }
    } catch (e: any) {
      notify.error('Erreur Campagne', e.message)
    } finally {
      isComposerLoading.value = false
    }
    return false
  }

  const saveDraft = async () => {
    isComposerLoading.value = true
    try {
      await $fetch('/api/mails/drafts', {
        method: 'POST',
        body: {
          id: composerForm.value.id,
          to: composerForm.value.to,
          cc: composerForm.value.cc,
          bcc: composerForm.value.bcc,
          subject: composerForm.value.subject,
          body: composerForm.value.body,
          layoutId: composerForm.value.layoutId,
          attachments: composerForm.value.attachments.map(a => a.id),
          toAccount: 'contact'
        }
      })
      notify.success('Brouillon sauvegardé')
    } catch (e: any) {
      notify.error('Erreur Draft', e.message)
    } finally {
      isComposerLoading.value = false
    }
  }

  const uploadAttachment = async (file: File) => {
    isComposerLoading.value = true
    try {
      const { post, key, publicUrl } = await $fetch<any>('/api/assets/upload-contract', {
        query: {
          filename: file.name,
          contentType: file.type,
          type: 'attachments'
        }
      })

      const formData = new FormData()
      Object.entries(post.fields).forEach(([k, v]) => {
        formData.append(k, v as string)
      })
      formData.append('file', file)

      await $fetch(post.url, {
        method: 'POST',
        body: formData
      })

      composerForm.value.attachments.push({
        id: key,
        filename: file.name,
        contentType: file.type,
        size: file.size,
        s3Key: key,
        publicUrl
      })

      notify.success('Pièce jointe ajoutée')
    } catch (e: any) {
      console.error('Upload error:', e)
      notify.error('Upload échoué', e.message)
    } finally {
      isComposerLoading.value = false
    }
  }

  const parseEmlOnServer = async (files: File[]) => {
    isComposerLoading.value = true
    try {
      const { parseEMLFiles } = useMailAssembler()
      const mails = await parseEMLFiles(files)
      if (mails && mails.length > 0) {
        pendingMails.value.push(...mails.map((m: any) => ({
          ...m,
          id: m.id || Math.random().toString(36).substring(7),
          folderId: null
        })))
        notify.success(`${mails.length} fichiers analysés`)
      }
    } catch (e: any) {
      notify.error('Erreur Parsing', e.message)
    } finally {
      isComposerLoading.value = false
    }
  }

  return {
    isComposerOpen,
    composerMode,
    composerStep,
    isComposerLoading,
    composerForm,
    isReplyMode,
    pendingMails,
    openComposer,
    closeComposer,
    saveLayout,
    saveCampaign,
    saveDraft,
    uploadAttachment,
    parseEmlOnServer
  }
}
