import { Pool } from 'pg';
import pgTypes from 'pg-types';
import dotenv from 'dotenv';

dotenv.config();

pgTypes.setTypeParser(20, (value: string) => Number(value));

const isTest = process.env.NODE_ENV === 'test';
if (isTest && !process.env.TEST_DATABASE_URL) {
  throw new Error(
    'TEST_DATABASE_URL ist nicht gesetzt: Im Testbetrieb (NODE_ENV=test) wird ausschliesslich TEST_DATABASE_URL verwendet, ohne Fallback auf DATABASE_URL. ' +
      'Bitte z. B. TEST_DATABASE_URL=postgres://user:pass@localhost:5432/ticketing_test setzen.',
  );
}

export const pool = new Pool({
  connectionString: isTest ? process.env.TEST_DATABASE_URL : process.env.DATABASE_URL,
});

pool.on('error', (err) => {
  console.error('pg pool idle client error', err);
});
