export default defineAppConfig({
  assistant: {
    icons: {
      trigger: 'i-custom-ai'
    },
    floatingInput: true,
    shortcuts: {
      focusInput: 'meta_i'
    }
  },
  docus: {
    ai: {
      floatingInput: true,
      explainWithAI: true,
      faqs: [
        {
          question: 'Comment envoyer un email avec Techknè ?',
          category: 'Communication'
        },
        {
          question: 'Comment configurer SQLite pour mes documents ?',
          category: 'Technique'
        },
        {
          question: 'Quelles sont les bonnes pratiques d’envoi ?',
          category: 'Conseils'
        }
      ]
    }
  }
})
