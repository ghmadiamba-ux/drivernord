import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url) throw new Error('Missing environment variable: SUPABASE_URL');
if (!key) throw new Error('Missing environment variable: SUPABASE_SERVICE_ROLE_KEY');

export const db = createClient(url, key);
