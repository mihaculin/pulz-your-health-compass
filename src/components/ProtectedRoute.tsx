import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useApp } from "@/contexts/AppContext";

function LoadingScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: "hsl(var(--background))" }}>
      <span className="text-2xl font-heading font-semibold" style={{ color: "hsl(var(--primary))" }}>PULZ</span>
      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-2 h-2 rounded-full"
            style={{
              backgroundColor: "#b3ecec",
              animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { appLoading, intakeSurveyCompleted } = useApp();
  const location = useLocation();

  if (loading || appLoading) return <LoadingScreen />;

  if (!user) return <Navigate to="/" replace />;

  const atOnboarding = location.pathname === "/onboarding";

  if (atOnboarding && intakeSurveyCompleted) {
    return <Navigate to="/dashboard" replace />;
  }

  if (!atOnboarding && !intakeSurveyCompleted) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}
