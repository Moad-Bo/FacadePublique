<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  modelValue: any
  layouts: any[]
}>()

const emit = defineEmits(['update:modelValue'])

const formData = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

// Templates disponibles
const templates = ref<any[]>([])
const loadingTemplates = ref(false)

const fetchTemplates = async () => {
  loadingTemplates.value = true
  try {
    const res = await $fetch<any>('/api/campaign/templates')
    if (res.success) templates.value = res.templates
  } finally {
    loadingTemplates.value = false
  }
}

onMounted(fetchTemplates)

const selectTemplate = (tpl: any) => {
  formData.value = {
    ...formData.value,
    templateId: tpl.id,
    // Pré-remplir l'objet si vide
    subject: formData.value.subject || tpl.subject || '',
    // Pré-remplir le body si vide
    body: formData.value.body || tpl.content || '',
  }
}

const clearTemplate = () => {
  formData.value = { ...formData.value, templateId: '' }
}
</script>

<template>
  <div class="h-full flex flex-col p-10 animate-in fade-in slide-in-from-right-4 duration-500 overflow-y-auto scrollbar-thin">
    <!-- DESTINATAIRE ANCHOR -->
    <div id="forge-header" class="hidden" />
    <div class="max-w-4xl mx-auto w-full space-y-8">

      <!-- HEADER -->
      <div class="space-y-2">
        <div class="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full border border-primary/20 mb-2">
          <UIcon name="i-lucide:pencil" class="size-4 text-primary" />
          <span class="text-[10px] font-black uppercase tracking-widest text-primary">Étape 2 — Contenu</span>
        </div>
        <h2 class="text-3xl font-black uppercase italic tracking-tighter">Composition</h2>
        <p class="text-dimmed text-sm uppercase tracking-widest font-bold">
          Rédigez votre message ou partez d'un modèle existant.
        </p>
      </div>

      <!-- SÉLECTION MODÈLE -->
      <div class="bg-white dark:bg-neutral-900 rounded-[2rem] border border-default p-6 space-y-4">
        <div class="flex items-center justify-between">
          <p class="text-[10px] font-black uppercase tracking-widest text-dimmed">Modèle de base</p>
          <UButton
            v-if="formData.templateId"
            label="Effacer"
            icon="i-lucide:x"
            variant="ghost"
            color="neutral"
            size="xs"
            @click="clearTemplate"
          />
        </div>

        <div v-if="loadingTemplates" class="flex items-center justify-center py-8 text-dimmed">
          <UIcon name="i-lucide:loader-2" class="size-5 animate-spin mr-2" />
          <span class="text-xs font-bold">Chargement des modèles...</span>
        </div>

        <div v-else class="grid grid-cols-2 md:grid-cols-4 gap-3">
          <!-- Vierge -->
          <button
            type="button"
            class="p-4 rounded-2xl border-2 cursor-pointer transition-all text-center"
            :class="!formData.templateId ? 'border-primary bg-primary/5' : 'border-default bg-neutral-50/50 dark:bg-neutral-900/50 hover:border-neutral-300'"
            @click="clearTemplate"
          >
            <UIcon name="i-lucide:file-plus" class="size-6 mx-auto mb-2" :class="!formData.templateId ? 'text-primary' : 'text-dimmed'" />
            <p class="text-xs font-black uppercase" :class="!formData.templateId ? 'text-primary' : 'text-dimmed'">Vierge</p>
          </button>

          <!-- Templates existants -->
          <button
            v-for="tpl in templates"
            :key="tpl.id"
            type="button"
            class="p-4 rounded-2xl border-2 cursor-pointer transition-all text-center"
            :class="formData.templateId === tpl.id ? 'border-primary bg-primary/5' : 'border-default bg-neutral-50/50 dark:bg-neutral-900/50 hover:border-neutral-300'"
            @click="selectTemplate(tpl)"
          >
            <UIcon :name="tpl.icon || 'i-lucide:mail'" class="size-6 mx-auto mb-2 text-primary" />
            <p class="text-xs font-black uppercase truncate">{{ tpl.name }}</p>
          </button>
        </div>
      </div>

      <!-- OBJET -->
      <div class="bg-white dark:bg-neutral-900 rounded-[2rem] border border-default p-6 space-y-3">
        <div>
          <p class="text-[10px] font-black uppercase tracking-widest text-dimmed mb-0.5">
            Objet de l'email <span class="text-error-500">*</span>
          </p>
          <p class="text-xs text-dimmed italic">L'objet est le premier élément vu par vos destinataires.</p>
        </div>
        <UInput
          v-model="formData.subject"
          placeholder="ex : 🚀 Votre Newsletter d'Avril — Toutes les nouveautés"
          size="lg"
          :ui="{ base: 'font-bold' }"
        />
        <div class="flex items-center gap-2 text-[10px] text-dimmed">
          <UIcon name="i-lucide:info" class="size-3" />
          <span>{{ (formData.subject || '').length }} / 150 caractères recommandés</span>
          <span v-if="(formData.subject || '').length > 60" class="text-warning-500 font-bold">
            — Long : risque de coupure dans certains clients mail
          </span>
        </div>
      </div>

      <!-- ÉDITEUR RICHE -->
      <div class="bg-white dark:bg-neutral-900 rounded-[2rem] border border-default overflow-hidden">
        <div class="px-6 pt-5 pb-3 border-b border-default">
          <p class="text-[10px] font-black uppercase tracking-widest text-dimmed">
            Contenu HTML <span class="text-error-500">*</span>
          </p>
          <p class="text-xs text-dimmed italic mt-0.5">
            Utilisez les variables <code class="bg-neutral-100 dark:bg-neutral-800 px-1 rounded">%recipient.name%</code>
            pour personnaliser chaque envoi via Mailgun.
          </p>
        </div>

        <!-- Shared RichEditor — même composant que le webmailer -->
        <div class="min-h-72">
          <DashboardComSharedRichEditor v-model="formData.body" />
        </div>
      </div>

      <!-- APERÇU EMAIL — utilise EmailPreview.client.vue (shared) -->
      <div class="bg-white dark:bg-neutral-900 rounded-[2rem] border border-default overflow-hidden">
        <div class="px-6 pt-5 pb-3 border-b border-default flex items-center justify-between">
          <div>
            <p class="text-[10px] font-black uppercase tracking-widest text-dimmed">Prévisualisation</p>
            <p class="text-xs text-dimmed italic mt-0.5">Rendu dans le layout sélectionné</p>
          </div>
          <UBadge label="Live" color="success" size="xs" variant="soft" />
        </div>
        <div class="h-80">
          <DashboardComSharedEmailPreview
            :content="formData.body || ''"
            :subject="formData.subject"
            :layout-id="formData.layoutId || 'campaign'"
            :zoom="90"
          />
        </div>
      </div>

    </div>
  </div>
</template>
