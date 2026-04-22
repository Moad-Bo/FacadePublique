import { ref, computed } from 'vue'

export const useComposer = () => {
  const notify = useNotify()

  // ─── STATE ──────────────────────────────────────────────────────────────────
  const isComposerOpen = useState('composer-open', () => false)
  const composerMode = useState<'new_message' | 'layout' | 'automation' | 'newsletter' | 'import_export' | 'blacklist_mgmt'>('composer-mode', () => 'new_message')
  const composerStep = useState('composer-step', () => 1)
  const isComposerLoading = useState('composer-loading', () => false)
  const isReplyMode = useState('composer-is-reply', () => false)
  
  // EML Import State
  const pendingMails = useState<any[]>('composer-pending-mails', () => [])

  // Universal Form
  const composerForm = useState('composer-form', () => ({
    id: '',                    // Mail ID, Draft ID, Layout ID, Template ID
    to: '',
    cc: '',
    bcc: '',
    subject: '',
    body: '',                  // HTML or Plain text
    name: '',                  // For Layouts / Campaigns
    description: '',           // For Layouts
    category: 'contact',       // For Layouts
    layoutId: 'inbox',         // Frame (Shell)
    contentLayoutId: '',       // Body structure
    templateId: '',            // Base Model
    attachments: [] as any[],
    showCcBcc: false,
    
    // Campaign / Automation specifics
    scheduledAt: '',
    recurrence: 'none' as 'none' | 'daily' | 'weekly' | 'monthly',
    recurrenceValue: '',
    timezone: 'Europe/Paris',
    fromContext: 'Support'
  }))

  const resetComposer = () => {
    composerForm.value = {
      id: '', to: '', cc: '', bcc: '', subject: '', body: '',
      name: '', description: '', category: 'contact',
      layoutId: 'inbox', contentLayoutId: '', templateId: '',
      attachments: [], showCcBcc: false,
      scheduledAt: '', recurrence: 'none', recurrenceValue: '', 
      timezone: 'Europe/Paris',
      fromContext: 'Support'
    }
    composerStep.value = 1
    isReplyMode.value = false
    pendingMails.value = []
  }

  const openComposer = (opts: { 
    mode: 'new_message' | 'layout' | 'automation' | 'newsletter' | 'import_export' | 'blacklist_mgmt',
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
    
    // If it's a creation, usually start at step 1. 
    // If editing existing, go to editor (step 2 or 3)
    composerStep.value = (opts.isCreation) ? 1 : 2

    // Fill form
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
      const res = await $fetch<any>('/api/newsletter/campaigns', {
        method: 'POST',
        body: {
          ...composerForm.value,
          content: composerForm.value.body, // S'assurer que 'content' est envoyé (attendu par Zod)
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
          toAccount: 'contact' // Valeur par défaut attendue par le backend
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
      // 1. Obtenir le contrat d'upload direct (Presigned POST)
      const { post, key, publicUrl } = await $fetch<any>('/api/assets/upload-contract', {
        query: {
          filename: file.name,
          contentType: file.type,
          type: 'attachments'
        }
      })

      // 2. Préparer le FormData pour S3
      const formData = new FormData()
      Object.entries(post.fields).forEach(([k, v]) => {
        formData.append(k, v as string)
      })
      formData.append('file', file) // Le fichier doit être le dernier champ

      // 3. Upload direct vers S3
      await $fetch(post.url, {
        method: 'POST',
        body: formData
      })

      // 4. Ajouter à la liste des pièces jointes
      composerForm.value.attachments.push({
        id: key, // Utiliser la clé S3 comme ID unique
        filename: file.name,
        contentType: file.type,
        size: file.size,
        r2Key: key,
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
