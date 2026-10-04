// Shown instantly while the boards server-render, so switching tabs never
// leaves the old page frozen with no feedback.
export default function LeaderboardsLoading() {
  return (
    <div className="mx-auto max-w-2xl animate-pulse">
      <div className="mb-6">
        <div className="h-4 w-28 rounded bg-[#3c2d0f]/10" />
        <div className="mt-2 h-8 w-48 rounded-lg bg-[#3c2d0f]/10" />
        <div className="mt-2 h-4 w-full max-w-md rounded bg-[#3c2d0f]/10" />
      </div>
      <div className="panel p-6">
        <div className="h-4 w-40 rounded bg-gold/20" />
        <div className="mt-4 flex items-center gap-4">
          <div className="h-14 w-14 rounded-full bg-[#3c2d0f]/10" />
          <div className="flex-1 space-y-2">
            <div className="h-5 w-1/3 rounded bg-[#3c2d0f]/10" />
            <div className="h-4 w-1/2 rounded bg-[#3c2d0f]/10" />
          </div>
        </div>
      </div>
      <div className="panel mt-5 space-y-2 p-4 sm:p-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-xl border border-[#3c2d0f]/10 px-3 py-2.5">
            <div className="h-7 w-7 rounded-lg bg-[#3c2d0f]/10" />
            <div className="h-8 w-8 rounded-full bg-[#3c2d0f]/10" />
            <div className="h-4 flex-1 rounded bg-[#3c2d0f]/10" />
            <div className="h-4 w-16 rounded bg-gold/20" />
          </div>
        ))}
      </div>
    </div>
  );
}
