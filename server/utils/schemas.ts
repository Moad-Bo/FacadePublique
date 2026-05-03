import { z } from 'zod'

/**
 * Schéma pour le listage des emails (Query params)
 */
export const MailListSchema = z.object({
    account: z.string().optional().default('contact'),
    folder: z.string().optional().default('inbox'),
    search: z.string().optional().default(''),
    sortBy: z.enum(['date', 'size']).optional().default('date'),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
    tab: z.enum(['all', 'unread', 'pinned', 'important']).optional().default('all'),
    type: z.enum([
        "system", "newsletter", "contact", "notification",
        "mod-forum", "staff", "campaign", "marketing"
    ]).optional(),
    page: z.preprocess((val) => val ? parseInt(val as string, 10) : undefined, z.number().min(1).default(1)),
    perPage: z.preprocess((val) => val ? parseInt(val as string, 10) : undefined, z.number().min(1).max(200).default(50))
})

/**
 * Schéma pour les actions groupées sur les emails
 */
export const MailActionSchema = z.object({
    action: z.enum([
        'toggle-attribute', 'archive', 'trash', 'restore', 
        'mark-read', 'mark-unread', 'delete-forever', 
        'spam', 'unspam', 'move-to-folder', 'add-label', 'remove-label'
    ]),
    ids: z.array(z.string().uuid().or(z.string().min(1))),
    attribute: z.string().optional(),
    value: z.any().optional(),
    folderId: z.string().optional().nullable(),
    labelId: z.string().optional(),
    blacklist: z.boolean().optional()
})

/**
 * Schéma pour l'envoi d'emails (Manuel ou Planifié)
 */
export const SendMailSchema = z.object({
    to: z.string().email('Adresse email invalide'),
    cc: z.string().optional(),
    bcc: z.string().optional(),
    subject: z.string().min(1, 'Le sujet est requis').max(255),
    message: z.string().min(1, 'Le message ne peut pas être vide'),
    type: z.enum([
        "system", "newsletter", "contact", "notification", 
        "mod-forum", "staff", "campaign", "marketing"
    ]).optional().default("contact"),
    templateId: z.string().optional(),
    scheduledAt: z.string().datetime().optional().nullable(),
    recurrence: z.enum(['none', 'daily', 'weekly', 'monthly']).optional().default('none'),
    recurrenceValue: z.string().optional(),
    timezone: z.string().optional().default('Europe/Paris'),
    fromContext: z.string().optional()
})
