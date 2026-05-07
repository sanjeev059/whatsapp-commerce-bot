import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Header({ title, subtitle, onBack, right }) {
  const navigate = useNavigate();
  const back = () => (onBack ? onBack() : navigate(-1));
  return (
    <div
      className="sticky top-0 z-30 px-4 py-3 flex items-center gap-3"
      style={{
        background: "rgba(7,8,11,0.85)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        borderBottom: "1px solid var(--border-soft)",
      }}
      data-testid="page-header"
    >
      <button
        onClick={back}
        className="w-10 h-10 rounded-full flex items-center justify-center surface-2"
        data-testid="header-back-btn"
        aria-label="Back"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
      <div className="flex-1 min-w-0">
        <div className="text-base font-semibold leading-tight truncate" data-testid="header-title">
          {title}
        </div>
        {subtitle && (
          <div className="text-xs text-[var(--text-muted)] truncate">{subtitle}</div>
        )}
      </div>
      {right}
    </div>
  );
}
