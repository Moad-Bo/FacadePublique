import mysql from 'mysql2/promise';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

async function check() {
    const conn = await mysql.createConnection({
        host: process.env.MYSQL_HOST, port: 4000, user: process.env.MYSQL_USER, password: process.env.MYSQL_PASSWORD, database: process.env.MYSQL_DATABASE,
        ssl: { ca: fs.readFileSync(process.env.MYSQL_SSL_CA, 'utf8') },
    });
    const [rows] = await conn.query('SELECT * FROM `role`');
    console.log(`Roles in DB: ${rows.length}`);
    rows.forEach(r => console.log(`- ${r.name}`));
    await conn.end();
}
check();
