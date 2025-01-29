import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000',
});

// Interceptor para adicionar token em todas as requisições
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('@UtilDigital:token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor para tratamento de erros
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expirado ou inválido
      await AsyncStorage.multiRemove([
        '@UtilDigital:token',
        '@UtilDigital:user'
      ]);
      // TODO: Redirecionar para login
    }
    return Promise.reject(error);
  }
);

export interface LoginResponse {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    store?: {
      id: string;
      name: string;
      logo?: string;
    };
  };
}

export interface ApiError {
  message: string;
  status: number;
}

export const authService = {
  async login(email: string, password: string): Promise<LoginResponse> {
    try {
      const response = await api.post<LoginResponse>('/auth/login', {
        email,
        password,
      });

      // Salvar token e dados do usuário
      await AsyncStorage.setItem('@UtilDigital:token', response.data.token);
      await AsyncStorage.setItem(
        '@UtilDigital:user',
        JSON.stringify(response.data.user)
      );

      return response.data;
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Erro ao fazer login',
        status: error.response?.status || 500,
      } as ApiError;
    }
  },

  async logout() {
    await AsyncStorage.multiRemove([
      '@UtilDigital:token',
      '@UtilDigital:user'
    ]);
  },
};

export default api;
