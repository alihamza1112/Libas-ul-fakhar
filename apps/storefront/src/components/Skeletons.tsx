// Suspense fallbacks for routes that read live data (stock, orders) at request time.

export function GridSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10" aria-busy="true" aria-label="Loading">
      <div className="mx-auto mb-10 h-10 w-64 animate-pulse bg-sand" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 lg:gap-6">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i}>
            <div className="aspect-[4/5] animate-pulse bg-cream" />
            <div className="mt-3 h-3 w-3/4 animate-pulse bg-sand" />
            <div className="mt-2 h-3 w-1/3 animate-pulse bg-sand" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 md:grid-cols-[1.15fr_1fr]" aria-busy="true" aria-label="Loading">
      <div className="aspect-[4/5] animate-pulse bg-cream" />
      <div className="space-y-4">
        <div className="h-9 w-3/4 animate-pulse bg-sand" />
        <div className="h-5 w-1/4 animate-pulse bg-sand" />
        <div className="h-24 animate-pulse bg-cream" />
        <div className="h-12 animate-pulse bg-sand" />
      </div>
    </div>
  );
}

export function PanelSkeleton() {
  return <div className="h-64 animate-pulse bg-white" aria-busy="true" aria-label="Loading" />;
}
