import apiClient from "./client";

export const getCurrentAnnouncement = () =>
  apiClient.get("/announcements/current/").then((r) => r.data);

export const listAnnouncements = () =>
  apiClient.get("/announcements/").then((r) => r.data);

export const createAnnouncement = (payload) =>
  apiClient.post("/announcements/", payload).then((r) => r.data);

export const updateAnnouncement = (id, payload) =>
  apiClient.patch(`/announcements/${id}/`, payload).then((r) => r.data);

export const deleteAnnouncement = (id) =>
  apiClient.delete(`/announcements/${id}/`).then((r) => r.data);

export const publishAnnouncement = (id) =>
  apiClient.post(`/announcements/${id}/publish/`).then((r) => r.data);
