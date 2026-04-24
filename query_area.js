require('dotenv').config({path: '.env.local'});
const {sql} = require('@vercel/postgres');
sql`SELECT name, cleaning_area FROM users`.then(res => console.log(res.rows));
