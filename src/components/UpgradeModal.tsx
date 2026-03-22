import { X } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface UpgradeModalProps {
  feature: string;
  onClose: () => void;
}

export function UpgradeModal({ feature, onClose }: UpgradeModalProps) {
  const navigate = useNavigate();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/25" onClick={onClose} />
      <div
        className="relative z-10 w-full max-w-sm mx-4 rounded-3xl p-7 shadow-xl"
        style={{ backgroundColor: "#fff", animation: "slideUpSheet 0.3s cubic-bezier(0.16, 1, 0.3, 1) both" }}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-muted-foreground hover:bg-muted transition-colors"
        >
          <X size={16} />
        </button>

        <div className="mb-5 flex items-center gap-2">
          <span className="text-xl font-heading font-bold text-primary">PULZ</span>
          <span
            className="text-xs font-medium px-2 py-0.5 rounded-full"
            style={{ backgroundColor: "#b3ecec", color: "#1A4040" }}
          >
            Premium
          </span>
        </div>

        <h2 className="font-heading font-semibold text-lg leading-snug mb-2">
          Această funcție este disponibilă în Premium
        </h2>

        <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
          <span className="font-medium text-foreground">{feature}</span> face parte din planul
          Premium — designed pentru o experiență completă de monitorizare și recuperare.
        </p>

        <div
          className="rounded-2xl p-4 mb-5 flex items-center justify-between"
          style={{ backgroundColor: "#E8F8F7", border: "1px solid #b3ecec" }}
        >
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Premium</p>
            <p className="text-2xl font-mono font-bold" style={{ color: "#1A4040" }}>
              €9.99<span className="text-sm font-normal text-muted-foreground">/lună</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">sau €99.90/an</p>
            <p className="text-xs font-medium" style={{ color: "#4CAF7D" }}>2 luni gratuit</p>
          </div>
        </div>

        <button
          onClick={() => { onClose(); navigate("/pricing"); }}
          className="w-full py-3 rounded-2xl text-sm font-medium text-white transition-colors active:scale-[0.98] mb-3"
          style={{ backgroundColor: "#2D7D6F" }}
        >
          Upgrade acum →
        </button>

        <button
          onClick={onClose}
          className="w-full py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Nu acum
        </button>
      </div>
    </div>
  );
}
