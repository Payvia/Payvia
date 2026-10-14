import { Suspense } from "react";

type PlaceholderProps = {
  title: string;
  /** Design files this route will be built from. */
  designs: string;
  params?: Promise<{ id: string }>;
};

/** Stand-in for screens that are not built yet. Removed as each phase lands. */
export function Placeholder({ title, designs, params }: PlaceholderProps) {
  return (
    <div className="rounded-card border border-dashed border-line p-6 text-sm text-muted">
      <h1 className="text-xl text-ink">{title}</h1>
      <p className="mt-1">Not built yet. Designs: {designs}</p>
      {params ? (
        <Suspense fallback={null}>
          <RouteId params={params} />
        </Suspense>
      ) : null}
    </div>
  );
}

async function RouteId({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <p className="mt-3 font-mono text-xs">
      id: <span className="text-ink">{id}</span>
    </p>
  );
}
