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

const { getAliasForType } = useCampaigns()

const resolvedAlias = computed(() => getAliasForType(formData.value.campaignType || 'campaign_newsletter'))
const selectedTypeConfig = computed(() =>
  CAMPAIGN_TYPES.find(t => t.id === formData.value.campaignType) || CAMPAIGN_TYPES[0]
)

// Audience estimée pour le récap
const audienceCount = ref<number | null>(null)
onMounted(async () => {
  try {
    const subs = await $fetch<any[]>('/api/campaign/audience')
    const conf = CAMPAIGN_TYPES.find(t => t.id === formData.value.campaignType)!
    audienceCount.value = subs.filter(s => s[conf.optInField] === true && s.isActive).length
  } catch { audienceCount.value = null }
})

// Planification
const recurrenceOptions = [
  { label: 'Aucune (envoi unique)', value: 'none' },
  { label: 'Quotidienne', value: 'daily' },
  { label: 'Hebdomadaire', value: 'weekly' },
  { label: 'Mensuelle', value: 'monthly' },
]

const timezones = [
  { label: 'Paris (Europe/Paris)', value: 'Europe/Paris' },
  { label: 'UTC', value: 'UTC' },
  { label: 'New York (America/New_York)', value: 'America/New_York' },
  { label: 'Londres (Europe/London)', value: 'Europe/London' },
]

const isSendNow = computed(() => !formData.value.scheduledAt)

const setSendNow = () => {
  formData.value = { ...formData.value, scheduledAt: '', recurrence: 'none' }
}

const setSendLater = () => {
  if (!formData.value.scheduledAt) {
    formData.value = {
      ...formData.value,
      scheduledAt: new Date(Date.now() + 3600000).toISOString().slice(0, 16)
    }
  }
}

// Analyse rapide du contenu
const bodyLength = computed(() => (formData.value.body || '').replace(/<[^>]*>/g, '').length)
const hasPersonalization = computed(() => (formData.value.body || '').includes('%recipient.'))
const hasUnsubLink = computed(() => (formData.value.body || '').includes('%recipient.token%') || (formData.value.body || '').includes('unsubscribe'))

const checks = computed(() => [
  { label: 'Objet renseigné', ok: !!(formData.value.subject), icon: 'i-lucide:text-cursor-input' },
  { label: 'Contenu rédigé', ok: bodyLength.value > 50, icon: 'i-lucide:file-text' },
  { label: 'Personnalisation (%recipient.name%)', ok: hasPersonalization.value, icon: 'i-lucide:user-check', optional: true },
  { label: 'Lien de désinscription', ok: hasUnsubLink.value, icon: 'i-lucide:mail-x', optional: true },
  { label: 'Type de campagne défini', ok: !!(formData.value.campaignType), icon: 'i-lucide:tag' },
])
</script>

<template>
  <div class="h-full flex gap-8 p-10 animate-in fade-in slide-in-from-right-4 duration-500 overflow-hidden">

    <!-- LEFT: PLANNING + CHECKLIST -->
    <div class="w-80 flex flex-col gap-6 overflow-y-auto scrollbar-thin shrink-0">

      <!-- Header -->
      <div class="space-y-1">
        <div class="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full border border-primary/20">
          <UIcon name="i-lucide:calendar-clock" class="size-4 text-primary" />
          <span class="text-[10px] font-black uppercase tracking-widest text-primary">Étape 3 — Envoi</span>
        </div>
        <h2 class="text-2xl font-black uppercase italic tracking-tighter">Planification</h2>
      </div>

      <!-- Immédiat / Planifié -->
      <div class="space-y-3">
        <p class="text-[10px] font-black uppercase tracking-widest text-dimmed">Quand envoyer ?</p>
        <div class="grid grid-cols-2 gap-3">
          <button
            type="button"
            class="flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all cursor-pointer"
            :class="isSendNow ? 'border-primary bg-primary/5' : 'border-default hover:border-neutral-300'"
            @click="setSendNow"
          >
            <UIcon name="i-lucide:zap" class="size-5" :class="isSendNow ? 'text-primary' : 'text-dimmed'" />
            <p class="text-[10px] font-black uppercase" :class="isSendNow ? 'text-primary' : 'text-dimmed'">Maintenant</p>
          </button>
          <button
            type="button"
            class="flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all cursor-pointer"
            :class="!isSendNow ? 'border-primary bg-primary/5' : 'border-default hover:border-neutral-300'"
            @click="setSendLater"
          >
            <UIcon name="i-lucide:calendar" class="size-5" :class="!isSendNow ? 'text-primary' : 'text-dimmed'" />
            <p class="text-[10px] font-black uppercase" :class="!isSendNow ? 'text-primary' : 'text-dimmed'">Planifier</p>
          </button>
        </div>
      </div>

      <!-- Date/heure si planifié -->
      <div v-if="!isSendNow" class="space-y-4 animate-in fade-in duration-300">
        <div>
          <p class="text-[10px] font-black uppercase tracking-widest text-dimmed mb-2">Date & Heure</p>
          <UInput v-model="formData.scheduledAt" type="datetime-local" />
        </div>
        <div>
          <p class="text-[10px] font-black uppercase tracking-widest text-dimmed mb-2">Fuseau horaire</p>
          <USelect v-model="formData.timezone" :items="timezones" />
        </div>
        <div>
          <p class="text-[10px] font-black uppercase tracking-widest text-dimmed mb-2">Récurrence</p>
          <USelect v-model="formData.recurrence" :items="recurrenceOptions" />
        </div>
      </div>

      <!-- CHECKLIST QUALITÉ -->
      <div class="bg-white dark:bg-neutral-900 rounded-2xl border border-default p-4 space-y-3">
        <p class="text-[10px] font-black uppercase tracking-widest text-dimmed">Vérifications</p>
        <div class="space-y-2">
          <div
            v-for="check in checks"
            :key="check.label"
            class="flex items-center gap-2.5"
          >
            <div
              class="size-5 rounded-full flex items-center justify-center shrink-0 transition-all"
              :class="check.ok
                ? 'bg-success-500/10 text-success-500'
                : check.optional
                  ? 'bg-neutral-100 dark:bg-neutral-800 text-dimmed'
                  : 'bg-error-500/10 text-error-500'"
            >
              <UIcon
                :name="check.ok ? 'i-lucide:check' : (check.optional ? 'i-lucide:minus' : 'i-lucide:x')"
                class="size-2.5"
              />
            </div>
            <p class="text-[10px] font-bold" :class="check.ok ? 'text-default' : check.optional ? 'text-dimmed' : 'text-error-500'">
              {{ check.label }}
            </p>
            <UBadge v-if="check.optional" label="optionnel" size="xs" variant="soft" color="neutral" class="ml-auto text-[8px]" />
          </div>
        </div>
      </div>
    </div>

    <!-- RIGHT: RÉCAPITULATIF + PREVIEW -->
    <div class="flex-1 flex flex-col gap-6 overflow-hidden min-w-0">

      <!-- RÉCAPITULATIF CARTE -->
      <UCard class="bg-white dark:bg-neutral-900 border-2 border-primary/20 shadow-2xl rounded-[2.5rem] overflow-hidden shrink-0">
        <div class="space-y-5">
          <div class="flex items-center gap-3 border-b border-default pb-4">
            <div class="size-10 rounded-2xl bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/30">
              <UIcon name="i-lucide:clipboard-check" class="size-5" />
            </div>
            <h4 class="font-black uppercase italic text-sm">Récapitulatif Campagne</h4>
          </div>

          <dl class="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
            <div>
              <dt class="text-[9px] text-dimmed uppercase font-black tracking-widest mb-1">Type</dt>
              <dd class="font-bold flex items-center gap-2">
                <UIcon :name="selectedTypeConfig.icon" class="size-4" />
                {{ selectedTypeConfig.label }}
              </dd>
            </div>
            <div>
              <dt class="text-[9px] text-dimmed uppercase font-black tracking-widest mb-1">Expéditeur</dt>
              <dd class="font-bold text-primary truncate text-xs italic">{{ resolvedAlias.email }}</dd>
            </div>
            <div class="col-span-2">
              <dt class="text-[9px] text-dimmed uppercase font-black tracking-widest mb-1">Objet</dt>
              <dd class="font-bold truncate">{{ formData.subject || '—' }}</dd>
            </div>
            <div>
              <dt class="text-[9px] text-dimmed uppercase font-black tracking-widest mb-1">Destinataires</dt>
              <dd class="font-black text-success-500 text-lg">{{ audienceCount ?? '—' }}</dd>
            </div>
            <div>
              <dt class="text-[9px] text-dimmed uppercase font-black tracking-widest mb-1">Envoi</dt>
              <dd class="font-bold text-xs">
                {{ isSendNow ? 'Immédiatement' : (formData.scheduledAt ? new Date(formData.scheduledAt).toLocaleString('fr-FR') : '—') }}
              </dd>
            </div>
            <div v-if="formData.recurrence && formData.recurrence !== 'none'">
              <dt class="text-[9px] text-dimmed uppercase font-black tracking-widest mb-1">Récurrence</dt>
              <dd class="font-bold">{{ recurrenceOptions.find(r => r.value === formData.recurrence)?.label }}</dd>
            </div>
          </dl>
        </div>
      </UCard>

      <!-- PREVIEW FINALE — utilise EmailPreview.client.vue (shared) -->
      <div class="flex-1 bg-white dark:bg-neutral-900 rounded-[2.5rem] border-4 border-white dark:border-neutral-800 shadow-2xl overflow-hidden min-h-0">
        <div class="px-6 py-3 border-b border-default flex items-center justify-between bg-neutral-50/50 dark:bg-neutral-900/50">
          <p class="text-[10px] font-black uppercase tracking-widest text-dimmed">Prévisualisation finale</p>
          <UBadge label="Rendu exact avant envoi" color="primary" size="xs" variant="soft" />
        </div>
        <div class="h-full pb-14">
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
