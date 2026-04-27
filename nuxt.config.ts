// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-07-15',

  runtimeConfig: {
    // Clés serveur uniquement (jamais exposées au client)
    authSecret: process.env.BETTER_AUTH_SECRET,
    // AWS S3 & CloudFront
    awsRegion: process.env.AWS_REGION || 'us-east-1',
    awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID,
    awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    awsS3BucketName: process.env.AWS_S3_BUCKET_NAME || 'techkne-assets',
    cloudfrontDomain: process.env.CLOUDFRONT_DOMAIN || 'assets.techkne.com',
    cloudfrontKeyPairId: process.env.CLOUDFRONT_KEY_PAIR_ID,
    // Chemin vers le fichier .pem — plus sûr qu'une clé inline dans .env
    cloudfrontPrivateKeyPath: process.env.CLOUDFRONT_PRIVATE_KEY_PATH,

    // Mailgun isolation
    mailgunApiKey: process.env.MAILGUN_API_KEY,
    mailgunWebhookSigningKey: process.env.MAILGUN_WEBHOOK_SIGNING_KEY,
    // Adresses expéditeurs complètes — source de vérité depuis .env
    // Format: "user@domaine" — le domaine est extrait pour le routing Mailgun
    mailDomainSystem: (process.env.MAIL_DOMAIN_SYSTEM || 'system@support.techkne.com').split('@').pop(),
    mailDomainMarketing: (process.env.MAIL_DOMAIN_MARKETING || 'marketing@support.techkne.com').split('@').pop(),
    mailDomainSupport: (process.env.MAIL_DOMAIN_SUPPORT || 'contact@support.techkne.com').split('@').pop(),
    smtpHost: process.env.SMTP_HOST || 'smtp.eu.mailgun.org',
    smtpPort: parseInt(process.env.SMTP_PORT || '587'),
    smtpUser: process.env.SMTP_USER,
    smtpPass: process.env.SMTP_PASS,
    /**
     * MAILGUN_SENDER_CONTEXTS — Alias expéditeurs configurables
     * Alignés avec MAIL_DOMAIN_SYSTEM, MAIL_DOMAIN_MARKETING, MAIL_DOMAIN_SUPPORT
     * Format: "Label:adresse@domaine" séparés par des virgules
     * 
     * Contextes disponibles (correspondances avec emailRouter):
     *   Support   → MAIL_DOMAIN_SUPPORT  (EmailContext.WEBMAILER)  → SMTP
     *   Newsletter→ MAIL_DOMAIN_MARKETING(EmailContext.MARKETING_BATCH) → API
     *   Système   → MAIL_DOMAIN_SYSTEM   (EmailContext.SYSTEM)     → API
     */
    mailgunSenderContexts: process.env.MAILGUN_SENDER_CONTEXTS
      // Fallback auto-construit depuis les 3 variables de domaine officielles
      || [
        `Support:${process.env.MAIL_DOMAIN_SUPPORT || 'contact@support.techkne.com'}`,
        `Newsletter:${process.env.MAIL_DOMAIN_MARKETING || 'marketing@support.techkne.com'}`,
        `Système:${process.env.MAIL_DOMAIN_SYSTEM || 'system@support.techkne.com'}`,
      ].join(','),
    // Clés publiques (accessibles depuis le client via useRuntimeConfig().public)
    public: {
      authBaseUrl: process.env.BETTER_AUTH_URL || 'http://localhost:3000',
      // Version frontend: liste des labels uniquement (sans les emails privés)
      // Dérivée depuis MAILGUN_SENDER_CONTEXTS ou depuis les variables de domaine
      mailSenderLabels: (process.env.MAILGUN_SENDER_CONTEXTS || 'Support,Newsletter,Système')
        .split(',')
        .map(s => s.split(':')[0].trim())
        .join(','),
      assistant: {
        enabled: true,
        apiPath: '/__docus__/assistant'
      }
    }
  },

  future: {
    compatibilityVersion: 4
  },

  // Configuration des composants : supporte le nouveau dossier /common sans préfixe
  // tout en préservant le pathPrefix pour le dashboard et le forum.
  components: [
    { path: 'components/common', pathPrefix: false },
    { path: 'components/community', pathPrefix: false },
    'components', // Par défaut pathPrefix: true
  ],

  modules: [
    './modules/assistant',
    '@nuxtjs/mcp-toolkit',
    "@nuxt/ui",
    "@nuxt/fonts",
    "@nuxt/icon",
    "@nuxtjs/color-mode",
    "@nuxt/content",
    "@nuxtjs/i18n",
    "@nuxtjs/seo",
    "nuxt-llms",
    // 'nuxt-studio'
    "@vueuse/nuxt",
    'vue3-carousel-nuxt'
  ],

  llms: {
    domain: 'https://facadepublique.com',
    title: 'Facade Publique',
    description: 'Documentation et outils pour la communication publique.',
    contentRawMarkdown: {
      rewriteLLMSTxt: true
    }
  },

  alias: {
    '~': './app',
    '~~': './'
  },
  css: ['~/assets/css/main.css'],

  imports: {
    dirs: ['app/composables', 'app/composables/**', 'app/utils']
  },

  i18n: {
    locales: [
      { code: 'en', iso: 'en-US', file: 'en.json', name: 'English' },
      { code: 'fr', iso: 'fr-FR', file: 'fr.json', name: 'Français' }
    ],
    langDir: 'locales',
    defaultLocale: 'fr',
    strategy: 'prefix_except_default'
  },

  content: {
    experimental: { sqliteConnector: 'native' },
    build: {
      markdown: {
        highlight: {
          langs: ['bash', 'diff', 'json', 'js', 'ts', 'html', 'css', 'vue', 'shell', 'mdc', 'md', 'yaml'],
          theme: 'github-dark'
        }
      }
    }
  },

  vite: {
    server: {
      allowedHosts: true
    },
    optimizeDeps: {
      include: [
        '@vue/devtools-core',
        '@vue/devtools-kit',
        'better-auth/vue',
        'better-auth/client/plugins',
        'better-auth/plugins/access',
        'better-auth/plugins/admin/access',
        '@unovis/vue',
        '@internationalized/date',
        'date-fns',
        '@vueuse/core',
        'zod',
        '@tiptap/vue-3',
        '@tiptap/starter-kit',
        '@tiptap/extension-text-style',
        '@tiptap/extension-color',
        '@tiptap/extension-font-family',
        '@tiptap/extension-text-align',
        '@tiptap/extension-strike',
        '@tiptap/extension-link',
        '@tiptap/extension-blockquote',
        '@tiptap/extension-horizontal-rule',
        '@tiptap/extension-mention',
        'prosemirror-state',
        'prosemirror-transform',
        'prosemirror-model',
        'prosemirror-view',
        'prosemirror-gapcursor'
      ]
    },
    plugins: [
      {
        name: 'ai-assistant-vercel-fix',
        config(config) {
          if (process.env.AI_GATEWAY_API_KEY) {
            config.optimizeDeps ||= {}
            config.optimizeDeps.include ||= []
            if (!config.optimizeDeps.include.includes('@vercel/oidc')) {
              config.optimizeDeps.include.push('@vercel/oidc')
            }
          }
        }
      }
    ]
  },

  sourcemap: {
    server: false,
    client: false
  },

  telemetry: false,

  nitro: {
    preset: 'vercel',
    routeRules: {
      '/**': {
        headers: {
          // Fix Error with Permissions-Policy header: Unrecognized feature
          // We set a minimum baseline to override any browser-injected trial features
          'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
        }
      }
    }
  },

  devtools: {
    timeline: {
      enabled: true
    }
  }
})