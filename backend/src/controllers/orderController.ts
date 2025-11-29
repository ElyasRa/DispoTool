import { Request, Response } from 'express';
import { query } from '../config/db';
import { sendOrderAssignment } from '../services/telegramService';
import { Auftrag, Monteur } from '../types/models';

/**
 * Get all orders
 */
export const getAllOrders = async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await query(
      `SELECT a.*, m.name as monteur_name, m.vorname as monteur_vorname 
       FROM auftraege a 
       LEFT JOIN monteure m ON a.zugewiesen_an = m.id 
       ORDER BY a.erstellt_am DESC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
};

/**
 * Get orders by status
 */
export const getOrdersByStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status } = req.params;
    const result = await query(
      `SELECT a.*, m.name as monteur_name, m.vorname as monteur_vorname 
       FROM auftraege a 
       LEFT JOIN monteure m ON a.zugewiesen_an = m.id 
       WHERE a.status = $1 
       ORDER BY a.erstellt_am DESC`,
      [status]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching orders by status:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
};

/**
 * Get a single order by ID
 */
export const getOrderById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await query(
      `SELECT a.*, m.name as monteur_name, m.vorname as monteur_vorname 
       FROM auftraege a 
       LEFT JOIN monteure m ON a.zugewiesen_an = m.id 
       WHERE a.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
};

/**
 * Create a new order
 */
export const createOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      gewerk,
      region,
      auftraggeber_typ,
      name,
      vorname,
      telefon,
      strasse,
      hausnummer,
      plz,
      stadt,
      latitude,
      longitude,
    } = req.body;

    // Validate required fields
    if (!gewerk || !region || !auftraggeber_typ || !name || !vorname || !telefon || !strasse || !hausnummer || !plz || !stadt) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    // Generate order number: YYYYMMDD-XXXXX
    const today = new Date();
    const datePrefix = today.toISOString().slice(0, 10).replace(/-/g, '');
    
    // Get the count of orders for today to generate sequence number
    const countResult = await query(
      `SELECT COUNT(*) FROM auftraege WHERE auftragsnummer LIKE $1`,
      [`${datePrefix}-%`]
    );
    const sequenceNumber = (parseInt(countResult.rows[0].count) + 1).toString().padStart(5, '0');
    const auftragsnummer = `${datePrefix}-${sequenceNumber}`;

    const result = await query(
      `INSERT INTO auftraege (
        auftragsnummer, gewerk, region, auftraggeber_typ, name, vorname, 
        telefon, strasse, hausnummer, plz, stadt, latitude, longitude, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) 
      RETURNING *`,
      [
        auftragsnummer,
        gewerk,
        region,
        auftraggeber_typ,
        name,
        vorname,
        telefon,
        strasse,
        hausnummer,
        plz,
        stadt,
        latitude || null,
        longitude || null,
        'Neu',
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
};

/**
 * Assign an order to a Monteur
 */
export const assignOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { monteur_id } = req.body;

    if (!monteur_id) {
      res.status(400).json({ error: 'monteur_id is required' });
      return;
    }

    // Check if order exists
    const orderResult = await query('SELECT * FROM auftraege WHERE id = $1', [id]);
    if (orderResult.rows.length === 0) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    // Check if monteur exists
    const monteurResult = await query('SELECT * FROM monteure WHERE id = $1', [monteur_id]);
    if (monteurResult.rows.length === 0) {
      res.status(404).json({ error: 'Monteur not found' });
      return;
    }

    const monteur: Monteur = monteurResult.rows[0];

    // Update order status and assign monteur
    const updateResult = await query(
      `UPDATE auftraege 
       SET status = 'Zugewiesen', zugewiesen_an = $1 
       WHERE id = $2 
       RETURNING *`,
      [monteur_id, id]
    );

    const updatedOrder: Auftrag = updateResult.rows[0];

    // Send Telegram notification if monteur has chat_id
    let telegramSent = false;
    if (monteur.telegram_chat_id) {
      try {
        await sendOrderAssignment(monteur.telegram_chat_id, updatedOrder);
        telegramSent = true;
      } catch (telegramError) {
        // Log the error but don't fail the assignment
        console.error('Failed to send Telegram notification:', telegramError);
      }
    }

    res.json({
      message: 'Order assigned successfully',
      order: updatedOrder,
      telegram_sent: telegramSent,
    });
  } catch (error) {
    console.error('Error assigning order:', error);
    res.status(500).json({ error: 'Failed to assign order' });
  }
};

/**
 * Update order status
 */
export const updateOrderStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['Neu', 'Zugewiesen', 'Angenommen', 'Erledigt', 'Storno', 'Abgelehnt'];
    if (!validStatuses.includes(status)) {
      res.status(400).json({ error: 'Invalid status' });
      return;
    }

    const updateData: Record<string, unknown> = { status };
    
    // If status is 'Erledigt', set erledigt_am
    if (status === 'Erledigt') {
      updateData.erledigt_am = new Date();
    }

    let queryText = 'UPDATE auftraege SET status = $1';
    const params: unknown[] = [status];

    if (status === 'Erledigt') {
      queryText += ', erledigt_am = $2 WHERE id = $3 RETURNING *';
      params.push(new Date(), id);
    } else {
      queryText += ' WHERE id = $2 RETURNING *';
      params.push(id);
    }

    const result = await query(queryText, params);

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ error: 'Failed to update order status' });
  }
};

export default {
  getAllOrders,
  getOrdersByStatus,
  getOrderById,
  createOrder,
  assignOrder,
  updateOrderStatus,
};
