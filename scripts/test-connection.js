require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

console.log('Testing Crew Member Creation...');

if (!supabaseUrl || !supabaseKey) {
    console.error('ERROR: Missing environment variables.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testCrewMemberInsert() {
    try {
        // 1. Get a Company ID
        console.log('\n1. Fetching a Company ID...');
        const { data: company, error: companyError } = await supabase
            .from('companies')
            .select('id')
            .limit(1)
            .single();

        if (companyError || !company) {
            console.error('FAILED to get company:', companyError?.message || 'No company found');
            return;
        }
        console.log('Got Company ID:', company.id);

        // 2. Try Insert Crew Member
        console.log('\n2. Attempting to insert dummy Crew Member...');
        const dummyMember = {
            company_id: company.id,
            first_name: 'Test',
            last_name: 'Bot',
            position: 'Tester',
            // Minimal required fields based on schema
        };

        const { data: member, error: insertError } = await supabase
            .from('crew_members')
            .insert([dummyMember])
            .select()
            .single();

        if (insertError) {
            console.error('INSERT FAILED:', insertError.message);
            console.error('Details:', insertError);
            console.error('Hint: Check if all required columns are nullable or provided, and check RLS policies.');
        } else {
            console.log('INSERT SUCCESSFUL! Created member ID:', member.id);

            // Cleanup
            console.log('Cleaning up...');
            await supabase.from('crew_members').delete().eq('id', member.id);
        }

    } catch (err) {
        console.error('UNEXPECTED ERROR:', err.message);
    }
}

testCrewMemberInsert();
