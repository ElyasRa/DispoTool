import { Pool } from 'pg';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'dispo_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

// Test database connection
pool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  // Log the error but don't exit immediately to allow for graceful recovery
  // In production, implement retry logic or health check monitoring
});

export const query = (text: string, params?: unknown[]) => pool.query(text, params);

// Initialize database schema and seed admin user
export const initializeDatabase = async () => {
  try {
    // Create users table if not exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add username column if not exists
    await pool.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(255) UNIQUE
    `);

    console.log('Database schema initialized');

    // Seed admin user if not exists
    const adminCheck = await pool.query('SELECT id FROM users WHERE username = $1', ['admin']);
    if (adminCheck.rows.length === 0) {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash('admin123', salt);
      await pool.query(
        'INSERT INTO users (username, email, password_hash, name, role) VALUES ($1, $2, $3, $4, $5)',
        ['admin', 'admin@dispotool.local', passwordHash, 'Administrator', 'admin']
      );
      console.log('Admin user seeded: username=admin, password=admin123');
    }
  } catch (error) {
    console.error('Database initialization error:', error);
  }
};

export default pool;
