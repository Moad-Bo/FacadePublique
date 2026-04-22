<script setup lang="ts">
const { locale } = useI18n();
const localePath = useLocalePath();

const features = [
  {
    title: 'Business Operating System',
    description: 'Transform your enterprise workflow with our unified Cloud & BOS solution.',
    icon: 'i-lucide-layers',
    to: '/basis'
  },
  {
    title: 'Strategic Consulting',
    description: 'Expert audit and agency services for technical digital transformation.',
    icon: 'i-lucide-award',
    to: '/syn'
  },
  {
    title: 'Enterprise Mailing',
    description: 'Secure, high-availability mailing infrastructure for modern teams.',
    icon: 'i-lucide-mail',
    to: '/docs/mailing'
  }
];

// ── Notifications ────────────────────────────────────────
const route = useRoute();
const notify = useNotify();

onMounted(() => {
  if (route.query.unsubscribed === 'success') {
    notify.success(
      'Désabonnement réussi', 
      'Vous avez été retiré de notre newsletter avec succès.'
    );
  } else if (route.query.unsubscribed === 'invalid' || route.query.unsubscribed === 'invalid_token') {
    notify.error(
      'Lien invalide', 
      'Ce lien de désabonnement est expiré ou incorrect.'
    );
  }
});

// ── SEO ──────────────────────────────────────────────────
const { t } = useI18n();
useSeoMeta({
  title: 'Techknè Group — Industrie Digitale Modernisée',
  ogTitle: 'Techknè Group — Industrie Digitale Modernisée',
  description: 'Un écosystème informatique complet : Cloud, BOS, Mailing, Création Web et Conseil. Conçu pour l\'excellence opérationnelle.',
  ogDescription: 'Un écosystème informatique complet : Cloud, BOS, Mailing, Création Web et Conseil. Conçu pour l\'excellence opérationnelle.',
  keywords: 'techknè, cloud, bos, business operating system, mailing, conseil stratégique, agence syn, infrastructure, saas',
});
</script>

<template>
  <div class="relative overflow-hidden bg-white dark:bg-neutral-950 min-h-screen pt-20 pb-16">
    <!-- Hero Section -->
    <div class="container mx-auto px-4 md:px-6">
      <div class="max-w-4xl mx-auto text-center space-y-8 animate-fade-in-up">
        <h1 class="text-5xl md:text-7xl font-extrabold tracking-tighter text-neutral-900 dark:text-white leading-tight">
          Techknè Group. 
          <span class="text-primary-500">Industrie Digitale Modernisée.</span>
        </h1>
        <p class="text-xl text-neutral-500 dark:text-neutral-400 max-w-2xl mx-auto leading-relaxed">
          Un écosystème informatique complet : Cloud, BOS, Mailing, Création Web et Conseil. 
          Conçu pour l'excellence opérationnelle.
        </p>
        
        <div class="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <UButton :to="localePath('/basis')" size="xl" color="primary" class="px-8 shadow-lg shadow-primary-500/20">
            Explorer Basis
          </UButton>
          <UButton :to="localePath('/syn')" size="xl" variant="ghost" class="px-8 underline-offset-4 decoration-primary-500 hover:decoration-4">
            Services Syn
          </UButton>
        </div>
      </div>

      <!-- Feature Grid -->
      <div class="grid md:grid-cols-3 gap-8 mt-32">
        <template v-for="item in features" :key="item.title">
          <ULink 
            :to="localePath(item.to)"
            class="group p-8 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 transition-all hover:border-primary-500/50 hover:shadow-2xl hover:shadow-primary-500/10"
          >
            <div class="w-12 h-12 rounded-xl bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center mb-6 text-primary-500 transition-transform group-hover:scale-110">
              <UIcon :name="item.icon" class="w-6 h-6" />
            </div>
            <h3 class="text-xl font-bold mb-3 text-neutral-900 dark:text-white">{{ item.title }}</h3>
            <p class="text-neutral-500 dark:text-neutral-400 text-sm leading-relaxed mb-6">{{ item.description }}</p>
            <div class="flex items-center text-primary-500 text-xs font-bold uppercase tracking-widest gap-2">
              <span>View Details</span>
              <UIcon name="i-lucide-arrow-right" class="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </div>
          </ULink>
        </template>
      </div>
    </div>

    <!-- Background Decoration -->
    <div class="absolute top-0 right-0 -z-10 w-1/3 h-1/2 bg-gradient-to-bl from-primary-500/10 to-transparent blur-3xl opacity-50 dark:opacity-20 pointer-events-none"></div>
    <div class="absolute bottom-0 left-0 -z-10 w-1/3 h-1/2 bg-gradient-to-tr from-primary-500/10 to-transparent blur-3xl opacity-50 dark:opacity-20 pointer-events-none"></div>
  </div>
</template>

<style scoped>
.animate-fade-in-up {
  animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(40px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
