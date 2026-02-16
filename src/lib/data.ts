import path from 'path';
import { User, UsageRecord, Notice, DailyOverride, AttendanceRecord, Workplace } from './types';
export type { User, UsageRecord, Notice, DailyOverride, AttendanceRecord, Workplace };

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
  work_address?: string;
  work_lat?: number;
  work_lng?: number;
  allowed_radius?: number;
  workplace_id?: string;
  // Joined fields
  wp_lat?: number;
  wp_lng?: number;
  wp_address?: string;
  wp_radius?: number;
};




const DATA_FILE_PATH = path.join(process.cwd(), 'data.json');
const USERS_FILE_PATH = path.join(process.cwd(), 'users.json');

// Check if Postgres is configured
const isPostgresEnabled = () => !!process.env.POSTGRES_URL;

// --- Helper to ensure files exist ---
async function ensureFile(filePath: string, defaultData: unknown) {
  try {
    const fs = (await import('fs/promises')).default;
    await fs.access(filePath);
  } catch {
    try {
      const fs = (await import('fs/promises')).default;
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
      // Join with workplaces to get location if workplace_id is set
      // Actually, for simplicity and to avoid complex joins if not needed, we can just fetch all and map?
      // Or better, do a LEFT JOIN.
      // But to keep it simple with sql template, let's just fetch users and if they have workplace_id, we might need to look it up?
      // No, `getUsers` should return the effective location. 
      // Let's do a JOIN.

      const { rows } = await sql<UserRow>`
        SELECT u.*, w.lat as wp_lat, w.lng as wp_lng, w.address as wp_address, w.radius as wp_radius
        FROM users u
        LEFT JOIN workplaces w ON u.workplace_id = w.id
        ORDER BY u.created_at DESC
      `;

      return rows.map(r => ({
        id: r.id,
        phoneNumber: r.phone_number,
        name: r.name,
        cleaningArea: r.cleaning_area,
        role: r.role as 'admin' | 'cleaner',
        createdAt: r.created_at.toString(),
        password: r.password,
        // Prioritize workplace settings if valid, otherwise fallback to user specific
        workAddress: r.workplace_id ? r.wp_address : r.work_address,
        workLat: r.workplace_id ? r.wp_lat : r.work_lat,
        workLng: r.workplace_id ? r.wp_lng : r.work_lng,
        allowedRadius: r.workplace_id ? r.wp_radius : r.allowed_radius,
        workplaceId: r.workplace_id
      }));
    } catch (error) {
      console.warn('Postgres error (getUsers):', error);
      return [];
    }
  }

  // Fallback to File System
  await ensureFile(USERS_FILE_PATH, []);
  try {
    const fs = (await import('fs/promises')).default;
    const data = await fs.readFile(USERS_FILE_PATH, 'utf-8');
    const users: User[] = JSON.parse(data);

    // For file system, we also need to join with workplaces manually
    const workplaces = await getWorkplaces();
    return users.map(u => {
      if (u.workplaceId) {
        const wp = workplaces.find(w => w.id === u.workplaceId);
        if (wp) {
          return {
            ...u,
            workAddress: wp.address,
            workLat: wp.lat,
            workLng: wp.lng,
            allowedRadius: wp.radius
          };
        }
      }
      return u;
    });
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
        INSERT INTO users (id, phone_number, name, cleaning_area, role, created_at, password, workplace_id, work_address, work_lat, work_lng, allowed_radius)
        VALUES (${id}, ${user.phoneNumber}, ${user.name}, ${user.cleaningArea}, ${user.role}, NOW(), ${password}, ${user.workplaceId ?? null}, ${user.workAddress ?? null}, ${user.workLat ?? null}, ${user.workLng ?? null}, ${user.allowedRadius ?? null})
       `;
      // Return constructed user
      return {
        id: id,
        phoneNumber: user.phoneNumber,
        name: user.name,
        cleaningArea: user.cleaningArea,
        role: user.role,
        createdAt: new Date().toISOString(),
        password,
        workAddress: user.workAddress,
        workLat: user.workLat,
        workLng: user.workLng,
        allowedRadius: user.allowedRadius,
        workplaceId: user.workplaceId
      };
    } catch (e) {
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

  // We need to write the raw user, not the joined one. 
  // But getUsers returns joined ones? 
  // For file system, we read raw file, so we should append to raw list.
  // Re-read file to be safe
  const fs = (await import('fs/promises')).default;
  const rawData = await fs.readFile(USERS_FILE_PATH, 'utf-8').catch(() => '[]');
  const rawUsers: User[] = JSON.parse(rawData);

  rawUsers.push(newUser);
  await fs.writeFile(USERS_FILE_PATH, JSON.stringify(rawUsers, null, 2), 'utf-8');
  return newUser;
}

export async function deleteUser(userId: string): Promise<void> {
  if (isPostgresEnabled()) {
    await sql`DELETE FROM users WHERE id = ${userId}`;
    return;
  }

  const fs = (await import('fs/promises')).default;
  const rawData = await fs.readFile(USERS_FILE_PATH, 'utf-8').catch(() => '[]');
  let rawUsers: User[] = JSON.parse(rawData);
  const filtered = rawUsers.filter(u => u.id !== userId);
  await fs.writeFile(USERS_FILE_PATH, JSON.stringify(filtered, null, 2), 'utf-8');
}

// --- Workplace Management ---
const WORKPLACES_FILE_PATH = path.join(process.cwd(), 'workplaces.json');



export async function getWorkplaces(): Promise<Workplace[]> {
  if (isPostgresEnabled()) {
    try {
      const { rows } = await sql`SELECT * FROM workplaces ORDER BY created_at DESC`;
      return rows.map(r => ({
        id: r.id,
        name: r.name,
        address: r.address,
        lat: r.lat,
        lng: r.lng,
        radius: r.radius,
        createdAt: r.created_at.toString()
      }));
    } catch (e) {
      console.warn('DB Error getting workplaces:', e);
      return [];
    }
  }

  await ensureFile(WORKPLACES_FILE_PATH, []);
  try {
    const fs = (await import('fs/promises')).default;
    const data = await fs.readFile(WORKPLACES_FILE_PATH, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export async function addWorkplace(data: Omit<Workplace, 'id' | 'createdAt'>): Promise<Workplace> {
  if (isPostgresEnabled()) {
    const id = crypto.randomUUID();
    await sql`
            INSERT INTO workplaces (id, name, address, lat, lng, radius, created_at)
            VALUES (${id}, ${data.name}, ${data.address}, ${data.lat}, ${data.lng}, ${data.radius}, NOW())
        `;
    return { ...data, id, createdAt: new Date().toISOString() };
  }

  const workplaces = await getWorkplaces();
  const newWorkplace: Workplace = {
    ...data,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString()
  };
  workplaces.push(newWorkplace);
  const fs = (await import('fs/promises')).default;
  await fs.writeFile(WORKPLACES_FILE_PATH, JSON.stringify(workplaces, null, 2), 'utf-8');
  return newWorkplace;
}

export async function updateWorkplace(id: string, updates: Partial<Workplace>): Promise<void> {
  if (isPostgresEnabled()) {
    const { rows } = await sql`SELECT * FROM workplaces WHERE id = ${id}`;
    if (rows.length === 0) throw new Error('Workplace not found');
    const existing = rows[0];

    // Ensure we handle potentially undefined updates correctly or rely on SQL existing value logic
    const newName = updates.name ?? existing.name;
    const newAddress = updates.address ?? existing.address;
    const newLat = updates.lat ?? existing.lat;
    const newLng = updates.lng ?? existing.lng;
    const newRadius = updates.radius ?? existing.radius;

    await sql`
            UPDATE workplaces
            SET name = ${newName},
                address = ${newAddress},
                lat = ${newLat},
                lng = ${newLng},
                radius = ${newRadius}
            WHERE id = ${id}
        `;
    return;
  }

  const workplaces = await getWorkplaces();
  const index = workplaces.findIndex(w => w.id === id);
  if (index === -1) throw new Error('Workplace not found');

  workplaces[index] = { ...workplaces[index], ...updates };
  const fs = (await import('fs/promises')).default;
  await fs.writeFile(WORKPLACES_FILE_PATH, JSON.stringify(workplaces, null, 2), 'utf-8');
}

export async function deleteWorkplace(id: string): Promise<void> {
  if (isPostgresEnabled()) {
    await sql`UPDATE users SET workplace_id = NULL WHERE workplace_id = ${id}`;
    await sql`DELETE FROM workplaces WHERE id = ${id}`;
    return;
  }

  // File system for dev
  let workplaces = await getWorkplaces();
  workplaces = workplaces.filter(w => w.id !== id);
  const fs = (await import('fs/promises')).default;
  await fs.writeFile(WORKPLACES_FILE_PATH, JSON.stringify(workplaces, null, 2), 'utf-8');
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
                password = ${newPassword},
                work_address = ${updates.workAddress ?? user.work_address},
                work_lat = ${updates.workLat ?? user.work_lat},
                work_lng = ${updates.workLng ?? user.work_lng},
                allowed_radius = ${updates.allowedRadius ?? user.allowed_radius}
            WHERE id = ${id}
        `;
    return;
  }

  const users = await getUsers();
  const index = users.findIndex(u => u.id === id);
  if (index === -1) throw new Error('User not found');

  users[index] = { ...users[index], ...updates };
  const fs = (await import('fs/promises')).default;
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
      console.warn('DB Error getting records (ignoring for build):', e);
      return [];
    }
  }

  // Fallback to File System
  await ensureFile(DATA_FILE_PATH, []);
  try {
    const fs = (await import('fs/promises')).default;
    const data = await fs.readFile(DATA_FILE_PATH, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export async function addRecord(size: 45 | 50 | 75, userId?: string, userName?: string): Promise<UsageRecord> {
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
  const fs = (await import('fs/promises')).default;
  await fs.writeFile(DATA_FILE_PATH, JSON.stringify(records, null, 2), 'utf-8');
  return newRecord;
}

export async function manageUsageDelta(
  userId: string,
  userName: string,
  delta50: number, // Renamed from delta45
  delta75: number
): Promise<{ success: boolean; message?: string }> {
  if (isPostgresEnabled()) {
    // Postgres Transaction Logic

    if (delta50 > 0) {
      for (let i = 0; i < delta50; i++) {
        // Insert new 50L records
        await sql`INSERT INTO usage_records (id, size, user_id, user_name, timestamp) VALUES (${crypto.randomUUID()}, 50, ${userId}, ${userName}, NOW())`;
      }
    } else if (delta50 < 0) {
      const limit = Math.abs(delta50);
      // Remove 50L first, then 45L if needed
      // Since SQL deletion with priority is complex in one go, we can do two steps or a complex subquery.
      // Simple approach: Delete 50L records first.

      let deletedCount = 0;

      // 1. Try to delete up to 'limit' of 50L records
      const result50 = await sql`
            WITH deleted AS (
                DELETE FROM usage_records
                WHERE id IN (
                    SELECT id FROM usage_records
                    WHERE user_id = ${userId} AND size = 50 AND timestamp::date = CURRENT_DATE
                    ORDER BY timestamp DESC
                    LIMIT ${limit}
                )
                RETURNING id
            )
            SELECT COUNT(*) FROM deleted
      `;
      deletedCount += Number(result50.rows[0].count);

      // 2. If needed more, delete 45L records
      if (deletedCount < limit) {
        const remaining = limit - deletedCount;
        await sql`
            DELETE FROM usage_records
            WHERE id IN (
                SELECT id FROM usage_records
                WHERE user_id = ${userId} AND size = 45 AND timestamp::date = CURRENT_DATE
                ORDER BY timestamp DESC
                LIMIT ${remaining}
            )
          `;
      }
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

  // Removal Logic 50L (and 45L)
  if (delta50 < 0) {
    let countToRemove = Math.abs(delta50);
    let removed = 0;

    // First pass: remove 50L
    for (let i = newRecordsList.length - 1; i >= 0 && removed < countToRemove; i--) {
      const r = newRecordsList[i];
      if (r.userId === userId && r.size === 50 && r.timestamp.startsWith(todayStr)) {
        newRecordsList.splice(i, 1);
        removed++;
      }
    }

    // Second pass: remove 45L if needed
    if (removed < countToRemove) {
      for (let i = newRecordsList.length - 1; i >= 0 && removed < countToRemove; i--) {
        const r = newRecordsList[i];
        if (r.userId === userId && r.size === 45 && r.timestamp.startsWith(todayStr)) {
          newRecordsList.splice(i, 1);
          removed++;
        }
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
  if (delta50 > 0) {
    for (let i = 0; i < delta50; i++) {
      newRecordsList.push({
        id: crypto.randomUUID(),
        size: 50,
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

  const fs = (await import('fs/promises')).default;
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
    const fs = (await import('fs/promises')).default;
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
      console.warn('DB Error getting notices (ignoring for build):', e);
      return [];
    }
  }

  await ensureFile(NOTICES_FILE_PATH, []);
  try {
    const fs = (await import('fs/promises')).default;
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
  const fs = (await import('fs/promises')).default;
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
  const fs = (await import('fs/promises')).default;
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
  const fs = (await import('fs/promises')).default;
  await fs.writeFile(NOTICES_FILE_PATH, JSON.stringify(notices, null, 2), 'utf-8');
}

// --- Attendance ---
const ATTENDANCE_FILE_PATH = path.join(process.cwd(), 'attendance.json');

export async function getAttendanceRecords(userId?: string): Promise<AttendanceRecord[]> {
  if (isPostgresEnabled()) {
    try {
      let query = sql`SELECT * FROM attendance_records ORDER BY timestamp DESC`;
      // If filtering by userId is needed strictly in SQL
      if (userId) {
        const { rows } = await sql`SELECT * FROM attendance_records WHERE user_id = ${userId} ORDER BY timestamp DESC`;
        return rows.map(r => ({
          id: r.id,
          userId: r.user_id,
          type: r.type,
          timestamp: r.timestamp.toString()
        }));
      }

      const { rows } = await sql`SELECT * FROM attendance_records ORDER BY timestamp DESC`;
      return rows.map(r => ({
        id: r.id,
        userId: r.user_id,
        type: r.type,
        timestamp: r.timestamp.toString()
      }));
    } catch (e) {
      console.warn('DB Error getting attendance (ignoring):', e);
      return [];
    }
  }

  await ensureFile(ATTENDANCE_FILE_PATH, []);
  try {
    const fs = (await import('fs/promises')).default;
    const data = await fs.readFile(ATTENDANCE_FILE_PATH, 'utf-8');
    const all: AttendanceRecord[] = JSON.parse(data);
    if (userId) {
      return all.filter(r => r.userId === userId).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }
    return all.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  } catch {
    return [];
  }
}

export async function addAttendanceRecord(userId: string, type: 'CHECK_IN' | 'CHECK_OUT'): Promise<AttendanceRecord> {
  if (isPostgresEnabled()) {
    const id = crypto.randomUUID();
    await sql`
      INSERT INTO attendance_records (id, user_id, type, timestamp)
      VALUES (${id}, ${userId}, ${type}, NOW())
    `;
    return {
      id,
      userId,
      type,
      timestamp: new Date().toISOString()
    };
  }

  const records = await getAttendanceRecords(); // This actually loads all if we don't pass userId, which is fine for appending
  // Actually getAttendanceRecords might return filtered list if I updated it to take args.
  // Let's reuse ensureFile logic for simplicity to get raw array
  await ensureFile(ATTENDANCE_FILE_PATH, []);
  const fs = (await import('fs/promises')).default;
  const data = await fs.readFile(ATTENDANCE_FILE_PATH, 'utf-8');
  let allRecords: AttendanceRecord[] = JSON.parse(data);

  const newRecord: AttendanceRecord = {
    id: crypto.randomUUID(),
    userId,
    type,
    timestamp: new Date().toISOString()
  };

  allRecords.push(newRecord);
  await fs.writeFile(ATTENDANCE_FILE_PATH, JSON.stringify(allRecords, null, 2), 'utf-8');
  return newRecord;
}

export async function getLatestAttendance(userId: string): Promise<AttendanceRecord | null> {
  const records = await getAttendanceRecords(userId);
  return records.length > 0 ? records[0] : null;
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
      console.warn('DB Error getting overrides (ignoring for build):', e);
      return [];
    }
  }

  await ensureFile(DAILY_OVERRIDES_FILE_PATH, []);
  try {
    const fs = (await import('fs/promises')).default;
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

  const fs = (await import('fs/promises')).default;
  await fs.writeFile(DAILY_OVERRIDES_FILE_PATH, JSON.stringify(overrides, null, 2), 'utf-8');
}
