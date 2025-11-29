import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../config/db';

const router = Router();

// JWT_SECRET must be set in production
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('JWT_SECRET environment variable must be set in production');
}
const jwtSecret = JWT_SECRET || 'dev-secret-key-do-not-use-in-production';

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Username validation regex (alphanumeric and underscores, 3-30 chars)
const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,30}$/;

// Register endpoint
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { username, email, password, name, vorname } = req.body;

    // Validate input
    if (!username || !password || !name) {
      res.status(400).json({ error: 'Username, password, and name are required' });
      return;
    }

    // Validate username format
    if (!USERNAME_REGEX.test(username)) {
      res.status(400).json({ error: 'Username must be 3-30 characters and contain only letters, numbers, and underscores' });
      return;
    }

    // Validate email format if provided
    if (email && !EMAIL_REGEX.test(email)) {
      res.status(400).json({ error: 'Invalid email format' });
      return;
    }

    // Validate password strength
    if (password.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters' });
      return;
    }

    // Check if username already exists
    const existingUsername = await query('SELECT id FROM users WHERE benutzername = $1', [username]);
    if (existingUsername.rows.length > 0) {
      res.status(409).json({ error: 'Username is already taken' });
      return;
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Insert user into database using new schema
    const result = await query(
      'INSERT INTO users (benutzername, name, vorname, passwort, rolle, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, benutzername, name, vorname, rolle, status',
      [username, name, vorname || '', passwordHash, 'disponent', 'active']
    );

    const user = result.rows[0];

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, username: user.benutzername, role: user.rolle },
      jwtSecret,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user.id,
        username: user.benutzername,
        name: user.name,
        vorname: user.vorname,
        role: user.rolle,
        status: user.status,
      },
      token,
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login endpoint
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
      res.status(400).json({ error: 'Username and password are required' });
      return;
    }

    // Find user by username (using new column name benutzername)
    const result = await query(
      'SELECT id, benutzername, passwort, name, vorname, rolle, status FROM users WHERE benutzername = $1',
      [username]
    );

    if (result.rows.length === 0) {
      res.status(401).json({ error: 'Invalid username or password' });
      return;
    }

    const user = result.rows[0];

    // Check if user is active
    if (user.status === 'inactive') {
      res.status(401).json({ error: 'User account is inactive' });
      return;
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwort);
    if (!isValidPassword) {
      res.status(401).json({ error: 'Invalid username or password' });
      return;
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, username: user.benutzername, role: user.rolle },
      jwtSecret,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        username: user.benutzername,
        name: user.name,
        vorname: user.vorname,
        role: user.rolle,
        status: user.status,
      },
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
