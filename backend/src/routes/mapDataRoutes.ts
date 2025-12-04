import { Router } from 'express';
import { getMapData } from '../controllers/mapDataController';

const router = Router();

// GET /api/map-data - Get map data for drivers and orders
router.get('/', getMapData);

export default router;
