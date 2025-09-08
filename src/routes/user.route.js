import * as userController from '../controllers/user.controller.js';
import express from 'express';
const router = express.Router();

router.get('/', userController.getAllUsers);

// You can add more routes if needed in future:
// router.post('/', userController.createUser);
// router.get('/:id', userController.getUser);
// router.put('/:id', userController.updateUser);
// router.delete('/:id', userController.deleteUser);

export default router;