import { Router } from 'express';
import {
  getAllOrders,
  getOrdersByStatus,
  getOrderById,
  createOrder,
  assignOrder,
  updateOrderStatus,
} from '../controllers/orderController';

const router = Router();

// GET /api/orders - Get all orders
router.get('/', getAllOrders);

// GET /api/orders/status/:status - Get orders by status
router.get('/status/:status', getOrdersByStatus);

// GET /api/orders/:id - Get a single order
router.get('/:id', getOrderById);

// POST /api/orders - Create a new order
router.post('/', createOrder);

// PUT /api/orders/:id/assign - Assign order to a monteur
router.put('/:id/assign', assignOrder);

// PUT /api/orders/:id/status - Update order status
router.put('/:id/status', updateOrderStatus);

export default router;
