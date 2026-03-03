const { Client } = require('pg');

async function testConnection(host) {
  console.log(`Testing connection to ${host}...`);
  const client = new Client({
    user: 'postgres',
    host: host,
    database: 'vilpack_bot_db',
    password: 'password',
    port: 5432,
  });

  try {
    await client.connect();
    console.log(`Successfully connected to ${host}`);
    await client.end();
    return true;
  } catch (err) {
    console.error(`Failed to connect to ${host}:`, err.message);
    return false;
  }
}

async function run() {
  await testConnection('127.0.0.1');
  await testConnection('localhost');
}

run();
