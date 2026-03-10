import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function test() {
  console.log("Fetching prompts to check scene associations...");
  const { data, error } = await supabase
    .from('prompts')
    .select('id, scene_id, prompt_text, is_active')
    .limit(10);
  
  if (error) {
    console.error("Error:", error);
  } else {
    console.log(data);
  }
}

test();
