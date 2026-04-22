import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import * as schema from '../../drizzle/src/db/schema';

const caPath = process.env.MYSQL_SSL_CA;
let caCert = undefined;

if (caPath) {
    try {
        const fullPath = path.isAbsolute(caPath) ? caPath : path.resolve(process.cwd(), caPath);
        caCert = fs.readFileSync(fullPath, 'utf8');
    } catch (e: any) {
        console.error("Erreur lecture SSL CA:", e.message);
    }
}

const poolConnection = mysql.createPool({
    host: process.env.MYSQL_HOST,
    port: Number(process.env.MYSQL_PORT),
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    ssl: caCert ? {
        rejectUnauthorized: true,
        ca: caCert,
    } : undefined,
    connectTimeout: 5000, 
    waitForConnections: true,
    connectionLimit: 30, // Reduced to avoid saturating TiDB Cloud
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
    maxIdle: 10,
    idleTimeout: 60000
});

export const db = drizzle(poolConnection, { schema, mode: 'default' });
