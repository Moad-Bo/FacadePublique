import dotenv from "dotenv";
dotenv.config();
import { db } from "../server/utils/db";
import { emailQueue } from "../drizzle/src/db/schema";
import { and, lte, or, eq, lt } from "drizzle-orm";

async function verify() {
    console.log("Verifying scheduler query integrity...");
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60000);

    try {
        const pending = await db.select()
            .from(emailQueue)
            .where(
                and(
                    lte(emailQueue.scheduledAt, now),
                    or(
                        eq(emailQueue.status, "pending"),
                        and(eq(emailQueue.status, "locked"), lte(emailQueue.lockedAt, fiveMinutesAgo))
                    ),
                    lt(emailQueue.retryCount, 3)
                )
            )
            .limit(1);
        
        console.log(`Success! Query executed. Found ${pending.length} pending items.`);
        process.exit(0);
    } catch (e: any) {
        console.error("Verification failed:", e.message);
        process.exit(1);
    }
}

verify();
