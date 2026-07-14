const API_URL = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:4000';

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Request failed');
  }

  return data;
}

export function createRoom(name) {
  return request('/api/rooms', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}

export function getRoom(roomId) {
  return request(`/api/rooms/${roomId}`);
}

export function joinRoom(roomId, name) {
  return request(`/api/rooms/${roomId}/join`, {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}

export function sendRoomMessage(roomId, participantId, text) {
  return request(`/api/rooms/${roomId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ participantId, text }),
  });
}

export function updateRoomMedia(roomId, participantId, media) {
  return request(`/api/rooms/${roomId}/media`, {
    method: 'PATCH',
    body: JSON.stringify({ participantId, media }),
  });
}
