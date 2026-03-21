import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useApp } from "@/contexts/AppContext";
import { Skeleton } from "@/components/ui/skeleton";

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="space-y-4 w-full max-w-md px-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    </div>
  );
}

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, role, loading } = useAuth();
  const { appLoading, intakeSurveyCompleted } = useApp();
  const location = useLocation();

  if (loading || appLoading) return <LoadingScreen />;

  if (!user) return <Navigate to="/" replace />;

  const atOnboarding = location.pathname === "/onboarding";
  const destination = role === "specialist" ? "/specialist/dashboard" : "/dashboard";

  if (atOnboarding && intakeSurveyCompleted) {
    return <Navigate to={destination} replace />;
  }

  if (!atOnboarding && role === "client" && !intakeSurveyCompleted) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}
