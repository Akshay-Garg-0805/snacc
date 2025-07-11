// Configuration for next-cloudinary
export const cloudinaryConfig = {
  cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
};

export interface UploadResponse {
  secure_url: string;
  public_id: string;
}