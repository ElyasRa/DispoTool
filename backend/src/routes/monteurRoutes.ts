import { Router } from 'express';
import {
  getAllMonteure,
  getActiveMonteure,
  getMonteurById,
  createMonteur,
  updateMonteur,
  getMonteureWithStats,
} from '../controllers/monteurController';

const router = Router();

// GET /api/monteure - Get all monteure
router.get('/', getAllMonteure);

// GET /api/monteure/active - Get active monteure only
router.get('/active', getActiveMonteure);

// GET /api/monteure/stats - Get monteure with assignment stats
router.get('/stats', getMonteureWithStats);

// GET /api/monteure/:id - Get a single monteur
router.get('/:id', getMonteurById);

// POST /api/monteure - Create a new monteur
router.post('/', createMonteur);

// PUT /api/monteure/:id - Update a monteur
router.put('/:id', updateMonteur);

export default router;
