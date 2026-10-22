import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <p className="eyebrow">404</p>
      <h1 className="mt-2 text-5xl">This page has wandered off</h1>
      <p className="mt-3 text-muted">The link may be old, or the piece may have sold out. Try searching instead.</p>
      <form action="/search" className="mx-auto mt-8 flex max-w-sm">
        <input name="q" className="field rounded-e-none" placeholder="Search the collection" aria-label="Search" />
        <button className="btn btn-primary rounded-s-none">Search</button>
      </form>
      <div className="mt-6 flex justify-center gap-3">
        <Link href="/" className="btn btn-secondary">Home</Link>
        <Link href="/collections/new-arrivals" className="btn btn-secondary">New arrivals</Link>
      </div>
    </div>
  );
}
