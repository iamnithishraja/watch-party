import { Router } from 'express';
import {
  createRoomHandler,
  getRoomHandler,
  joinRoomHandler,
  sendRoomMessageHandler,
  updateRoomMediaHandler,
} from '../controllers/roomController.js';

const router = Router();

router.post('/', createRoomHandler);
router.get('/:roomId', getRoomHandler);
router.post('/:roomId/join', joinRoomHandler);
router.post('/:roomId/messages', sendRoomMessageHandler);
router.patch('/:roomId/media', updateRoomMediaHandler);

export default router;
