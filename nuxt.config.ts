import path from 'node:path'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-07-15',
  site: {
    url: 'https://facadepublique.com',
    name: 'Facade Publique'
  },

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
    
    // Domaine API racine pour le routage de base
    mailgunApiDomain: process.env.MAILGUN_API_DOMAIN || 'support.techkne.com',

    // Adresses expéditeurs complètes — source de vérité depuis .env
    mailSenderSystem: process.env.MAIL_SENDER_SYSTEM || 'system@support.techkne.com',
    mailSenderNewsletter: process.env.MAIL_SENDER_NEWSLETTER || 'newsletter@support.techkne.com',
    mailSenderChangelog: process.env.MAIL_SENDER_CHANGELOG || 'changelog@support.techkne.com',
    mailSenderPromo: process.env.MAIL_SENDER_PROMO || 'marketing@support.techkne.com',
    mailSenderSupport: process.env.MAIL_SENDER_SUPPORT || 'support@support.techkne.com',
    mailSenderContact: process.env.MAIL_SENDER_CONTACT || 'contact@support.techkne.com',
    mailSenderModeration: process.env.MAIL_SENDER_MODERATION || 'moderation@support.techkne.com',

    smtpHost: process.env.SMTP_HOST || 'smtp.eu.mailgun.org',
    smtpPort: parseInt(process.env.SMTP_PORT || '587'),
    smtpUser: process.env.SMTP_USER,
    smtpPass: process.env.SMTP_PASS,

    // Clés publiques (accessibles depuis le client via useRuntimeConfig().public)
    public: {
      authBaseUrl: process.env.BETTER_AUTH_URL || 'http://localhost:3000',
      // Version frontend: liste des labels (configurés statiquement maintenant que les alias sont typés)
      mailSenderLabels: 'Support,Newsletter,Système,Changelog,Promotionnel,Moderation',
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

  icon: {
    // On évite de packer toute la collection locale (10MB+) dans le bundle serveur
    // On laisse le scan détecter uniquement les icônes utilisées
    serverBundle: 'remote', 
    clientBundle: {
      scan: true
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
    preset: 'node-server',
    // On mocke secure-exec pour éviter les erreurs de build sans l'installer (sécurité)
    alias: {
      'secure-exec': path.resolve(__dirname, 'server/utils/mock-secure-exec.ts')
    },
    prerender: {
      crawlLinks: true,
      ignore: [
        '/__nuxt_content/**', // Évite le rerendering des lourds dumps SQL de Content v3
        '/llms.txt'
      ]
    },
    routeRules: {
      '/**': {
        headers: {
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