import mysql from 'mysql2/promise';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
dotenv.config();

const rolesToSeed = [
    { name: 'admin', permissions: 'docs:internal,manager:customers,manager:members,support:chat,manage_mails,manage_roles', isStatic: true },
    { name: 'moderator', permissions: 'manager:members,support:chat', isStatic: true },
    { name: 'editor', permissions: 'docs:internal,manager:members', isStatic: true },
    { name: 'customer', permissions: 'support:chat', isStatic: true },
    { name: 'membre', permissions: '', isStatic: true },
    { name: 'user', permissions: '', isStatic: true }
];

async function seed() {
    const conn = await mysql.createConnection({
        host: process.env.MYSQL_HOST,
        port: 4000,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
        ssl: { ca: fs.readFileSync(process.env.MYSQL_SSL_CA, 'utf8') },
    });

    console.log('Seeding roles into TiDB Cloud...');
    for (const r of rolesToSeed) {
        try {
            await conn.query('INSERT INTO `role` (id, name, permissions, is_static, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)', [
                uuidv4(), r.name, r.permissions, r.isStatic, new Date(), new Date()
            ]);
            console.log(`- Seeded role: ${r.name}`);
        } catch (e) {
            console.error(`- Failed to seed ${r.name}:`, e.message);
        }
    }
    await conn.end();
}
seed();
