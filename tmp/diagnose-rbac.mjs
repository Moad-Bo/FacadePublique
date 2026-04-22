import { auth } from "../server/lib/auth";

async function diagnose() {
    console.log("Starting authentication diagnostics...");
    
    // Simulate what the client sees
    try {
        const email = "user@example.com";
        const password = "password123";

        console.log(`Attempting login for ${email}...`);
        const session = await auth.api.signInEmail({
            body: {
                email,
                password
            }
        });

        if (!session) {
            console.error("Login failed: No session returned.");
            return;
        }

        const user = session.user;
        console.log("-----------------------------------------");
        console.log(`SUCCESS: Logged in as ${user.email}`);
        console.log(`Role: ${user.role}`);
        console.log(`Enriched Permissions: ${user.permissions}`);
        console.log("-----------------------------------------");

        if (user.permissions && user.permissions.includes("manage_roles")) {
             console.log("RESULT: User HAS manage_roles permission.");
        } else {
             console.log("RESULT: User MISSES manage_roles permission.");
        }
        
    } catch (e) {
        console.error("CRITICAL ERROR during diagnostics:", e.message);
    }
}

diagnose();
