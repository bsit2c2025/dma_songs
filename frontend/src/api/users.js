import apiClient from "./client";

export const listUsers = () => apiClient.get("/users/").then((r) => r.data);

export const getMyProfile = () => apiClient.get("/users/me/").then((r) => r.data);

export const updateMyProfile = (payload) =>
  apiClient.patch("/users/me/", payload).then((r) => r.data);

// payload: { role?: 'user'|'admin', voice_part?: <uuid|null> }
export const updateUser = (id, payload) =>
  apiClient.patch(`/users/${id}/`, payload).then((r) => r.data);
