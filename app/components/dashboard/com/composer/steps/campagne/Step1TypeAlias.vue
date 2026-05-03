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

const { fetchSettings, getAliasForType } = useCampaigns()

// Audience estimée selon le type sélectionné
const audienceCount = ref<number | null>(null)
const loadingAudience = ref(false)

const fetchAudienceCount = async (type: CampaignTypeId) => {
  loadingAudience.value = true
  try {
    const subs = await $fetch<any[]>('/api/campaign/audience')
    const conf = CAMPAIGN_TYPES.find(t => t.id === type)!
    audienceCount.value = subs.filter(s => s[conf.optInField] === true && s.isActive).length
  } catch {
    audienceCount.value = null
  } finally {
    loadingAudience.value = false
  }
}

onMounted(() => {
  fetchSettings()
  fetchAudienceCount(formData.value.campaignType || 'campaign_newsletter')
})

watch(() => formData.value.campaignType, (type) => {
  if (type) fetchAudienceCount(type)
})

const resolvedAlias = computed(() => getAliasForType(formData.value.campaignType || 'campaign_newsletter'))
const selectedTypeConfig = computed(() =>
  CAMPAIGN_TYPES.find(t => t.id === formData.value.campaignType) || CAMPAIGN_TYPES[0]
)

const updateType = (typeId: CampaignTypeId) => {
  formData.value = { ...formData.value, campaignType: typeId }
}
</script>

<template>
  <div class="h-full flex flex-col p-10 animate-in fade-in slide-in-from-right-4 duration-500 overflow-y-auto scrollbar-thin">
    <div class="max-w-3xl mx-auto w-full space-y-10">

      <!-- HEADER -->
      <div class="space-y-2">
        <div class="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full border border-primary/20 mb-2">
          <UIcon name="i-lucide:settings-2" class="size-4 text-primary" />
          <span class="text-[10px] font-black uppercase tracking-widest text-primary">Étape 1 — Ciblage</span>
        </div>
        <h2 class="text-3xl font-black uppercase italic tracking-tighter">Type & Expéditeur</h2>
        <p class="text-dimmed text-sm uppercase tracking-widest font-bold">
          Le type détermine l'alias d'expédition et les règles de consentement RGPD.
        </p>
      </div>

      <!-- CAMPAIGN TYPE CARDS -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          v-for="type in CAMPAIGN_TYPES"
          :key="type.id"
          type="button"
          class="relative cursor-pointer rounded-[2rem] border-2 p-6 transition-all duration-300 text-left group"
          :class="formData.campaignType === type.id
            ? `border-${type.color}-500 bg-${type.color}-500/5 shadow-xl shadow-${type.color}-500/10 scale-[1.02]`
            : 'border-default bg-white dark:bg-neutral-900 hover:border-neutral-300 dark:hover:border-neutral-600'"
          @click="updateType(type.id)"
        >
          <div class="flex flex-col gap-4">
            <div class="flex items-center justify-between">
              <div :class="`size-11 rounded-xl bg-${type.color}-500/10 flex items-center justify-center`">
                <UIcon :name="type.icon" :class="`size-5 text-${type.color}-500`" />
              </div>
              <div
                class="size-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 shrink-0"
                :class="formData.campaignType === type.id
                  ? `border-${type.color}-500 bg-${type.color}-500`
                  : 'border-neutral-300 dark:border-neutral-600'"
              >
                <UIcon v-if="formData.campaignType === type.id" name="i-lucide:check" class="size-2.5 text-white" />
              </div>
            </div>
            <div>
              <h3 class="font-black text-sm uppercase tracking-tight">{{ type.label }}</h3>
              <p class="text-xs text-dimmed mt-1 leading-relaxed">{{ type.description }}</p>
            </div>
            <div class="pt-3 border-t border-default">
              <p class="text-[9px] font-black uppercase text-dimmed tracking-widest mb-1.5">Opt-in requis</p>
              <UBadge
                :label="type.optInField === 'optInNewsletter' ? 'Newsletter' : type.optInField === 'optInChangelog' ? 'Changelog' : 'Marketing'"
                size="xs"
                variant="soft"
                :color="type.optInField === 'optInNewsletter' ? 'primary' : type.optInField === 'optInChangelog' ? 'info' : 'warning'"
              />
            </div>
          </div>
        </button>
      </div>

      <!-- ALIAS & AUDIENCE SUMMARY -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- Expéditeur résolu -->
        <div class="p-6 bg-white dark:bg-neutral-900 rounded-[2rem] border border-default shadow-sm">
          <div class="flex items-center gap-4">
            <div class="size-11 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <UIcon name="i-lucide:send" class="size-5" />
            </div>
            <div class="min-w-0">
              <p class="text-[10px] font-black uppercase text-dimmed tracking-widest mb-0.5">Expéditeur résolu</p>
              <p class="font-black text-sm truncate">{{ resolvedAlias.label }}</p>
              <p class="text-xs text-primary italic truncate">{{ resolvedAlias.email }}</p>
            </div>
          </div>
        </div>

        <!-- Audience estimée -->
        <div class="p-6 bg-white dark:bg-neutral-900 rounded-[2rem] border border-default shadow-sm">
          <div class="flex items-center gap-4">
            <div class="size-11 rounded-xl bg-success-500/10 flex items-center justify-center text-success-500 shrink-0">
              <UIcon name="i-lucide:users" class="size-5" />
            </div>
            <div>
              <p class="text-[10px] font-black uppercase text-dimmed tracking-widest mb-0.5">Destinataires estimés</p>
              <div v-if="!loadingAudience" class="flex items-baseline gap-1">
                <p class="font-black text-2xl italic">{{ audienceCount ?? '—' }}</p>
                <span class="text-xs text-dimmed">abonnés actifs</span>
              </div>
              <UIcon v-else name="i-lucide:loader-2" class="size-5 animate-spin text-success-500" />
            </div>
          </div>
        </div>
      </div>

      <!-- NOM DE LA CAMPAGNE -->
      <div class="bg-white dark:bg-neutral-900 rounded-[2rem] border border-default p-6 space-y-4">
        <div>
          <p class="text-[10px] font-black uppercase tracking-widest text-dimmed mb-1.5">Nom de la campagne</p>
          <p class="text-xs text-dimmed italic">Optionnel — un nom sera généré automatiquement sinon.</p>
        </div>
        <UInput
          v-model="formData.name"
          placeholder="ex : Newsletter Avril 2026 — Nouveautés"
          class="font-bold"
        />
      </div>

      <!-- CONSEIL -->
      <div class="p-5 bg-info-500/5 rounded-3xl border border-info-500/20 flex items-start gap-3">
        <UIcon name="i-lucide:lightbulb" class="size-4 text-info-500 mt-0.5 shrink-0" />
        <div>
          <p class="text-[10px] font-black uppercase tracking-widest text-info-500 mb-1">Conseil</p>
          <p class="text-xs text-info-500/80 leading-relaxed font-medium">
            Le choix du type détermine l'alias Mailgun utilisé et filtre les abonnés
            selon leur consentement RGPD. Les destinataires non opt-in ne recevront jamais le message.
          </p>
        </div>
      </div>

    </div>
  </div>
</template>
