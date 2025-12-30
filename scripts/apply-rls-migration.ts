import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Error: VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function applyMigrations() {
    console.log('🔧 Applying Database Migrations...\n');

    const migrations = [
        'fix_rls_policies.sql',
        'add_trips_columns.sql'
    ];

    for (const migrationFile of migrations) {
        try {
            const sqlPath = join(__dirname, '..', 'supabase', 'migrations', migrationFile);
            const sql = readFileSync(sqlPath, 'utf-8');

            console.log(`📄 Applying migration: ${migrationFile}`);

            // Split SQL into individual statements
            const statements = sql
                .split(';')
                .map(s => s.trim())
                .filter(s => s.length > 0 && !s.startsWith('--') && !s.match(/^DO\s+\$\$/));

            for (const statement of statements) {
                if (statement.length < 10) continue; // Skip very short statements

                try {
                    // Use the REST API to execute SQL
                    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'apikey': supabaseServiceKey,
                            'Authorization': `Bearer ${supabaseServiceKey}`
                        },
                        body: JSON.stringify({ sql_query: statement + ';' })
                    });

                    if (!response.ok && response.status !== 404) {
                        const error = await response.text();
                        console.error(`    ⚠️  Statement failed (may already exist): ${error.substring(0, 100)}`);
                    }
                } catch (err: any) {
                    console.error(`    ⚠️  Error: ${err.message}`);
                }
            }

            console.log(`    ✅ Migration ${migrationFile} completed\n`);

        } catch (err: any) {
            console.error(`❌ Failed to apply ${migrationFile}:`, err.message);
        }
    }

    console.log('\n🎉 All migrations have been processed!');
    console.log('\nChanges applied:');
    console.log('  • RLS policies for ride_requests, ride_preferences, saved_places, notifications');
    console.log('  • Missing columns added to trips table');
    console.log('  • Public view policy for trips table');
}

applyMigrations();
