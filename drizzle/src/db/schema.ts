import { int, mysqlTable, serial, varchar, text, mediumtext, json, timestamp, boolean } from 'drizzle-orm/mysql-core';

export const user = mysqlTable("user", {
	id: varchar("id", { length: 36 }).primaryKey(),
	name: text("name").notNull(),
	email: varchar("email", { length: 255 }).notNull().unique(),
	emailVerified: boolean("emailVerified").notNull(),
	image: text("image"),
	role: text("role"),
	permissions: mediumtext("permissions"),
	themePrimary: varchar("theme_primary", { length: 50 }),
	themeNeutral: varchar("theme_neutral", { length: 50 }),
	fontFamily: varchar("font_family", { length: 50 }),
	fontSize: varchar("font_size", { length: 20 }),
	bio: text("bio"),
	quote: varchar("quote", { length: 255 }),
	metadata: json("metadata").$type<Record<string, any>>(),
	banned: boolean("banned"),
	banReason: text("ban_reason"),
	banExpires: timestamp("ban_expires", { fsp: 3 }),
	createdAt: timestamp("createdAt").notNull().defaultNow(),
	updatedAt: timestamp("updatedAt").notNull().defaultNow().onUpdateNow(),
});

export const role = mysqlTable("role", {
	id: varchar("id", { length: 36 }).primaryKey(),
	name: varchar("name", { length: 100 }).notNull().unique(),
	permissions: mediumtext("permissions"),
	isStatic: boolean("is_static").default(false),
	createdAt: timestamp("createdAt").notNull().defaultNow(),
	updatedAt: timestamp("updatedAt").notNull().defaultNow().onUpdateNow(),
});

export const session = mysqlTable("session", {
	id: varchar("id", { length: 36 }).primaryKey(),
	expiresAt: timestamp("expiresAt").notNull(),
	token: varchar("token", { length: 255 }).notNull().unique(),
	createdAt: timestamp("createdAt").notNull(),
	updatedAt: timestamp("updatedAt").notNull(),
	ipAddress: text("ipAddress"),
	userAgent: text("userAgent"),
	userId: varchar("userId", { length: 36 }).notNull().references(() => user.id),
	impersonatedBy: text("impersonated_by"),
});

export const account = mysqlTable("account", {
	id: varchar("id", { length: 36 }).primaryKey(),
	accountId: text("accountId").notNull(),
	providerId: text("providerId").notNull(),
	userId: varchar("userId", { length: 36 }).notNull().references(() => user.id),
	accessToken: text("accessToken"),
	refreshToken: text("refreshToken"),
	idToken: text("idToken"),
	accessTokenExpiresAt: timestamp("accessTokenExpiresAt"),
	refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt"),
	scope: text("scope"),
	password: text("password"),
	createdAt: timestamp("createdAt").notNull(),
	updatedAt: timestamp("updatedAt").notNull(),
});

export const verification = mysqlTable("verification", {
	id: varchar("id", { length: 36 }).primaryKey(),
	identifier: text("identifier").notNull(),
	value: text("value").notNull(),
	expiresAt: timestamp("expiresAt").notNull(),
	createdAt: timestamp("createdAt"),
	updatedAt: timestamp("updatedAt"),
});

export const emailLog = mysqlTable("email_log", {
	id: varchar("id", { length: 36 }).primaryKey(),
	recipient: varchar("recipient", { length: 255 }).notNull(),
	subject: text("subject").notNull(),
	template: varchar("template", { length: 50 }),
	type: varchar("type", { length: 20 }).default("system"), // system, newsletter, personal
	status: varchar("status", { length: 20 }).default("sent"), // sent, failed, delivered
	errorMessage: text("error_message"),
	messageId: varchar("message_id", { length: 255 }),
	campaignId: varchar("campaign_id", { length: 36 }),
	openedAt: timestamp("opened_at"),
	openCount: int("open_count").default(0),
	sentAt: timestamp("sent_at").defaultNow(),
});

export const mailbox = mysqlTable("mailbox", {
	id: varchar("id", { length: 36 }).primaryKey(),
	userId: varchar("userId", { length: 36 }).references(() => user.id), // Nullable to allow archiving after user deletion
	deletedUserRef: text("deleted_user_ref"), // Stores original owner info (e.g. "Jack (jack@techkne.fr)")
	fromName: text("from_name").notNull(),
	fromEmail: varchar("from_email", { length: 255 }).notNull(),
	subject: text("subject").notNull(),
	cc: text("cc"), // Field for Carbon Copy
	bcc: text("bcc"), // Field for Blind Carbon Copy
	body: mediumtext("body").notNull(),
	date: timestamp("date").defaultNow(),
	unread: boolean("unread").default(true),
	starred: boolean("starred").default(false),
	important: boolean("important").default(false),
	pinned: boolean("pinned").default(false),
	archived: boolean("archived").default(false),
	trashed: boolean("trashed").default(false),
	category: varchar("category", { length: 20 }).default("inbox"), // inbox, sent, draft
	// NEW: Webmailer fields
	toAccount: varchar("to_account", { length: 20 }).default("contact"), // contact, noreply, newsletter
	folderId: varchar("folder_id", { length: 36 }), // custom folder
	labels: json("labels").$type<string[]>().default([]), // label IDs
	size: int("size").default(0), // size in bytes for sorting
	layoutId: varchar("layout_id", { length: 36 }).default("inbox"), // Design layout ID
	isSpam: boolean("is_spam").default(false), // Flag for spam folder
});

export const spamFilter = mysqlTable("spam_filter", {
	id: varchar("id", { length: 36 }).primaryKey(),
	userId: varchar("user_id", { length: 36 }).references(() => user.id),
	email: varchar("email", { length: 255 }).notNull(), // Removed unique to allow multiple users to block same email
	reason: text("reason"),
	createdAt: timestamp("created_at").defaultNow(),
});

export const mailboxFolder = mysqlTable("mailbox_folder", {
	id: varchar("id", { length: 36 }).primaryKey(),
	userId: varchar("user_id", { length: 36 }).notNull().references(() => user.id),
	name: varchar("name", { length: 100 }).notNull(),
	color: varchar("color", { length: 20 }).default("neutral"),
	icon: varchar("icon", { length: 50 }).default("i-lucide:folder"),
	createdAt: timestamp("created_at").defaultNow(),
});

export const mailboxRule = mysqlTable("mailbox_rule", {
	id: varchar("id", { length: 36 }).primaryKey(),
	userId: varchar("user_id", { length: 36 }).notNull().references(() => user.id),
	name: varchar("name", { length: 100 }),
	senderEmail: varchar("sender_email", { length: 255 }).notNull(),
	targetFolderId: varchar("target_folder_id", { length: 36 }).notNull(),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at").defaultNow(),
});

export const mailboxLabel = mysqlTable("mailbox_label", {
	id: varchar("id", { length: 36 }).primaryKey(),
	userId: varchar("user_id", { length: 36 }).notNull().references(() => user.id),
	name: varchar("name", { length: 100 }).notNull(),
	color: varchar("color", { length: 20 }).default("primary"),
	createdAt: timestamp("created_at").defaultNow(),
});

export const mailboxAttachment = mysqlTable("mailbox_attachment", {
	id: varchar("id", { length: 36 }).primaryKey(),
	mailboxId: varchar("mailbox_id", { length: 36 }).references(() => mailbox.id, { onDelete: 'cascade' }),
	filename: varchar("filename", { length: 255 }).notNull(),
	mimeType: varchar("mime_type", { length: 100 }).notNull(),
	size: int("size").notNull(),
	r2Key: varchar("r2_key", { length: 500 }).notNull(),
	createdAt: timestamp("created_at").defaultNow(),
});

export const settings = mysqlTable("settings", {
    key: varchar("key", { length: 100 }).primaryKey(),
    value: text("value").notNull(),
    updatedAt: timestamp("updatedAt").notNull().onUpdateNow(),
});

export const audience = mysqlTable("audience", {
	id: varchar("id", { length: 36 }).primaryKey(),
	email: varchar("email", { length: 255 }).notNull().unique(),
	userId: varchar("user_id", { length: 36 }).references(() => user.id),
	optInNewsletter: boolean("opt_in_newsletter").default(false),
	optInMarketing: boolean("opt_in_marketing").default(false),
	optInForum: boolean("opt_in_forum").default(true),
	source: varchar("source", { length: 50 }).default("landing"),
	unsubscribedAt: timestamp("unsubscribed_at"),
	createdAt: timestamp("created_at").defaultNow(),
	updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

export const newsletterTemplate = mysqlTable("newsletter_template", {
    id: varchar("id", { length: 36 }).primaryKey(),
    name: varchar("name", { length: 100 }).notNull(),
    description: text("description"),
    subject: text("subject").notNull(),
    content: mediumtext("content").notNull(),
    icon: varchar("icon", { length: 50 }).default("i-lucide:mail"),
    layoutId: varchar("layout_id", { length: 36 }).default("newsletter"),
    createdAt: timestamp("createdAt").defaultNow(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow(),
});

export const newsletterCampaign = mysqlTable("newsletter_campaign", {
    id: varchar("id", { length: 36 }).primaryKey(),
    name: varchar("name", { length: 100 }).notNull(),
    templateId: varchar("template_id", { length: 36 }).references(() => newsletterTemplate.id),
    subject: text("subject").notNull(),
    content: text("content").notNull(),
    status: varchar("status", { length: 20 }).default("draft"), // draft, sent, archived
    fromContext: varchar("from_context", { length: 50 }),
    layoutId: varchar("layout_id", { length: 36 }).default("newsletter"),
    contentLayoutId: varchar("content_layout_id", { length: 36 }).references(() => emailLayout.id),
    sentAt: timestamp("sent_at"),
    totalRecipients: int("total_recipients").default(0),
    deliveredCount: int("delivered_count").default(0),
    openedCount: int("opened_count").default(0),
    failedCount: int("failed_count").default(0),
    clickedCount: int("clicked_count").default(0), // clics sur liens dans l'email (tracking Mailgun)
    createdAt: timestamp("createdAt").defaultNow(),
});

export const emailQueue = mysqlTable("email_queue", {
    id: varchar("id", { length: 36 }).primaryKey(),
    recipient: varchar("recipient", { length: 255 }).notNull(),
    subject: text("subject").notNull(),
    cc: text("cc"),
    bcc: text("bcc"),
    html: mediumtext("html").notNull(),
    type: varchar("type", { length: 20 }).default("manual"), // system, newsletter, manual
    fromContext: varchar("from_context", { length: 50 }),
    template: varchar("template", { length: 50 }),
    status: varchar("status", { length: 20 }).default("pending"), // pending, sent, failed, cancelled, locked
    scheduledAt: timestamp("scheduled_at").notNull(),
    recurrence: varchar("recurrence", { length: 20 }).default("none"), // none, daily, weekly, monthly
    recurrenceValue: varchar("recurrence_value", { length: 100 }), // e.g. "1" for Mon, or "7" for every 7 days
    layoutId: varchar("layout_id", { length: 36 }),
    timezone: varchar("timezone", { length: 50 }).default("Europe/Paris"),
    errorMessage: text("error_message"),
    retryCount: int("retry_count").default(0),
    lockedAt: timestamp("locked_at"),
    createdAt: timestamp("createdAt").defaultNow(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow(),
});

export const systemTemplate = mysqlTable("system_template", {
    id: varchar("id", { length: 36 }).primaryKey(), // Action key (e.g. 'verify_email')
    description: text("description"),
    subject: text("subject").notNull(),
    content: mediumtext("content").notNull(),
    layoutId: varchar("layout_id", { length: 36 }).default("system"),
    isDefault: boolean("is_default").default(true),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow(),
});

export const securityEvent = mysqlTable("security_event", {
    id: varchar("id", { length: 36 }).primaryKey(),
    type: varchar("type", { length: 50 }).notNull(), // LOGIN_FAILURE, RATE_LIMIT, BAN_TRIGGER
    ipAddress: varchar("ip_address", { length: 100 }).notNull(),
    email: varchar("email", { length: 255 }),
    userAgent: text("user_agent"),
    details: text("details"), // JSON extra info
    createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const ipBan = mysqlTable("ip_ban", {
    ipAddress: varchar("ip_address", { length: 100 }).primaryKey(),
    reason: text("reason"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const emailLayout = mysqlTable("email_layout", {
    id: varchar("id", { length: 36 }).primaryKey(), // 'inbox', 'newsletter', 'system'
    name: varchar("name", { length: 100 }).notNull(),
    category: varchar("category", { length: 20 }).default("contact"), // system, newsletter, contact
    description: text("description"),
    html: mediumtext("html").notNull(),
    isDefault: boolean("is_default").default(false), // true for built-in layouts
    createdAt: timestamp("createdAt").defaultNow(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow(),
});

// --- FORUM SECTION ---

export const forumCategory = mysqlTable("forum_category", {
    id: varchar("id", { length: 36 }).primaryKey(),
    name: varchar("name", { length: 100 }).notNull(),
    slug: varchar("slug", { length: 100 }).notNull().unique(),
    description: text("description"),
    color: varchar("color", { length: 20 }).default("primary"),
    icon: varchar("icon", { length: 50 }).default("i-lucide:message-square"),
    order: int("order").default(0),
    threadCount: int("thread_count").default(0),
    createdAt: timestamp("createdAt").defaultNow(),
});

export const forumThread = mysqlTable("forum_thread", {
    id: varchar("id", { length: 36 }).primaryKey(),
    authorId: varchar("author_id", { length: 36 }).notNull().references(() => user.id),
    categoryId: varchar("category_id", { length: 36 }).notNull().references(() => forumCategory.id),
    title: text("title").notNull(),
    slug: varchar("slug", { length: 255 }).notNull().unique(),
    content: mediumtext("content").notNull(),
    views: int("views").default(0),
    status: varchar("status", { length: 20 }).default("open"), // open, closed, archived
    isPinned: boolean("is_pinned").default(false),
    isResolved: boolean("is_resolved").default(false),
    upvotes: int("upvotes").default(0),
    downvotes: int("downvotes").default(0),
    createdAt: timestamp("createdAt").defaultNow(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow(),
});

export const forumReply = mysqlTable("forum_reply", {
    id: varchar("id", { length: 36 }).primaryKey(),
    threadId: varchar("thread_id", { length: 36 }).notNull().references(() => forumThread.id, { onDelete: 'cascade' }),
    authorId: varchar("author_id", { length: 36 }).notNull().references(() => user.id),
    content: text("content").notNull(),
    isSolution: boolean("is_solution").default(false),
    upvotes: int("upvotes").default(0),
    downvotes: int("downvotes").default(0),
    createdAt: timestamp("createdAt").defaultNow(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow(),
});

export const forumVote = mysqlTable("forum_vote", {
    id: varchar("id", { length: 36 }).primaryKey(),
    userId: varchar("user_id", { length: 36 }).notNull().references(() => user.id),
    targetId: varchar("target_id", { length: 36 }).notNull(), // Can be threadId or replyId
    targetType: varchar("target_type", { length: 10 }).notNull(), // 'thread' or 'reply'
    value: int("value").notNull(), // 1 for upvote, -1 for downvote
    createdAt: timestamp("createdAt").defaultNow(),
});
export const termsAgreement = mysqlTable("terms_agreement", {
    id: varchar("id", { length: 36 }).primaryKey(),
    userId: varchar("user_id", { length: 36 }).notNull().references(() => user.id),
    version: varchar("version", { length: 10 }).notNull().default("v1"),
    acceptedAt: timestamp("accepted_at").defaultNow().notNull(),
});

export const asset = mysqlTable("asset", {
    id: varchar("id", { length: 36 }).primaryKey(),
    userId: varchar("user_id", { length: 36 }).notNull().references(() => user.id),
    type: varchar("type", { length: 20 }).notNull(), // 'forum_thread', 'forum_reply', 'newsletter', 'legal'
    targetId: varchar("target_id", { length: 36 }),
    filename: varchar("filename", { length: 255 }).notNull(),
    mimeType: varchar("mime_type", { length: 100 }).notNull(),
    size: int("size").notNull(),
    r2Key: varchar("r2_key", { length: 500 }).notNull(),
    publicUrl: text("public_url"),
    createdAt: timestamp("created_at").defaultNow(),
});

// --- TICKETS & PRIVATE MESSAGES ---

export const ticket = mysqlTable("ticket", {
    id: varchar("id", { length: 36 }).primaryKey(),
    userId: varchar("user_id", { length: 36 }).notNull().references(() => user.id),
    subject: varchar("subject", { length: 255 }).notNull(),
    status: varchar("status", { length: 20 }).default("open"), // open, in_progress, resolved, closed
    priority: varchar("priority", { length: 20 }).default("medium"), // low, medium, high, urgent
    category: varchar("category", { length: 50 }).default("general"), // technical, billing, general, bug
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

export const ticketMessage = mysqlTable("ticket_message", {
    id: varchar("id", { length: 36 }).primaryKey(),
    ticketId: varchar("ticket_id", { length: 36 }).notNull().references(() => ticket.id, { onDelete: 'cascade' }),
    senderId: varchar("sender_id", { length: 36 }).notNull().references(() => user.id),
    body: text("body").notNull(),
    isAdmin: boolean("is_admin").default(false),
    createdAt: timestamp("created_at").defaultNow(),
});

export const privateMessage = mysqlTable("private_message", {
    id: varchar("id", { length: 36 }).primaryKey(),
    fromId: varchar("from_id", { length: 36 }).notNull().references(() => user.id),
    toId: varchar("to_id", { length: 36 }).notNull().references(() => user.id),
    content: text("content").notNull(),
    isRead: boolean("is_read").default(false),
    createdAt: timestamp("created_at").defaultNow(),
});
