function BrandLogo() {
  return (
    <div className="flex items-center gap-3" aria-label="Watch Party">
      <div className="grid h-10 w-10 place-items-center rounded-lg border border-white/10 bg-white/10 shadow-glow">
        <div className="h-4 w-5 rounded-sm border-2 border-accent">
          <div className="mx-auto mt-1 h-1 w-1 rounded-full bg-accent" />
        </div>
      </div>
      <span className="text-lg font-semibold text-white">Watch Party</span>
    </div>
  );
}

export default BrandLogo;
