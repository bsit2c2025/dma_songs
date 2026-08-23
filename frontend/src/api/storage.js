import apiClient from "./client";

// purpose: 'music-sheet' | 'hero-image'
export const getSignedUploadUrl = ({ purpose, filename, contentType, sizeBytes }) =>
  apiClient
    .post("/storage/signed-upload-url/", {
      purpose,
      filename,
      content_type: contentType,
      size_bytes: sizeBytes,
    })
    .then((r) => r.data);

// Uploads the raw file straight to Supabase Storage using the signed URL
// Django issued. Does NOT go through Django or apiClient (no Bearer header,
// no baseURL) — it's a direct PUT to Supabase.
export const uploadToSignedUrl = async (signedUrl, file) => {
  const res = await fetch(signedUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });
  if (!res.ok) {
    throw new Error("Upload failed. Please try again.");
  }
  return res;
};
