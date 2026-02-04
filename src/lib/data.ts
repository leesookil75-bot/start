import fs from 'fs/promises';
import path from 'path';

export type User = {
  id: string;
  phoneNumber: string;
  name: string;
  cleaningArea: string;
  role: 'admin' | 'cleaner';
  createdAt: string;
};

export type UsageRecord = {
  id: string;
  size: 45 | 75;
  timestamp: string;
  userId?: string;
  userName?: string;
};

// Internal DB Row Type
type UserRow = {
  id: string;
  phone_number: string;
  name: string;
  cleaning_area: string;
  role: string;
  created_at: Date;
};

import { sql } from '@vercel/postgres';

const DATA_FILE_PATH = path.join(process.cwd(), 'data.json');
const USERS_FILE_PATH = path.join(process.cwd(), 'users.json');

// Check if Postgres is configured
const isPostgresEnabled = () => !!process.env.POSTGRES_URL;

// --- Helper to ensure files exist ---
async function ensureFile(filePath: string, defaultData: unknown) {
  try {
    await fs.access(filePath);
  } catch {
    try {
      await fs.writeFile(filePath, JSON.stringify(defaultData, null, 2), 'utf-8');
    } catch (error) {
      console.warn(`Could not create file ${filePath}. This is expected on Vercel if DB is not connected.`, error);
    }
  }
}

// --- User Management ---
export async function getUsers(): Promise<User[]> {
  if (isPostgresEnabled()) {
    try {
      const { rows } = await sql<UserRow>`SELECT * FROM users ORDER BY created_at DESC`;
      return rows.map(r => ({
        id: r.id,
        phoneNumber: r.phone_number,
        name: r.name,
        cleaningArea: r.cleaning_area,
        role: r.role as 'admin' | 'cleaner',
        createdAt: r.created_at.toString()
      }));
    } catch (error) {
      // Fallback or error if table doesn't exist?
      console.error('Postgres error:', error);
      return [];
    }
  }

  // Fallback to File System
  await ensureFile(USERS_FILE_PATH, []);
  try {
    const data = await fs.readFile(USERS_FILE_PATH, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export async function addUser(user: Omit<User, 'id' | 'createdAt'>): Promise<User> {
  const users = await getUsers();

  // Check if phone number already exists
  if (users.some(u => u.phoneNumber === user.phoneNumber)) {
    throw new Error('Phone number already registered');
  }

  if (isPostgresEnabled()) {
    try {
      const id = crypto.randomUUID();
      await sql`
        INSERT INTO users (id, phone_number, name, cleaning_area, role, created_at)
        VALUES (${id}, ${user.phoneNumber}, ${user.name}, ${user.cleaningArea}, ${user.role}, NOW())
       `;
      // Return constructed user
      return {
        id: id,
        phoneNumber: user.phoneNumber,
        name: user.name,
        cleaningArea: user.cleaningArea,
        role: user.role,
        createdAt: new Date().toISOString()
      };
    } catch {
      throw new Error('Database error adding user');
    }
  }

  const newUser: User = {
    ...user,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };

  users.push(newUser);
  await fs.writeFile(USERS_FILE_PATH, JSON.stringify(users, null, 2), 'utf-8');
  return newUser;
}

export async function deleteUser(userId: string): Promise<void> {
  if (isPostgresEnabled()) {
    await sql`DELETE FROM users WHERE id = ${userId}`;
    return;
  }

  const users = await getUsers();
  const filtered = users.filter(u => u.id !== userId);
  await fs.writeFile(USERS_FILE_PATH, JSON.stringify(filtered, null, 2), 'utf-8');
}

export async function getUserByPhone(phoneNumber: string): Promise<User | undefined> {
  const users = await getUsers();
  return users.find(u => u.phoneNumber === phoneNumber);
}

// --- Usage Records ---
export async function getRecords(): Promise<UsageRecord[]> {
  if (isPostgresEnabled()) {
    try {
      const { rows } = await sql`SELECT * FROM usage_records ORDER BY timestamp DESC`;
      return rows.map(r => ({
        id: r.id,
        size: r.size,
        timestamp: r.timestamp.toString(),
        userId: r.user_id,
        userName: r.user_name
      }));
    } catch (e) {
      console.error('DB Error getting records', e);
      return [];
    }
  }

  // Fallback to File System
  await ensureFile(DATA_FILE_PATH, []);
  try {
    const data = await fs.readFile(DATA_FILE_PATH, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export async function addRecord(size: 45 | 75, userId?: string, userName?: string): Promise<UsageRecord> {
  if (isPostgresEnabled()) {
    const id = crypto.randomUUID();
    await sql`
      INSERT INTO usage_records (id, size, user_id, user_name, timestamp)
      VALUES (${id}, ${size}, ${userId}, ${userName}, NOW())
     `;
    // Construct generic return
    return {
      id: id,
      size,
      timestamp: new Date().toISOString(),
      userId,
      userName
    }
  }

  const records = await getRecords();
  const newRecord: UsageRecord = {
    id: crypto.randomUUID(),
    size,
    timestamp: new Date().toISOString(),
    userId,
    userName,
  };
  records.push(newRecord);
  await fs.writeFile(DATA_FILE_PATH, JSON.stringify(records, null, 2), 'utf-8');
  return newRecord;
}

export async function manageUsageDelta(
  userId: string,
  userName: string,
  delta45: number,
  delta75: number
): Promise<{ success: boolean; message?: string }> {
  if (isPostgresEnabled()) {
    // Postgres Transaction Logic
    // Since @vercel/postgres doesn't support transactions easily in the lightweight client without pooling manually in complex ways sometimes,
    // we'll just run queries. Real transaction would be better but let's keep it simple for now.

    if (delta45 > 0) {
      for (let i = 0; i < delta45; i++) {
        await sql`INSERT INTO usage_records (id, size, user_id, user_name, timestamp) VALUES (${crypto.randomUUID()}, 45, ${userId}, ${userName}, NOW())`;
      }
    } else if (delta45 < 0) {
      const limit = Math.abs(delta45);
      // Delete latest 'limit' records for this user today
      await sql`
            DELETE FROM usage_records
            WHERE id IN (
                SELECT id FROM usage_records
                WHERE user_id = ${userId} AND size = 45 AND timestamp::date = CURRENT_DATE
                ORDER BY timestamp DESC
                LIMIT ${limit}
            )
          `;
    }

    if (delta75 > 0) {
      for (let i = 0; i < delta75; i++) {
        await sql`INSERT INTO usage_records (id, size, user_id, user_name, timestamp) VALUES (${crypto.randomUUID()}, 75, ${userId}, ${userName}, NOW())`;
      }
    } else if (delta75 < 0) {
      const limit = Math.abs(delta75);
      await sql`
            DELETE FROM usage_records
            WHERE id IN (
                SELECT id FROM usage_records
                WHERE user_id = ${userId} AND size = 75 AND timestamp::date = CURRENT_DATE
                ORDER BY timestamp DESC
                LIMIT ${limit}
            )
          `;
    }

    return { success: true };
  }

  const records = await getRecords();
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];



  // We can just construct the new list.
  const newRecordsList = [...records];

  // Removal Logic 45L
  if (delta45 < 0) {
    const countToRemove = Math.abs(delta45);
    let removed = 0;
    // Iterate backwards to find user's today records
    for (let i = newRecordsList.length - 1; i >= 0 && removed < countToRemove; i--) {
      const r = newRecordsList[i];
      if (r.userId === userId && r.size === 45 && r.timestamp.startsWith(todayStr)) {
        newRecordsList.splice(i, 1);
        removed++;
      }
    }
  }

  // Removal Logic 75L
  if (delta75 < 0) {
    const countToRemove = Math.abs(delta75);
    let removed = 0;
    for (let i = newRecordsList.length - 1; i >= 0 && removed < countToRemove; i--) {
      const r = newRecordsList[i];
      if (r.userId === userId && r.size === 75 && r.timestamp.startsWith(todayStr)) {
        newRecordsList.splice(i, 1);
        removed++;
      }
    }
  }

  // Addition Logic
  if (delta45 > 0) {
    for (let i = 0; i < delta45; i++) {
      newRecordsList.push({
        id: crypto.randomUUID(),
        size: 45,
        timestamp: new Date().toISOString(),
        userId,
        userName
      });
    }
  }

  if (delta75 > 0) {
    for (let i = 0; i < delta75; i++) {
      newRecordsList.push({
        id: crypto.randomUUID(),
        size: 75,
        timestamp: new Date().toISOString(),
        userId,
        userName
      });
    }
  }

  await fs.writeFile(DATA_FILE_PATH, JSON.stringify(newRecordsList, null, 2), 'utf-8');
  return { success: true };
}
