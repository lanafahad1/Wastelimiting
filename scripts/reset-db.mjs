// Delete the local SQLite database so the next server start re-seeds the
// menu, rules, demo accounts and the synthetic demonstration hospital.
import { rmSync } from 'node:fs';
import { join } from 'node:path';

const file = process.env.CAREBITE_DB ?? join(process.cwd(), 'var', 'carebite.db');
for (const f of [file, `${file}-wal`, `${file}-shm`]) rmSync(f, { force: true });
console.log(`Removed ${file}. Start the server (npm run dev or npm start) to re-seed it.`);
