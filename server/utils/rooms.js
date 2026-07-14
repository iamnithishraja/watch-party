import { randomUUID } from 'node:crypto';
import { customAlphabet } from 'nanoid';

const createRoomId = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 8);
const rooms = new Map();

export function createRoom({ hostName }) {
  const roomId = createRoomId();
  const host = {
    id: randomUUID(),
    name: hostName?.trim() || 'Host',
    role: 'host',
    micMuted: false,
  };

  const room = {
    id: roomId,
    hostId: host.id,
    participants: [host],
    messages: [],
    media: {
      mode: 'idle',
      youtubeEmbedUrl: '',
      youtubeVideoId: '',
      youtubeIsPlaying: false,
      youtubeCurrentTime: 0,
      youtubeUpdatedAt: 0,
      sharedBy: '',
      sharedByParticipantId: '',
    },
    createdAt: new Date().toISOString(),
  };

  rooms.set(roomId, room);
  return room;
}

export function getRoom(roomId) {
  return rooms.get(roomId?.trim().toUpperCase());
}

export function joinRoom({ roomId, name }) {
  const room = getRoom(roomId);

  if (!room) {
    return null;
  }

  const participant = {
    id: randomUUID(),
    name: name?.trim() || 'Guest',
    role: 'participant',
    micMuted: false,
  };

  room.participants.push(participant);
  return { room, participant };
}

export function serializeRoom(room) {
  return {
    id: room.id,
    hostId: room.hostId,
    participants: room.participants,
    participantCount: room.participants.length,
    messages: room.messages,
    media: room.media,
    createdAt: room.createdAt,
  };
}

export function addRoomMessage({ roomId, participantId, text }) {
  const room = getRoom(roomId);
  const participant = room?.participants.find((user) => user.id === participantId);

  if (!room || !participant || !text?.trim()) {
    return null;
  }

  const message = {
    id: randomUUID(),
    participantId,
    username: participant.name,
    text: text.trim().slice(0, 500),
    createdAt: new Date().toISOString(),
  };

  room.messages.push(message);
  room.messages = room.messages.slice(-100);
  return { room, message };
}

export function updateRoomMedia({ roomId, participantId, media }) {
  const room = getRoom(roomId);
  const participant = room?.participants.find((user) => user.id === participantId);

  if (!room || !participant) {
    return null;
  }

  if (media.mode === 'idle') {
    room.media = {
      mode: 'idle',
      youtubeEmbedUrl: '',
      youtubeVideoId: '',
      youtubeIsPlaying: false,
      youtubeCurrentTime: 0,
      youtubeUpdatedAt: 0,
      sharedBy: '',
      sharedByParticipantId: '',
    };
    return room;
  }

  if (media.mode === 'youtube') {
    if (participant.role !== 'host' && participant.id !== room.hostId) {
      return null;
    }

    room.media = {
      mode: 'youtube',
      youtubeEmbedUrl: media.youtubeVideoId
        ? `https://www.youtube.com/embed/${media.youtubeVideoId}`
        : media.youtubeEmbedUrl || '',
      youtubeVideoId: media.youtubeVideoId || '',
      youtubeIsPlaying: media.youtubeIsPlaying ?? false,
      youtubeCurrentTime: media.youtubeCurrentTime ?? 0,
      youtubeUpdatedAt: media.youtubeUpdatedAt ?? Date.now(),
      sharedBy: participant.name,
      sharedByParticipantId: participant.id,
    };
    return room;
  }

  room.media = {
    mode: media.mode,
    youtubeEmbedUrl: '',
    youtubeVideoId: '',
    youtubeIsPlaying: false,
    youtubeCurrentTime: 0,
    youtubeUpdatedAt: 0,
    sharedBy: participant.name,
    sharedByParticipantId: participant.id,
  };

  return room;
}

export function updateYoutubePlayback({ roomId, action, currentTime, videoId }) {
  const room = getRoom(roomId);

  if (!room) {
    return null;
  }

  const now = Date.now();

  if (videoId) {
    room.media.youtubeVideoId = videoId;
    room.media.youtubeEmbedUrl = `https://www.youtube.com/embed/${videoId}`;
    room.media.mode = 'youtube';
  }

  room.media.youtubeCurrentTime = currentTime;
  room.media.youtubeUpdatedAt = now;

  if (action === 'play') {
    room.media.youtubeIsPlaying = true;
  } else if (action === 'pause') {
    room.media.youtubeIsPlaying = false;
  } else if (action === 'load') {
    room.media.youtubeIsPlaying = false;
    room.media.youtubeCurrentTime = 0;
    room.media.youtubeUpdatedAt = now;
  }

  return room;
}
