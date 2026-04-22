export const useNotify = () => {
  const toast = useToast()

  /**
   * Logs critical UI errors to the server CLI for monitoring
   */
  const logToServer = async (level: 'error' | 'warning', title: string, description?: string) => {
    try {
      await $fetch('/api/logs', {
        method: 'POST',
        body: { 
          level, 
          title, 
          description, 
          path: window.location.pathname,
          timestamp: new Date().toISOString()
        }
      })
    } catch (e) {
      // Fail silently to avoid infinite loops if the logging API is down
    }
  }

  return {
    success: (title: string, description?: string, duration = 5000, options: any = {}) => {
      toast.add({ 
        title, 
        description, 
        color: 'success', 
        icon: 'i-lucide:check-circle',
        id: crypto.randomUUID(),
        duration,
        ...options
      })
    },
    error: (title: string, description?: string, duration = 7000, options: any = {}) => {
      toast.add({ 
        title, 
        description, 
        color: 'error', 
        icon: 'i-lucide:alert-circle',
        id: crypto.randomUUID(),
        duration,
        ...options
      })
      logToServer('error', title, description)
    },
    warning: (title: string, description?: string, duration = 6000, options: any = {}) => {
      toast.add({ 
        title, 
        description, 
        color: 'warning', 
        icon: 'i-lucide:alert-triangle',
        id: crypto.randomUUID(),
        duration,
        ...options
      })
    },
    info: (title: string, description?: string, duration = 5000, options: any = {}) => {
      toast.add({ 
        title, 
        description, 
        color: 'primary', 
        icon: 'i-lucide:info',
        id: crypto.randomUUID(),
        duration,
        ...options
      })
    }
  }
}
