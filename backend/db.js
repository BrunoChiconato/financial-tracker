/**
 * Database Connection Module
 *
 * Manages PostgreSQL connection pool for the Financial Tracker API.
 * All database credentials are loaded from environment variables.
 */

import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'finance',
  user: process.env.DB_USER || 'finance',
  password: process.env.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(1);
});

/**
 * Executes a SQL query with parameters.
 *
 * @param {string} text - The SQL query text
 * @param {Array} params - Query parameters
 * @returns {Promise<pg.QueryResult>} Query result
 */
export const query = (text, params) => pool.query(text, params);

/**
 * Gets a client from the pool for transaction management.
 * Remember to release the client after use.
 *
 * @returns {Promise<pg.PoolClient>} Database client
 */
export const getClient = () => pool.connect();

/**
 * Tests database connectivity.
 *
 * @returns {Promise<boolean>} True if connection successful
 */
export const testConnection = async () => {
  try {
    const result = await query('SELECT NOW()');
    console.log('✓ Database connected at:', result.rows[0].now);
    return true;
  } catch (error) {
    console.error('✗ Database connection failed:', error.message);
    return false;
  }
};

export default pool;
