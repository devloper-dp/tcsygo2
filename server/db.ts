
import { drizzle } from 'drizzle-orm/pglite';
import { PGlite } from '@electric-sql/pglite';
import * as schema from "../shared/schema";
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-serverless';
import ws from "ws";

let dbInstance: any;

// Use real DB if URL is provided and looks valid (not the placeholder 'helium')
// Also checking 'postgres' prefix to be generous
if (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes("helium") && process.env.DATABASE_URL.startsWith("postgres")) {
  neonConfig.webSocketConstructor = ws;
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  dbInstance = drizzleNeon(pool, { schema });
} else {
  console.log("Using local PGlite database (Mock Mode)");
  // Persist to a folder in the project root or relative to CWD
  // 'mock_db_data' folder
  const client = new PGlite("./mock_db_data");
  dbInstance = drizzle(client, { schema });
}

export const db = dbInstance;
