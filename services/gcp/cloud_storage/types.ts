import { imageDirectoryType, imageQualityType } from '@/convex/types';
import { Infer } from 'convex/values'

export type ImageDirectory = Infer<typeof imageDirectoryType>;
export type ImageQuality = Infer<typeof imageQualityType>;

export interface ProcessedImageResult {
  originalUrl: string;
  thumbnailUrl: string;
}

export interface UploadedFileResult {
  publicUrl: string;
  filePath: string;
}

