import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

async function migrate() {
    const caPath = process.env.MYSQL_SSL_CA;
    let caCert = undefined;
    if (caPath) {
        const fullPath = path.isAbsolute(caPath) ? caPath : path.resolve(process.cwd(), caPath);
        caCert = fs.readFileSync(fullPath, 'utf8');
    }

    const connection = await mysql.createConnection({
        host: process.env.MYSQL_HOST,
        port: Number(process.env.MYSQL_PORT),
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
        ssl: caCert ? {
            rejectUnauthorized: true,
            ca: caCert,
        } : undefined,
    });

    console.log('🚀 Starting Community Engine Migration with SSL...');

    try {
        // 1. Rename categories table and columns
        console.log('--- Migrating Categories ---');
        await connection.query('ALTER TABLE forum_category RENAME TO community_category');
        await connection.query('ALTER TABLE community_category RENAME COLUMN thread_count TO topic_count');
        await connection.query("ALTER TABLE community_category ADD COLUMN context VARCHAR(30) DEFAULT 'forum'");

        // 2. Rename threads table and columns
        console.log('--- Migrating Topics (Threads) ---');
        await connection.query('ALTER TABLE forum_thread RENAME TO community_topic');
        await connection.query('ALTER TABLE community_topic RENAME COLUMN is_pinned TO is_sticky');
        await connection.query("ALTER TABLE community_topic ADD COLUMN context VARCHAR(30) DEFAULT 'forum'");
        await connection.query('ALTER TABLE community_topic ADD COLUMN external_id VARCHAR(100)');

        // 3. Rename replies table
        console.log('--- Migrating Replies ---');
        await connection.query('ALTER TABLE forum_reply RENAME TO community_reply');
        await connection.query('ALTER TABLE community_reply RENAME COLUMN thread_id TO topic_id');

        // 4. Rename votes table
        console.log('--- Migrating Votes ---');
        await connection.query('ALTER TABLE forum_vote RENAME TO community_vote');

        console.log('✅ Migration completed successfully!');
    } catch (error: any) {
        console.error('❌ Migration failed:', error.message);
    } finally {
        await connection.end();
    }
}

migrate();
