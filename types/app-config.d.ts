export {}

declare module '@nuxt/schema' {
  interface AppConfig {
    assistant?: {
      icons?: {
        trigger?: string
      }
      floatingInput?: boolean
      shortcuts?: {
        focusInput?: string
      }
    }
  }
}

declare module 'nuxt/schema' {
  interface AppConfig {
    assistant?: {
      icons?: {
        trigger?: string
      }
      floatingInput?: boolean
      shortcuts?: {
        focusInput?: string
      }
    }
  }
}
