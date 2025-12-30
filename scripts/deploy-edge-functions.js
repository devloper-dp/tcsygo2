import { readdirSync, statSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Adjust path to project root (scripts is usually in root/scripts)
const projectRoot = join(__dirname, '..');
const functionsDir = join(projectRoot, 'supabase', 'functions');
const envPath = join(projectRoot, '.env');

console.log('🚀 Starting deployment of all Supabase Edge Functions...');
console.log(`📂 Functions directory: ${functionsDir}`);

// Extract Project Ref from .env or Environment Variables
let projectRef = process.env.SUPABASE_PROJECT_REF;

// Try to extract from VITE_SUPABASE_URL env var if available (common in CI)
if (!projectRef && process.env.VITE_SUPABASE_URL) {
    const match = process.env.VITE_SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/);
    if (match && match[1]) {
        projectRef = match[1];
    }
}

// Fallback: Try to read from .env file
if (!projectRef) {
    try {
        const envContent = readFileSync(envPath, 'utf-8');
        // Match both VITE_SUPABASE_URL or SUPABASE_URL
        const match = envContent.match(/(?:VITE_)?SUPABASE_URL=https:\/\/([^.]+)\.supabase\.co/);
        if (match && match[1]) {
            projectRef = match[1];
            console.log(`🔗 Found Project Ref in .env: ${projectRef}`);
        }
    } catch (e) {
        console.warn('⚠️ Could not read .env file and no environment variable set.');
    }
} else {
    console.log(`🔗 Found Project Ref from Environment: ${projectRef}`);
}

try {
    const items = readdirSync(functionsDir);
    let deployedCount = 0;
    let failedCount = 0;

    for (const item of items) {
        const fullPath = join(functionsDir, item);

        // Check if it's a directory and not a hidden one (and not node_modules just in case)
        if (statSync(fullPath).isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
            console.log(`\n-----------------------------------`);
            console.log(`⚡ Deploying function: ${item}`);
            console.log(`-----------------------------------`);

            try {
                // Construct command
                let cmd = `supabase functions deploy ${item} --no-verify-jwt`;
                if (projectRef) {
                    cmd += ` --project-ref ${projectRef}`;
                }

                // Run supabase functions deploy
                execSync(cmd, {
                    stdio: 'inherit',
                    cwd: projectRoot
                });

                console.log(`✅ ${item} deployed successfully.`);
                deployedCount++;
            } catch (error) {
                console.error(`❌ Failed to deploy ${item}`);
                failedCount++;

                // Slightly heuristic check:
                // execSync throws usually, but we don't catch stdout directly because of stdio:inherit.
                // However, we can warn globally at the end if things failed.
            }
        }
    }

    console.log(`\n===================================`);
    console.log(`🎉 Deployment Complete`);
    console.log(`✅ Successful: ${deployedCount}`);
    if (failedCount > 0) {
        console.log(`❌ Failed: ${failedCount}`);
        if (!projectRef) {
            console.warn('\n⚠️ WARNING: Project Ref was not found. If these failures are due to Docker issues, make sure to add VITE_SUPABASE_URL in .env or link your project with "supabase link".');
        }
    }
    console.log(`===================================`);

} catch (error) {
    console.error('❌ Error reading functions directory:', error);
    process.exit(1);
}
