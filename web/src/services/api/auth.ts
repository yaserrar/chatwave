import type { UserDto } from '~/types/auth';
import { api } from './client';

/** The session lives in an httpOnly cookie set by the API: the browser sends it by itself on every call. */
export const authApi = {
  /** 401 when there is no valid session. */
  me: () => api.get<UserDto>('/auth/me'),
  startAnonymous: () => api.post<UserDto>('/auth/anonymous'),
};
