require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

console.log('Testing Supabase connection (read-only)...');

if (!supabaseUrl || !supabaseKey) {
    console.error('ERROR: Missing environment variables.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
    try {
        const { count, error } = await supabase
            .from('companies')
            .select('id', { count: 'exact', head: true });

        if (error) {
            console.error('CONNECTION FAILED:', error.message);
            process.exitCode = 1;
        } else {
            console.log('CONNECTION SUCCESSFUL. Accessible companies:', count || 0);
        }
    } catch (err) {
        console.error('UNEXPECTED ERROR:', err.message);
        process.exitCode = 1;
    }
}

testConnection();
