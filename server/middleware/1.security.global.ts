import { LRUCache } from "lru-cache";

// 1. Rate Limiting Cache (In-Memory)
const rateLimitCache = new LRUCache<string, number>({
    max: 5000,
    ttl: 1000 * 60, // 1 minute window
});

export default defineEventHandler(async (event) => {
    // A. Detect Real IP (Cloudflare Priority)
    const headers = getHeaders(event);
    const ip = headers['cf-connecting-ip'] 
               || headers['x-forwarded-for']?.split(',')[0] 
               || event.node.req.socket.remoteAddress 
               || 'unknown';

    // B. Intelligent Rate Limiting
    const userAgent = headers['user-agent'] || '';
    const isCrawler = /googlebot|bingbot|yandex|baiduspider|slurp|duckduckbot/i.test(userAgent);
    
    // Exclude static assets and system internal routes from rate limiting
    // This prevents frequent icon loads or content queries from triggering a 429
    const path = event.path;
    const isAsset = path.startsWith('/_nuxt') 
                 || path.startsWith('/api/_nuxt_icon') 
                 || path.startsWith('/__nuxt_content')
                 || path.includes('.webp')
                 || path.includes('.png')
                 || path.includes('.jpg');

    if (isAsset) return;

    // Limits
    const limit = isCrawler ? 2000 : 500; // Increased: 2000 per min for SEO, 500 for humans
    
    const currentRequests = rateLimitCache.get(ip) || 0;
    
    if (currentRequests > limit) {
        console.error(`[SECURITY] Rate limit dynamic hit for IP: ${ip} (Limit: ${limit}) | Path: ${path}`);
        event.node.res.setHeader('Retry-After', '60');
        throw createError({
            statusCode: 429,
            statusMessage: "Too Many Requests: Please slow down.",
        });
    }

    rateLimitCache.set(ip, currentRequests + 1);

});
