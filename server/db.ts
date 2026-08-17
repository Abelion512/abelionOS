import { desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { AuditEvent, FileRecord, GoogleConnection, InsertAuditEvent, InsertFileRecord, InsertGoogleConnection, InsertUser, auditEvents, files, googleConnections, users } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function createAuditEvent(event: InsertAuditEvent): Promise<AuditEvent | undefined> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.insert(auditEvents).values(event);
  const inserted = await db.select().from(auditEvents).where(eq(auditEvents.id, result[0].insertId)).limit(1);
  return inserted[0];
}

export async function listAuditEvents(userId: number, limit = 50): Promise<AuditEvent[]> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return db.select().from(auditEvents).where(eq(auditEvents.userId, userId)).orderBy(desc(auditEvents.createdAt)).limit(Math.min(limit, 100));
}

export async function createFileRecord(file: InsertFileRecord): Promise<FileRecord> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.insert(files).values(file);
  const inserted = await db.select().from(files).where(eq(files.id, result[0].insertId)).limit(1);
  if (!inserted[0]) throw new Error("File metadata was not created");
  return inserted[0];
}

export async function listUserFiles(userId: number, limit = 100): Promise<FileRecord[]> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return db.select().from(files).where(eq(files.userId, userId)).orderBy(desc(files.createdAt)).limit(Math.min(limit, 100));
}

export async function getGoogleConnection(userId: number): Promise<GoogleConnection | undefined> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.select().from(googleConnections).where(eq(googleConnections.userId, userId)).limit(1);
  return result[0];
}

export async function upsertGoogleConnection(connection: InsertGoogleConnection): Promise<GoogleConnection> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.insert(googleConnections).values(connection).onDuplicateKeyUpdate({
    set: {
      encryptedRefreshToken: connection.encryptedRefreshToken,
      grantedScopes: connection.grantedScopes,
      tokenExpiry: connection.tokenExpiry,
    },
  });
  const saved = await getGoogleConnection(connection.userId);
  if (!saved) throw new Error("Google connection was not saved");
  return saved;
}

export async function deleteGoogleConnection(userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.delete(googleConnections).where(eq(googleConnections.userId, userId));
  return (result[0]?.affectedRows ?? 0) > 0;
}
