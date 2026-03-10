import fs from 'fs';
const envFile = fs.readFileSync('.env', 'utf-8');
const env = {};
envFile.split('\n').forEach(line => {
  const [key, ...vals] = line.split('=');
  if (key) env[key.trim()] = vals.join('=').trim().replace(/['"]/g, '');
});

const url = env['VITE_SUPABASE_URL'] + '/rest/v1/prompts?select=id,scene_id,created_at,is_active&limit=50';
const key = env['VITE_SUPABASE_ANON_KEY'];

fetch(url, { headers: { apikey: key, Authorization: 'Bearer ' + key } })
  .then(res => res.json())
  .then(data => console.log(JSON.stringify(data, null, 2)))
  .catch(console.error);
