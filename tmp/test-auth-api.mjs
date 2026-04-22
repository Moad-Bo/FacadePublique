import { auth } from "../server/lib/auth";

async function test() {
    try {
        console.log("Testing createUser without headers...");
        // Note: This might still fail if Better Auth requires some internal context
        const res = await auth.api.createUser({
            body: {
                email: "test_logic_" + Date.now() + "@example.com",
                password: "password123",
                name: "Test Logic",
                role: "user"
            }
        });
        console.log("Success:", res);
    } catch (e) {
        console.error("Failed:", e.message);
    }
}

test();
