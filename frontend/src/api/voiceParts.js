import apiClient from "./client";

export const listVoiceParts = () =>
  apiClient.get("/voice-parts/").then((r) => r.data);

export const createVoicePart = (payload) =>
  apiClient.post("/voice-parts/", payload).then((r) => r.data);

export const updateVoicePart = (id, payload) =>
  apiClient.patch(`/voice-parts/${id}/`, payload).then((r) => r.data);

export const deleteVoicePart = (id) =>
  apiClient.delete(`/voice-parts/${id}/`).then((r) => r.data);
