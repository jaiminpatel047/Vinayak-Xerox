const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error('SUPABASE_URL environment variable is missing');
}

if (!supabaseAnonKey) {
  throw new Error('SUPABASE_ANON_KEY environment variable is missing');
}

const environmentContent = `export const environment = {
  production: true,
  supabaseUrl: '${supabaseUrl}',
  supabaseAnonKey: '${supabaseAnonKey}'
};`;

const filePath = path.join(
  __dirname,
  '../src/environments/environment.ts'
);

fs.writeFileSync(filePath, environmentContent);

console.log('Production environment file generated successfully.');