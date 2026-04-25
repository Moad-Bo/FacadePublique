import { resolve } from 'path';

/**
 * Resolves a path relative to the project root, 
 * even if it starts with a leading slash.
 */
export function resolveProjectPath(p: string): string {
    if (!p) return p;
    // Treat leading slash as relative to project root
    const cleanPath = p.startsWith('/') ? p.slice(1) : p;
    return resolve(process.cwd(), cleanPath);
}
