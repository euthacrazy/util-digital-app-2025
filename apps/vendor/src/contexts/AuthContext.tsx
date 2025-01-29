import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService, ApiError } from '../services/api';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  store?: {
    id: string;
    name: string;
    logo?: string;
  };
}

interface AuthContextData {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStorageData() {
      const storedUser = await AsyncStorage.getItem('@UtilDigital:user');
      const storedToken = await AsyncStorage.getItem('@UtilDigital:token');

      if (storedUser && storedToken) {
        setUser(JSON.parse(storedUser));
      }

      setLoading(false);
    }

    loadStorageData();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const response = await authService.login(email, password);

      if (response.user.role !== 'VENDOR') {
        throw {
          message: 'Acesso permitido apenas para vendedores',
          status: 403,
        } as ApiError;
      }

      setUser(response.user);
    } catch (error) {
      throw error;
    }
  };

  const signOut = async () => {
    await authService.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextData {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}
