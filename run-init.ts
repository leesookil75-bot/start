import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

import { initializeDB } from './src/lib/db-init.ts';

initializeDB().then(res => {
  console.log('Init DB Result:', res);
  process.exit(0);
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
