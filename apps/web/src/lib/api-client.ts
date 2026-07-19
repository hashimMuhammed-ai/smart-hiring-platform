import axios from 'axios';
import { useAuthStore } from '@/store/auth';

const apiClient = axios.create({
  baseURL: (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000') + '/api',
});

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (res) => res,
  (err: unknown) => {
    if (
      typeof err === 'object' &&
      err !== null &&
      'response' in err &&
      (err as { response?: { status?: number } }).response?.status === 401
    ) {
      useAuthStore.getState().logout();
    }
    return Promise.reject(err);
  },
);

export default apiClient;
