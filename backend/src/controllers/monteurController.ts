import { Request, Response } from 'express';
import { query } from '../config/db';

/**
 * Get all monteure (technicians)
 */
export const getAllMonteure = async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await query(
      `SELECT * FROM monteure ORDER BY name, vorname`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching monteure:', error);
    res.status(500).json({ error: 'Failed to fetch monteure' });
  }
};

/**
 * Get active monteure only
 */
export const getActiveMonteure = async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await query(
      `SELECT * FROM monteure WHERE status = 'active' ORDER BY name, vorname`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching active monteure:', error);
    res.status(500).json({ error: 'Failed to fetch active monteure' });
  }
};

/**
 * Get a single monteur by ID
 */
export const getMonteurById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await query('SELECT * FROM monteure WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Monteur not found' });
      return;
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching monteur:', error);
    res.status(500).json({ error: 'Failed to fetch monteur' });
  }
};

/**
 * Create a new monteur
 */
export const createMonteur = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      name,
      vorname,
      region,
      telefonnummer,
      telegram_chat_id,
      provision_pro_auftrag,
      gps_latitude,
      gps_longitude,
    } = req.body;

    // Validate required fields
    if (!name || !vorname || !region || !telefonnummer) {
      res.status(400).json({ error: 'Name, vorname, region, and telefonnummer are required' });
      return;
    }

    const result = await query(
      `INSERT INTO monteure (
        name, vorname, region, telefonnummer, telegram_chat_id, 
        provision_pro_auftrag, gps_latitude, gps_longitude, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
      RETURNING *`,
      [
        name,
        vorname,
        region,
        telefonnummer,
        telegram_chat_id || null,
        provision_pro_auftrag || 0,
        gps_latitude || null,
        gps_longitude || null,
        'active',
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating monteur:', error);
    res.status(500).json({ error: 'Failed to create monteur' });
  }
};

/**
 * Update a monteur
 */
export const updateMonteur = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      name,
      vorname,
      region,
      telefonnummer,
      telegram_chat_id,
      provision_pro_auftrag,
      gps_latitude,
      gps_longitude,
      status,
    } = req.body;

    const result = await query(
      `UPDATE monteure SET 
        name = COALESCE($1, name),
        vorname = COALESCE($2, vorname),
        region = COALESCE($3, region),
        telefonnummer = COALESCE($4, telefonnummer),
        telegram_chat_id = COALESCE($5, telegram_chat_id),
        provision_pro_auftrag = COALESCE($6, provision_pro_auftrag),
        gps_latitude = COALESCE($7, gps_latitude),
        gps_longitude = COALESCE($8, gps_longitude),
        status = COALESCE($9, status)
      WHERE id = $10 
      RETURNING *`,
      [
        name,
        vorname,
        region,
        telefonnummer,
        telegram_chat_id,
        provision_pro_auftrag,
        gps_latitude,
        gps_longitude,
        status,
        id,
      ]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Monteur not found' });
      return;
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating monteur:', error);
    res.status(500).json({ error: 'Failed to update monteur' });
  }
};

/**
 * Get monteure with their assigned order counts
 */
export const getMonteureWithStats = async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await query(`
      SELECT 
        m.*,
        COUNT(CASE WHEN a.status = 'Zugewiesen' THEN 1 END) as assigned_orders,
        COUNT(CASE WHEN a.status = 'Angenommen' THEN 1 END) as accepted_orders,
        COUNT(CASE WHEN a.status = 'Erledigt' THEN 1 END) as completed_orders
      FROM monteure m
      LEFT JOIN auftraege a ON m.id = a.zugewiesen_an
      WHERE m.status = 'active'
      GROUP BY m.id
      ORDER BY m.name, m.vorname
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching monteure with stats:', error);
    res.status(500).json({ error: 'Failed to fetch monteure with stats' });
  }
};

export default {
  getAllMonteure,
  getActiveMonteure,
  getMonteurById,
  createMonteur,
  updateMonteur,
  getMonteureWithStats,
};
