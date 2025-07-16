import express from 'express';
import {
  getPlansByUserType,
  addDefaultPlans
} from '../controllers/subscription.controller.js';


const router = express.Router();


router.get('/:type', getPlansByUserType);


// ✅ Add this route
router.post('/add-defaults', addDefaultPlans);


export default router;


