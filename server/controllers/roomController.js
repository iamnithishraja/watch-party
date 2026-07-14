import {
  addRoomMessage,
  createRoom,
  getRoom,
  joinRoom,
  serializeRoom,
  updateRoomMedia,
} from '../utils/rooms.js';

export function createRoomHandler(req, res) {
  const room = createRoom({ hostName: req.body?.name });

  res.status(201).json({
    room: serializeRoom(room),
    participant: room.participants[0],
  });
}

export function getRoomHandler(req, res) {
  const room = getRoom(req.params.roomId);

  if (!room) {
    return res.status(404).json({ message: 'Room not found' });
  }

  return res.json({ room: serializeRoom(room) });
}

export function joinRoomHandler(req, res) {
  const result = joinRoom({
    roomId: req.params.roomId,
    name: req.body?.name,
  });

  if (!result) {
    return res.status(404).json({ message: 'Room not found' });
  }

  return res.status(200).json({
    room: serializeRoom(result.room),
    participant: result.participant,
  });
}

export function sendRoomMessageHandler(req, res) {
  const result = addRoomMessage({
    roomId: req.params.roomId,
    participantId: req.body?.participantId,
    text: req.body?.text,
  });

  if (!result) {
    return res.status(400).json({ message: 'Unable to send message' });
  }

  const room = serializeRoom(result.room);
  req.app.get('io')?.to(result.room.id).emit('room:updated', { room });

  return res.status(201).json({ room, message: result.message });
}

export function updateRoomMediaHandler(req, res) {
  const result = updateRoomMedia({
    roomId: req.params.roomId,
    participantId: req.body?.participantId,
    media: req.body?.media,
  });

  if (!result) {
    return res.status(400).json({ message: 'Unable to update room media' });
  }

  const room = serializeRoom(result);
  req.app.get('io')?.to(result.id).emit('room:updated', { room });

  return res.status(200).json({ room });
}
