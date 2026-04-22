<script setup lang="ts">
import { ref, onBeforeUnmount, watch } from 'vue'
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import { TextStyle } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import { Highlight } from '@tiptap/extension-highlight'
import { FontFamily } from '@tiptap/extension-font-family'
import { TextAlign } from '@tiptap/extension-text-align'

const props = defineProps<{
  modelValue: string
  placeholder?: string
  label?: string
}>()

const emit = defineEmits(['update:modelValue'])

const editor = useEditor({
  content: props.modelValue,
  extensions: [
    StarterKit.configure({
      // We keep it as base
    }),
    // Link.configure({ openOnClick: false }), // Potential duplicate
    TextStyle,
    Color,
    Highlight.configure({ multicolor: true }),
    FontFamily,
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    Placeholder.configure({ placeholder: props.placeholder || 'Rédigez votre contenu ici...' })
  ],
  onUpdate: () => {
    emit('update:modelValue', editor.value?.getHTML())
  }
})

// SYNC PROP -> INTERNAL
watch(() => props.modelValue, (val) => {
  if (editor.value && val !== editor.value.getHTML()) {
    editor.value.commands.setContent(val || '')
  }
})

onBeforeUnmount(() => {
  editor.value?.destroy()
})

// --- ACTIONS ---
const addLink = () => {
  const url = window.prompt('URL?')
  if (url) {
    editor.value?.chain().focus().setLink({ href: url }).run()
  } else {
    editor.value?.chain().focus().unsetLink().run()
  }
}

// Fixed sets of colors and fonts for "Premium" feel
const colors = ['#000000', '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6']
const fonts = [
  { label: 'Sans Serif', value: 'sans-serif' },
  { label: 'Serif', value: 'serif' },
  { label: 'Mono', value: 'monospace' },
  { label: 'Display (Inter)', value: 'Inter, sans-serif' }
]
</script>

<template>
  <div class="flex flex-col h-full bg-white dark:bg-neutral-900 border border-default rounded-3xl overflow-hidden shadow-xl transition-all duration-300 focus-within:ring-2 focus-within:ring-primary/20">
    
    <!-- LABEL HEADER (Optional) -->
    <div v-if="label" class="px-6 py-2 border-b border-default bg-neutral-50 dark:bg-neutral-800 flex items-center gap-2">
       <span class="text-[9px] font-black uppercase text-primary tracking-widest">{{ label }}</span>
    </div>

    <!-- TOOLBAR (Gmail Inspired) -->
    <div class="flex flex-wrap items-center gap-0.5 p-2 bg-white dark:bg-neutral-950 border-b border-default shrink-0">
      
      <!-- FONT SELECTION -->
      <USelectMenu 
        :model-value="editor?.getAttributes('textStyle').fontFamily"
        :options="fonts"
        placeholder="Font"
        size="xs"
        class="w-32 mr-2"
        @update:model-value="(val: any) => editor?.chain().focus().setFontFamily(val.value).run()"
      />

      <div class="flex items-center gap-0.5 border-r border-default pr-1.5 mr-1.5">
        <UButton icon="i-lucide:bold" variant="ghost" color="neutral" size="xs" 
          :class="{ 'bg-primary/10 text-primary': editor?.isActive('bold') }" 
          @click="editor?.chain().focus().toggleBold().run()" 
        />
        <UButton icon="i-lucide:italic" variant="ghost" color="neutral" size="xs" 
          :class="{ 'bg-primary/10 text-primary': editor?.isActive('italic') }" 
          @click="editor?.chain().focus().toggleItalic().run()" 
        />
        <UButton icon="i-lucide:strikethrough" variant="ghost" color="neutral" size="xs" 
          :class="{ 'bg-primary/10 text-primary': editor?.isActive('strike') }" 
          @click="editor?.chain().focus().toggleStrike().run()" 
        />
      </div>

      <!-- ALIGNMENT -->
      <div class="flex items-center gap-0.5 border-r border-default pr-1.5 mr-1.5">
        <UButton icon="i-lucide:align-left" variant="ghost" color="neutral" size="xs" 
          :class="{ 'bg-primary/10 text-primary': editor?.isActive({ textAlign: 'left' }) }" 
          @click="editor?.chain().focus().setTextAlign('left').run()" 
        />
        <UButton icon="i-lucide:align-center" variant="ghost" color="neutral" size="xs" 
          :class="{ 'bg-primary/10 text-primary': editor?.isActive({ textAlign: 'center' }) }" 
          @click="editor?.chain().focus().setTextAlign('center').run()" 
        />
      </div>

      <!-- LISTS -->
      <div class="flex items-center gap-0.5 border-r border-default pr-1.5 mr-1.5">
        <UButton icon="i-lucide:list" variant="ghost" color="neutral" size="xs" 
          :class="{ 'bg-primary/10 text-primary': editor?.isActive('bulletList') }" 
          @click="editor?.chain().focus().toggleBulletList().run()" 
        />
        <UButton icon="i-lucide:list-ordered" variant="ghost" color="neutral" size="xs" 
          :class="{ 'bg-primary/10 text-primary': editor?.isActive('orderedList') }" 
          @click="editor?.chain().focus().toggleOrderedList().run()" 
        />
      </div>

      <!-- COLORS -->
      <div class="flex items-center gap-0.5 border-r border-default pr-1.5 mr-1.5">
         <UPopover :popper="{ placement: 'bottom-start' }">
            <UButton icon="i-lucide:type" variant="ghost" color="neutral" size="xs" />
            <template #content>
               <div class="p-2 grid grid-cols-4 gap-1">
                  <div v-for="c in colors" :key="c" :style="{ backgroundColor: c }" class="size-5 rounded cursor-pointer border border-default" @click="editor?.chain().focus().setColor(c).run()" />
               </div>
            </template>
         </UPopover>
         <UPopover :popper="{ placement: 'bottom-start' }">
            <UButton icon="i-lucide:highlighter" variant="ghost" color="neutral" size="xs" />
            <template #content>
               <div class="p-2 grid grid-cols-4 gap-1">
                  <div v-for="c in colors" :key="c" :style="{ backgroundColor: c + '20' }" class="size-5 rounded cursor-pointer border border-default" @click="editor?.chain().focus().setHighlight({ color: c + '40' }).run()" />
                  <div class="size-5 rounded cursor-pointer border border-default bg-white flex items-center justify-center text-[8px] text-dimmed" @click="editor?.chain().focus().unsetHighlight().run()">X</div>
               </div>
            </template>
         </UPopover>
      </div>

      <UButton icon="i-lucide:link" variant="ghost" color="neutral" size="xs" :class="{ 'bg-primary/10 text-primary': editor?.isActive('link') }" @click="addLink" />
      <UButton icon="i-lucide:undo" variant="ghost" color="neutral" size="xs" @click="editor?.chain().focus().undo().run()" />

    </div>

    <!-- EDITOR AREA -->
    <div class="flex-1 overflow-y-auto p-8 prose dark:prose-invert max-w-none focus:outline-none">
       <EditorContent :editor="editor" spellcheck="false" />
    </div>

    <!-- STATUS BAR -->
    <div class="px-4 py-1 border-t border-default bg-neutral-50/50 dark:bg-neutral-900/50 flex items-center justify-between">
       <div class="flex items-center gap-2">
          <UIcon name="i-lucide:info" class="size-3 text-dimmed" />
          <span class="text-[8px] font-bold text-dimmed uppercase tracking-wider">Tiptap Engine Pro v3</span>
       </div>
    </div>
  </div>
</template>

<style>
.ProseMirror {
  outline: none;
  min-height: 200px;
}
.ProseMirror p.is-editor-empty:first-child::before {
  content: attr(data-placeholder);
  float: left;
  color: #adb5bd;
  pointer-events: none;
  height: 0;
}
</style>
