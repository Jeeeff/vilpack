import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

async function run() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('Connected to database');

    await client.query(`ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "customerName" TEXT;`);
    console.log('Added customerName');

    await client.query(`ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "customerPhone" TEXT;`);
    console.log('Added customerPhone');

    await client.query(`ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "orderSummary" TEXT;`);
    console.log('Added orderSummary');

    await client.query(`ALTER TABLE "Order" ALTER COLUMN "status" SET DEFAULT 'draft';`);
    console.log('Updated status default');

    await client.query(`ALTER TABLE "Order" ALTER COLUMN "total" SET DEFAULT 0.00;`);
    console.log('Updated total default');

    console.log('Migration completed successfully');
  } catch (err) {
    console.error('Migration failed', err);
  } finally {
    await client.end();
  }
}

run();
