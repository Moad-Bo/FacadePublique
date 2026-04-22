<script setup lang="ts">
/**
 * Appearance Settings Component
 * Optimized with local state, save button, and navigation guards.
 */
const { session, fetchSession } = useSession();
const appConfig = useAppConfig() as any;
const notify = useNotify();
const colorMode = useColorMode();

const colors = ['red', 'orange', 'amber', 'yellow', 'lime', 'green', 'emerald', 'teal', 'cyan', 'sky', 'blue', 'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose'];
const neutrals = ['slate', 'gray', 'zinc', 'neutral', 'stone'];

const isSaving = ref(false);

// 1. Initial State from Session/AppConfig
const initialSettings = {
  primary: appConfig.ui.colors.primary,
  neutral: appConfig.ui.colors.neutral,
  fontFamily: (session.value?.user as any)?.fontFamily || 'font-sans',
  fontSize: (session.value?.user as any)?.fontSize || 'text-base'
};

// 2. Draft State (Local modifications)
const draft = reactive({ ...initialSettings });

// 3. Computed Dirty State
const isDirty = computed(() => {
  return draft.primary !== initialSettings.primary ||
         draft.neutral !== initialSettings.neutral ||
         draft.fontFamily !== initialSettings.fontFamily ||
         draft.fontSize !== initialSettings.fontSize;
});

// 4. Instant Preview Logic
watch(() => draft.primary, (val) => { appConfig.ui.colors.primary = val; });
watch(() => draft.neutral, (val) => { appConfig.ui.colors.neutral = val; });
watch([() => draft.fontFamily, () => draft.fontSize], () => {
    applyTypographyLocally();
});

const applyTypographyLocally = () => {
    if (import.meta.server) return;
    const root = document.documentElement;
    // Remove previous font/size classes
    const classesToRemove = Array.from(root.classList).filter(c => c.startsWith('font-') || c.startsWith('text-'));
    classesToRemove.forEach(c => root.classList.remove(c));
    
    // Add new ones
    root.classList.add(draft.fontFamily, draft.fontSize);
};

// 5. Navigation Guards (Modern Pattern - No next())
onBeforeRouteLeave((to, from) => {
  if (isDirty.value) {
    const confirm = window.confirm('Vous avez des modifications non enregistrées. Voulez-vous vraiment quitter ?');
    if (!confirm) return false;
  }
  return true;
});

useEventListener(window, 'beforeunload', (event) => {
  if (isDirty.value) {
    event.preventDefault();
    event.returnValue = '';
  }
});


// 6. Font Definitions
const fontFamilies = [
  { group: 'Esthétique', items: [
    { label: 'Sans-Serif (Moderne)', value: 'font-sans' },
    { label: 'Serif (Classique)', value: 'font-serif' },
    { label: 'Monospace (Technique)', value: 'font-mono' }
  ]},
  { group: 'Accessibilité', items: [
    { label: 'OpenDyslexic', value: 'font-dyslexic' },
    { label: 'Comic Sans MS', value: 'font-comic' },
    { label: 'Arial (Lisible)', value: 'font-arial' }
  ]}
];

const fontSizes = [
  { label: 'Petit', value: 'text-sm', icon: 'i-lucide-type' },
  { label: 'Standard', value: 'text-base', icon: 'i-lucide-type' },
  { label: 'Grand', value: 'text-lg', icon: 'i-lucide-type' }
];

// 7. Save Action
const handleSave = async () => {
  if (!session.value) return;
  isSaving.value = true;
  try {
    await $fetch('/api/user/settings', {
      method: 'PATCH',
      body: {
        themePrimary: draft.primary,
        themeNeutral: draft.neutral,
        fontFamily: draft.fontFamily,
        fontSize: draft.fontSize
      }
    });

    // Update initial state baseline
    Object.assign(initialSettings, draft);
    
    await fetchSession();
    notify.success('Préférences enregistrées', 'Votre interface a été mise à jour avec succès.');
  } catch (e) {
    notify.error('Erreur', 'Impossible de sauvegarder vos préférences.');
  } finally {
    isSaving.value = false;
  }
};

const resetChanges = () => {
    Object.assign(draft, initialSettings);
    appConfig.ui.colors.primary = initialSettings.primary;
    appConfig.ui.colors.neutral = initialSettings.neutral;
    applyTypographyLocally();
};

const resetToDefault = () => {
    const defaults = {
        primary: 'blue',
        neutral: 'slate',
        fontFamily: 'font-sans',
        fontSize: 'text-base'
    };
    Object.assign(draft, defaults);
    appConfig.ui.colors.primary = defaults.primary;
    appConfig.ui.colors.neutral = defaults.neutral;
    applyTypographyLocally();
    notify.info('Apparence réinitialisée', 'Les paramètres par défaut ont été appliqués (aperçu).');
};
</script>


<template>
  <div class="space-y-12">
    <header class="flex flex-col gap-1 pb-6 border-b border-neutral-200 dark:border-neutral-800">
      <div class="flex items-center justify-between">
        <h2 class="text-xl font-bold tracking-tight">Apparence & Thème</h2>
        <div class="flex items-center gap-3">
            <UButton 
                label="Défaut" 
                variant="ghost" 
                color="neutral" 
                size="xs" 
                icon="i-lucide-rotate-ccw"
                @click="resetToDefault" 
            />
            <UButton 
                v-if="isDirty" 
                label="Réinitialiser" 
                variant="ghost" 
                color="neutral" 
                size="xs" 
                @click="resetChanges" 
            />

            <UButton 
                :loading="isSaving" 
                :disabled="!isDirty"
                label="Enregistrer les modifications" 
                color="primary" 
                size="sm" 
                class="rounded-xl shadow-lg shadow-primary-500/20"
                icon="i-lucide-save"
                @click="handleSave"
            />
        </div>
      </div>
      <p class="text-sm text-neutral-500">Personnalisez les couleurs et le style de votre interface Kosmos.</p>
    </header>

    <!-- Theme Selection Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
      <!-- Primary Color -->
      <section class="space-y-4">
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-palette" class="w-5 h-5 text-primary-500" />
          <h3 class="font-bold uppercase text-xs tracking-widest text-neutral-400">Couleur Primaire</h3>
        </div>
        <div class="grid grid-cols-6 gap-2">
          <UButton
            v-for="color in colors"
            :key="color"
            square
            variant="ghost"
            :class="[
              `swatch-${color}`,
              'w-full aspect-square rounded-full transition-all hover:scale-110 active:scale-95 ring-2 ring-offset-2 ring-transparent flex items-center justify-center',
              draft.primary === color ? 'ring-primary-500 shadow-lg scale-110' : 'opacity-80 hover:opacity-100'
            ]"
            @click="draft.primary = color"
          >
            <UIcon v-if="draft.primary === color" name="i-lucide-check" class="text-white w-4 h-4" />
          </UButton>
        </div>
      </section>

      <!-- Neutral Color -->
      <section class="space-y-4">
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-brush" class="w-5 h-5 text-neutral-500" />
          <h3 class="font-bold uppercase text-xs tracking-widest text-neutral-400">Teinte de Neutre</h3>
        </div>
        <div class="grid grid-cols-5 gap-2">
          <UButton
            v-for="color in neutrals"
            :key="color"
            square
            variant="ghost"
            :class="[
              `swatch-${color}`,
              'w-full aspect-square rounded-full transition-all hover:scale-110 active:scale-95 ring-2 ring-offset-2 ring-transparent flex items-center justify-center',
              draft.neutral === color ? 'ring-neutral-500 shadow-lg scale-110' : 'opacity-80 hover:opacity-100'
            ]"
            @click="draft.neutral = color"
          >
            <UIcon v-if="draft.neutral === color" name="i-lucide-check" class="text-white w-4 h-4" />
          </UButton>
        </div>
      </section>

    </div>

    <!-- Mode Selection & Typography -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
      <!-- Mode Selection -->
      <section class="space-y-4">
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-sun-moon" class="w-5 h-5 text-neutral-500" />
          <h3 class="font-bold uppercase text-xs tracking-widest text-neutral-400">Mode d'affichage</h3>
        </div>
        <USelect 
          v-model="colorMode.preference" 
          :items="[
            { label: 'Clair', value: 'light', icon: 'i-lucide-sun' },
            { label: 'Sombre', value: 'dark', icon: 'i-lucide-moon' },
            { label: 'Système', value: 'system', icon: 'i-lucide-monitor' }
          ]" 
          class="rounded-xl"
        />
      </section>

      <!-- Typography -->
      <section class="space-y-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-baseline" class="w-5 h-5 text-neutral-500" />
            <h3 class="font-bold uppercase text-xs tracking-widest text-neutral-400">Typographie & Lecture</h3>
          </div>
        </div>
        
        <div class="space-y-3">
          <USelectMenu 
            v-model="draft.fontFamily" 
            :options="fontFamilies" 
            value-attribute="value" 
            option-attribute="label"
            class="rounded-xl"
          />

          <USelect 
            v-model="draft.fontSize" 
            :options="fontSizes" 
            class="rounded-xl"
          />
        </div>
      </section>
    </div>

    <!-- Unsaved Warning Callout -->
    <Transition name="fade">
        <div v-if="isDirty" class="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-3">
            <UIcon name="i-lucide-alert-triangle" class="w-5 h-5 text-amber-500 shrink-0" />
            <p class="text-xs text-amber-700 dark:text-amber-400 font-medium">
                Vous avez des modifications non enregistrées. N'oubliez pas de sauvegarder avant de quitter.
            </p>
        </div>
    </Transition>

    <!-- Preview Section -->
    <section class="p-8 rounded-[2.5rem] border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50 relative overflow-hidden">
      <div class="absolute -right-20 -top-20 w-64 h-64 bg-primary-500/5 rounded-full blur-3xl" />
      
      <div class="relative space-y-6">
        <div class="flex flex-col gap-1">
          <h4 class="font-black text-xs uppercase tracking-widest text-primary-500">Aperçu en temps réel</h4>
          <p class="text-[10px] text-neutral-500 font-medium">Voici comment les éléments s'affichent sur votre compte.</p>
        </div>

        <div class="flex flex-wrap gap-4">
          <UButton label="Exemple Solide" color="primary" class="rounded-xl shadow-lg shadow-primary-500/20" />
          <UButton label="Exemple Soft" variant="soft" color="primary" class="rounded-xl" />
          <UBadge label="Status" color="primary" variant="subtle" class="rounded-full px-4" />
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

/* Ensure color swatches have fallback or explicit colors if variables are missing */
.swatch-red { background-color: #ef4444 !important; }
.swatch-orange { background-color: #f97316 !important; }
.swatch-amber { background-color: #f59e0b !important; }
.swatch-yellow { background-color: #eab308 !important; }
.swatch-lime { background-color: #84cc16 !important; }
.swatch-green { background-color: #22c55e !important; }
.swatch-emerald { background-color: #10b981 !important; }
.swatch-teal { background-color: #14b8a6 !important; }
.swatch-cyan { background-color: #06b6d4 !important; }
.swatch-sky { background-color: #0ea5e9 !important; }
.swatch-blue { background-color: #3b82f6 !important; }
.swatch-indigo { background-color: #6366f1 !important; }
.swatch-violet { background-color: #8b5cf6 !important; }
.swatch-purple { background-color: #a855f7 !important; }
.swatch-fuchsia { background-color: #d946ef !important; }
.swatch-pink { background-color: #ec4899 !important; }
.swatch-rose { background-color: #f43f5e !important; }

/* Neutrals */
.swatch-slate { background-color: #64748b !important; }
.swatch-gray { background-color: #6b7280 !important; }
.swatch-zinc { background-color: #71717a !important; }
.swatch-neutral { background-color: #737373 !important; }
.swatch-stone { background-color: #78716c !important; }
</style>


