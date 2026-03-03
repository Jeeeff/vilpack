import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import dotenv from 'dotenv';

dotenv.config();

// Ensure connection string is available
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not defined');
}

const connectionString = `${process.env.DATABASE_URL}`;
console.log('DB Connection String:', connectionString.replace(/:[^:@]+@/, ':****@'));

// Setup the connection pool
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

// Pass the adapter to PrismaClient
const prisma = new PrismaClient({ adapter });

export default prisma;
