import { auth } from "../server/lib/auth";

async function test() {
    try {
        console.log("Analyzing impersonateUser return value...");
        // Assuming we have at least one user in the DB
        const res = await auth.api.impersonateUser({
            body: {
                userId: "any-user-id" // This is just for analysis
            }
        });
        console.log("Response Type:", typeof res);
        console.log("Response Keys:", Object.keys(res || {}));
        console.log("Full Response:", JSON.stringify(res, null, 2));
    } catch (e) {
        console.error("Failed (Expected):", e.message);
    }
}

test();
