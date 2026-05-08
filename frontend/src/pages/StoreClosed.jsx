import { useNavigate, useParams } from "react-router-dom";
import { Clock, ArrowLeft } from "lucide-react";

export default function StoreClosed() {
  const { slug } = useParams();
  const navigate = useNavigate();

  return (
    <div
      className="min-h-[100dvh] flex items-center justify-center px-6 text-center"
      data-testid="store-closed"
    >
      <div className="max-w-sm fade-up">
        <div
          className="w-20 h-20 rounded-full mx-auto flex items-center justify-center"
          style={{ background: "rgba(244,63,94,0.14)" }}
        >
          <Clock className="w-9 h-9 text-[var(--danger)]" />
        </div>
        <h2 className="mt-5 text-2xl font-extrabold">Store currently closed</h2>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          The shop isn't taking orders right now. Check back later — your cart will be saved.
        </p>
        <button
          onClick={() => navigate(`/store/${slug}`)}
          className="btn-ghost mt-6 mx-auto"
          data-testid="closed-back"
        >
          <ArrowLeft className="w-4 h-4" /> Back to storefront
        </button>
      </div>
    </div>
  );
}
