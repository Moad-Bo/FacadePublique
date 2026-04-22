import { auth } from "../../lib/auth";
import { defineEventHandler, toWebRequest } from "h3";

// Pattern officiel Better Auth pour H3/Nitro (Nuxt 4)
// Ref: https://www.better-auth.com/docs/integrations/nuxt
export default defineEventHandler((event) => {
    return auth.handler(toWebRequest(event));
});
