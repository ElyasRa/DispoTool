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
    // Create users table with updated schema based on Pflichtenheft
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        vorname VARCHAR(255) NOT NULL,
        benutzername VARCHAR(255) UNIQUE NOT NULL,
        passwort VARCHAR(255) NOT NULL,
        rolle VARCHAR(50) NOT NULL DEFAULT 'disponent',
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Migrate existing users table to new schema if needed
    // Add missing columns for backward compatibility
    await pool.query(`
      DO $$
      BEGIN
        -- Add vorname column if not exists
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'vorname') THEN
          ALTER TABLE users ADD COLUMN vorname VARCHAR(255) DEFAULT '';
        END IF;
        
        -- Add benutzername column if not exists (migrate from username)
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'benutzername') THEN
          ALTER TABLE users ADD COLUMN benutzername VARCHAR(255);
          UPDATE users SET benutzername = COALESCE(username, email) WHERE benutzername IS NULL;
          ALTER TABLE users ALTER COLUMN benutzername SET NOT NULL;
          ALTER TABLE users ADD CONSTRAINT users_benutzername_unique UNIQUE (benutzername);
        END IF;
        
        -- Add passwort column if not exists (migrate from password_hash)
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'passwort') THEN
          ALTER TABLE users ADD COLUMN passwort VARCHAR(255);
          UPDATE users SET passwort = password_hash WHERE passwort IS NULL;
          ALTER TABLE users ALTER COLUMN passwort SET NOT NULL;
        END IF;
        
        -- Rename role to rolle if rolle doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'rolle') THEN
          ALTER TABLE users ADD COLUMN rolle VARCHAR(50) DEFAULT 'disponent';
          UPDATE users SET rolle = role WHERE rolle = 'disponent';
        END IF;
        
        -- Add status column if not exists
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'status') THEN
          ALTER TABLE users ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'active';
        END IF;
      END $$;
    `);

    console.log('Users table initialized');

    // Create monteure (technicians) table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS monteure (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        vorname VARCHAR(255) NOT NULL,
        region VARCHAR(255) NOT NULL,
        telefonnummer VARCHAR(50) NOT NULL,
        telegram_chat_id VARCHAR(255),
        provision_pro_auftrag DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
        gps_latitude DECIMAL(10, 8),
        gps_longitude DECIMAL(11, 8),
        status VARCHAR(20) NOT NULL DEFAULT 'active'
      )
    `);

    console.log('Monteure table initialized');

    // Create auftraege (orders) table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS auftraege (
        id SERIAL PRIMARY KEY,
        auftragsnummer VARCHAR(20) UNIQUE NOT NULL,
        gewerk VARCHAR(50) NOT NULL,
        region VARCHAR(255) NOT NULL,
        auftraggeber_typ VARCHAR(20) NOT NULL,
        name VARCHAR(255) NOT NULL,
        vorname VARCHAR(255) NOT NULL,
        telefon VARCHAR(50) NOT NULL,
        strasse VARCHAR(255) NOT NULL,
        hausnummer VARCHAR(20) NOT NULL,
        plz VARCHAR(10) NOT NULL,
        stadt VARCHAR(255) NOT NULL,
        latitude DECIMAL(10, 8),
        longitude DECIMAL(11, 8),
        status VARCHAR(50) NOT NULL DEFAULT 'Neu',
        erstellt_am TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        zugewiesen_an INTEGER REFERENCES monteure(id),
        erledigt_am TIMESTAMP
      )
    `);

    console.log('Auftraege table initialized');

    // Create abrechnungen (settlements) table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS abrechnungen (
        id SERIAL PRIMARY KEY,
        monteur_id INTEGER NOT NULL REFERENCES monteure(id),
        zeitraum_von DATE NOT NULL,
        zeitraum_bis DATE NOT NULL,
        summe_auftraege INTEGER NOT NULL DEFAULT 0,
        provision DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
        endsumme DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
        pdf_pfad VARCHAR(500) NOT NULL,
        bezahlt BOOLEAN NOT NULL DEFAULT FALSE
      )
    `);

    console.log('Abrechnungen table initialized');

    // Create umsatz (revenue) table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS umsatz (
        id SERIAL PRIMARY KEY,
        auftrag_id INTEGER NOT NULL REFERENCES auftraege(id),
        betrag DECIMAL(10, 2) NOT NULL,
        korrekturvermerk VARCHAR(500),
        eingetragen_am TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('Umsatz table initialized');
    console.log('Database schema initialized successfully');

    // Seed admin user if not exists
    const adminCheck = await pool.query('SELECT id FROM users WHERE benutzername = $1', ['admin']);
    if (adminCheck.rows.length === 0) {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash('admin123', salt);
      await pool.query(
        'INSERT INTO users (name, vorname, benutzername, passwort, rolle, status) VALUES ($1, $2, $3, $4, $5, $6)',
        ['Administrator', 'System', 'admin', passwordHash, 'admin', 'active']
      );
      console.log('Admin user seeded: benutzername=admin, password=admin123');
    }
  } catch (error) {
    console.error('Database initialization error:', error);
  }
};

export default pool;
