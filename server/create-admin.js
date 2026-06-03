import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: new URL('../.env', import.meta.url).pathname });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const adminEmail = process.env.ADMIN_EMAIL || 'admin@homehero.test';
const adminPassword = process.env.ADMIN_PASSWORD || 'Admin123!';

async function run() {
  console.log('Creating admin user:', adminEmail);
  try {
    const { data, error } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: { name: 'Admin' },
    });
    if (error) {
      console.error('Error creating admin user:', error);
      process.exit(1);
    }

    // supabase-js v2 returns either data.user or data
    const userId = data?.user?.id || data?.id || null;
    if (!userId) {
      console.warn('Could not determine user id from createUser response:', data);
    } else {
      // Upsert profile and role
      await supabase.from('profiles').upsert({ id: userId, name: 'Admin' });
      await supabase.from('user_roles').upsert({ id: userId, user_id: userId, role: 'ADMIN' });
    }

    console.log(`Admin created: ${adminEmail} / ${adminPassword}`);
    console.log('If you used a custom SUPABASE_SERVICE_ROLE_KEY, ensure it is kept secret.');
  } catch (e) {
    console.error('Unexpected error:', e);
    process.exit(1);
  }
}

run();
