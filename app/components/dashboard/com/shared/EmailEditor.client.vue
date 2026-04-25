<script setup lang="ts">
import { watch, onBeforeUnmount } from 'vue'
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'

const props = defineProps<{
  modelValue: string
}>()

const emit = defineEmits(['update:modelValue'])

const editor = useEditor({
  content: props.modelValue,
  extensions: [
    StarterKit,
    Image
  ],
  onUpdate: () => {
    emit('update:modelValue', editor.value?.getHTML())
  }
})

watch(() => props.modelValue, (val) => {
  if (editor.value && val !== editor.value.getHTML()) {
    editor.value.commands.setContent(val)
  }
})

onBeforeUnmount(() => {
  editor.value?.destroy()
})

const addTag = (tag: string) => {
  if (!editor.value) return
  editor.value.chain().focus().insertContent(tag).run()
}

const addLink = () => {
  if (!editor.value) return
  const url = window.prompt('URL?')
  if (url) {
    editor.value.chain().focus().setLink({ href: url }).run()
  }
}

const addImage = () => {
  if (!editor.value) return
  const url = window.prompt('Image URL?')
  if (url) {
    editor.value.chain().focus().setImage({ src: url }).run()
  }
}
</script>

<template>
  <div class="border border-default rounded-xl overflow-hidden bg-white dark:bg-neutral-900 flex flex-col h-full min-h-[400px]">
    <!-- Toolbar -->
    <div class="flex flex-wrap items-center gap-1 p-2 border-b border-default bg-neutral-50 dark:bg-neutral-950/50">
      <UButton icon="i-lucide:bold" variant="ghost" color="neutral" size="xs" @click="editor?.chain().focus().toggleBold().run()" :class="{ 'bg-primary/10 text-primary': editor?.isActive('bold') }" />
      <UButton icon="i-lucide:italic" variant="ghost" color="neutral" size="xs" @click="editor?.chain().focus().toggleItalic().run()" :class="{ 'bg-primary/10 text-primary': editor?.isActive('italic') }" />
      <UButton icon="i-lucide:list" variant="ghost" color="neutral" size="xs" @click="editor?.chain().focus().toggleBulletList().run()" :class="{ 'bg-primary/10 text-primary': editor?.isActive('bulletList') }" />
      <UButton icon="i-lucide:heading-1" variant="ghost" color="neutral" size="xs" @click="editor?.chain().focus().toggleHeading({ level: 1 }).run()" :class="{ 'bg-primary/10 text-primary': editor?.isActive('heading', { level: 1 }) }" />
      <UButton icon="i-lucide:heading-2" variant="ghost" color="neutral" size="xs" @click="editor?.chain().focus().toggleHeading({ level: 2 }).run()" :class="{ 'bg-primary/10 text-primary': editor?.isActive('heading', { level: 2 }) }" />
      
      <div class="w-px h-4 bg-default mx-1" />
      
      <UButton icon="i-lucide:link" variant="ghost" color="neutral" size="xs" @click="addLink" :class="{ 'bg-primary/10 text-primary': editor?.isActive('link') }" />
      <UButton icon="i-lucide:image" variant="ghost" color="neutral" size="xs" @click="addImage" />
      
      <div class="ml-auto flex items-center gap-2 pr-2">
        <span class="text-[10px] font-bold text-dimmed uppercase tracking-wider">Tags:</span>
        <UButton label="{user}" size="xs" variant="soft" @click="addTag('{user}')" />
        <UButton label="{date}" size="xs" variant="soft" @click="addTag('{date}')" />
      </div>
    </div>

    <!-- Editor Content -->
    <div class="p-4 flex-grow prose dark:prose-invert max-w-none overflow-y-auto bg-white dark:bg-neutral-900 border-none rounded-none focus:outline-none">
      <EditorContent :editor="editor" class="editor-content-container" />
    </div>
  </div>
</template>

<style>
.editor-content-container .ProseMirror {
  min-height: 300px;
  outline: none !important;
}

.ProseMirror p.is-editor-empty:first-child::before {
  content: attr(data-placeholder);
  float: left;
  color: #adb5bd;
  pointer-events: none;
  height: 0;
}
</style>
