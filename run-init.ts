import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());

import { initializeDB } from './src/lib/db-init';

async function main() {
  console.log('Running DB Init...');
  const res = await initializeDB();
  console.log('Result:', res);
}

main().catch(console.error);
