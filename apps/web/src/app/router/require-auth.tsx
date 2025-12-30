import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth-provider";
import { useWorkspace } from "@/shared/workspaces/workspace-provider";

export const RequireAuth: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const { workspaces, isLoading: workspaceLoading } = useWorkspace();
  const location = useLocation();

  if (isLoading || workspaceLoading) {
    return null;
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  const isOnboardingRoute = location.pathname.startsWith("/onboarding");
  if (!isOnboardingRoute && workspaces.length === 0) {
    return <Navigate to="/onboarding" state={{ from: location }} replace />;
  }

  return <Outlet />;
};
