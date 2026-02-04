// @ts-nocheck
const { db } = require('@vercel/postgres');

async function seedUsers(client) {
  await client.sql`
    CREATE TABLE IF NOT EXISTS users (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      phone_number TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      cleaning_area TEXT NOT NULL,
      role TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `;

  // Check if admin exists, if not create default admin
  const { rows } = await client.sql`SELECT * FROM users WHERE role = 'admin' LIMIT 1`;
  if (rows.length === 0) {
    // Note: In a real app we would want a secure way to create the initial admin.
    // user will need to add manually or we can add a default one.
    // Let's add a default admin for convenience if none exists.
    await client.sql`
      INSERT INTO users (phone_number, name, cleaning_area, role)
      VALUES ('010-0000-0000', '관리자', '전체', 'admin')
      ON CONFLICT (phone_number) DO NOTHING;
    `;
    console.log('Created default admin user');
  }
}

async function seedUsageRecords(client) {
  await client.sql`
    CREATE TABLE IF NOT EXISTS usage_records (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      size INTEGER NOT NULL,
      timestamp TIMESTAMP DEFAULT NOW(),
      user_id UUID REFERENCES users(id),
      user_name TEXT
    );
  `;
}

async function main() {
  const client = await db.connect();

  await seedUsers(client);
  await seedUsageRecords(client);

  await client.end();
  console.log('Database seeded successfully');
}

main().catch((err) => {
  console.error(
    'An error occurred while attempting to seed the database:',
    err,
  );
});
