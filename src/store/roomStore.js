import { create } from 'zustand';

export const useRoomStore = create((set) => ({
  guestName: '',
  roomCode: '',
  currentRoom: null,
  currentParticipant: null,
  setGuestName: (guestName) => set({ guestName }),
  setRoomCode: (roomCode) => set({ roomCode: roomCode.trim().toUpperCase() }),
  setSession: ({ room, participant }) =>
    set({ currentRoom: room, currentParticipant: participant, roomCode: room.id }),
  updateRoom: (room) => set({ currentRoom: room }),
}));
