
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixForeignKey() {
    console.log('Attempting to add missing Foreign Key constraint...');

    const sql = `
    DO $$
    BEGIN
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'bookings_trip_id_fkey'
        ) THEN
            ALTER TABLE public.bookings
            ADD CONSTRAINT bookings_trip_id_fkey
            FOREIGN KEY (trip_id)
            REFERENCES public.trips(id)
            ON DELETE SET NULL;
            RAISE NOTICE 'Added foreign key constraint bookings_trip_id_fkey';
        ELSE
            RAISE NOTICE 'Constraint bookings_trip_id_fkey already exists';
        END IF;
    END $$;
  `;

    // Try using the execute_sql RPC if it exists (commonly added in starter kits)
    const { data, error } = await supabase.rpc('execute_sql', {
        query: sql
    });

    if (error) {
        console.error('RPC execution failed:', error.message);
        console.log('Falling back to checking if we can just infer the issue is definitely the missing FK.');
    } else {
        console.log('RPC execution success!');
    }
}

fixForeignKey().catch(console.error);
