import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import * as schema from '../../drizzle/src/db/schema';

// TiDB (MySQL) requires a certificate for secure connections.
const getCACert = () => {
    const caEnv = process.env.MYSQL_SSL_CA;
    if (caEnv && caEnv.startsWith('-----BEGIN CERTIFICATE-----')) return caEnv;

    const relativePath = caEnv || 'server/keys/content-db.pem';
    const searchPaths = [
        path.resolve(process.cwd(), relativePath),
        path.resolve(process.cwd(), '..', relativePath),
        typeof import.meta.dirname !== 'undefined' ? path.resolve(import.meta.dirname, '../../server/keys/content-db.pem') : undefined,
        typeof import.meta.dirname !== 'undefined' ? path.resolve(import.meta.dirname, '../../../server/keys/content-db.pem') : undefined,
        // On Vercel, sometimes files are in /var/task/server/keys/...
        '/var/task/server/keys/content-db.pem'
    ].filter((p): p is string => typeof p === 'string');

    for (const fullPath of searchPaths) {
        try {
            if (fs.existsSync(fullPath)) {
                return fs.readFileSync(fullPath, 'utf8');
            }
        } catch (e) {}
    }
    return undefined;
};

const caCert = getCACert();
if (!caCert && !import.meta.prerender) {
    console.warn("⚠️ SSL CA file not found. Database connection might fail if required.");
}

// Create the pool connection
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
    connectTimeout: import.meta.prerender ? 2000 : 10000, // Short timeout during build
    waitForConnections: true,
    connectionLimit: 30,
    enableKeepAlive: true,
    maxIdle: 10,
});

// Export drizzle instance - adding a failsafe layer for prerendering
export const db = drizzle(poolConnection, { schema, mode: 'default' });
