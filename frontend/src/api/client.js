// Central axios instance for every call to the Django REST API.
// Attaches the current Supabase access token (if any) as a Bearer header,
// so both public and admin-only endpoints go through the same client.
import axios from "axios";
import { supabase } from "../services/supabaseClient";

const baseURL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";

export const apiClient = axios.create({ baseURL });

apiClient.interceptors.request.use(async (config) => {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Every error response from Django follows { error: { message, detail } }
// (see backend core/exceptions.py). Normalize so callers can just read
// err.message.
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const backendMessage = error?.response?.data?.error?.message;
    if (backendMessage) {
      error.message = backendMessage;
    }
    return Promise.reject(error);
  }
);

export default apiClient;
