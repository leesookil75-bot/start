require('dotenv').config({ path: '.env.local' });
const { sql } = require('@vercel/postgres');

async function deleteAdmin() {
    try {
        const oldAdminId = 'f97c0a83-4c8b-4f82-8b6c-17fbffb64a90';
        
        await sql`DELETE FROM daily_overrides WHERE user_id = ${oldAdminId}`;
        await sql`DELETE FROM attendance_records WHERE user_id = ${oldAdminId}`;
        await sql`DELETE FROM leave_requests WHERE user_id = ${oldAdminId}`;
        
        // Delete user
        const res = await sql`DELETE FROM users WHERE id = ${oldAdminId}`;
        console.log("Deleted admin user:", res.rowCount);
    } catch (e) {
        console.error("Error deleting user:", e);
    }
}

deleteAdmin();
