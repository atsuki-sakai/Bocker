'use client'

import Image, { ImageProps } from 'next/image'
import { useState, useEffect } from 'react'
import { gcsService } from '@/services/gcp/cloud_storage/GoogleStorageService'

interface OptimizedImageProps extends Omit<ImageProps, 'src' | 'onError'> {
  src: string | null | undefined
  fallbackSrc?: string
  transformSrc?: boolean // CDN変換を適用するかどうか（デフォルト: true）
  onError?: (error: Error) => void
}

/**
 * CDN対応の最適化された画像コンポーネント
 * - GCS URLを自動的にCDN URLに変換
 * - エラー時のフォールバック処理
 * - ローディング状態の管理
 */
export function OptimizedImage({
  src,
  fallbackSrc = '/assets/images/logo.png',
  transformSrc = true,
  onError,
  alt,
  className,
  priority = false,
  loading,
  ...props
}: OptimizedImageProps) {
  const [imgSrc, setImgSrc] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    // srcが無効な場合はフォールバック画像を使用
    if (!src) {
      setImgSrc(fallbackSrc)
      setIsLoading(false)
      return
    }

    // CDN変換が有効で、transformSrcがtrueの場合はCDN URLに変換
    const processedSrc = transformSrc && gcsService.isCdnEnabled() ? gcsService.getCdnUrl(src) : src
    setImgSrc(processedSrc)
    setIsLoading(false)
  }, [src, fallbackSrc, transformSrc])

  const handleError = () => {
    console.warn('[OptimizedImage] 画像の読み込みに失敗しました:', imgSrc)
    setHasError(true)
    setImgSrc(fallbackSrc)

    if (onError) {
      onError(new Error(`画像の読み込みに失敗しました: ${imgSrc}`))
    }
  }

  const handleLoad = () => {
    setIsLoading(false)
  }

  // スケルトンローディング用のクラス
  const skeletonClass = isLoading ? 'animate-pulse bg-gray-200' : ''

  return (
    <div className={`relative ${className || ''}`}>
      {isLoading && <div className={`absolute inset-0 ${skeletonClass} rounded`} />}
      <Image
        src={imgSrc}
        alt={alt}
        className={`${className || ''} ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
        onError={handleError}
        onLoad={handleLoad}
        priority={priority}
        loading={loading || (priority ? undefined : 'lazy')}
        {...props}
      />
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted text-muted-foreground text-xs">
          画像を読み込めません
        </div>
      )}
    </div>
  )
}

/**
 * サムネイル画像用の最適化コンポーネント
 * 小さいサイズで高速表示を優先
 */
export function OptimizedThumbnail({
  src,
  alt,
  size = 80,
  className = '',
  ...props
}: Omit<OptimizedImageProps, 'width' | 'height'> & { size?: number }) {
  return (
    <OptimizedImage
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={`rounded-md ${className}`}
      loading="lazy"
      {...props}
    />
  )
}

/**
 * バナー画像用の最適化コンポーネント
 * 大きいサイズで品質を重視
 */
export function OptimizedBanner({
  src,
  alt,
  className = '',
  ...props
}: Omit<OptimizedImageProps, 'fill'>) {
  return (
    <div className={`relative w-full ${className}`}>
      <OptimizedImage
        src={src}
        alt={alt}
        fill
        className="object-cover"
        priority
        sizes="100vw"
        {...props}
      />
    </div>
  )
}

/**
 * アバター画像用の最適化コンポーネント
 * 円形で小さいサイズ
 */
export function OptimizedAvatar({
  src,
  alt,
  size = 40,
  className = '',
  ...props
}: Omit<OptimizedImageProps, 'width' | 'height'> & { size?: number }) {
  return (
    <OptimizedImage
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={`rounded-full ${className}`}
      loading="lazy"
      {...props}
    />
  )
}
