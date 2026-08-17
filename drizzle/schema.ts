import { boolean, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const auditEvents = mysqlTable("audit_events", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  action: varchar("action", { length: 80 }).notNull(),
  resourceType: varchar("resourceType", { length: 80 }).notNull(),
  resourceId: varchar("resourceId", { length: 160 }),
  status: mysqlEnum("status", ["accepted", "rejected", "error"]).notNull(),
  details: text("details"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AuditEvent = typeof auditEvents.$inferSelect;
export type InsertAuditEvent = typeof auditEvents.$inferInsert;

export const files = mysqlTable("files", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  objectKey: varchar("objectKey", { length: 512 }).notNull().unique(),
  objectUrl: varchar("objectUrl", { length: 1024 }).notNull(),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  mimeType: varchar("mimeType", { length: 160 }).notNull(),
  sizeBytes: int("sizeBytes").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type FileRecord = typeof files.$inferSelect;
export type InsertFileRecord = typeof files.$inferInsert;

export const googleConnections = mysqlTable("google_connections", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique().references(() => users.id),
  encryptedRefreshToken: text("encryptedRefreshToken").notNull(),
  grantedScopes: text("grantedScopes").notNull(),
  tokenExpiry: timestamp("tokenExpiry"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type GoogleConnection = typeof googleConnections.$inferSelect;
export type InsertGoogleConnection = typeof googleConnections.$inferInsert;

export const companionDevices = mysqlTable("companion_devices", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  deviceId: varchar("deviceId", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 120 }).notNull(),
  deviceType: mysqlEnum("deviceType", ["laptop", "server"]).notNull(),
  capabilities: text("capabilities").notNull(),
  secretHash: varchar("secretHash", { length: 128 }).notNull(),
  isDefaultReasoner: boolean("isDefaultReasoner").notNull().default(false),
  lastSeenAt: timestamp("lastSeenAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CompanionDevice = typeof companionDevices.$inferSelect;
export type InsertCompanionDevice = typeof companionDevices.$inferInsert;

export const dailyFocusActions = mysqlTable("daily_focus_actions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  deviceId: varchar("deviceId", { length: 64 }),
  kind: mysqlEnum("kind", ["task.create", "calendar.create", "calendar.delete", "gmail.trash"]).notNull(),
  status: mysqlEnum("status", ["draft", "queued", "processing", "ready", "confirmed", "executed", "rejected", "error", "expired"]).notNull().default("draft"),
  encryptedInput: text("encryptedInput"),
  proposalPayload: text("proposalPayload"),
  providerResourceId: varchar("providerResourceId", { length: 512 }),
  errorCode: varchar("errorCode", { length: 120 }),
  expiresAt: timestamp("expiresAt").notNull(),
  confirmedAt: timestamp("confirmedAt"),
  executedAt: timestamp("executedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DailyFocusAction = typeof dailyFocusActions.$inferSelect;
export type InsertDailyFocusAction = typeof dailyFocusActions.$inferInsert;
