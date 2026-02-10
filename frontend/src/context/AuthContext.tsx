/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { apiClient, authApi } from '../lib/api';

interface User {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  channel?: {
    id: string;
    handle: string;
    name: string;
    subscriberCount: number;
    verified: boolean;
  };
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    email: string;
    username: string;
    password: string;
    displayName: string;
  }) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    const checkAuth = async () => {
      const token = apiClient.getToken();
      if (token) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const response: any = await authApi.getCurrentUser();
          // Backend returns { success, message, data: user }
          setUser(response.data as User);
        } catch (error) {
          console.error('Auth check failed:', error);
          apiClient.setToken(null);
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response: any = await authApi.login({ email, password });
    // Backend returns { success, message, data: { user, accessToken, refreshToken } }
    apiClient.setToken(response.data.accessToken);
    localStorage.setItem('refreshToken', response.data.refreshToken);
    setUser(response.data.user);
  };

  const register = async (data: {
    email: string;
    username: string;
    password: string;
    displayName: string;
  }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response: any = await authApi.register(data);
    // Backend returns { success, message, data: { user, accessToken, refreshToken } }
    apiClient.setToken(response.data.accessToken);
    localStorage.setItem('refreshToken', response.data.refreshToken);
    setUser(response.data.user);
  };

  const logout = () => {
    apiClient.setToken(null);
    localStorage.removeItem('refreshToken');
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
