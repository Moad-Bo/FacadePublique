<script setup lang="ts">
/**
 * DashboardComWebmailerHtmlRenderer.client.vue
 *
 * Rendu HTML des emails entrants.
 * - Si isHtml === true  → iframe srcdoc sandboxée, sans cadre visible, auto-height
 * - Si isHtml === false → texte brut (whitespace-pre-wrap)
 *
 * Design : le contenu donne l'impression d'être "posé" sur la card, pas dans un widget.
 * - Fond transparent, pas de bordure, pas de scrollbar interne sauf dépassement maxHeight.
 * - Thème de l'app injecté dans le document srcdoc.
 */

const props = withDefaults(defineProps<{
  body: string
  isHtml?: boolean
  maxHeight?: number // px — si contenu > maxHeight, iframe devient scrollable intérieurement
}>(), {
  isHtml: false,
  maxHeight: 1200,
})

const colorMode = useColorMode()

const iframeRef = ref<HTMLIFrameElement | null>(null)
const frameHeight = ref(200) // Hauteur calculée par ResizeObserver

// ─── CSS INJECTION ────────────────────────────────────────────────────────────
//
// On injecte le design system de l'app dans le srcdoc.
// But : les emails entrants n'ont pas de contexte d'application, on leur en donne un.
// Le fond est transparent pour que la card parente transparaisse.
// Les couleurs texte correspondent à l'app (dark/light).
//
const buildThemeCss = (dark: boolean) => {
  const textColor = dark ? '#e5e7eb' : '#171717'
  const mutedColor = dark ? '#9ca3af' : '#6b7280'
  const linkColor = dark ? '#818cf8' : '#4f46e5'
  const borderColor = dark ? '#374151' : '#e5e7eb'
  const codeBackground = dark ? '#1f2937' : '#f9fafb'

  return `
    :root { color-scheme: ${dark ? 'dark' : 'light'}; }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      padding: 0;
      background: transparent !important;
      color: ${textColor};
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 14px;
      line-height: 1.65;
      word-break: break-word;
      -webkit-font-smoothing: antialiased;
    }

    /* Override blanc forcé des emails tiers */
    table { background: transparent !important; }
    td, th { background: transparent !important; }
    div[style*="background:#fff"],
    div[style*="background:#ffffff"],
    div[style*="background: #fff"],
    div[style*="background: #ffffff"],
    div[style*="background:white"],
    div[style*="background: white"] {
      background: transparent !important;
    }

    /* Tables email courants (Mailchimp, etc.) */
    .email-wrapper,
    .email-body,
    .email-content {
      background: transparent !important;
    }

    /* Liens */
    a {
      color: ${linkColor};
      text-decoration: underline;
      text-underline-offset: 2px;
    }
    a:hover { opacity: 0.8; }

    /* Code blocks */
    pre, code {
      background: ${codeBackground};
      border: 1px solid ${borderColor};
      border-radius: 6px;
      padding: 2px 6px;
      font-size: 12px;
      font-family: "SF Mono", "JetBrains Mono", Consolas, monospace;
    }
    pre { padding: 12px 16px; overflow-x: auto; }
    pre code { background: none; border: none; padding: 0; }

    /* Typographie basique */
    p { margin: 0 0 0.75em; }
    blockquote {
      border-left: 3px solid ${borderColor};
      margin: 0.5em 0;
      padding-left: 1em;
      color: ${mutedColor};
    }
    img { max-width: 100%; height: auto; }
    hr { border: none; border-top: 1px solid ${borderColor}; margin: 1em 0; }

    /* Scrollbar élégante si overflow */
    ::-webkit-scrollbar { width: 4px; height: 4px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: ${borderColor}; border-radius: 99px; }
  `
}

// ─── SRCDOC ───────────────────────────────────────────────────────────────────
const safeDoc = computed(() => {
  const dark = colorMode.value === 'dark'
  const css = buildThemeCss(dark)

  // Extrait le contenu <body> s'il existe (emails complets) ou utilise tel quel
  let content = props.body || ''

  // Si le html contient un <body>, on n'encapsule que son contenu
  const bodyMatch = content.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
  if (bodyMatch) {
    content = bodyMatch[1]
  }

  // Retire les <script> pour la sécurité (double protection avec sandbox)
  content = content.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
  // Retire les <style> dans head externe — on applique les nôtres
  // On garde les <style> inline dans le body (cas des emails riches avec CSS interne)

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <base target="_blank" rel="noopener noreferrer">
  <style>${css}</style>
</head>
<body>${content}</body>
</html>`
})

// ─── AUTO-HEIGHT (ResizeObserver) ────────────────────────────────────────────
//
// On observe le body du document de l'iframe après chargement.
// Quand son scrollHeight change (images chargées, etc.), on met à jour la hauteur.
// Résultat : l'iframe s'intègre comme du contenu natif dans la card.
//
let resizeObserver: ResizeObserver | null = null

const setupResizeObserver = () => {
  if (!iframeRef.value) return

  const doc = iframeRef.value.contentDocument
  if (!doc?.body) return

  resizeObserver?.disconnect()

  resizeObserver = new ResizeObserver(() => {
    if (!iframeRef.value?.contentDocument?.body) return
    const h = iframeRef.value.contentDocument.body.scrollHeight
    frameHeight.value = h
  })

  resizeObserver.observe(doc.body)
  // Initial
  frameHeight.value = doc.body.scrollHeight
}

const onIframeLoad = () => {
  setupResizeObserver()
}

// Quand le contenu ou le thème change, on re-injecte le srcdoc
watch([() => props.body, () => colorMode.value], () => {
  // Le watcher sur safeDoc met à jour srcdoc via le binding
  // On doit attendre le prochain tick pour que le DOM iframe soit prêt
  nextTick(() => {
    if (iframeRef.value) {
      iframeRef.value.srcdoc = safeDoc.value
    }
  })
})

// Client-side fallback: detect HTML for pre-migration rows (isHtml was false by default)
// This covers rows stored before the isHtml column was added to the DB.
const effectiveIsHtml = computed(() =>
  props.isHtml || /<[a-zA-Z][^>]*>/.test(props.body || '')
)

onUnmounted(() => {
  resizeObserver?.disconnect()
})
</script>

<template>
  <div>
    <!-- Texte brut : comportement original, pas de changement -->
    <div v-if="!effectiveIsHtml" class="whitespace-pre-wrap text-sm leading-relaxed">{{ body }}</div>

    <!-- HTML riche : iframe invisible qui se fond dans la card -->
    <ClientOnly v-else>
      <iframe
        ref="iframeRef"
        :srcdoc="safeDoc"
        sandbox="allow-popups allow-popups-to-escape-sandbox"
        referrerpolicy="no-referrer"
        class="w-full border-none block bg-transparent"
        :style="{
          height: `${Math.min(frameHeight, maxHeight)}px`,
          overflowY: frameHeight > maxHeight ? 'auto' : 'hidden',
        }"
        @load="onIframeLoad"
      />
      <template #fallback>
        <div class="h-24 flex items-center justify-center opacity-30">
          <UIcon name="i-lucide:loader-2" class="size-5 animate-spin" />
        </div>
      </template>
    </ClientOnly>
  </div>
</template>
