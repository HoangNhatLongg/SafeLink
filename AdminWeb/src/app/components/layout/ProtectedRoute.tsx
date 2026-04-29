import React from 'react';
import { Navigate, useLocation } from 'react-router';
import { useAuthStore } from '../../stores/authStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated || !user) {
    // Redirect to login page and save the current location they were trying to go to
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Ensure only admin or moderator can access
  if (user.role !== 'admin' && user.role !== 'moderator') {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};
