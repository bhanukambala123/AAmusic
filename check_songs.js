const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://zmsklhagxmwlachetbzz.supabase.co';
const supabaseKey = 'sb_publishable__6SYL6xGoHd0orLnbOZMsg_YeKGTS2H';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase.from('songs').select('id, title, artist, audio_url, cover_url').limit(10);
  if (error) {
    console.error(error);
  } else {
    console.log("Songs count:", data.length);
    console.log(JSON.stringify(data, null, 2));
  }
}
check();
