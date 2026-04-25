import { eq, and } from "drizzle-orm";
import { db } from "../../utils/db";
import { audience } from "../../../drizzle/src/db/schema";
import { generateUnsubscribeToken } from "../../utils/email-builder";

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const email = query.email as string;
  const token = query.token as string;

  if (!email || !token) {
    return sendRedirect(event, '/?unsubscribed=invalid');
  }

  // 1. Verify token
  const expectedToken = generateUnsubscribeToken(email);
  if (token !== expectedToken) {
    console.error(`[UNSUBSCRIBE] Invalid token attempt for ${email}`);
    return sendRedirect(event, '/?unsubscribed=invalid_token');
  }

  try {
    // 2. Mark as unsubscribed
    const result = await db.update(audience)
      .set({ 
        optInMarketing: false, 
        unsubscribedAt: new Date() 
      })
      .where(and(
        eq(audience.email, email),
        eq(audience.optInMarketing, true)
      ));

    console.log(`[UNSUBSCRIBE] User ${email} has unsubscribed.`);
    
    // Redirect to a landing page with a success message
    return sendRedirect(event, '/?unsubscribed=success');
  } catch (e: any) {
    console.error(`[UNSUBSCRIBE] Database error:`, e.message);
    return sendRedirect(event, '/?unsubscribed=error');
  }
});
