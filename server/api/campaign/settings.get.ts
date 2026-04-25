import { defineEventHandler } from 'h3'
import { requireUserSession } from '../../utils/auth'

export default defineEventHandler(async (event) => {
    await requireUserSession(event, { permission: 'manage_campaign' })

    const contextsStr = process.env.MAILGUN_SENDER_CONTEXTS || ''
    const aliases = contextsStr.split(',').map(item => {
        const [label, email] = item.split(':')
        const domain = email?.split('@')[1] || 'techkne.com'
        return { label, email, domain }
    }).filter(a => a.email)

    return {
        success: true,
        aliases,
        defaultAlias: aliases[0] || null
    }
})
