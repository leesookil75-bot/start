import fs from 'fs/promises';
import path from 'path';
import { User, UsageRecord, Notice, DailyOverride } from './types';
import { sql } from '@vercel/postgres';

// Internal DB Row Type
type UserRow = {
  id: string;
  phone_number: string;
  name: string;
  cleaning_area: string;
  role: string;
  created_at: Date;
  password?: string;
};




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
        createdAt: r.created_at.toString(),
        password: r.password
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
      const password = user.password || user.phoneNumber.slice(-4);

      await sql`
        INSERT INTO users (id, phone_number, name, cleaning_area, role, created_at, password)
        VALUES (${id}, ${user.phoneNumber}, ${user.name}, ${user.cleaningArea}, ${user.role}, NOW(), ${password})
       `;
      // Return constructed user
      return {
        id: id,
        phoneNumber: user.phoneNumber,
        name: user.name,
        cleaningArea: user.cleaningArea,
        role: user.role,
        createdAt: new Date().toISOString(),
        password
      };
    } catch (e: any) {
      console.error('Database error adding user', e);
      throw new Error('Database error adding user');
    }
  }

  const newUser: User = {
    ...user,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    password: user.password || user.phoneNumber.slice(-4)
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

export async function updateUser(id: string, updates: Partial<Omit<User, 'id' | 'createdAt'>>): Promise<void> {
  if (isPostgresEnabled()) {
    // Construct dynamic query or just update all fields if provided
    // We fetch first to merge, or use COALESCE in SQL
    // Fetching first is safer for selective updates without complex SQL building
    const { rows } = await sql`SELECT * FROM users WHERE id = ${id}`;
    if (rows.length === 0) throw new Error('User not found');
    const user = rows[0];

    const newName = updates.name ?? user.name;
    const newPhone = updates.phoneNumber ?? user.phone_number;
    const newArea = updates.cleaningArea ?? user.cleaning_area;
    const newRole = updates.role ?? user.role;
    // Password update is handled separately typically, but let's allow it if passed? 
    // No, let's keep password separate or handled by updateUserPassword. 
    // But if updates has password, we should update it.
    const newPassword = updates.password ?? user.password;

    await sql`
            UPDATE users
            SET name = ${newName},
                phone_number = ${newPhone},
                cleaning_area = ${newArea},
                role = ${newRole},
                password = ${newPassword}
            WHERE id = ${id}
        `;
    return;
  }

  const users = await getUsers();
  const index = users.findIndex(u => u.id === id);
  if (index === -1) throw new Error('User not found');

  users[index] = { ...users[index], ...updates };
  await fs.writeFile(USERS_FILE_PATH, JSON.stringify(users, null, 2), 'utf-8');
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

export async function updateUserPassword(userId: string, newPassword: string): Promise<void> {
  if (isPostgresEnabled()) {
    await sql`UPDATE users SET password = ${newPassword} WHERE id = ${userId}`;
    return;
  }

  const users = await getUsers();
  const userIndex = users.findIndex(u => u.id === userId);
  if (userIndex !== -1) {
    users[userIndex].password = newPassword;
    await fs.writeFile(USERS_FILE_PATH, JSON.stringify(users, null, 2), 'utf-8');
  }
}

// --- Notices ---
// Notice type imported from ./types


const NOTICES_FILE_PATH = path.join(process.cwd(), 'notices.json');

export async function getNotices(): Promise<Notice[]> {
  if (isPostgresEnabled()) {
    try {
      // Using generic/any for row type for now to avoid extensive type definitions overhead
      const { rows } = await sql`SELECT * FROM notices ORDER BY is_pinned DESC, created_at DESC`;
      return rows.map(r => ({
        id: r.id,
        title: r.title,
        content: r.content,
        imageData: r.image_data,
        isPinned: r.is_pinned,
        createdAt: r.created_at.toString(),
        authorId: r.author_id
      }));
    } catch (e) {
      console.error('DB Error getting notices', e);
      return [];
    }
  }

  await ensureFile(NOTICES_FILE_PATH, []);
  try {
    const data = await fs.readFile(NOTICES_FILE_PATH, 'utf-8');
    const notices: Notice[] = JSON.parse(data);
    return notices.sort((a, b) => {
      // Sort by Pinned (true first), then Date (newest first)
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  } catch {
    return [];
  }
}

export async function addNotice(notice: Omit<Notice, 'id' | 'createdAt'>): Promise<Notice> {
  if (isPostgresEnabled()) {
    const id = crypto.randomUUID();
    await sql`
            INSERT INTO notices (id, title, content, image_data, is_pinned, created_at, author_id)
            VALUES (${id}, ${notice.title}, ${notice.content}, ${notice.imageData || null}, ${notice.isPinned || false}, NOW(), ${notice.authorId})
         `;
    return {
      ...notice,
      id,
      createdAt: new Date().toISOString()
    };
  }

  const notices = await getNotices();
  const newNotice: Notice = {
    ...notice,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString()
  };
  notices.unshift(newNotice); // Add to beginning
  await fs.writeFile(NOTICES_FILE_PATH, JSON.stringify(notices, null, 2), 'utf-8');
  return newNotice;
}

export async function deleteNotice(id: string): Promise<void> {
  if (isPostgresEnabled()) {
    await sql`DELETE FROM notices WHERE id = ${id}`;
    return;
  }

  const notices = await getNotices();
  const filtered = notices.filter(n => n.id !== id);
  await fs.writeFile(NOTICES_FILE_PATH, JSON.stringify(filtered, null, 2), 'utf-8');
}

export async function updateNotice(id: string, updates: Partial<Notice>): Promise<void> {
  if (isPostgresEnabled()) {
    // Dynamic query construction is tricky with template literals helper, so we handle fields individually or basic coalesce
    // For simplicity, we'll update fields if they are provided. 
    // Ideally use a builder, but here we can check keys.
    // However, since we usually update all fields in the form, let's assume we pass what we have.
    // Actually, SQL template tags don't support dynamic columns easily.
    // We will assume 'updates' contains the full set of editable fields for simplicity, or we write a smarter query.
    // Let's just update all editable fields (title, content, isPinned, imageData). Note: imageData might be null or undefined.

    // If imageData is undefined, we shouldn't overwrite it if we want partial updates?
    // But the form usually sends the new state. If image isn't changed, we might send the old one or undefined?
    // Let's assume the action logic handles "keep existing image".
    // Here we act on what is passed.

    // We need to construct the SET clause safely.
    // Since sql`` is a function, we can't easily map.
    // We will do a robust check.

    // Simplest approach: Retrieve existing, merge, update.
    const { rows } = await sql`SELECT * FROM notices WHERE id = ${id}`;
    if (rows.length === 0) throw new Error('Notice not found');
    const existing = rows[0];

    const newTitle = updates.title ?? existing.title;
    const newContent = updates.content ?? existing.content;
    const newPinned = updates.isPinned ?? existing.is_pinned; // DB uses snake_case column
    const newImage = updates.imageData === undefined ? existing.image_data : updates.imageData; // Allow setting to null? If updates.imageData is null, it means remove image. If undefined, means no change.

    await sql`
      UPDATE notices 
      SET title = ${newTitle}, 
          content = ${newContent}, 
          is_pinned = ${newPinned},
          image_data = ${newImage}
      WHERE id = ${id}
    `;
    return;
  }

  const notices = await getNotices();
  const index = notices.findIndex(n => n.id === id);
  if (index === -1) throw new Error('Notice not found');

  notices[index] = { ...notices[index], ...updates };
  await fs.writeFile(NOTICES_FILE_PATH, JSON.stringify(notices, null, 2), 'utf-8');
}

// --- Daily Overrides ---
// DailyOverride type imported from ./types


const DAILY_OVERRIDES_FILE_PATH = path.join(process.cwd(), 'daily_overrides.json');

export async function getDailyOverrides(): Promise<DailyOverride[]> {
  if (isPostgresEnabled()) {
    try {
      // Postgres implementation - assumed table 'daily_overrides'
      const { rows } = await sql`SELECT * FROM daily_overrides`;
      return rows.map(r => ({
        date: r.date, // formatting might be needed depending on DB type
        userId: r.user_id,
        type: r.type,
        value: !isNaN(Number(r.value)) ? Number(r.value) : r.value
      }));
    } catch (e) {
      console.error('DB Error getting overrides', e);
      return [];
    }
  }

  await ensureFile(DAILY_OVERRIDES_FILE_PATH, []);
  try {
    const data = await fs.readFile(DAILY_OVERRIDES_FILE_PATH, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export async function saveDailyOverride(override: DailyOverride): Promise<void> {
  if (isPostgresEnabled()) {
    // Postgres upsert
    // Cast value to string for storage if mixed types are allowed, or use specific column
    // Here we assume value column is TEXT
    await sql`
      INSERT INTO daily_overrides (date, user_id, type, value, updated_at)
      VALUES (${override.date}, ${override.userId}, ${override.type}, ${String(override.value)}, NOW())
      ON CONFLICT (date, user_id, type) 
      DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
    `;
    return;
  }

  const overrides = await getDailyOverrides();
  const index = overrides.findIndex(
    o => o.date === override.date && o.userId === override.userId && o.type === override.type
  );

  if (index !== -1) {
    overrides[index] = override;
  } else {
    overrides.push(override);
  }

  await fs.writeFile(DAILY_OVERRIDES_FILE_PATH, JSON.stringify(overrides, null, 2), 'utf-8');
}
