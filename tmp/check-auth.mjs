import { auth } from '../server/lib/auth.ts';
console.log('Available API methods:', Object.keys(auth.api).filter(k => k.toLowerCase().includes('password') || k.toLowerCase().includes('user')));
console.log('Available Admin properties:', Object.keys(auth.admin || {}));
