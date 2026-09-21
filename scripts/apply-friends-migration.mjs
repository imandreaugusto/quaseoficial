// One-off migration runner: adds photo_url/status_message columns to brazilian_friends_users.
// Usage (PowerShell):
//   $env:SUPABASE_DB_URL = "postgresql://postgres:SUA_SENHA@db.tzsuluofmfumaprvxurp.supabase.co:5432/postgres"
//   npm install pg --no-save
//   node scripts/apply-friends-migration.mjs
import { Client } from 'pg';

const connectionString = process.env.SUPABASE_DB_URL;
if (!connectionString) {
  console.error('Defina a variável SUPABASE_DB_URL antes de rodar este script.');
  process.exit(1);
}

const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

async function run() {
  await client.connect();
  await client.query('alter table public.brazilian_friends_users add column if not exists photo_url text;');
  await client.query('alter table public.brazilian_friends_users add column if not exists status_message text;');
  console.log('✅ Migração aplicada com sucesso: photo_url e status_message prontos.');
  await client.end();
}

run().catch((err) => {
  console.error('❌ Falha ao aplicar migração:', err.message);
  process.exit(1);
});
