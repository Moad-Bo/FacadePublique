import { randomUUID } from "crypto";

export default defineEventHandler(async (event) => {
    // Vérifier l'authentification (admin ou staff requis pour certains types)
    const session = await authClient.getSession({ fetchOptions: { headers: event.node.req.headers } });
    if (!session) {
        throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
    }

    const query = getQuery(event);
    const filename = query.filename as string;
    const contentType = query.contentType as string;
    const type = (query.type as string) || 'ugc'; // ugc, avatar, ticket, etc.

    if (!filename || !contentType) {
        throw createError({ statusCode: 400, statusMessage: "filename and contentType are required" });
    }

    const id = randomUUID();
    const key = `${type}/${id}-${filename}`;

    try {
        const post = await createDirectUploadContrat(key, contentType);
        
        return {
            success: true,
            post,
            key,
            publicUrl: getR2PublicUrl(key)
        };
    } catch (error: any) {
        throw createError({
            statusCode: 500,
            statusMessage: error.message || "Failed to create upload contract"
        });
    }
});
