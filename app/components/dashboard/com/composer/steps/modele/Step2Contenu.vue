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

// Sujet par défaut
const bodyLength = computed(() => (formData.value.body || '').replace(/<[^>]*>/g, '').length)

const hasPlaceholders = computed(() => {
  const b = formData.value.body || ''
  return b.includes('%recipient.') || b.includes('{user}') || b.includes('{name}')
})

const tips = [
  'Utilisez <strong>%recipient.name%</strong> pour personnaliser le prénom.',
  'Utilisez <strong>%recipient.token%</strong> pour générer un lien de désinscription unique.',
  'Le layout sélectionné à l\'étape précédente encapsule ce contenu automatiquement.',
]
</script>

<template>
  <div class="h-full flex gap-8 p-10 animate-in fade-in slide-in-from-right-4 duration-500 overflow-hidden">

    <!-- LEFT: FORM + TIPS -->
    <div class="w-96 flex flex-col gap-6 overflow-y-auto scrollbar-thin shrink-0">

      <div class="space-y-1">
        <div class="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full border border-primary/20">
          <UIcon name="i-lucide:pencil" class="size-4 text-primary" />
          <span class="text-[10px] font-black uppercase tracking-widest text-primary">Étape 2 — Contenu</span>
        </div>
        <h2 class="text-2xl font-black uppercase italic tracking-tighter">Composition</h2>
      </div>

      <!-- Sujet par défaut -->
      <div class="bg-white dark:bg-neutral-900 rounded-2xl border border-default p-4 space-y-3">
        <div>
          <p class="text-[10px] font-black uppercase tracking-widest text-dimmed mb-0.5">
            Sujet par défaut <span class="text-error-500">*</span>
          </p>
          <p class="text-[10px] text-dimmed italic">Pré-rempli lors de l'utilisation de ce modèle dans une campagne.</p>
        </div>
        <UInput
          v-model="formData.subject"
          placeholder="ex : [Techknè] Votre newsletter du mois"
          :ui="{ base: 'font-bold' }"
        />
      </div>

      <!-- Stats du contenu -->
      <div class="bg-white dark:bg-neutral-900 rounded-2xl border border-default p-4 space-y-3">
        <p class="text-[10px] font-black uppercase tracking-widest text-dimmed">Indicateurs</p>
        <div class="space-y-2.5">
          <div class="flex items-center justify-between text-xs">
            <span class="text-dimmed font-bold">Caractères (sans HTML)</span>
            <span class="font-black" :class="bodyLength > 100 ? 'text-success-500' : 'text-warning-500'">{{ bodyLength }}</span>
          </div>
          <div class="flex items-center justify-between text-xs">
            <span class="text-dimmed font-bold">Personnalisation</span>
            <UBadge
              :label="hasPlaceholders ? 'Oui' : 'Non'"
              size="xs"
              :color="hasPlaceholders ? 'success' : 'neutral'"
              variant="soft"
            />
          </div>
          <div class="flex items-center justify-between text-xs">
            <span class="text-dimmed font-bold">Sujet renseigné</span>
            <UBadge
              :label="formData.subject ? 'Oui' : 'Non'"
              size="xs"
              :color="formData.subject ? 'success' : 'error'"
              variant="soft"
            />
          </div>
        </div>
      </div>

      <!-- Variables disponibles -->
      <div class="bg-neutral-50 dark:bg-neutral-800/40 rounded-2xl border border-default p-4 space-y-3">
        <p class="text-[10px] font-black uppercase tracking-widest text-dimmed">Variables Mailgun disponibles</p>
        <div class="space-y-1.5">
          <div v-for="tip in tips" :key="tip" class="flex items-start gap-2">
            <UIcon name="i-lucide:variable" class="size-3 text-primary mt-0.5 shrink-0" />
            <p class="text-[10px] text-dimmed leading-relaxed" v-html="tip" />
          </div>
        </div>
      </div>
    </div>

    <!-- RIGHT: ÉDITEUR + PREVIEW -->
    <div class="flex-1 flex flex-col gap-4 overflow-hidden min-w-0">

      <!-- Éditeur riche — shared RichEditor -->
      <div class="flex-1 bg-white dark:bg-neutral-900 rounded-[2rem] border border-default overflow-hidden min-h-0 flex flex-col">
        <div class="px-6 py-3 border-b border-default flex items-center justify-between bg-neutral-50/50 dark:bg-neutral-900/50 shrink-0">
          <p class="text-[10px] font-black uppercase tracking-widest text-dimmed">
            Éditeur de contenu <span class="text-error-500">*</span>
          </p>
          <span class="text-[10px] font-bold text-primary italic">Mode HTML enrichi</span>
        </div>
        <div class="flex-1 min-h-0">
          <DashboardComSharedRichEditor v-model="formData.body" />
        </div>
      </div>

      <!-- Prévisualisation live — EmailPreview.client.vue (shared) -->
      <div class="bg-white dark:bg-neutral-900 rounded-[2rem] border border-default overflow-hidden shrink-0" style="height: 300px;">
        <div class="px-6 py-3 border-b border-default flex items-center justify-between bg-neutral-50/50 dark:bg-neutral-900/50">
          <p class="text-[10px] font-black uppercase tracking-widest text-dimmed">Prévisualisation en direct</p>
          <UBadge label="Live" color="success" size="xs" variant="soft" />
        </div>
        <div class="h-full pb-10">
          <DashboardComSharedEmailPreview
            :content="formData.body || ''"
            :subject="formData.subject"
            :layout-id="formData.layoutId || 'campaign'"
            :zoom="80"
          />
        </div>
      </div>
    </div>

  </div>
</template>
