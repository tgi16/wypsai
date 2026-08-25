import { auth } from './firebase';

export const getAuthorizedJsonHeaders = async (): Promise<Record<string, string>> => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const user = auth.currentUser;

  if (user) {
    headers.Authorization = `Bearer ${await user.getIdToken()}`;
  } else if ((import.meta as any).env?.DEV) {
    const apiSecret = (import.meta as any).env?.VITE_WYPS_API_SECRET;
    if (apiSecret) headers['x-wyps-secret'] = apiSecret;
  }

  return headers;
};
