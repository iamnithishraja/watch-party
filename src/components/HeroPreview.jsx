function ParticipantTile({ name, color, speaking = false }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.06] p-3">
      <div
        className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-bold text-midnight"
        style={{ backgroundColor: color }}
      >
        {name.charAt(0)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-white">{name}</p>
        <div className="mt-1 flex h-2 items-center gap-1">
          {[0, 1, 2].map((bar) => (
            <span
              className={`h-1.5 rounded-full bg-accent ${speaking ? 'animate-pulseLine' : 'opacity-30'}`}
              key={bar}
              style={{ width: `${18 + bar * 8}px`, animationDelay: `${bar * 140}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function HeroPreview() {
  return (
    <div className="relative mx-auto w-full max-w-2xl animate-float overflow-hidden rounded-lg border border-white/10 bg-panel/80 shadow-2xl shadow-black/40 backdrop-blur">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-coral" />
          <span className="h-3 w-3 rounded-full bg-amber-300" />
          <span className="h-3 w-3 rounded-full bg-accent" />
        </div>
        <div className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-300">
          Room K7X9Q2M4
        </div>
      </div>

      <div className="grid gap-0 lg:grid-cols-[1fr_220px]">
        <div className="screen-grid relative min-h-[330px] overflow-hidden bg-[#0d111f] p-5">
          <div className="absolute inset-y-0 left-0 h-full w-24 bg-gradient-to-r from-transparent via-accent/10 to-transparent blur-sm animate-sweep" />
          <div className="relative flex h-full flex-col justify-between rounded-lg border border-white/10 bg-black/30 p-5">
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-accent/15 px-3 py-1 text-xs font-medium text-accent">
                Screen sharing
              </span>
              <span className="text-xs text-slate-400">Live</span>
            </div>

            <div className="mx-auto w-full max-w-sm">
              <div className="rounded-lg border border-white/10 bg-white/[0.08] p-4">
                <div className="mb-4 h-3 w-24 rounded-full bg-white/20" />
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2 h-24 rounded-md bg-iris/35" />
                  <div className="h-24 rounded-md bg-coral/35" />
                  <div className="h-16 rounded-md bg-accent/30" />
                  <div className="col-span-2 h-16 rounded-md bg-white/15" />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3">
              <span className="h-10 w-10 rounded-full border border-white/10 bg-white/10" />
              <span className="h-10 w-10 rounded-full bg-coral/90" />
              <span className="h-10 w-10 rounded-full border border-white/10 bg-white/10" />
            </div>
          </div>
        </div>

        <aside className="border-t border-white/10 bg-[#101522] p-4 lg:border-l lg:border-t-0">
          <p className="mb-3 text-sm font-semibold text-white">Participants</p>
          <div className="space-y-3">
            <ParticipantTile name="Animesh" color="#75f4d3" speaking />
            <ParticipantTile name="Kripa" color="#8ea4ff" />
            {/* <ParticipantTile name="Diyansh" color="#ffcf6e" speaking /> */}
          </div>
        </aside>
      </div>
    </div>
  );
}

export default HeroPreview;
