import { eq } from "drizzle-orm";
import { user as userTable } from "../../../drizzle/src/db/schema";
import { db } from "../../utils/db";




export default defineEventHandler(async (event) => {
    const session = event.context.session;
    if (!session) {
        throw createError({
            statusCode: 401,
            message: "Unauthorized",
        });
    }

    const body = await readBody(event);
    const { themePrimary, themeNeutral, fontFamily, fontSize, bio, quote, metadata } = body;

    const updateData: any = {};
    if (themePrimary !== undefined) updateData.themePrimary = themePrimary;
    if (themeNeutral !== undefined) updateData.themeNeutral = themeNeutral;
    if (fontFamily !== undefined) updateData.fontFamily = fontFamily;
    if (fontSize !== undefined) updateData.fontSize = fontSize;
    if (bio !== undefined) updateData.bio = bio;
    if (quote !== undefined) updateData.quote = quote;
    if (metadata !== undefined) updateData.metadata = metadata;

    if (Object.keys(updateData).length === 0) {
        return { success: true, message: "No data to update" };
    }

    try {
        await db.update(userTable)
            .set(updateData)
            .where(eq(userTable.id, session.user.id));

        return { 
            success: true, 
            message: "Settings updated",
            data: updateData
        };
    } catch (e: any) {
        throw createError({
            statusCode: 500,
            message: e.message,
        });
    }
});
