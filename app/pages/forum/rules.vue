<script setup lang="ts">
definePageMeta({
  layout: 'forum'
});

const rulesItems = [
  {
    label: 'Code de Conduite & Interactions',
    icon: 'i-lucide-users',
    defaultOpen: true,
    content: `
      ### Bienveillance et Respect
      Le forum Techknè est un espace d'entraide. Le respect mutuel est obligatoire. Toute forme de harcèlement, d'insulte ou de discrimination entraînera un bannissement immédiat.
      
      ### Pas de Spam
      La promotion non sollicitée de produits ou services tiers est interdite. Les liens doivent être pertinents par rapport à la discussion technique.
      
      ### Clarté des Questions
      Avant de poster, assurez-vous que votre titre soit explicite et fournissez suffisamment de contexte (code, logs, environnement) pour être aidé efficacement.
    `
  },
  {
    label: 'CGU & Confidentialité',
    icon: 'i-lucide-shield-check',
    content: `
      ### Propriété des Contenus
      En publiant sur le forum, vous accordez à Techknè Group le droit non exclusif d'afficher et de conserver vos contributions.
      
      ### Données Personnelles
      Nous ne partageons pas vos données avec des tiers. Votre email n'est utilisé que pour les notifications liées à vos discussions (si activées).
      
      ### Responsabilité
      Vous êtes responsable des extraits de code et des informations que vous partagez. Évitez de publier des clés API ou des mots de passe en clair.
    `
  },
  {
    label: 'Usage de l\'IA Assistant',
    icon: 'i-lucide-sparkles',
    content: `
      ### Votre compagnon intelligent
      Un assistant IA est à votre disposition via le bouton flottant (en bas à droite). Il a été entraîné sur l'ensemble de notre documentation et de nos discussions passées.
      
      ### Ce qu'il peut faire pour vous :
      1. **Trouver des ressources** : Il peut vous diriger instantanément vers le tutoriel ou la documentation dont vous avez besoin.
      2. **Réponses techniques** : Il peut analyser vos problématiques courantes et proposer des pistes de solution.
      3. **Service de Redirection** : Si votre problème nécessite une intervention humaine ou sort de ses compétences, il vous dirigera vers le service compétent (support technique, commercial ou facturation).
      
      ### Note sur les réponses de l'IA
      Bien que très performant, l'assistant peut parfois commettre des erreurs. Vérifiez toujours les solutions critiques avant mise en production.
    `
  }
];
</script>

<template>
  <div class="max-w-4xl mx-auto space-y-12 pb-20">
    <!-- Hero Header -->
    <header class="text-center space-y-6 py-12">
      <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-500/10 text-primary-500 border border-primary-500/20 shadow-sm">
        <UIcon name="i-lucide-gavel" class="w-4 h-4" />
        <span class="text-[10px] font-black uppercase tracking-[0.2em]">Réglement Communautaire</span>
      </div>
      
      <h1 class="text-4xl md:text-6xl font-black tracking-tighter leading-[0.8] text-neutral-900 dark:text-white">
        Établir les bases d'une <br />
        <span class="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-purple-400">collaboration saine.</span>
      </h1>
      
      <p class="text-neutral-500 dark:text-neutral-400 max-w-2xl mx-auto font-medium leading-relaxed">
        Bienvenue sur le forum Techknè. Pour garantir la meilleure expérience à chacun, veuillez prendre connaissance de nos règles de vie et conditions d'utilisation.
      </p>
    </header>

    <!-- Content Sections -->
    <div class="grid grid-cols-1 gap-8">
      <UAccordion 
        :items="rulesItems" 
        multiple
        class="border border-neutral-200 dark:border-neutral-800 rounded-3xl overflow-hidden bg-white dark:bg-neutral-900/50"
      >
        <template #default="{ item, open }">
          <UButton 
            color="neutral" 
            variant="ghost" 
            class="w-full flex items-center justify-between p-6 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors group"
          >
            <div class="flex items-center gap-4">
              <div 
                class="w-10 h-10 rounded-xl flex items-center justify-center transition-all group-hover:scale-110"
                :class="open ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/20' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500'"
              >
                <UIcon :name="item.icon" class="w-5 h-5" />
              </div>
              <span class="text-lg font-black tracking-tight uppercase">{{ item.label }}</span>
            </div>
            
            <UIcon 
              name="i-lucide-chevron-right" 
              class="w-5 h-5 transition-transform duration-300"
              :class="open ? 'rotate-90' : ''"
            />
          </UButton>
        </template>

        <template #item="{ item }">
          <div class="px-8 pb-8 pt-2">
            <div class="prose dark:prose-invert prose-sm max-w-none prose-headings:font-black prose-headings:tracking-tighter prose-headings:uppercase prose-headings:text-xs prose-headings:text-neutral-400 prose-p:font-medium">
              <MDC :value="item.content" />
            </div>
          </div>
        </template>
      </UAccordion>
    </div>

    <!-- Contact Support (Footer of Rules) -->
    <section class="p-8 rounded-[2.5rem] bg-neutral-900 border border-neutral-800 relative overflow-hidden text-center space-y-6">
       <div class="absolute inset-0 z-0">
         <div class="absolute -top-24 -left-24 w-64 h-64 bg-primary-500/10 rounded-full blur-[80px]" />
         <div class="absolute -bottom-24 -right-24 w-64 h-64 bg-purple-500/10 rounded-full blur-[80px]" />
       </div>
       
       <div class="relative z-10 space-y-4">
          <h2 class="text-2xl font-black tracking-tighter text-white uppercase">Besoin d'une clarification ?</h2>
          <p class="text-neutral-400 text-sm font-medium max-w-md mx-auto">
            Si une règle ne vous semble pas claire ou si vous souhaitez signaler un comportement, notre équipe de modération est à votre écoute.
          </p>
          <div class="flex flex-wrap items-center justify-center gap-4 pt-4">
             <UButton label="Contacter la modération" variant="solid" color="primary" icon="i-lucide-mail" class="rounded-xl px-6" />
             <UButton label="Revenir à l'index" variant="ghost" color="neutral" to="/forum" class="text-white hover:text-primary-400" />
          </div>
       </div>
    </section>
  </div>
</template>
