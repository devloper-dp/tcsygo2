/**
 * Environment Variable Validator
 * 
 * Validates that all required environment variables are set before the app starts.
 * This prevents runtime errors due to missing configuration.
 */

interface EnvConfig {
    VITE_SUPABASE_URL: string;
    VITE_SUPABASE_ANON_KEY: string;
    VITE_RAZORPAY_KEY_ID: string;
}

const REQUIRED_ENV_VARS: (keyof EnvConfig)[] = [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY',
    'VITE_RAZORPAY_KEY_ID',
];

/**
 * Validates that all required environment variables are present and valid
 * @throws Error if any required environment variable is missing or invalid
 */
export function validateEnvironment(): void {
    const missing: string[] = [];
    const invalid: string[] = [];

    for (const key of REQUIRED_ENV_VARS) {
        const value = import.meta.env[key];

        if (!value) {
            missing.push(key);
            continue;
        }

        // Check for placeholder values
        if (typeof value === 'string' && value.includes('placeholder')) {
            invalid.push(`${key} contains placeholder value`);
            continue;
        }

        // Validate Supabase URL format
        if (key === 'VITE_SUPABASE_URL' && !value.startsWith('https://')) {
            invalid.push(`${key} must start with https://`);
        }

        // Validate Razorpay key format
        if (key === 'VITE_RAZORPAY_KEY_ID' && !value.startsWith('rzp_')) {
            invalid.push(`${key} must start with rzp_`);
        }
    }

    if (missing.length > 0 || invalid.length > 0) {
        const errors: string[] = [];

        if (missing.length > 0) {
            errors.push(`Missing required environment variables: ${missing.join(', ')}`);
        }

        if (invalid.length > 0) {
            errors.push(`Invalid environment variables: ${invalid.join(', ')}`);
        }

        const errorMessage = [
            '❌ Environment Configuration Error',
            '',
            ...errors,
            '',
            '📝 Please check your .env file and ensure all required variables are set correctly.',
            '   See .env.example for reference.',
        ].join('\n');

        console.error(errorMessage);
        throw new Error(errorMessage);
    }

    console.log('✅ Environment variables validated successfully');
}

/**
 * Gets a typed environment configuration object
 * @returns Typed environment configuration
 */
export function getEnvConfig(): EnvConfig {
    return {
        VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
        VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
        VITE_RAZORPAY_KEY_ID: import.meta.env.VITE_RAZORPAY_KEY_ID,
    };
}
