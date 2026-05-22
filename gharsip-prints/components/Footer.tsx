export function Footer() {
  const items = [
    "Premium cotton",
    "Sharp print",
    "4–5 days delivery",
    "Easy returns",
  ];
  return (
    <footer className="mt-16 border-t border-zinc-200 bg-zinc-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-semibold uppercase tracking-wider text-zinc-500 sm:gap-8">
          {items.map((t) => (
            <span key={t}>{t}</span>
          ))}
        </div>
        <p className="mt-6 text-center text-xs text-zinc-400">
          © {new Date().getFullYear()} Gharsip Custom Prints. Bengaluru, India.
        </p>
      </div>
    </footer>
  );
}
