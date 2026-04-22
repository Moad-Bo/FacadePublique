import { defineEventHandler, readBody, createError } from 'h3'
import { requireUserSession } from '../../utils/auth'
import { getDynamicTemplate } from '../../utils/templates'
import { sendEmail } from '../../utils/email'

const TEST_RECIPIENT = 'moad.bo@proton.me'

export default defineEventHandler(async (event) => {
    await requireUserSession(event, { permission: 'manage_mail' })

    const body = await readBody(event)
    const { templateId } = body

    if (!templateId) {
        throw createError({ statusCode: 400, statusMessage: 'Missing templateId' })
    }

    const template = await getDynamicTemplate(templateId, {
        url: 'https://techkne.com/test',
        name: 'Test User',
        message: 'Ceci est un email de test envoyé depuis le panneau d\'administration.'
    })

    const result = await sendEmail({
        recipient: TEST_RECIPIENT,
        subject: `[TEST] ${template.subject}`,
        html: template.html,
        type: 'system',
        template: templateId
    })

    return { 
        success: result.success, 
        message: result.success ? `Email de test envoyé à ${TEST_RECIPIENT}` : 'Échec de l\'envoi'
    }
})
