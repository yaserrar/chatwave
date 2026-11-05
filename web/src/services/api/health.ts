import type { HealthDto } from '~/types/api';
import { api } from './client';

export const healthApi = {
  get: () => api.get<HealthDto>('/health'),
};
