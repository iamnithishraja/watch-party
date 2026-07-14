import {
  addRoomMessage,
  getRoom,
  serializeRoom,
  updateRoomMedia,
  updateYoutubePlayback,
} from '../utils/rooms.js';

const roomParticipantSockets = new Map();

function trackParticipantSocket(roomId, participantId, socketId) {
  if (!roomParticipantSockets.has(roomId)) {
    roomParticipantSockets.set(roomId, new Map());
  }

  roomParticipantSockets.get(roomId).set(participantId, socketId);
}

function untrackParticipantSocket(roomId, participantId) {
  roomParticipantSockets.get(roomId)?.delete(participantId);
}

function relayToParticipant(io, roomId, toParticipantId, event, payload) {
  const socketId = roomParticipantSockets.get(roomId)?.get(toParticipantId);
  if (!socketId) {
    return;
  }

  io.to(socketId).emit(event, payload);
}

export function registerSocketHandlers(io) {
  io.on('connection', (socket) => {
    socket.on('room:join', ({ roomId, participant }) => {
      const room = getRoom(roomId);

      if (!room || !participant?.id) {
        socket.emit('room:error', { message: 'Room not found' });
        return;
      }

      socket.join(room.id);
      socket.data.roomId = room.id;
      socket.data.participantId = participant.id;
      trackParticipantSocket(room.id, participant.id, socket.id);

      io.to(room.id).emit('room:updated', { room: serializeRoom(room) });
    });

    socket.on('webrtc:offer', ({ roomId, toParticipantId, sdp }) => {
      if (!socket.data.participantId || socket.data.roomId !== roomId) {
        return;
      }

      relayToParticipant(io, roomId, toParticipantId, 'webrtc:offer', {
        fromParticipantId: socket.data.participantId,
        sdp,
      });
    });

    socket.on('webrtc:answer', ({ roomId, toParticipantId, sdp }) => {
      if (!socket.data.participantId || socket.data.roomId !== roomId) {
        return;
      }

      relayToParticipant(io, roomId, toParticipantId, 'webrtc:answer', {
        fromParticipantId: socket.data.participantId,
        sdp,
      });
    });

    socket.on('webrtc:ice-candidate', ({ roomId, toParticipantId, candidate }) => {
      if (!socket.data.participantId || socket.data.roomId !== roomId) {
        return;
      }

      relayToParticipant(io, roomId, toParticipantId, 'webrtc:ice-candidate', {
        fromParticipantId: socket.data.participantId,
        candidate,
      });
    });

    socket.on('disconnect', () => {
      if (socket.data.roomId && socket.data.participantId) {
        untrackParticipantSocket(socket.data.roomId, socket.data.participantId);
      }
    });

    socket.on('youtube:playback', ({ roomId, action, currentTime, videoId }) => {
      if (!socket.data.participantId || socket.data.roomId !== roomId || !action) {
        return;
      }

      const allowedActions = new Set(['play', 'pause', 'seek', 'sync', 'load']);
      if (!allowedActions.has(action)) {
        return;
      }

      const room = getRoom(roomId);
      if (!room) {
        return;
      }

      // Only the host can load / change the video; anyone can control playback.
      if (action === 'load') {
        const participant = room.participants.find(
          (user) => user.id === socket.data.participantId,
        );
        if (!participant || (participant.role !== 'host' && participant.id !== room.hostId)) {
          return;
        }
      }

      const updated = updateYoutubePlayback({
        roomId,
        action,
        currentTime: Number(currentTime) || 0,
        videoId: action === 'load' ? videoId : room.media.youtubeVideoId,
      });

      if (!updated) {
        return;
      }

      socket.to(roomId).emit('youtube:playback', {
        fromParticipantId: socket.data.participantId,
        action,
        currentTime: updated.media.youtubeCurrentTime,
        updatedAt: updated.media.youtubeUpdatedAt,
        isPlaying: updated.media.youtubeIsPlaying,
        videoId: updated.media.youtubeVideoId,
      });

      if (action === 'load') {
        io.to(roomId).emit('room:updated', { room: serializeRoom(updated) });
      }
    });

    socket.on('chat:send', ({ roomId, participantId, text }) => {
      const result = addRoomMessage({ roomId, participantId, text });

      if (!result) {
        socket.emit('room:error', { message: 'Unable to send message' });
        return;
      }

      io.to(result.room.id).emit('chat:message', { message: result.message });
      io.to(result.room.id).emit('room:updated', { room: serializeRoom(result.room) });
    });

    socket.on('media:update', ({ roomId, participantId, media }) => {
      const room = updateRoomMedia({ roomId, participantId, media });

      if (!room) {
        socket.emit('room:error', { message: 'Unable to update room media' });
        return;
      }

      io.to(room.id).emit('room:updated', { room: serializeRoom(room) });
    });
  });
}
