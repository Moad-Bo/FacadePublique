import mysql from "mysql2/promise";
import dotenv from "dotenv";
import fs from "fs";
dotenv.config();

async function migrate() {
    const caPath = process.env.MYSQL_SSL_CA;
    const caCert = caPath ? fs.readFileSync(caPath, 'utf8') : undefined;

    const connection = await mysql.createConnection({
        host: process.env.MYSQL_HOST,
        port: Number(process.env.MYSQL_PORT),
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
        ssl: caCert ? { ca: caCert } : undefined,
    });

    console.log("Connected to database. Running migration...");

    const queries = [
        "ALTER TABLE email_queue ADD COLUMN retry_count INT DEFAULT 0 AFTER error_message",
        "ALTER TABLE email_queue ADD COLUMN locked_at TIMESTAMP NULL AFTER retry_count"
    ];

    for (const q of queries) {
        try {
            await connection.query(q);
            console.log(`Success: ${q}`);
        } catch (e: any) {
            console.log(`Log: ${e.message}`);
        }
    }

    await connection.end();
    console.log("Migration finished.");
    process.exit(0);
}

migrate();
