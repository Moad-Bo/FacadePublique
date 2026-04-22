import { z } from "zod";
import { H3Event, createError, readBody } from "h3";

/**
 * Validates the request body against a Zod schema.
 * Throws a 400 error with a generic message if validation fails.
 */
export async function validateBody<T extends z.ZodTypeAny>(event: H3Event, schema: T): Promise<z.infer<T>> {
    const body = await readBody(event);
    
    if (!body) {
        throw createError({
            statusCode: 400,
            statusMessage: "Le corps de la requête est vide.",
        });
    }

    const result = schema.safeParse(body);

    if (!result.success) {
        // Detailed log for server-side debugging
        console.warn(`[VALIDATION] Schema validation failed for ${event.path}:`, JSON.stringify(result.error.format()));
        
        // Generic error message for the client as requested
        throw createError({
            statusCode: 400,
            statusMessage: "Données invalides. Veuillez vérifier les champs envoyés.",
        });
    }

    return result.data;
}
