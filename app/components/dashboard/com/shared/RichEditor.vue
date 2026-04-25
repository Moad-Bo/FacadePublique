<script setup lang="ts">
import type { Editor } from '@tiptap/vue-3'
import { TextStyle } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import { FontFamily } from '@tiptap/extension-font-family'
import { TextAlign } from '@tiptap/extension-text-align'
import { Strike } from '@tiptap/extension-strike'
import { Link } from '@tiptap/extension-link'
import { Blockquote } from '@tiptap/extension-blockquote'
import { HorizontalRule } from '@tiptap/extension-horizontal-rule'
import { Mention } from '@tiptap/extension-mention'
import StarterKit from '@tiptap/starter-kit'
import { FontSize } from '../../../../utils/editor/FontSize'
import type { EditorToolbarItem } from '@nuxt/ui'

const props = defineProps<{
  modelValue: string
  placeholder?: string
  label?: string
}>()

const emit = defineEmits(['update:modelValue'])

const value = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const fonts = [
  { label: 'Default', value: '' },
  { label: 'Sans', value: 'sans-serif' },
  { label: 'Serif', value: 'serif' },
  { label: 'Mono', value: 'monospace' },
  { label: 'Inter', value: 'Inter, sans-serif' }
]

const fontSizes = [
  { label: 'Tiny', value: '10px' },
  { label: 'Small', value: '13px' },
  { label: 'Normal', value: '16px' },
  { label: 'Large', value: '20px' },
  { label: 'Huge', value: '24px' },
  { label: 'Gigantic', value: '32px' }
]

const colors = [
  { label: 'Default', value: '' },
  { label: 'Primary', value: 'var(--ui-primary)' },
  { label: 'Indigo', value: '#6366f1' },
  { label: 'Emerald', value: '#10b981' },
  { label: 'Orange', value: '#f59e0b' },
  { label: 'Rose', value: '#f43f5e' },
  { label: 'Sky', value: '#0ea5e9' }
]

const mentionItems = [
  { label: 'Tous les membres', id: 'role:all', icon: 'i-lucide:users', description: 'Notifier toute la communauté' },
  { label: 'Administration', id: 'role:admin', icon: 'i-lucide:shield-check', description: 'Mentionner l\'administration' },
  { label: 'Support Client', id: 'role:support', icon: 'i-lucide:headphones', description: 'Lier à un ticket support' },
  { label: '{alias}', id: 'var:alias', icon: 'i-lucide:briefcase', description: 'Variable: Nom de l\'alias expéditeur' },
  { label: '{user}', id: 'var:user', icon: 'i-lucide:at-sign', description: 'Variable: Nom du destinataire' },
  { label: '{date}', id: 'var:date', icon: 'i-lucide:calendar', description: 'Variable: Date du jour' },
  { label: '{unsubscribe_link}', id: 'var:unsub', icon: 'i-lucide:log-out', description: 'Variable: Lien de désabonnement' }
]

const toolbarItems = computed(() => [
  [
    {
      label: 'Font',
      icon: 'i-lucide:type',
      content: { align: 'start' },
      items: fonts.map(f => ({
        label: f.label,
        onClick: (editor: any) => editor.chain().focus().setFontFamily(f.value).run(),
        active: (editor: any) => editor.isActive('textStyle', { fontFamily: f.value })
      }))
    },
    {
      label: 'Size',
      icon: 'i-lucide:text-cursor-input',
      content: { align: 'start' },
      items: fontSizes.map(s => ({
        label: s.label,
        onClick: (editor: any) => editor.chain().focus().setFontSize(s.value).run(),
        active: (editor: any) => editor.isActive('textStyle', { fontSize: s.value })
      }))
    }
  ],
  [
    {
      kind: 'mark',
      mark: 'bold',
      icon: 'i-lucide:bold',
      tooltip: { text: 'Bold (Ctrl+B)' }
    },
    {
      kind: 'mark',
      mark: 'italic',
      icon: 'i-lucide:italic',
      tooltip: { text: 'Italic (Ctrl+I)' }
    },
    {
      kind: 'mark',
      mark: 'strike',
      icon: 'i-lucide:strikethrough',
      tooltip: { text: 'Strikethrough' }
    }
  ],
  [
    {
       kind: 'link',
       icon: 'i-lucide:link',
       tooltip: { text: 'Insérer un lien' }
    }
  ],
  [
    {
      label: 'Color',
      icon: 'i-lucide:palette',
      content: { align: 'start' },
      items: colors.map(c => ({
        label: c.label,
        icon: 'i-lucide:circle',
        iconClass: c.value ? `text-[${c.value}]` : 'text-neutral-400',
        onClick: (editor: any) => c.value ? editor.chain().focus().setColor(c.value).run() : editor.chain().focus().unsetColor().run(),
        active: (editor: any) => editor.isActive('textStyle', { color: c.value })
      }))
    }
  ],
  [
    {
      icon: 'i-lucide:align-left',
      tooltip: { text: 'Align' },
      items: [
        { kind: 'textAlign', align: 'left', icon: 'i-lucide:align-left', label: 'Left' },
        { kind: 'textAlign', align: 'center', icon: 'i-lucide:align-center', label: 'Center' },
        { kind: 'textAlign', align: 'right', icon: 'i-lucide:align-right', label: 'Right' }
      ]
    }
  ],
  [
    { kind: 'bulletList', icon: 'i-lucide:list' },
    { kind: 'orderedList', icon: 'i-lucide:list-ordered' },
    { kind: 'blockquote', icon: 'i-lucide:text-quote', tooltip: { text: 'Citation' } },
    { kind: 'horizontalRule', icon: 'i-lucide:separator-horizontal', tooltip: { text: 'Ligne de séparation' } }
  ],
  [
    { kind: 'undo', icon: 'i-lucide:undo' },
    { kind: 'redo', icon: 'i-lucide:redo' }
  ]
] as EditorToolbarItem[][])

</script>

<template>
  <div class="rich-editor-wrapper h-full flex flex-col bg-white dark:bg-neutral-900 border border-default rounded-3xl overflow-hidden shadow-xl">
    
    <div v-if="label" class="px-6 py-2 border-b border-default bg-neutral-50 dark:bg-neutral-800 flex items-center justify-between">
       <span class="text-[9px] font-black uppercase text-primary tracking-widest">{{ label }}</span>
       <UBadge label="Nuxt UI Editor v4" color="neutral" variant="subtle" size="xs" class="font-bold opacity-50" />
    </div>

    <UEditor
      v-model="value"
      content-type="html"
      :extensions="[
        TextStyle,
        Color,
        FontFamily,
        FontSize,
        Link.configure({
          openOnClick: false,
          HTMLAttributes: {
            class: 'text-primary underline cursor-pointer'
          }
        }),
        TextAlign.configure({ types: ['heading', 'paragraph'] }),
        Mention.configure({
          HTMLAttributes: {
            class: 'mention bg-primary/10 text-primary px-1 rounded font-bold'
          }
        })
      ]"
      :placeholder="placeholder || 'Rédigez votre contenu ici...'"
      class="flex-1 overflow-hidden flex flex-col"
      :ui="{
        base: 'flex-1 p-8 prose dark:prose-invert max-w-none focus:outline-none min-h-[300px]'
      }"
    >
      <template #default="{ editor }">
        <UEditorToolbar 
          :editor="editor" 
          :items="toolbarItems" 
          class="border-b border-default bg-white dark:bg-neutral-950 px-4 py-2 sticky top-0 z-10 shrink-0" 
        />
        <UEditorMentionMenu :editor="editor" :items="mentionItems" />
      </template>
    </UEditor>
  </div>
</template>

<style>
/* Nuxt UI Editor Styling Overrides */
.rich-editor-wrapper .tiptap {
  min-height: 300px;
  outline: none !important;
}

.rich-editor-wrapper .tiptap p.is-editor-empty:first-child::before {
  color: var(--ui-text-dimmed);
  font-style: italic;
}
</style>
