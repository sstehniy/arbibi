import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const pool = new Pool({
  host: process.env.POSTGRES_HOST || "localhost",
  port: Number(process.env.POSTGRES_PORT) || 5432,
  user: process.env.POSTGRES_USER || "arbibot",
  password: process.env.POSTGRES_PASSWORD || "arbibot123",
  database: process.env.POSTGRES_DB || "arbibot",
});

export const db = drizzle(pool, { schema });
