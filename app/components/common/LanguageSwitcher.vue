<script setup lang="ts">
const { locale, locales, setLocale } = useI18n();

const currentLocale = computed(() => locales.value.find(l => l.code === locale.value));
const availableLocales = computed(() => locales.value.filter(l => l.code !== locale.value));

const flagIcon = (code: string) => {
  return code === 'fr' ? 'twemoji:flag-france' : 'twemoji:flag-united-states';
};
</script>

<template>
  <div class="flex items-center gap-2">
    <UTooltip v-if="availableLocales.length" :text="`Switch to ${availableLocales[0].code.toUpperCase()}`">
      <button 
        @click="setLocale(availableLocales[0].code)"
        class="p-2 transition-colors rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800"
      >
        <UIcon :name="flagIcon(availableLocales[0].code)" class="w-5 h-5" />
      </button>
    </UTooltip>
  </div>
</template>
