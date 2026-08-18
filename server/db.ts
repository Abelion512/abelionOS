import { and, desc, eq, gt } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { AuditEvent, CompanionDevice, DailyFocusAction, FileRecord, GoogleConnection, InsertAuditEvent, InsertCompanionDevice, InsertDailyFocusAction, InsertFileRecord, InsertGoogleConnection, InsertUser, auditEvents, companionDevices, dailyFocusActions, files, googleConnections, users } from "../drizzle/schema";
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

export async function createCompanionDevice(device: InsertCompanionDevice): Promise<CompanionDevice> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.insert(companionDevices).values(device);
  const inserted = await db.select().from(companionDevices).where(eq(companionDevices.id, result[0].insertId)).limit(1);
  if (!inserted[0]) throw new Error("Companion device was not created");
  return inserted[0];
}

export async function listCompanionDevices(userId: number): Promise<CompanionDevice[]> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return db.select().from(companionDevices).where(eq(companionDevices.userId, userId)).orderBy(desc(companionDevices.lastSeenAt), desc(companionDevices.createdAt));
}

export async function getCompanionDeviceForUser(userId: number, deviceId: string): Promise<CompanionDevice | undefined> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const device = await db.select().from(companionDevices).where(and(eq(companionDevices.userId, userId), eq(companionDevices.deviceId, deviceId))).limit(1);
  return device[0];
}

export async function getCompanionDevice(deviceId: string): Promise<CompanionDevice | undefined> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const device = await db.select().from(companionDevices).where(eq(companionDevices.deviceId, deviceId)).limit(1);
  return device[0];
}

export async function markCompanionDeviceSeen(deviceId: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(companionDevices).set({ lastSeenAt: new Date(), encryptedPairingSecret: null, pairingExpiresAt: null }).where(eq(companionDevices.deviceId, deviceId));
}

export async function createDailyFocusAction(action: InsertDailyFocusAction): Promise<DailyFocusAction> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.insert(dailyFocusActions).values(action);
  const inserted = await db.select().from(dailyFocusActions).where(eq(dailyFocusActions.id, result[0].insertId)).limit(1);
  if (!inserted[0]) throw new Error("Daily Focus action was not created");
  return inserted[0];
}

export async function getDailyFocusAction(userId: number, actionId: number): Promise<DailyFocusAction | undefined> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const action = await db.select().from(dailyFocusActions).where(and(eq(dailyFocusActions.userId, userId), eq(dailyFocusActions.id, actionId))).limit(1);
  return action[0];
}

export async function listDailyFocusActions(userId: number, limit = 25): Promise<DailyFocusAction[]> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return db.select().from(dailyFocusActions).where(eq(dailyFocusActions.userId, userId)).orderBy(desc(dailyFocusActions.createdAt)).limit(Math.min(limit, 50));
}

export async function getNextDeviceAction(deviceId: string): Promise<DailyFocusAction | undefined> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const action = await db.select().from(dailyFocusActions).where(and(eq(dailyFocusActions.deviceId, deviceId), eq(dailyFocusActions.status, "queued"), gt(dailyFocusActions.expiresAt, new Date()))).orderBy(dailyFocusActions.createdAt).limit(1);
  return action[0];
}

export async function claimNextDeviceAction(deviceId: string): Promise<DailyFocusAction | undefined> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const next = await getNextDeviceAction(deviceId);
  if (!next) return undefined;
  const update = await db.update(dailyFocusActions).set({ status: "processing" }).where(and(eq(dailyFocusActions.id, next.id), eq(dailyFocusActions.deviceId, deviceId), eq(dailyFocusActions.status, "queued")));
  if ((update[0]?.affectedRows ?? 0) !== 1) return undefined;
  const claimed = await db.select().from(dailyFocusActions).where(and(eq(dailyFocusActions.id, next.id), eq(dailyFocusActions.deviceId, deviceId))).limit(1);
  return claimed[0];
}

export async function updateDailyFocusAction(userId: number, actionId: number, values: Partial<Pick<DailyFocusAction, "status" | "proposalPayload" | "providerResourceId" | "errorCode" | "confirmedAt" | "executedAt" | "encryptedInput">>): Promise<DailyFocusAction> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(dailyFocusActions).set(values).where(and(eq(dailyFocusActions.userId, userId), eq(dailyFocusActions.id, actionId)));
  const saved = await getDailyFocusAction(userId, actionId);
  if (!saved) throw new Error("Daily Focus action was not found");
  return saved;
}

export async function updateDailyFocusActionForDevice(deviceId: string, actionId: number, values: Partial<Pick<DailyFocusAction, "status" | "proposalPayload" | "errorCode" | "encryptedInput">>): Promise<DailyFocusAction> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(dailyFocusActions).set(values).where(and(eq(dailyFocusActions.id, actionId), eq(dailyFocusActions.deviceId, deviceId)));
  const saved = await db.select().from(dailyFocusActions).where(and(eq(dailyFocusActions.id, actionId), eq(dailyFocusActions.deviceId, deviceId))).limit(1);
  if (!saved[0]) throw new Error("Daily Focus device action was not found");
  return saved[0];
}

export async function getDailyFocusActionForDevice(deviceId: string, actionId: number): Promise<DailyFocusAction | undefined> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const action = await db.select().from(dailyFocusActions).where(and(eq(dailyFocusActions.id, actionId), eq(dailyFocusActions.deviceId, deviceId))).limit(1);
  return action[0];
}
