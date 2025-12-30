#!/usr/bin/env node

/**
 * Supabase Setup Verification Script
 * 
 * This script helps verify that your Supabase setup is complete and correct.
 * Run this after completing the setup steps to ensure everything is configured properly.
 * 
 * Usage: node verify-supabase-setup.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ANSI color codes for terminal output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
};

const checkmark = '✓';
const crossmark = '✗';
const warning = '⚠';

console.log(`\n${colors.cyan}========================================`);
console.log('  SUPABASE SETUP VERIFICATION');
console.log(`========================================${colors.reset}\n`);

let totalChecks = 0;
let passedChecks = 0;
let warnings = 0;

function pass(message) {
    console.log(`${colors.green}${checkmark}${colors.reset} ${message}`);
    totalChecks++;
    passedChecks++;
}

function fail(message) {
    console.log(`${colors.red}${crossmark}${colors.reset} ${message}`);
    totalChecks++;
}

function warn(message) {
    console.log(`${colors.yellow}${warning}${colors.reset} ${message}`);
    warnings++;
}

function info(message) {
    console.log(`${colors.blue}ℹ${colors.reset} ${message}`);
}

function section(title) {
    console.log(`\n${colors.cyan}${title}${colors.reset}`);
    console.log('─'.repeat(title.length));
}

// Check 1: Environment file exists
section('1. Environment Configuration');

const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
    pass('.env file exists');

    // Read and parse .env file
    const envContent = fs.readFileSync(envPath, 'utf8');
    const envVars = {};

    envContent.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
            const [key, ...valueParts] = trimmed.split('=');
            if (key) {
                envVars[key.trim()] = valueParts.join('=').trim();
            }
        }
    });

    // Check required environment variables
    const requiredVars = [
        'VITE_SUPABASE_URL',
        'VITE_SUPABASE_ANON_KEY',
        'EXPO_PUBLIC_SUPABASE_URL',
        'EXPO_PUBLIC_SUPABASE_ANON_KEY',
        'SUPABASE_SERVICE_ROLE_KEY',
    ];

    requiredVars.forEach(varName => {
        if (envVars[varName] && envVars[varName] !== 'your-project-ref.supabase.co' && !envVars[varName].includes('your-')) {
            pass(`${varName} is set`);
        } else {
            fail(`${varName} is missing or not configured`);
        }
    });

    // Check Razorpay keys
    if (envVars['RAZORPAY_KEY_ID'] && !envVars['RAZORPAY_KEY_ID'].includes('your_')) {
        pass('RAZORPAY_KEY_ID is set');
    } else {
        warn('RAZORPAY_KEY_ID is not configured (optional for testing)');
    }

    if (envVars['RAZORPAY_KEY_SECRET'] && !envVars['RAZORPAY_KEY_SECRET'].includes('your_')) {
        pass('RAZORPAY_KEY_SECRET is set');
    } else {
        warn('RAZORPAY_KEY_SECRET is not configured (optional for testing)');
    }

    // Security check
    if (envVars['VITE_SUPABASE_URL'] === envVars['EXPO_PUBLIC_SUPABASE_URL']) {
        pass('Supabase URLs are consistent across web and mobile');
    } else {
        warn('Supabase URLs differ between web and mobile configs');
    }

} else {
    fail('.env file not found');
    info('Copy .env.example to .env and configure your credentials');
}

// Check 2: Supabase directory structure
section('2. Supabase Directory Structure');

const supabasePath = path.join(__dirname, 'supabase');
if (fs.existsSync(supabasePath)) {
    pass('supabase/ directory exists');

    // Check for COMPLETE_SETUP.sql
    const setupSqlPath = path.join(supabasePath, 'COMPLETE_SETUP.sql');
    if (fs.existsSync(setupSqlPath)) {
        pass('COMPLETE_SETUP.sql exists');
    } else {
        fail('COMPLETE_SETUP.sql not found');
    }

    // Check for functions directory
    const functionsPath = path.join(supabasePath, 'functions');
    if (fs.existsSync(functionsPath)) {
        pass('functions/ directory exists');

        const expectedFunctions = [
            'create-payment-order',
            'verify-payment',
            'send-push-notification',
            'update-live-location'
        ];

        expectedFunctions.forEach(funcName => {
            const funcPath = path.join(functionsPath, funcName);
            if (fs.existsSync(funcPath)) {
                pass(`Edge function: ${funcName}`);
            } else {
                warn(`Edge function missing: ${funcName}`);
            }
        });
    } else {
        warn('functions/ directory not found');
    }

} else {
    fail('supabase/ directory not found');
}

// Check 3: Client configuration
section('3. Client Configuration');

const clientSupabasePath = path.join(__dirname, 'client', 'src', 'lib', 'supabase.ts');
if (fs.existsSync(clientSupabasePath)) {
    pass('Web client Supabase config exists');
} else {
    fail('Web client Supabase config not found');
}

// Check 4: Mobile configuration
section('4. Mobile Configuration');

const mobileSupabasePath = path.join(__dirname, 'mobile', 'lib', 'supabase.ts');
if (fs.existsSync(mobileSupabasePath)) {
    pass('Mobile app Supabase config exists');
} else {
    warn('Mobile app Supabase config not found (optional if not using mobile)');
}

// Check 5: Package dependencies
section('5. Dependencies');

const packageJsonPath = path.join(__dirname, 'package.json');
if (fs.existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

    if (packageJson.dependencies && packageJson.dependencies['@supabase/supabase-js']) {
        pass('@supabase/supabase-js installed');
    } else {
        fail('@supabase/supabase-js not found in dependencies');
    }
} else {
    fail('package.json not found');
}

// Check 6: Documentation
section('6. Documentation');

const docs = [
    'SUPABASE_COMPLETE_SETUP_GUIDE.md',
    'SUPABASE_SETUP_CHECKLIST.md',
    'README.md'
];

docs.forEach(doc => {
    const docPath = path.join(__dirname, doc);
    if (fs.existsSync(docPath)) {
        pass(`${doc} exists`);
    } else {
        warn(`${doc} not found`);
    }
});

// Final summary
section('Summary');

const successRate = totalChecks > 0 ? Math.round((passedChecks / totalChecks) * 100) : 0;

console.log(`\nTotal Checks: ${totalChecks}`);
console.log(`${colors.green}Passed: ${passedChecks}${colors.reset}`);
console.log(`${colors.red}Failed: ${totalChecks - passedChecks}${colors.reset}`);
console.log(`${colors.yellow}Warnings: ${warnings}${colors.reset}`);
console.log(`\nSuccess Rate: ${successRate}%\n`);

if (successRate === 100 && warnings === 0) {
    console.log(`${colors.green}🎉 Perfect! Your Supabase setup is complete!${colors.reset}\n`);
} else if (successRate >= 80) {
    console.log(`${colors.green}✓ Good! Your setup is mostly complete.${colors.reset}`);
    console.log(`${colors.yellow}Review the warnings and failed checks above.${colors.reset}\n`);
} else if (successRate >= 50) {
    console.log(`${colors.yellow}⚠ Your setup is incomplete.${colors.reset}`);
    console.log(`${colors.yellow}Please review the failed checks and complete the setup.${colors.reset}\n`);
} else {
    console.log(`${colors.red}✗ Your setup needs attention.${colors.reset}`);
    console.log(`${colors.red}Please follow the SUPABASE_COMPLETE_SETUP_GUIDE.md${colors.reset}\n`);
}

console.log(`${colors.cyan}Next Steps:${colors.reset}`);
console.log('1. Review SUPABASE_COMPLETE_SETUP_GUIDE.md for detailed instructions');
console.log('2. Use SUPABASE_SETUP_CHECKLIST.md to track your progress');
console.log('3. Run this script again after making changes\n');

process.exit(successRate >= 80 ? 0 : 1);
