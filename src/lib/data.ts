import path from 'path';
import { User, UsageRecord, Notice, DailyOverride, AttendanceRecord, Workplace, LeaveRequest, LeaveStatus, Zone, Issue, Agency } from './types';
export type { User, UsageRecord, Notice, DailyOverride, AttendanceRecord, Workplace, LeaveRequest, LeaveStatus, Zone, Issue, Agency };

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
  agency_id?: string;
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

// --- Agency Management ---
export async function getAgencies(): Promise<Agency[]> {
    if (!isPostgresEnabled()) return [];
    try {
        const { rows } = await sql`SELECT * FROM agencies ORDER BY created_at DESC`;
        return rows.map(r => ({
            id: r.id,
            name: r.name,
            contactPhone: r.contact_phone,
            planType: r.plan_type,
            isActive: r.is_active,
            createdAt: r.created_at.toString()
        }));
    } catch (e) {
        console.error('Error fetching agencies:', e);
        return [];
    }
}

export async function updateAgencyDetails(id: string, name: string, contactPhone: string, planType: string, isActive: boolean): Promise<boolean> {
    if (!isPostgresEnabled()) return false;
    try {
        await sql`
            UPDATE agencies 
            SET name = ${name}, 
                contact_phone = ${contactPhone}, 
                plan_type = ${planType}, 
                is_active = ${isActive}
            WHERE id = ${id}`;
        return true;
    } catch (error) {
        console.error('Failed to update agency details:', error);
        return false;
    }
}

export async function createAgency(name: string, contactPhone: string, planType: string = 'basic'): Promise<Agency> {
    if (!isPostgresEnabled()) throw new Error('Postgres not enabled');
    const id = crypto.randomUUID();
    await sql`
        INSERT INTO agencies (id, name, contact_phone, plan_type)
        VALUES (${id}, ${name}, ${contactPhone}, ${planType})
    `;
    return {
        id, name, contactPhone, planType, isActive: true, createdAt: new Date().toISOString()
    };
}

// --- User Management ---
export async function getUsers(agencyId?: string): Promise<User[]> {
  if (isPostgresEnabled()) {
    try {
      let rows;
      if (agencyId) {
          const res = await sql<UserRow & { total_leaves: number }>`
            SELECT u.*, w.lat as wp_lat, w.lng as wp_lng, w.address as wp_address, w.radius as wp_radius
            FROM users u
            LEFT JOIN workplaces w ON u.workplace_id = w.id
            WHERE u.agency_id = ${agencyId}
            ORDER BY u.created_at DESC
          `;
          rows = res.rows;
      } else {
          const res = await sql<UserRow & { total_leaves: number }>`
            SELECT u.*, w.lat as wp_lat, w.lng as wp_lng, w.address as wp_address, w.radius as wp_radius
            FROM users u
            LEFT JOIN workplaces w ON u.workplace_id = w.id
            ORDER BY u.created_at DESC
          `;
          rows = res.rows;
      }

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
        workplaceId: r.workplace_id,
        totalLeaves: r.total_leaves ?? 15, // Default to 15 if null
        agencyId: r.agency_id
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
        INSERT INTO users (id, phone_number, name, cleaning_area, role, created_at, password, workplace_id, work_address, work_lat, work_lng, allowed_radius, total_leaves, agency_id)
        VALUES (${id}, ${user.phoneNumber}, ${user.name}, ${user.cleaningArea}, ${user.role}, NOW(), ${password}, ${user.workplaceId ?? null}, ${user.workAddress ?? null}, ${user.workLat ?? null}, ${user.workLng ?? null}, ${user.allowedRadius ?? null}, ${user.totalLeaves ?? 15}, ${user.agencyId ?? null})
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
        workplaceId: user.workplaceId,
        totalLeaves: user.totalLeaves ?? 15
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
    password: user.password || user.phoneNumber.slice(-4),
    totalLeaves: user.totalLeaves ?? 15
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



export async function getWorkplaces(agencyId?: string): Promise<Workplace[]> {
  if (isPostgresEnabled()) {
    try {
      let rows;
      if (agencyId) {
        const res = await sql`SELECT * FROM workplaces WHERE agency_id = ${agencyId} ORDER BY created_at DESC`;
        rows = res.rows;
      } else {
        const res = await sql`SELECT * FROM workplaces ORDER BY created_at DESC`;
        rows = res.rows;
      }
      return rows.map(r => {
        let parsedSubAreas: string[] = [];
        try {
          parsedSubAreas = typeof r.sub_areas === 'string' ? JSON.parse(r.sub_areas) : (r.sub_areas || []);
        } catch (e) { /* ignore parse error */ }

        return {
          id: r.id,
          name: r.name,
          dong: r.dong || '',
          subAreas: parsedSubAreas,
          address: r.address,
          lat: r.lat,
          lng: r.lng,
          radius: r.radius,
          createdAt: r.created_at.toString()
        };
      });
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
    const dong = data.dong || '';
    const subAreasJson = JSON.stringify(data.subAreas || []);
    await sql`
            INSERT INTO workplaces (id, name, dong, sub_areas, address, lat, lng, radius, created_at, agency_id)
            VALUES (${id}, ${data.name}, ${dong}, ${subAreasJson}, ${data.address}, ${data.lat}, ${data.lng}, ${data.radius}, NOW(), ${data.agencyId ?? null})
        `;
    return { ...data, id, dong, subAreas: data.subAreas || [], createdAt: new Date().toISOString() };
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
    const newDong = updates.dong !== undefined ? updates.dong : (existing.dong || '');
    const newSubAreasStr = updates.subAreas !== undefined ? JSON.stringify(updates.subAreas) : (existing.sub_areas || '[]');
    const newAddress = updates.address ?? existing.address;
    const newLat = updates.lat ?? existing.lat;
    const newLng = updates.lng ?? existing.lng;
    const newRadius = updates.radius ?? existing.radius;

    await sql`
            UPDATE workplaces
            SET name = ${newName},
                dong = ${newDong},
                sub_areas = ${newSubAreasStr},
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
                allowed_radius = ${updates.allowedRadius ?? user.allowed_radius},
                workplace_id = ${updates.workplaceId ?? user.workplace_id},
                total_leaves = ${updates.totalLeaves ?? user.total_leaves}
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
export async function getRecords(agencyId?: string): Promise<UsageRecord[]> {
  if (isPostgresEnabled()) {
    try {
      let rows;
      if (agencyId) {
        // Usage records don't have agency_id directly, so we JOIN users
        const res = await sql`
          SELECT r.* FROM usage_records r
          LEFT JOIN users u ON r.user_id = u.id
          WHERE u.agency_id = ${agencyId}
          ORDER BY r.timestamp DESC
        `;
        rows = res.rows;
      } else {
        const res = await sql`SELECT * FROM usage_records ORDER BY timestamp DESC`;
        rows = res.rows;
      }
      
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

export async function cleanupOrphanedRecords(): Promise<number> {
  // Common Logic: Identify orphaned records
  const users = await getUsers();
  const validUserIds = new Set(users.map(u => u.id));

  const isOrphaned = (userId?: string, userName?: string) => {
    // Preserve Administrator records
    if (userName === '관리자') return false;
    // Orphans: No ID or ID not in valid user list
    if (!userId || userId.trim() === '') return true;
    return !validUserIds.has(userId);
  };

  if (isPostgresEnabled()) {
    try {
      let totalDeleted = 0;

      // Fetch all to identify
      const records = await getRecords();
      const usageIdsToDelete = records
        .filter(r => isOrphaned(r.userId, r.userName))
        .map(r => r.id);

      if (usageIdsToDelete.length > 0) {
        for (const id of usageIdsToDelete) {
          const result = await sql`DELETE FROM usage_records WHERE id = ${id}`;
          totalDeleted += result.rowCount ?? 0;
        }
      }

      const overrides = await getDailyOverrides();
      const overrideIds = overrides
        .filter(o => isOrphaned(o.userId))
        .map(o => ({ date: o.date, user_id: o.userId, type: o.type }));

      for (const o of overrideIds) {
        const result = await sql`
          DELETE FROM daily_overrides 
          WHERE date = ${o.date} AND user_id = ${o.user_id} AND type = ${o.type}
        `;
        totalDeleted += result.rowCount ?? 0;
      }

      // Cleanup attendance (simple SQL fallback for tables with generic user_id check)
      const attrResult = await sql`DELETE FROM attendance_records WHERE user_id IS NOT NULL AND user_id NOT IN (SELECT id FROM users)`;
      totalDeleted += attrResult.rowCount ?? 0;

      const leaveResult = await sql`DELETE FROM leave_requests WHERE user_id IS NOT NULL AND user_id NOT IN (SELECT id FROM users)`;
      totalDeleted += leaveResult.rowCount ?? 0;

      console.log(`Successfully cleaned up ${totalDeleted} orphaned records.`);
      return totalDeleted;
    } catch (error) {
      console.error('Error in cleanupOrphanedRecords:', error);
      throw error;
    }
  }

  // File System Fallback
  const fs = (await import('fs/promises')).default;
  let totalDeleted = 0;

  const records = await getRecords();
  const filteredRecords = records.filter(r => !isOrphaned(r.userId, r.userName));
  totalDeleted += records.length - filteredRecords.length;
  if (records.length !== filteredRecords.length) {
    await fs.writeFile(DATA_FILE_PATH, JSON.stringify(filteredRecords, null, 2), 'utf-8');
  }

  const overrides = await getDailyOverrides();
  const filteredOverrides = overrides.filter(o => !isOrphaned(o.userId));
  totalDeleted += overrides.length - filteredOverrides.length;
  if (overrides.length !== filteredOverrides.length) {
    await fs.writeFile(DAILY_OVERRIDES_FILE_PATH, JSON.stringify(filteredOverrides, null, 2), 'utf-8');
  }

  return totalDeleted;
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
  delta75: number,
  targetDate?: string
): Promise<{ success: boolean; message?: string }> {
  // Use provided date or today (local string)
  const dateStr = targetDate || new Date().toISOString().split('T')[0];

  if (isPostgresEnabled()) {
    // Postgres Transaction Logic

    if (delta50 > 0) {
      for (let i = 0; i < delta50; i++) {
        // Insert new 50L records
        await sql`INSERT INTO usage_records (id, size, user_id, user_name, timestamp) VALUES (${crypto.randomUUID()}, 50, ${userId}, ${userName}, ${dateStr}::timestamp + interval '12 hours')`;
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
                    WHERE user_id = ${userId} AND size = 50 AND timestamp::date = ${dateStr}::date
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
                WHERE user_id = ${userId} AND size = 45 AND timestamp::date = ${dateStr}::date
                ORDER BY timestamp DESC
                LIMIT ${remaining}
            )
          `;
      }
    }

    if (delta75 > 0) {
      for (let i = 0; i < delta75; i++) {
        await sql`INSERT INTO usage_records (id, size, user_id, user_name, timestamp) VALUES (${crypto.randomUUID()}, 75, ${userId}, ${userName}, ${dateStr}::timestamp + interval '12 hours')`;
      }
    } else if (delta75 < 0) {
      const limit = Math.abs(delta75);
      await sql`
            DELETE FROM usage_records
            WHERE id IN (
                SELECT id FROM usage_records
                WHERE user_id = ${userId} AND size = 75 AND timestamp::date = ${dateStr}::date
                ORDER BY timestamp DESC
                LIMIT ${limit}
            )
          `;
    }

    return { success: true };
  }

  const records = await getRecords();
  // For file system, use dateStr as prefix for matching
  const targetDatePrefix = dateStr;

  // We can just construct the new list.
  const newRecordsList = [...records];

  // Removal Logic 50L (and 45L)
  if (delta50 < 0) {
    let countToRemove = Math.abs(delta50);
    let removed = 0;

    // First pass: remove 50L
    for (let i = newRecordsList.length - 1; i >= 0 && removed < countToRemove; i--) {
      const r = newRecordsList[i];
      if (r.userId === userId && r.size === 50 && r.timestamp.startsWith(targetDatePrefix)) {
        newRecordsList.splice(i, 1);
        removed++;
      }
    }

    // Second pass: remove 45L if needed
    if (removed < countToRemove) {
      for (let i = newRecordsList.length - 1; i >= 0 && removed < countToRemove; i--) {
        const r = newRecordsList[i];
        if (r.userId === userId && r.size === 45 && r.timestamp.startsWith(targetDatePrefix)) {
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
      if (r.userId === userId && r.size === 75 && r.timestamp.startsWith(targetDatePrefix)) {
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
        timestamp: targetDate ? `${targetDate}T12:00:00.000Z` : new Date().toISOString(),
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
        timestamp: targetDate ? `${targetDate}T12:00:00.000Z` : new Date().toISOString(),
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

// --- Leave Requests (Vacations) ---
const LEAVES_FILE_PATH = path.join(process.cwd(), 'leaves.json');

export async function getLeaveRequests(userId?: string, agencyId?: string): Promise<LeaveRequest[]> {
  if (isPostgresEnabled()) {
    try {
      const users = await getUsers();
      let allLeaves;
      if (agencyId) {
        const { rows } = await sql`
          SELECT r.* FROM leave_requests r
          LEFT JOIN users u ON r.user_id = u.id
          WHERE u.agency_id = ${agencyId}
          ORDER BY r.created_at DESC
        `;
        allLeaves = rows;
      } else {
        const { rows } = await sql`SELECT * FROM leave_requests ORDER BY created_at DESC`;
        allLeaves = rows;
      }

      // Calculate used leaves in JS to be safe
      const usedMap: Record<string, number> = {};
      allLeaves.forEach(r => {
        if (r.status === 'APPROVED') {
          const start = new Date(r.start_date);
          const end = new Date(r.end_date);
          const days = Math.floor((end.getTime() - start.getTime()) / (1000 * 3600 * 24)) + 1;
          usedMap[r.user_id] = (usedMap[r.user_id] || 0) + days;
        }
      });

      const results = allLeaves.map(r => {
        const u = users.find(user => user.id === r.user_id);
        const total = u?.totalLeaves ?? 15;
        const used = usedMap[r.user_id] || 0;

        return {
          id: r.id,
          userId: r.user_id,
          startDate: r.start_date,
          endDate: r.end_date,
          reason: r.reason,
          status: r.status as LeaveStatus,
          createdAt: r.created_at.toString(),
          userName: u?.name || r.user_name || '진행중...',
          cleaningArea: u?.cleaningArea || '',
          remainingLeaves: total - used
        };
      });

      if (userId) {
        return results.filter(r => r.userId === userId);
      }

      return results;
    } catch (e) {
      console.error('CRITICAL DB Error getting leaves:', e);
      return [];
    }
  }

  await ensureFile(LEAVES_FILE_PATH, []);
  try {
    const fs = (await import('fs/promises')).default;
    const data = await fs.readFile(LEAVES_FILE_PATH, 'utf-8');
    const all: LeaveRequest[] = JSON.parse(data);

    const users = await getUsers();

    // Calculate used leaves from all requests
    const usedMap: Record<string, number> = {};
    all.forEach(r => {
      if (r.status === 'APPROVED') {
        const start = new Date(r.startDate);
        const end = new Date(r.endDate);
        const days = Math.floor((end.getTime() - start.getTime()) / (1000 * 3600 * 24)) + 1;
        usedMap[r.userId] = (usedMap[r.userId] || 0) + days;
      }
    });

    const results = all.map(l => {
      const u = users.find(user => user.id === l.userId);
      const total = u?.totalLeaves ?? 15;
      const used = usedMap[l.userId] || 0;

      return {
        ...l,
        userName: u?.name,
        cleaningArea: u?.cleaningArea,
        remainingLeaves: total - used
      };
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    if (userId) {
      return results.filter(r => r.userId === userId);
    }
    return results;

  } catch (e) {
    console.error('File system error getting leaves:', e);
    return [];
  }
}

export async function addLeaveRequest(data: Omit<LeaveRequest, 'id' | 'createdAt' | 'status' | 'userName'>): Promise<LeaveRequest> {
  const status: LeaveStatus = 'PENDING';

  if (isPostgresEnabled()) {
    const id = crypto.randomUUID();
    await sql`
      INSERT INTO leave_requests (id, user_id, start_date, end_date, reason, status, created_at)
      VALUES (${id}, ${data.userId}, ${data.startDate}, ${data.endDate}, ${data.reason}, ${status}, NOW())
    `;
    return {
      ...data,
      id,
      status,
      createdAt: new Date().toISOString()
    };
  }

  const leaves = await getLeaveRequests();
  // Note: getLeaveRequests returns with userName, but for storage we want raw. 
  // So we should read raw file actually.

  const fs = (await import('fs/promises')).default;
  await ensureFile(LEAVES_FILE_PATH, []);
  const rawData = await fs.readFile(LEAVES_FILE_PATH, 'utf-8');
  let rawLeaves: LeaveRequest[] = JSON.parse(rawData);

  const newLeave: LeaveRequest = {
    id: crypto.randomUUID(),
    userId: data.userId,
    startDate: data.startDate,
    endDate: data.endDate,
    reason: data.reason,
    status,
    createdAt: new Date().toISOString()
  };

  rawLeaves.push(newLeave);
  await fs.writeFile(LEAVES_FILE_PATH, JSON.stringify(rawLeaves, null, 2), 'utf-8');
  return newLeave;
}

export async function updateLeaveRequestStatus(id: string, status: LeaveStatus): Promise<void> {
  if (isPostgresEnabled()) {
    await sql`UPDATE leave_requests SET status = ${status} WHERE id = ${id}`;
    return;
  }

  const fs = (await import('fs/promises')).default;
  const rawData = await fs.readFile(LEAVES_FILE_PATH, 'utf-8');
  let rawLeaves: LeaveRequest[] = JSON.parse(rawData);
  const index = rawLeaves.findIndex(l => l.id === id);
  if (index !== -1) {
    rawLeaves[index].status = status;
    await fs.writeFile(LEAVES_FILE_PATH, JSON.stringify(rawLeaves, null, 2), 'utf-8');
  }
}

// --- Notices ---
// Notice type imported from ./types


const NOTICES_FILE_PATH = path.join(process.cwd(), 'notices.json');

export async function getNotices(agencyId?: string): Promise<Notice[]> {
  if (isPostgresEnabled()) {
    try {
      let rows;
      if (agencyId) {
        const res = await sql`SELECT * FROM notices WHERE agency_id = ${agencyId} OR agency_id IS NULL ORDER BY is_pinned DESC, created_at DESC`;
        rows = res.rows;
      } else {
        const res = await sql`SELECT * FROM notices ORDER BY is_pinned DESC, created_at DESC`;
        rows = res.rows;
      }
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
      INSERT INTO notices (id, title, content, image_data, is_pinned, author_id, created_at, agency_id)
      VALUES (${id}, ${notice.title}, ${notice.content}, ${notice.imageData ?? null}, ${notice.isPinned ?? false}, ${notice.authorId}, NOW(), ${notice.agencyId ?? null})
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

export async function getAttendanceRecords(userId?: string, agencyId?: string): Promise<AttendanceRecord[]> {
  if (isPostgresEnabled()) {
    try {
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

      let rows;
      if (agencyId) {
        const res = await sql`SELECT * FROM attendance_records WHERE agency_id = ${agencyId} ORDER BY timestamp DESC`;
        rows = res.rows;
      } else {
        const res = await sql`SELECT * FROM attendance_records ORDER BY timestamp DESC`;
        rows = res.rows;
      }
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

export async function updateAttendanceRecord(id: string, updates: Partial<AttendanceRecord>): Promise<void> {
  if (isPostgresEnabled()) {
    const { rows } = await sql`SELECT * FROM attendance_records WHERE id = ${id}`;
    if (rows.length === 0) throw new Error('Record not found');
    const existing = rows[0];

    const newType = updates.type ?? existing.type;
    const newTimestamp = updates.timestamp ?? existing.timestamp;

    await sql`
            UPDATE attendance_records
            SET type = ${newType}, timestamp = ${newTimestamp}
            WHERE id = ${id}
        `;
    return;
  }

  const fs = (await import('fs/promises')).default;
  const data = await fs.readFile(ATTENDANCE_FILE_PATH, 'utf-8');
  let allRecords: AttendanceRecord[] = JSON.parse(data);
  const index = allRecords.findIndex(r => r.id === id);
  if (index === -1) throw new Error('Record not found');

  allRecords[index] = { ...allRecords[index], ...updates };
  await fs.writeFile(ATTENDANCE_FILE_PATH, JSON.stringify(allRecords, null, 2), 'utf-8');
}

export async function deleteAttendanceRecord(id: string): Promise<void> {
  if (isPostgresEnabled()) {
    await sql`DELETE FROM attendance_records WHERE id = ${id}`;
    return;
  }

  const fs = (await import('fs/promises')).default;
  const data = await fs.readFile(ATTENDANCE_FILE_PATH, 'utf-8');
  let allRecords: AttendanceRecord[] = JSON.parse(data);
  const filtered = allRecords.filter(r => r.id !== id);
  await fs.writeFile(ATTENDANCE_FILE_PATH, JSON.stringify(filtered, null, 2), 'utf-8');
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

// --- Map Zone & Issue Management ---

export async function getZones(): Promise<Zone[]> {
  if (isPostgresEnabled()) {
    try {
      const { rows } = await sql`
        SELECT z.*, u.name as worker_name 
        FROM cleaning_zones z
        LEFT JOIN users u ON z.worker_id = u.id
      `;
      return rows.map(r => {
        let effectiveIsCleaned = r.is_cleaned;
        // KST 자정 기준 자동 리셋 판별
        if (effectiveIsCleaned && r.last_cleaned_at) {
            const lastDate = new Date(r.last_cleaned_at);
            const now = new Date();
            const kstOffset = 9 * 60 * 60 * 1000;
            const lastDateKst = new Date(lastDate.getTime() + kstOffset);
            const nowKst = new Date(now.getTime() + kstOffset);
            
            if (lastDateKst.getUTCFullYear() !== nowKst.getUTCFullYear() || 
                lastDateKst.getUTCMonth() !== nowKst.getUTCMonth() || 
                lastDateKst.getUTCDate() !== nowKst.getUTCDate()) {
                effectiveIsCleaned = false; // 오늘이 아니면 무조건 빨간색으로 리셋
            }
        }

        return {
          id: r.id,
          path: JSON.parse(r.path_data),
          isCleaned: effectiveIsCleaned,
          workerId: r.worker_id,
          workerName: r.worker_name,
          groupName: r.group_name || undefined,
          createdAt: r.created_at?.toISOString(),
          lastCleanedAt: r.last_cleaned_at?.toISOString()
        };
      });
    } catch(e) {
      console.warn('Error fetching zones:', e);
      return [];
    }
  }
  return []; // Fallback empty for fs since localStorage handles it on client right now, but later we could implement FS
}

export async function addZone(zone: Omit<Zone, 'workerName' | 'createdAt'>): Promise<void> {
  if (isPostgresEnabled()) {
    const pathStr = JSON.stringify(zone.path);
    const groupName = zone.groupName || null;
    await sql`
      INSERT INTO cleaning_zones (id, worker_id, path_data, group_name, is_cleaned, created_at, last_cleaned_at)
      VALUES (${zone.id}, ${zone.workerId}, ${pathStr}, ${groupName}, false, NOW(), NULL)
    `;
  }
}

export async function toggleZoneStatus(id: string, isCleaned: boolean): Promise<void> {
  if (isPostgresEnabled()) {
    if (isCleaned) {
      await sql`UPDATE cleaning_zones SET is_cleaned = ${isCleaned}, last_cleaned_at = NOW() WHERE id = ${id}`;
    } else {
      await sql`UPDATE cleaning_zones SET is_cleaned = ${isCleaned} WHERE id = ${id}`;
    }
  }
}

export async function toggleZoneGroupStatus(groupName: string, workerId: string, isCleaned: boolean): Promise<void> {
  if (isPostgresEnabled()) {
    if (isCleaned) {
      await sql`UPDATE cleaning_zones SET is_cleaned = ${isCleaned}, last_cleaned_at = NOW() WHERE group_name = ${groupName} AND worker_id = ${workerId}`;
    } else {
      await sql`UPDATE cleaning_zones SET is_cleaned = ${isCleaned} WHERE group_name = ${groupName} AND worker_id = ${workerId}`;
    }
  }
}

export async function deleteZone(id: string): Promise<void> {
  if (isPostgresEnabled()) {
    await sql`DELETE FROM cleaning_zones WHERE id = ${id}`;
  }
}

export async function updateZonePath(id: string, pathCoords: any): Promise<void> {
  if (isPostgresEnabled()) {
    const pathStr = JSON.stringify(pathCoords);
    await sql`UPDATE cleaning_zones SET path_data = ${pathStr} WHERE id = ${id}`;
  }
}

export async function renameZoneGroup(workerId: string, oldGroupName: string, newGroupName: string): Promise<void> {
  if (isPostgresEnabled()) {
    await sql`UPDATE cleaning_zones SET group_name = ${newGroupName} WHERE worker_id = ${workerId} AND group_name = ${oldGroupName}`;
  }
}

export async function deleteZoneGroup(workerId: string, groupName: string): Promise<void> {
  if (isPostgresEnabled()) {
    await sql`DELETE FROM cleaning_zones WHERE worker_id = ${workerId} AND group_name = ${groupName}`;
  }
}

export async function getIssues(): Promise<Issue[]> {
  if (isPostgresEnabled()) {
    try {
       const { rows } = await sql`
        SELECT i.*, u.name as worker_name 
        FROM cleaning_issues i
        LEFT JOIN users u ON i.worker_id = u.id
      `;
      return rows.map(r => ({
        id: r.id,
        lat: r.lat,
        lng: r.lng,
        workerId: r.worker_id,
        workerName: r.worker_name,
        status: r.status as Issue['status'],
        photoUrl: r.photo_url || undefined,
        adminPhotoUrl: r.admin_photo_url || undefined,
        createdAt: r.created_at?.toISOString() || new Date(0).toISOString()
      }));
    } catch(e) {
      console.warn('Error fetching issues:', e);
      return [];
    }
  }
  return [];
}

export async function addIssue(issue: Omit<Issue, 'workerName'>): Promise<void> {
  if (isPostgresEnabled()) {
    const ts = new Date(issue.createdAt || Date.now()).toISOString();
    await sql`
      INSERT INTO cleaning_issues (id, lat, lng, worker_id, status, admin_photo_url, created_at)
      VALUES (${issue.id}, ${issue.lat}, ${issue.lng}, ${issue.workerId}, ${issue.status}, ${issue.adminPhotoUrl || null}, ${ts})
    `;
  }
}

export async function updateIssuePhotoAndStatus(id: string, photoUrl: string, status: Issue['status']): Promise<void> {
  if (isPostgresEnabled()) {
    await sql`
      UPDATE cleaning_issues SET photo_url = ${photoUrl}, status = ${status} WHERE id = ${id}
    `;
  }
}

export async function closeIssue(id: string): Promise<void> {
  if (isPostgresEnabled()) {
    await sql`UPDATE cleaning_issues SET status = 'CLOSED' WHERE id = ${id}`;
  }
}

export async function deleteIssue(id: string): Promise<void> {
  if (isPostgresEnabled()) {
    await sql`DELETE FROM cleaning_issues WHERE id = ${id}`;
  }
}
