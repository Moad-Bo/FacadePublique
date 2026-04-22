import { defineNitroPlugin } from 'nitropack/runtime/plugin'
import { processQueue } from '../utils/scheduler'

export default defineNitroPlugin((nitroApp) => {
    console.log('[Nitro] Starting Email Scheduler Plugin...')
    
    // Simple interval worker - every 60 seconds
    const interval = setInterval(async () => {
        try {
            // console.log('[Nitro Plugin] Scheduler checking queue...')
            await processQueue().catch(e => {
                console.error('[Nitro Plugin] Scheduler execution error:', e.message)
            })
        } catch (e) {
            // Global safety catch
        }
    }, 60 * 1000)

    nitroApp.hooks.hook('close', () => {
        console.log('[Nitro] Stopping Email Scheduler Plugin...')
        clearInterval(interval)
    })
})
