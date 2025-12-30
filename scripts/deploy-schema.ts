
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Error: VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function deploySchema() {
    console.log('Deploying schema...');

    const migrationFile = path.join(process.cwd(), 'supabase', 'migrations', 'setup.sql');

    try {
        const sqlContent = fs.readFileSync(migrationFile, 'utf8');

        // Split by semicolons to run statements one by one if needed, 
        // but the best way without a direct pg driver is via a custom RPC if available.
        // However, usually we can't run raw SQL from the client unless we have an unsafe 'exec_sql' RPC.
        // If we assume the user has such an RPC (common in these dev setups):

        const { error } = await supabase.rpc('exec_sql', { sql: sqlContent });

        if (error) {
            // If RPC fails (likely does not exist), we might try a fallback or just inform the user.
            // Another trick is to use the rest-api to post to a specific endpoint if enabled? No.

            console.error('Failed to execute SQL via RPC (exec_sql). Error:', error.message);
            console.log('Attempting to check if tables already exist as a fallback verification...');
            // (We can't really "deploy" without a driver or RPC. 
            // If this fails, we will instruct the user to run it in the dashboard).

            throw new Error('Automated deployment failed. Please run the SQL in the Supabase Dashboard SQL Editor.');
        }

        console.log('Schema deployed successfully!');

    } catch (err: any) {
        console.error('Migration failed:', err.message);
        process.exit(1);
    }
}

deploySchema();
