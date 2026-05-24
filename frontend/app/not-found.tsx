import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <p className="text-7xl font-extrabold text-brand">404</p>
      <h1 className="mt-4 text-2xl font-extrabold text-zinc-900">Page not found</h1>
      <p className="mt-2 text-sm text-zinc-500">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <div className="mt-8 flex gap-4">
        <Link
          href="/"
          className="rounded-2xl bg-brand px-6 py-3 text-sm font-extrabold text-white hover:bg-brand-dark"
        >
          Back to Home
        </Link>
        <Link
          href="/shop"
          className="rounded-2xl border border-zinc-200 px-6 py-3 text-sm font-extrabold text-zinc-700 hover:bg-zinc-50"
        >
          Browse Designs
        </Link>
      </div>
    </div>
  );
}
