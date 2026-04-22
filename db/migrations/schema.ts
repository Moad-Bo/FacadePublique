import { mysqlTable, mysqlSchema, AnyMySqlColumn, foreignKey, varchar, text, timestamp, index } from "drizzle-orm/mysql-core"
import { sql } from "drizzle-orm"

export const account = mysqlTable("account", {
	id: varchar({ length: 36 }).notNull(),
	accountId: text().notNull(),
	providerId: text().notNull(),
	userId: varchar({ length: 36 }).notNull().references(() => user.id),
	accessToken: text(),
	refreshToken: text(),
	idToken: text(),
	accessTokenExpiresAt: timestamp({ mode: 'string' }),
	refreshTokenExpiresAt: timestamp({ mode: 'string' }),
	scope: text(),
	password: text(),
	createdAt: timestamp({ mode: 'string' }).notNull(),
	updatedAt: timestamp({ mode: 'string' }).notNull(),
});

export const emailLog = mysqlTable("email_log", {
	id: varchar({ length: 36 }).notNull(),
	to: varchar({ length: 255 }).notNull(),
	subject: text().notNull(),
	template: varchar({ length: 50 }),
	type: varchar({ length: 20 }).default('system'),
	status: varchar({ length: 20 }).default('sent'),
	errorMessage: text("error_message"),
	sentAt: timestamp("sent_at", { mode: 'string' }).default('CURRENT_TIMESTAMP'),
});

export const role = mysqlTable("role", {
	id: varchar({ length: 36 }).notNull(),
	name: varchar({ length: 100 }).notNull(),
	permissions: text(),
	isStatic: tinyint("is_static").default(0),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("name").on(table.name),
]);

export const session = mysqlTable("session", {
	id: varchar({ length: 36 }).notNull(),
	expiresAt: timestamp({ mode: 'string' }).notNull(),
	token: varchar({ length: 255 }).notNull(),
	createdAt: timestamp({ mode: 'string' }).notNull(),
	updatedAt: timestamp({ mode: 'string' }).notNull(),
	ipAddress: text(),
	userAgent: text(),
	userId: varchar({ length: 36 }).notNull().references(() => user.id),
	impersonatedBy: text("impersonated_by"),
},
(table) => [
	index("session_token_unique").on(table.token),
]);

export const user = mysqlTable("user", {
	id: varchar({ length: 36 }).notNull(),
	name: text().notNull(),
	email: varchar({ length: 255 }).notNull(),
	emailVerified: tinyint().notNull(),
	image: text(),
	createdAt: timestamp({ mode: 'string' }).notNull(),
	updatedAt: timestamp({ mode: 'string' }).notNull(),
	role: text(),
	banned: tinyint(),
	banReason: text("ban_reason"),
	banExpires: timestamp("ban_expires", { mode: 'string' }),
	permissions: text(),
},
(table) => [
	index("user_email_unique").on(table.email),
]);

export const verification = mysqlTable("verification", {
	id: varchar({ length: 36 }).notNull(),
	identifier: text().notNull(),
	value: text().notNull(),
	expiresAt: timestamp({ mode: 'string' }).notNull(),
	createdAt: timestamp({ mode: 'string' }),
	updatedAt: timestamp({ mode: 'string' }),
});
