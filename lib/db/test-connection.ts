import { createPool } from "mysql2/promise";

async function main() {
  const url = process.env.MYSQL_URL!;
  console.log("Connecting to MySQL...");
  const pool = createPool(url);
  try {
    const [rows] = await pool.query("SELECT 1 AS ok");
    console.log("Connected OK:", JSON.stringify(rows));
    const [tables] = await pool.query("SHOW TABLES");
    console.log("Existing tables:", JSON.stringify(tables));
  } catch (e: any) {
    console.error("FAIL:", e.message, e.code);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
