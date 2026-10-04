// Shown instantly while the browse grid server-renders, so switching tabs
// never leaves the old page frozen with no feedback.
export default function BrowseLoading() {
  return (
    <div className="animate-pulse">
      <div className="mb-5">
        <div className="h-4 w-24 rounded bg-[#3c2d0f]/10" />
        <div className="mt-2 h-8 w-56 rounded-lg bg-[#3c2d0f]/10" />
        <div className="mt-2 h-4 w-20 rounded bg-[#3c2d0f]/10" />
      </div>
      <div className="panel-flat mb-6 h-16" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="panel-flat overflow-hidden">
            <div className="aspect-[4/3] bg-[#3c2d0f]/10" />
            <div className="space-y-2 p-4">
              <div className="h-4 w-3/4 rounded bg-[#3c2d0f]/10" />
              <div className="h-6 w-1/2 rounded bg-[#3c2d0f]/10" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
