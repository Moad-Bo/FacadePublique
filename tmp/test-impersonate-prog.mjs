import { auth } from "../server/lib/auth";

async function test() {
    try {
        console.log("Testing programmatic impersonateUser...");
        // Use a real user ID from the DB if possible, or any string
        const res = await auth.api.impersonateUser({
            body: {
                userId: "fGuQvSqI446WTN5CU8PeDdDqpblEdinH" // standard user ID
            }
        });
        console.log("Success! Return value:", JSON.stringify(res, null, 2));
    } catch (e) {
        console.error("Programmatic call failed:", e.message);
    }
}

test();
