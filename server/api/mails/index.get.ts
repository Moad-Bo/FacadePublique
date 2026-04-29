import { getQuery, defineEventHandler } from 'h3'
import { mailService } from '../../services/mail.service'
import { requireUserSession } from '../../utils/auth'
import { MailListSchema } from '../../utils/schemas'

export default defineEventHandler(async (event) => {
    const session = await requireUserSession(event, { permission: 'manage_mail' })
    
    // Validation des query params via Zod
    const query = await MailListSchema.parse(getQuery(event))

    // 1. Déclenchement des filtres automatiques
    if (query.folder === 'inbox' && query.page === 1) {
        await mailService.processAutoFilters(session.user.id)
    }

    // 2. Récupération des mails via le service (Pagination SQL réelle)
    return await mailService.listMails(session.user.id, {
        account: query.account,
        folder: query.folder,
        search: query.search,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
        tab: query.tab,
        page: query.page,
        limit: query.perPage
    })
})
