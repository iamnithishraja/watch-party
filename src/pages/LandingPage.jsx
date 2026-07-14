import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import BrandLogo from '../components/BrandLogo.jsx';
import HeroPreview from '../components/HeroPreview.jsx';
import { createRoom, joinRoom } from '../services/api.js';
import { useRoomStore } from '../store/roomStore.js';

function LandingPage() {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const guestName = useRoomStore((state) => state.guestName);
  const roomCode = useRoomStore((state) => state.roomCode);
  const setGuestName = useRoomStore((state) => state.setGuestName);
  const setRoomCode = useRoomStore((state) => state.setRoomCode);
  const setSession = useRoomStore((state) => state.setSession);

  const handleCreateRoom = async () => {
    setError('');
    setIsBusy(true);

    try {
      const session = await createRoom(guestName);
      setSession(session);
      navigate(`/room/${session.room.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsBusy(false);
    }
  };

  const handleJoinRoom = async (event) => {
    event.preventDefault();
    setError('');

    if (!roomCode) {
      setError('Enter a room code to join.');
      return;
    }

    setIsBusy(true);

    try {
      const session = await joinRoom(roomCode, guestName);
      setSession(session);
      navigate(`/room/${session.room.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <main className="min-h-screen overflow-hidden bg-midnight text-slate-100">
      <div className="absolute inset-0 -z-0 bg-[linear-gradient(130deg,rgba(142,164,255,0.12),transparent_30%,rgba(117,244,211,0.1)_65%,transparent),linear-gradient(180deg,rgba(255,255,255,0.04),transparent_42%)]" />
      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 py-5 sm:px-8 lg:px-10">
        <header className="py-3">
          <BrandLogo />
        </header>

        <section className="grid flex-1 items-center gap-12 py-12 lg:grid-cols-[0.9fr_1.1fr] lg:py-16">
          <div className="max-w-2xl">
            <p className="mb-5 inline-flex rounded-full border border-accent/30 bg-accent/10 px-4 py-2 text-sm font-medium text-accent">
              Browser screen share rooms for movie nights and watch sessions
            </p>
            <h1 className="max-w-3xl text-5xl font-bold leading-tight text-white sm:text-6xl lg:text-7xl">
              Watch Party
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300">
              Create a private room, share your screen through the browser, and
              keep everyone together with voice, chat, and participant controls.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <label className="sr-only" htmlFor="guest-name">
                Display name
              </label>
              <input
                className="min-w-0 rounded-lg border border-white/10 bg-white/[0.07] px-4 py-3 text-sm font-semibold text-white placeholder:text-slate-500 sm:w-40"
                id="guest-name"
                maxLength={24}
                onChange={(event) => setGuestName(event.target.value)}
                placeholder="Your name"
                value={guestName}
              />
              <button
                className="rounded-lg bg-accent px-6 py-3 text-base font-bold text-midnight shadow-glow transition hover:-translate-y-0.5 hover:bg-[#8dffe2]"
                disabled={isBusy}
                onClick={handleCreateRoom}
                type="button"
              >
                {isBusy ? 'Working...' : 'Create Room'}
              </button>
              <form className="flex min-w-0 flex-1 gap-3" onSubmit={handleJoinRoom}>
                <label className="sr-only" htmlFor="room-code">
                  Room code
                </label>
                <input
                  className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/[0.07] px-4 py-3 text-sm font-semibold uppercase text-white placeholder:text-slate-500"
                  id="room-code"
                  maxLength={12}
                  onChange={(event) => setRoomCode(event.target.value)}
                  placeholder="Enter code"
                  value={roomCode}
                />
                <button
                  className="rounded-lg border border-white/10 px-5 py-3 text-sm font-bold text-white transition hover:border-white/25 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isBusy}
                  type="submit"
                >
                  Join
                </button>
              </form>
            </div>

            {error ? (
              <div className="mt-4 max-w-xl rounded-lg border border-coral/40 bg-coral/10 px-4 py-3 text-sm text-coral">
                {error}
              </div>
            ) : null}

            <div className="mt-10 grid max-w-xl grid-cols-3 gap-4 border-t border-white/10 pt-6 text-sm text-slate-400">
              <div>
                <p className="text-2xl font-bold text-white">P2P</p>
                <p>WebRTC ready</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-white">No APIs</p>
                <p>Screen share only</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-white">Live</p>
                <p>Voice and chat path</p>
              </div>
            </div>
          </div>

          <HeroPreview />
        </section>
      </div>
    </main>
  );
}

export default LandingPage;
