import { randomUUID } from "crypto";
import { getS3PublicUrl, createDirectUploadContrat } from "../../utils/r2";
import { requireUserSession } from "../../utils/auth";

export default defineEventHandler(async (event) => {
    const session = await requireUserSession(event);
    if (!session) {
        throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
    }

    const query = getQuery(event);
    const filename = query.filename as string;
    const contentType = query.contentType as string;
    const type = (query.type as string) || 'ugc';

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
            publicUrl: getS3PublicUrl(key)
        };
    } catch (error: any) {
        throw createError({
            statusCode: 500,
            statusMessage: error.message || "Failed to create upload contract"
        });
    }
});
