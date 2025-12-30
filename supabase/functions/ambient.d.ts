
// Declare the Deno global namespace
declare namespace Deno {
    export const env: {
        get(key: string): string | undefined;
        toObject(): { [key: string]: string };
    };
    // Add other Deno APIs as needed
}

// Declare modules for URL imports found in the project
declare module "https://deno.land/std@0.168.0/http/server.ts" {
    export function serve(handler: (req: Request) => Response | Promise<Response>): void;
}

declare module "https://esm.sh/@supabase/supabase-js@2" {
    export * from '@supabase/supabase-js';
    export function createClient(url: string, key: string, options?: any): any;
}

declare module "https://deno.land/x/cors@v2.0.0/mod.ts" {
    export const corsHeaders: Record<string, string>;
}

// Wildcard for other versions if needed
declare module "https://deno.land/std@*/http/server.ts" {
    export function serve(handler: (req: Request) => Response | Promise<Response>): void;
}

declare module "https://esm.sh/*" {
    const value: any;
    export default value;
    export * from 'https://esm.sh/*';
}

// Declare module for npm imports
declare module "npm:razorpay@2.9.2" {
    const Razorpay: any;
    export default Razorpay;
}
