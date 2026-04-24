require('dotenv').config({path: '.env.local'});
const {sql} = require('@vercel/postgres');
sql`SELECT name, cleaning_area FROM users WHERE name = '최고관리자' OR cleaning_area = '최고관리자' OR role = 'super_admin'`.then(res => console.log(res.rows));
