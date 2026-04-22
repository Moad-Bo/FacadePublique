<script setup lang="ts">
const { locale } = useI18n()

const collection = computed(() => `content_${locale.value}`)

const { data: versions } = await useAsyncData(
  `changelog-${locale.value}`,
  () => queryCollection(collection.value as any).where('path', 'LIKE', '/changelog/%').order('date', 'DESC').all(),
  { watch: [locale] }
)

const title = 'Changelog'
const description = 'Découvrez les dernières mises à jour, améliorations et corrections du groupe Techknè.'

useSeoMeta({
  title: `${title} — Techknè Group`,
  ogTitle: title,
  description,
  ogDescription: description
})
</script>

<template>
  <div class="page-content animate-fade-in relative">
    <UContainer>
      <UPageHeader
        :title="title"
        :description="description"
        class="py-[50px]"
      />

      <UPageBody>
        <UChangelogVersions v-if="versions?.length">
          <UChangelogVersion
            v-for="(version, index) in versions"
            :key="index"
            :title="version.title"
            :description="version.description"
            :date="version.date ? new Date(version.date).toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' }) : undefined"
            :badge="version.badge"
          >
            <template #body>
              <article class="prose prose-neutral dark:prose-invert max-w-none">
                <ContentRenderer :value="version" />
              </article>
            </template>
          </UChangelogVersion>
        </UChangelogVersions>

        <div v-else class="text-center py-16 text-neutral-500">
          Aucune mise à jour trouvée.
        </div>
      </UPageBody>
    </UContainer>
  </div>
</template>

<style scoped>
.animate-fade-in {
  animation: fadeIn 0.4s ease-out;
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
</style>
