import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const { error } = await signIn(email, password);
    setSubmitting(false);

    if (error) {
      toast({ title: "Sign in failed", description: error.message, variant: "destructive" });
      return;
    }

    // Role-based redirect handled by App.tsx
    navigate("/dashboard");
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setSubmitting(false);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Check your email", description: "Password reset link sent." });
      setResetMode(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: "hsl(var(--background))" }}>
      <div className="w-full max-w-md space-y-6 slide-up">
        <button onClick={() => (resetMode ? setResetMode(false) : navigate("/"))} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft size={16} /> Back
        </button>

        <h1 className="text-2xl font-heading font-semibold" style={{ color: "hsl(var(--primary))" }}>
          {resetMode ? "Reset password" : "Welcome back"}
        </h1>

        <form onSubmit={resetMode ? handleReset : handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
          </div>

          {!resetMode && (
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Your password" required />
            </div>
          )}

          {!resetMode && (
            <button type="button" onClick={() => setResetMode(true)} className="text-sm text-muted-foreground hover:underline">
              Forgot password?
            </button>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 rounded-2xl font-medium text-primary-foreground transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
            style={{ backgroundColor: "hsl(var(--primary))" }}
          >
            {submitting ? (resetMode ? "Sending…" : "Signing in…") : resetMode ? "Send reset link" : "Sign in"}
          </button>

          {!resetMode && (
            <p className="text-center text-sm text-muted-foreground">
              New to PULZ? <Link to="/signup" className="underline" style={{ color: "hsl(var(--primary))" }}>Create account</Link>
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
