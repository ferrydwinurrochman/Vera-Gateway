import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./schema";

const mysqlUrl = process.env.MYSQL_URL;
if (!mysqlUrl) {
  throw new Error(
    "MYSQL_URL must be set. Please configure the MySQL connection string.",
  );
}

export const pool = mysql.createPool(mysqlUrl);
export const db = drizzle(pool, { schema, mode: "default" });

export * from "./schema";
