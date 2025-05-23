import { imgDirectoryType, imageQualityType } from '@/convex/types';
import { Infer } from 'convex/values'

export type ImageDirectory = Infer<typeof imgDirectoryType>;
export type ImageQuality = Infer<typeof imageQualityType>;

export interface ProcessedImageResult {
  imgUrl: string;
  thumbnailUrl: string;
}

export interface UploadedFileResult {
  publicUrl: string;
  filePath: string;
}

