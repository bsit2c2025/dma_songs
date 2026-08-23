import apiClient from "./client";

// params: { voice, category, search, published, page }
export const listSongs = (params = {}) =>
  apiClient.get("/songs/", { params }).then((r) => r.data);

export const getSong = (id) =>
  apiClient.get(`/songs/${id}/`).then((r) => r.data);

export const createSong = (payload) =>
  apiClient.post("/songs/", payload).then((r) => r.data);

export const updateSong = (id, payload) =>
  apiClient.patch(`/songs/${id}/`, payload).then((r) => r.data);

export const deleteSong = (id) =>
  apiClient.delete(`/songs/${id}/`).then((r) => r.data);

export const duplicateSong = (id) =>
  apiClient.post(`/songs/${id}/duplicate/`).then((r) => r.data);

export const toggleSongPublish = (id) =>
  apiClient.post(`/songs/${id}/publish/`).then((r) => r.data);

export const reorderSongs = (orderedIds) =>
  apiClient.post("/songs/reorder/", { ordered_ids: orderedIds }).then((r) => r.data);
