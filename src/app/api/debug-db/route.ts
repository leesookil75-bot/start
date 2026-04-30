import { sql } from '@vercel/postgres';

export async function GET() {
  const { rows: users } = await sql`SELECT id, name, cleaning_area, workplace_id, role, agency_id FROM users`;
  const { rows: wps } = await sql`SELECT id, name FROM workplaces`;
  return Response.json({ users, wps });
}
