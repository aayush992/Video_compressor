import React from 'react';
import LoginScreen from './LoginScreen';

interface Props {
  isAuthenticated: boolean;
  onAuthenticated: (token: string, email: string) => void;
  children: React.ReactNode;
}

/**
 * ProtectedRoute – renders children when authenticated, otherwise shows LoginScreen.
 * No router dependency: works with a simple boolean flag hoisted in App.tsx.
 */
const ProtectedRoute: React.FC<Props> = ({ isAuthenticated, onAuthenticated, children }) => {
  if (!isAuthenticated) {
    return <LoginScreen onAuthenticated={onAuthenticated} />;
  }
  return <>{children}</>;
};

export default ProtectedRoute;
