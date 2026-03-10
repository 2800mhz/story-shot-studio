const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function test() {
  const { data, error } = await supabase
    .from('prompts')
    .select('id, scene_id, prompt_text, is_active')
    .limit(10);
  
  if (error) {
    console.error("Error:", error);
  } else {
    console.log("Found prompts:", data.length);
    console.log(data);
  }
}

test();
