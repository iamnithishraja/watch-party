import { Link, useParams } from 'react-router-dom';
import BrandLogo from '../components/BrandLogo.jsx';

function RoomPlaceholder() {
  const { roomId } = useParams();

  return (
    <main className="min-h-screen bg-midnight px-5 py-5 text-slate-100 sm:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-2.5rem)] max-w-5xl flex-col">
        <header className="flex items-center justify-between py-3">
          <BrandLogo />
          <Link
            className="rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-white/25 hover:bg-white/10"
            to="/"
          >
            Back
          </Link>
        </header>

        <section className="grid flex-1 place-items-center py-12">
          <div className="w-full max-w-xl rounded-lg border border-white/10 bg-panel/80 p-6 shadow-2xl shadow-black/30">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">
              Room route ready
            </p>
            <h1 className="mt-4 text-3xl font-bold text-white sm:text-4xl">
              Room {roomId}
            </h1>
            <p className="mt-4 leading-7 text-slate-300">
              This route is wired for the upcoming room flow. Server-backed room
              creation, joining, and real-time presence begin in the next
              milestone.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

export default RoomPlaceholder;
