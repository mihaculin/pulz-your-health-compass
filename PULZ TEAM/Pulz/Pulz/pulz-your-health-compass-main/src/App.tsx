import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import Welcome from "./pages/Welcome";
import SignUp from "./pages/SignUp";
import SignIn from "./pages/SignIn";
import Dashboard from "./pages/Dashboard";
import Journal from "./pages/Journal";
import Progress from "./pages/Progress";
import Therapist from "./pages/Therapist";
import SettingsPage from "./pages/Settings";
import Personalise from "./pages/Personalise";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AppRoutes() {
  const { user, loading } = useAuth();

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={user && !loading ? <Navigate to="/dashboard" replace /> : <Welcome />} />
      <Route path="/signup" element={user && !loading ? <Navigate to="/dashboard" replace /> : <SignUp />} />
      <Route path="/signin" element={user && !loading ? <Navigate to="/dashboard" replace /> : <SignIn />} />

      {/* Protected client routes */}
      <Route path="/dashboard" element={<ProtectedRoute><AppLayout><Dashboard /></AppLayout></ProtectedRoute>} />
      <Route path="/journal" element={<ProtectedRoute><AppLayout><Journal /></AppLayout></ProtectedRoute>} />
      <Route path="/progress" element={<ProtectedRoute><AppLayout><Progress /></AppLayout></ProtectedRoute>} />
      <Route path="/therapist" element={<ProtectedRoute><AppLayout><Therapist /></AppLayout></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><AppLayout><SettingsPage /></AppLayout></ProtectedRoute>} />
      <Route path="/personalise" element={<ProtectedRoute><AppLayout><Personalise /></AppLayout></ProtectedRoute>} />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
