/**
 * GET /api/health
 *
 * Endpoint de santé utilisé par :
 *  - AWS App Runner (health check HTTP)
 *  - Docker HEALTHCHECK
 *  - Monitoring externe (UptimeRobot, etc.)
 *
 * Retourne 200 si le serveur est opérationnel.
 * Retourne 503 si la DB est indisponible (optionnel — peut être étendu).
 */
import { defineEventHandler, setResponseStatus } from 'h3';

export default defineEventHandler(async (event) => {
    setResponseStatus(event, 200);
    return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: Math.floor(process.uptime()),
        nodeVersion: process.version,
        env: process.env.NODE_ENV || 'development',
    };
});
