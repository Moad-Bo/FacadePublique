import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import crypto from 'node:crypto';

dotenv.config();

async function test() {
    console.log("--- STARTING DB TEST ---");
    const caPath = process.env.MYSQL_SSL_CA;
    const fullPath = path.isAbsolute(caPath) ? caPath : path.resolve(process.cwd(), caPath);
    
    console.log("Connecting to:", process.env.MYSQL_HOST);
    
    try {
        const conn = await mysql.createConnection({
            host: process.env.MYSQL_HOST,
            port: 4000,
            user: process.env.MYSQL_USER,
            password: process.env.MYSQL_PASSWORD,
            database: process.env.MYSQL_DATABASE,
            ssl: { ca: fs.readFileSync(fullPath, 'utf8') },
        });

        console.log("Connected successfully.");

        const roleId = crypto.randomUUID();
        const roleName = "test_role_" + Date.now();
        
        console.log(`Attempting to insert role: ${roleName}`);
        
        const [res] = await conn.execute(
            'INSERT INTO role (id, name, permissions, createdAt, updatedAt) VALUES (?, ?, ?, NOW(), NOW())',
            [roleId, roleName, 'manage_roles']
        );

        console.log("Insertion result:", res);

        // Verification
        const [rows] = await conn.execute('SELECT * FROM role WHERE id = ?', [roleId]);
        console.log("Verification select:", rows);

        // Cleanup
        await conn.execute('DELETE FROM role WHERE id = ?', [roleId]);
        console.log("Cleanup successful.");

        await conn.end();
        console.log("--- TEST PASSED ---");
    } catch (e) {
        console.error("--- TEST FAILED ---");
        console.error(e);
    }
}

test();
