<script setup lang="ts">
const props = defineProps<{
  modelValue: any,
  layouts: any[]
}>()

const emit = defineEmits(['update:modelValue'])

const formData = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})
</script>

<template>
  <DashboardComSharedForgeStructureSelector 
    v-model="formData" 
    :layouts="layouts"
    title="Design de Campagne"
    description="Choisissez l'allure de votre newsletter pour maximiser l'impact visuel."
    icon="i-lucide:megaphone"
    color-class="bg-success/10 border-success/20 text-success"
  />
</template>
