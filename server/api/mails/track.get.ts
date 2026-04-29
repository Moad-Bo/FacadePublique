import { defineEventHandler, getQuery, setHeader } from 'h3';
import { bufferOpen } from '../../utils/tracking-buffer';

/**
 * GET /api/mails/track
 *
 * Endpoint de tracking des ouvertures d'emails (pixel 1x1 GIF).
 * Les ouvertures sont bufferisées en mémoire et persistées en DB
 * toutes les 15 secondes par le plugin Nitro (plugins/tracking.ts).
 *
 * Cela évite N écritures DB simultanées lors d'une ouverture massive
 * (ex: newsletter envoyée à 5000 personnes).
 */
export default defineEventHandler((event) => {
    const query = getQuery(event);
    const id  = query.id  as string | undefined;  // emailLog.id
    const cid = query.cid as string | undefined;  // campaign.id (optionnel)

    // Enregistrement non-bloquant dans le buffer en mémoire (O(1))
    if (id) {
        bufferOpen(id, cid);
    }

    // Retour immédiat du pixel 1x1 — aucune attente DB
    const pixel = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');

    setHeader(event, 'Content-Type', 'image/gif');
    setHeader(event, 'Cache-Control', 'no-cache, no-store, must-revalidate');
    setHeader(event, 'Pragma', 'no-cache');
    setHeader(event, 'Expires', '0');

    return pixel;
});

