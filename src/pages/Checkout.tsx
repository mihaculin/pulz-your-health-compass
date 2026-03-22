import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Lock, ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

function formatCardNumber(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 16);
  return digits.replace(/(.{4})/g, "$1 ").trim();
}

function formatExpiry(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  if (digits.length >= 3) return digits.slice(0, 2) + " / " + digits.slice(2);
  if (digits.length === 2) return digits + " / ";
  return digits;
}

export default function Checkout() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const billing = (searchParams.get("billing") ?? "monthly") as "monthly" | "annual";

  const price = billing === "monthly" ? "€9.99/lună" : "€79/an";
  const nextPayment = (() => {
    const d = new Date();
    if (billing === "monthly") d.setMonth(d.getMonth() + 1);
    else d.setFullYear(d.getFullYear() + 1);
    return d.toLocaleDateString("ro-RO", { day: "numeric", month: "long", year: "numeric" });
  })();

  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState(user?.email ?? "");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user?.email) setEmail(user.email);
  }, [user]);

  const handleSubmit = async () => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 2000));
    navigate("/payment/success");
  };

  const inputCls = "w-full px-4 py-3 rounded-xl border text-sm focus:outline-none transition bg-white"
    + " focus:border-[#2D7D6F] focus:ring-2 focus:ring-[#2D7D6F]/20"
    + " border-[#E8EAED]";

  return (
    <div className="min-h-screen flex items-center justify-center py-10 px-4" style={{ backgroundColor: "#F9FAFB" }}>
      <div className="w-full max-w-[480px]">

        {import.meta.env.DEV && (
          <div
            className="rounded-xl px-4 py-2.5 mb-4 text-sm flex items-center gap-2"
            style={{ backgroundColor: "#FFFBEB", border: "1px solid #FCD34D", color: "#B45309" }}
          >
            🧪 Mod demo — nicio plată reală nu va fi procesată
          </div>
        )}

        <div
          className="bg-white shadow-lg"
          style={{ borderRadius: 20, padding: "32px", border: "1px solid #F0F0F0" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft size={15} />
              Înapoi
            </button>
            <div className="flex items-center gap-2">
              <span className="font-heading font-bold text-primary text-base">PULZ</span>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Lock size={11} /> Checkout securizat
              </span>
            </div>
          </div>

          {/* Plan summary */}
          <div
            className="rounded-xl px-4 py-3 mb-6 flex items-center justify-between"
            style={{ backgroundColor: "#E8F8F7" }}
          >
            <div>
              <p className="text-sm font-semibold" style={{ color: "#1A4040" }}>PULZ Premium</p>
              <p className="text-xs text-muted-foreground capitalize">{billing === "monthly" ? "Lunar" : "Anual"}</p>
            </div>
            <p className="font-mono font-bold text-sm" style={{ color: "#2D7D6F" }}>{price}</p>
          </div>

          {/* Card info */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                Informații card
              </label>
              <input
                className={inputCls}
                placeholder="1234 1234 1234 1234"
                value={cardNumber}
                onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                inputMode="numeric"
                maxLength={19}
              />
              <div className="grid grid-cols-2 gap-3 mt-2">
                <input
                  className={inputCls}
                  placeholder="MM / AA"
                  value={expiry}
                  onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                  inputMode="numeric"
                  maxLength={7}
                />
                <input
                  className={inputCls}
                  placeholder="CVC"
                  value={cvc}
                  onChange={(e) => setCvc(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  inputMode="numeric"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                Titular card
              </label>
              <input
                className={inputCls}
                placeholder="Numele de pe card"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                Email pentru factură
              </label>
              <input
                className={inputCls}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          {/* Order summary */}
          <div
            className="rounded-xl p-4 mt-5 space-y-1.5"
            style={{ backgroundColor: "#F7F8FA" }}
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">PULZ Premium · {billing === "monthly" ? "Lunar" : "Anual"}</p>
              <p className="text-sm font-mono font-semibold">{price}</p>
            </div>
            <p className="text-xs text-muted-foreground">Următoarea plată: {nextPayment}</p>
            <p className="text-xs text-muted-foreground">Anulezi oricând din setări</p>
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full mt-5 rounded-xl font-medium text-white transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            style={{ height: 52, backgroundColor: loading ? "#4A9E8E" : "#2D7D6F", fontSize: 15 }}
          >
            {loading ? (
              <>
                <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3" />
                  <path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="3" strokeLinecap="round" />
                </svg>
                Se procesează…
              </>
            ) : (
              "Completează abonamentul"
            )}
          </button>

          <p className="text-center text-xs text-muted-foreground mt-4">
            🔒 Plată procesată securizat. Datele cardului nu sunt stocate de PULZ.
          </p>
        </div>
      </div>
    </div>
  );
}
