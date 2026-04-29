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

// Icônes disponibles pour le picker
const iconOptions = [
  'i-lucide:mail', 'i-lucide:newspaper', 'i-lucide:megaphone', 'i-lucide:gift',
  'i-lucide:star', 'i-lucide:heart', 'i-lucide:bell', 'i-lucide:tag',
  'i-lucide:zap', 'i-lucide:sparkles', 'i-lucide:rocket', 'i-lucide:globe',
]

const selectIcon = (ico: string) => {
  formData.value = { ...formData.value, icon: ico }
}

const selectLayout = (layoutId: string) => {
  formData.value = { ...formData.value, layoutId }
}

const selectCategory = (cat: string) => {
  formData.value = { ...formData.value, category: cat }
}

// Catégories de layout — alignées avec emailLayout.category en base
const layoutCategories = [
  { id: 'newsletter',  label: 'Newsletter', icon: 'i-lucide:megaphone', color: 'text-primary' },
  { id: 'contact',     label: 'Contact', icon: 'i-lucide:users', color: 'text-info-500' },
  { id: 'system',      label: 'Système', icon: 'i-lucide:cpu', color: 'text-warning-500' },
]
</script>

<template>
  <div class="h-full flex flex-col p-12 animate-in fade-in slide-in-from-right-4 duration-500 overflow-y-auto scrollbar-thin">
    <div class="max-w-3xl mx-auto w-full space-y-10">

      <!-- HEADER -->
      <div class="space-y-2 text-center">
        <div class="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full border border-primary/20 mb-2">
          <UIcon name="i-lucide:tag" class="size-4 text-primary" />
          <span class="text-[10px] font-black uppercase tracking-widest text-primary">Étape 1 — Identité</span>
        </div>
        <h2 class="text-4xl font-black uppercase italic tracking-tighter">Identité du Modèle</h2>
        <p class="text-dimmed text-sm uppercase tracking-widest font-bold">
          Nommez, décrivez et configurez votre template réutilisable.
        </p>
      </div>

      <!-- FORMULAIRE PRINCIPAL -->
      <div class="grid gap-8 p-10 bg-white dark:bg-neutral-900 rounded-[3rem] border border-default shadow-2xl relative overflow-hidden">
        <!-- Accent visuel -->
        <div class="absolute -top-20 -right-20 size-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

        <div class="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
          <!-- Nom + Description -->
          <div class="space-y-6">
            <UFormField label="Nom du modèle" required :ui="{ label: 'text-[10px] uppercase font-black tracking-widest text-dimmed ml-1' }">
              <UInput
                v-model="formData.name"
                placeholder="ex : Newsletter Premium v1"
                variant="none"
                class="bg-neutral-50 dark:bg-neutral-950/40 rounded-2xl px-4 py-3 ring-1 ring-default shadow-sm focus-within:ring-primary font-bold"
              />
            </UFormField>

            <UFormField label="Description" :ui="{ label: 'text-[10px] uppercase font-black tracking-widest text-dimmed ml-1' }">
              <UTextarea
                v-model="formData.description"
                placeholder="À quoi sert ce modèle ?"
                variant="none"
                class="bg-neutral-50 dark:bg-neutral-950/40 rounded-2xl px-4 py-3 ring-1 ring-default shadow-sm focus-within:ring-primary min-h-[100px]"
              />
            </UFormField>

            <!-- Catégorie (usage du modèle) -->
            <div>
              <p class="text-[10px] uppercase font-black tracking-widest text-dimmed ml-1 mb-3">Catégorie d'usage</p>
              <div class="grid grid-cols-1 gap-2">
                <div
                  v-for="cat in layoutCategories"
                  :key="cat.id"
                  class="flex items-center gap-4 px-4 py-3 rounded-2xl cursor-pointer transition-all border border-default hover:border-primary/40"
                  :class="formData.category === cat.id ? 'bg-primary/10 border-primary/30 shadow-sm' : 'bg-neutral-50/50 dark:bg-neutral-900/50'"
                  @click="selectCategory(cat.id)"
                >
                  <div class="size-8 rounded-xl flex items-center justify-center bg-white dark:bg-black shadow-sm" :class="cat.color">
                    <UIcon :name="cat.icon" class="size-4" />
                  </div>
                  <div class="flex-1">
                    <p class="text-[11px] font-black uppercase tracking-tight">{{ cat.label }}</p>
                    <p class="text-[9px] text-dimmed italic">{{ cat.id }}</p>
                  </div>
                  <div v-if="formData.category === cat.id" class="size-4 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/30 animate-in zoom-in-50">
                    <UIcon name="i-lucide:check" class="size-2 text-white" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Icône + Layout -->
          <div class="space-y-6">
            <!-- Icône picker -->
            <div>
              <p class="text-[10px] uppercase font-black tracking-widest text-dimmed ml-1 mb-3">Icône représentative</p>
              <div class="grid grid-cols-6 gap-2">
                <button
                  v-for="ico in iconOptions"
                  :key="ico"
                  type="button"
                  class="size-10 rounded-xl border-2 flex items-center justify-center transition-all"
                  :class="formData.icon === ico
                    ? 'border-primary bg-primary/10 text-primary shadow-md shadow-primary/20 scale-110'
                    : 'border-default bg-neutral-50 dark:bg-neutral-800 text-dimmed hover:border-primary/40'"
                  @click="selectIcon(ico)"
                >
                  <UIcon :name="ico" class="size-4" />
                </button>
              </div>
            </div>

            <!-- Aperçu carte -->
            <div v-if="formData.name" class="p-5 bg-primary/5 rounded-2xl border border-primary/20 animate-in fade-in duration-300">
              <p class="text-[9px] font-black uppercase text-dimmed mb-3">Aperçu de la carte</p>
              <div class="flex items-center gap-3">
                <div class="size-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                  <UIcon :name="formData.icon || 'i-lucide:mail'" class="size-6" />
                </div>
                <div>
                  <p class="font-black text-sm">{{ formData.name }}</p>
                  <p class="text-xs text-dimmed">{{ formData.description || 'Aucune description' }}</p>
                  <UBadge :label="formData.category || 'newsletter'" size="xs" variant="soft" class="mt-1" />
                </div>
              </div>
            </div>

            <!-- Layout de base -->
            <div>
              <p class="text-[10px] uppercase font-black tracking-widest text-dimmed ml-1 mb-3">Layout de rendu</p>
              <div class="space-y-2">
                <div
                  v-for="layout in (layouts.length ? layouts : [{id:'campaign', name:'Campaign (défaut)', category:'newsletter'}])"
                  :key="layout.id"
                  class="flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all"
                  :class="formData.layoutId === layout.id ? 'border-primary bg-primary/5' : 'border-default hover:border-neutral-300'"
                  @click="selectLayout(layout.id)"
                >
                  <UIcon name="i-lucide:layout" class="size-4" :class="formData.layoutId === layout.id ? 'text-primary' : 'text-dimmed'" />
                  <div>
                    <p class="text-xs font-bold">{{ layout.name }}</p>
                    <p class="text-[9px] text-dimmed uppercase">{{ layout.category }}</p>
                  </div>
                  <div v-if="formData.layoutId === layout.id" class="ml-auto size-4 rounded-full bg-primary flex items-center justify-center">
                    <UIcon name="i-lucide:check" class="size-2 text-white" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- CONSEIL -->
      <div class="p-6 bg-warning-500/5 rounded-3xl border border-warning-500/20 flex items-start gap-4">
        <UIcon name="i-lucide:lightbulb" class="size-5 text-warning-500 mt-1 shrink-0" />
        <div>
          <p class="text-[10px] font-black uppercase tracking-widest text-warning-500 mb-1">Guide de conception</p>
          <p class="text-xs text-warning-500/80 leading-relaxed font-medium">
            Un bon nom + une icône reconnaissable rendent vos modèles faciles à identifier lors de la création d'une campagne.
            Le layout de rendu détermine l'habillage Header/Footer appliqué automatiquement.
          </p>
        </div>
      </div>

    </div>
  </div>
</template>
