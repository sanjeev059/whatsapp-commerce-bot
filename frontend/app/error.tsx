"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <p className="text-5xl font-extrabold text-zinc-300">Oops</p>
      <h1 className="mt-4 text-2xl font-extrabold text-zinc-900">Something went wrong</h1>
      <p className="mt-2 text-sm text-zinc-500">
        We hit an unexpected error. Try again or head back home.
      </p>
      <div className="mt-8 flex gap-4">
        <button
          onClick={reset}
          className="rounded-2xl bg-brand px-6 py-3 text-sm font-extrabold text-white hover:bg-brand-dark"
        >
          Try Again
        </button>
        <Link
          href="/"
          className="rounded-2xl border border-zinc-200 px-6 py-3 text-sm font-extrabold text-zinc-700 hover:bg-zinc-50"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}
