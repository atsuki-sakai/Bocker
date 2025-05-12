export interface UploadResult {
  publicUrl: string;
  filePath: string;
}

export type ImageCategory = 'staff' | 'menu' | 'salon' | 'example'
export type ImageSize = 'original' | 'thumbnail'

export interface ResizeConfig {
  width: number
  height: number
  quality: number
}

export const RESIZE_CONFIGS: Record<ImageSize, ResizeConfig> = {
  original: { width: 1200, height: 1200, quality: 90 },
  thumbnail: { width: 250, height: 250, quality: 80 },
}
