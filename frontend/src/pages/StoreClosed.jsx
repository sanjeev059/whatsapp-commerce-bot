export default function StoreClosed() {
  return (
    <div className="min-h-[100dvh] flex items-center justify-center px-6 text-center" data-testid="store-closed">
      <div className="max-w-sm">
        <div className="w-20 h-20 rounded-full mx-auto flex items-center justify-center text-3xl" style={{ background: "rgba(244,63,94,0.14)" }}>🔴</div>
        <h2 className="mt-5 text-2xl font-extrabold">Store Currently Closed</h2>
        <p className="mt-2 text-sm text-[var(--text-muted)]">We are currently closed for the day. Please come back later.</p>
      </div>
    </div>
  );
}
