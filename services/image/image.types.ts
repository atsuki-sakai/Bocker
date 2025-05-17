export type ImageDirectory = 'option' | 'menu' | 'setting' | 'staff' | 'customer' | 'carte';
export type ImageQuality = "low" | "high";

export interface ProcessedImageResult {
  imgUrl: string;
  thumbnailUrl: string;
}

export interface UploadedFileResult {
  publicUrl: string;
  filePath: string; // GCS内のフルパス
} 