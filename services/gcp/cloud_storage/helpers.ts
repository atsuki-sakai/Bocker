import { AspectType } from "@/convex/types";
import { ImageQuality } from "./types";
import { v4 as uuidv4 } from 'uuid';


/**
 * ブラウザが Canvas で WebP エンコード可能かを非同期に判定する。
 * 一度判定した結果をキャッシュして次回以降は即 return する。
 */
let webpEncodeSupport: boolean | undefined;
export async function canEncodeWebp(): Promise<boolean> {
  if (webpEncodeSupport !== undefined) return webpEncodeSupport;
  if (typeof document === 'undefined') return (webpEncodeSupport = false);

  const canvas = document.createElement('canvas');
  return new Promise<boolean>((resolve) => {
    canvas.toBlob(
      (blob) => {
        webpEncodeSupport = !!blob && blob.type === 'image/webp';
        resolve(webpEncodeSupport);
      },
      'image/webp',
      0.1
    );
  });
}

const qualityTable = {
    low: { original: { width: 700, quality: 0.4 }, thumb: { width: 150, quality: 0.3 }},
    medium: { original: { width: 1280, quality: 0.55 }, thumb: { width: 240, quality: 0.4 }},
    high: { original: { width: 1920, quality: 0.75 }, thumb: { width: 360, quality: 0.5 }},
};

/**
 * ファイル名を安全な形式に変換する
 * @param fileName 元のファイル名
 * @param preferredExt 出力拡張子 (例: ".webp" / ".jpg") デフォルトは ".webp"
 * @returns 例: "l9f2m3_sample_8a1b2c3d.webp"
 */
function sanitizeFileName(fileName: string, preferredExt: string = '.webp'): string {
  // ベース名生成: ディレクトリと既存拡張子を除去し、安全文字に置換
  const base = fileName
    .replace(/^.*[\\/]/, '')      // ディレクトリ除去
    .replace(/\.[^.]+$/, '')      // 既存拡張子除去
    .replace(/[^\w\-]/g, '_');    // 非英数字を置換

  const timestamp = Date.now().toString(36);  // 衝突低減
  const uuid = uuidv4().slice(0, 8);

  // ファイル名の長さ制限（拡張子含めて255文字以内）
  const maxBaseLength = 255 - preferredExt.length - timestamp.length - uuid.length - 2; // "_"分を考慮
  const truncatedBase = base.length > maxBaseLength ? base.substring(0, maxBaseLength) : base;

  return `${timestamp}_${truncatedBase}_${uuid}${preferredExt}`;
}

/**
 * 低メモリ端末かどうかを判定する
 * @returns メモリが限られている端末の場合true
 */
function isLowMemoryDevice(): boolean {
  // navigator.deviceMemoryがサポートされている場合は使用（GB単位）
  if ('deviceMemory' in navigator && typeof (navigator as any).deviceMemory === 'number') {
    return (navigator as any).deviceMemory <= 2; // 2GB以下は低メモリ端末と判定
  }
  
  // User Agentベースの推定（フォールバック）
  const ua = navigator.userAgent;
  // 古いデバイス、エントリーレベルのデバイスを検出
  if (/iPhone OS [89]_|Android [4-7]\.|Windows Phone|BlackBerry/.test(ua)) {
    return true;
  }
  
  return false; // 不明な場合は最新のものと仮定
}

/**
 * Exif情報から画像の回転角度を取得する
 * @param arrayBuffer 画像ファイルのArrayBuffer
 * @returns 回転角度（0, 90, 180, 270）
 */
function getExifRotation(arrayBuffer: ArrayBuffer): number {
  const dataView = new DataView(arrayBuffer);
  
  // JPEG でない場合やExif情報がない場合は回転なし
  if (dataView.getUint16(0) !== 0xFFD8) return 0;
  
  let offset = 2;
  while (offset < dataView.byteLength) {
    const marker = dataView.getUint16(offset);
    if (marker === 0xFFE1) {
      // Exifセグメント発見
      const exifOffset = offset + 4;
      if (dataView.getUint32(exifOffset) === 0x45786966) { // "Exif"
        const tiffOffset = exifOffset + 6;
        const byteOrder = dataView.getUint16(tiffOffset);
        const isLittleEndian = byteOrder === 0x4949;
        
        // IFD0のエントリ数を取得
        const ifd0Offset = tiffOffset + dataView.getUint32(tiffOffset + 4, isLittleEndian);
        const entryCount = dataView.getUint16(ifd0Offset, isLittleEndian);
        
        // Orientationタグ（0x0112）を検索
        for (let i = 0; i < entryCount; i++) {
          const entryOffset = ifd0Offset + 2 + i * 12;
          const tag = dataView.getUint16(entryOffset, isLittleEndian);
          if (tag === 0x0112) {
            const orientation = dataView.getUint16(entryOffset + 8, isLittleEndian);
            // Orientationからrotation角度に変換
            switch (orientation) {
              case 3: return 180;
              case 6: return 90;
              case 8: return 270;
              default: return 0;
            }
          }
        }
      }
    }
    // 次のセグメントへ
    offset += 2 + dataView.getUint16(offset + 2);
  }
  
  return 0;
}

/**
 * Canvas上で画像を回転させる
 * @param ctx CanvasRenderingContext2D または OffscreenCanvasRenderingContext2D
 * @param img 描画する画像
 * @param rotation 回転角度（0, 90, 180, 270）
 * @param sx ソース画像のx座標
 * @param sy ソース画像のy座標  
 * @param sw ソース画像の幅
 * @param sh ソース画像の高さ
 * @param dx 描画先のx座標
 * @param dy 描画先のy座標
 * @param dw 描画先の幅
 * @param dh 描画先の高さ
 */
function drawRotatedImage(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, 
  img: ImageBitmap | HTMLImageElement,
  rotation: number,
  sx: number, sy: number, sw: number, sh: number,
  dx: number, dy: number, dw: number, dh: number
): void {
  if (rotation === 0) {
    ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
    return;
  }
  
  ctx.save();
  
  // 回転の中心点をキャンバス中央に設定
  const centerX = dw / 2;
  const centerY = dh / 2;
  ctx.translate(centerX, centerY);
  ctx.rotate((rotation * Math.PI) / 180);
  
  // 90度回転の場合は幅と高さが入れ替わる
  if (rotation === 90 || rotation === 270) {
    ctx.drawImage(img, sx, sy, sw, sh, -centerY, -centerX, dh, dw);
  } else {
    ctx.drawImage(img, sx, sy, sw, sh, -centerX, -centerY, dw, dh);
  }
  
  ctx.restore();
}

/**
 * フロントエンドで画像を指定のアスペクト比＆幅でリサイズ・圧縮する  
 * iOS 17+ / Safari 17+ など OffscreenCanvas が使えるブラウザでは  
 * `OffscreenCanvas.convertToBlob()` を利用し、高速かつ品質指定付きで JPEG/WebP へエンコード。  
 * 旧ブラウザ（OffscreenCanvas 未対応）では `toDataURL → fetch()` フォールバックで
 * iOS Safari (<17) の `canvas.toBlob` 品質無視バグも回避する。
 */
export async function compressAndCropImage(
  file: File,
  maxWidth: number,
  aspectType: 'square' | 'landscape' | 'mobile',
  quality: number
): Promise<File> {
  console.log('[画像圧縮] 処理開始:', { fileName: file.name, size: file.size, type: file.type });
  
  // --- WebP エンコード可否 & iOS 判定 ----------------------------------------
  const canWebp = await canEncodeWebp();
  const isIOS = /iP(hone|od|ad)/.test(navigator.userAgent) ||
                (navigator.userAgent.includes('Mac') && navigator.maxTouchPoints > 1);
  const useWebp = canWebp && !isIOS;

  const mime = useWebp ? 'image/webp' : 'image/jpeg';
  const ext  = useWebp ? '.webp'    : '.jpg';

  // --- 低メモリ端末判定 ----------------------------------------------------
  const isLowMemory = isLowMemoryDevice();
  console.log('[画像圧縮] デバイス情報:', { isLowMemory, useWebp, isIOS });
  
  // --- OffscreenCanvas サポート判定 ------------------------------------------
  const supportsOffscreen =
    typeof OffscreenCanvas !== 'undefined' &&
    typeof createImageBitmap === 'function' &&
    // 型定義に convertToBlob がまだ無い場合があるため any キャスト
    (OffscreenCanvas.prototype as any).convertToBlob !== undefined;

  // 低メモリ端末の場合は強制的にフォールバックを使用
  const useOffscreenPath = supportsOffscreen && !isLowMemory;
  console.log('[画像圧縮] 処理パス選択:', { supportsOffscreen, useOffscreenPath });

  // --- 画像の向きは変更しない方針 ---------------------------------------
  // Exif の Orientation タグを読まず、常に 0° で描画する
  const rotation = 0;

  // ========================================================================
  // 1) OffscreenCanvas パス  (iOS 17+ / 最新ブラウザ)
  // ========================================================================
  if (useOffscreenPath) {
    let bitmap: ImageBitmap | null = null;
    let fileUrl: string | null = null;
    
    try {
      console.log('[画像圧縮] OffscreenCanvasパス開始');
      
      // ImageBitmap作成（例外処理強化）
      try {
        bitmap = await createImageBitmap(file);
        console.log('[画像圧縮] ImageBitmap作成成功:', { width: bitmap.width, height: bitmap.height });
      } catch (bitmapError) {
        console.warn('[画像圧縮] createImageBitmap失敗、フォールバックを使用:', bitmapError);
        // フォールバックパスに転送
        return await executeCanvasFallback(file, maxWidth, aspectType, quality, mime, ext, rotation);
      }
      
      const { width, height } = bitmap;

      // ----- アスペクト比計算 & クロップ領域算出 -----------------------------
      let targetAspect = 1;
      if (aspectType === 'landscape') targetAspect = 16 / 9;
      if (aspectType === 'mobile')    targetAspect = 2 / 3;

      let cropWidth = width, cropHeight = height;
      if (width / height > targetAspect) {
        cropHeight = height;
        cropWidth  = Math.round(height * targetAspect);
      } else {
        cropWidth  = width;
        cropHeight = Math.round(width / targetAspect);
      }

      const left = Math.floor((width  - cropWidth)  / 2);
      const top  = Math.floor((height - cropHeight) / 2);

      // ----- クロップ & リサイズ --------------------------------------------
      const scale = maxWidth / cropWidth;
      const outW = maxWidth;
      const outH = Math.round(cropHeight * scale);

      const off = new OffscreenCanvas(outW, outH);
      const ctx = off.getContext('2d')!;
      
      ctx.drawImage(bitmap, left, top, cropWidth, cropHeight, 0, 0, outW, outH);

      // ----- 画像エンコード ---------------------------------------------------
      const blob: Blob = await (off as any).convertToBlob({ type: mime, quality });
      console.log('[画像圧縮] OffscreenCanvas圧縮完了:', { originalSize: file.size, compressedSize: blob.size });
      
      return new File([blob], sanitizeFileName(file.name, ext), { type: mime });
      
    } catch (error) {
      console.error('[画像圧縮] OffscreenCanvasパスでエラー、フォールバックを試行:', error);
      // フォールバックパスに転送
      return await executeCanvasFallback(file, maxWidth, aspectType, quality, mime, ext, rotation);
    } finally {
      // メモリ解放
      if (bitmap) {
        bitmap.close();
        console.log('[画像圧縮] ImageBitmapを解放');
      }
      if (fileUrl) {
        URL.revokeObjectURL(fileUrl);
        console.log('[画像圧縮] ObjectURLを解放');
      }
    }
  }

  // ========================================================================
  // 2) フォールバックパス  (toDataURL → fetch で全 iOS 対応)
  // ========================================================================
  return await executeCanvasFallback(file, maxWidth, aspectType, quality, mime, ext, rotation);
}

/**
 * Canvas フォールバック処理を実行する
 */
async function executeCanvasFallback(
  file: File,
  maxWidth: number,
  aspectType: 'square' | 'landscape' | 'mobile',
  quality: number,
  mime: string,
  ext: string,
  rotation: number
): Promise<File> {
  console.log('[画像圧縮] Canvasフォールバックパス開始');
  
  return new Promise<File>((resolve, reject) => {
    const img = new Image();
    let fileUrl: string | null = null;
    
    img.onload = async () => {
      try {
        const width  = img.width;
        const height = img.height;

        let targetAspect = 1;
        if (aspectType === 'landscape') targetAspect = 16 / 9;
        if (aspectType === 'mobile')    targetAspect = 2 / 3;

        let cropWidth = width, cropHeight = height;
        if (width / height > targetAspect) {
          cropHeight = height;
          cropWidth  = Math.round(height * targetAspect);
        } else {
          cropWidth  = width;
          cropHeight = Math.round(width / targetAspect);
        }

        const left = Math.floor((width  - cropWidth)  / 2);
        const top  = Math.floor((height - cropHeight) / 2);

        const canvas = document.createElement('canvas');
        const scale  = maxWidth / cropWidth;
        
        // 画像の向きを変更しない
        canvas.width  = maxWidth;
        canvas.height = Math.round(cropHeight * scale);

        const ctx = canvas.getContext('2d')!;
        
        ctx.drawImage(img, left, top, cropWidth, cropHeight, 0, 0, canvas.width, canvas.height);

        // iOS Safari でも quality が反映される toDataURL 経由
        const dataURL = canvas.toDataURL(mime, quality);
        const blob = await (await fetch(dataURL)).blob();
        console.log('[画像圧縮] Canvasフォールバック圧縮完了:', { originalSize: file.size, compressedSize: blob.size });
        
        resolve(new File([blob], sanitizeFileName(file.name, ext), { type: mime }));
      } catch (err) {
        console.error('[画像圧縮] Canvasフォールバック処理エラー:', err);
        reject(err);
      } finally {
        // ObjectURL解放
        if (fileUrl) {
          URL.revokeObjectURL(fileUrl);
          console.log('[画像圧縮] ObjectURL解放（フォールバック）');
        }
      }
    };
    
    img.onerror = (error) => {
      console.error('[画像圧縮] 画像読み込みエラー:', error);
      if (fileUrl) {
        URL.revokeObjectURL(fileUrl);
      }
      reject(new Error('画像の読み込みに失敗しました'));
    };
    
    // ObjectURL作成
    fileUrl = URL.createObjectURL(file);
    img.src = fileUrl;
  });
}

/**
 * オリジナル画像とサムネイル画像を署名付きURLを取得してアップロードする
 * @param file オリジナル画像
 * @param orgId 組織ID
 * @param directory ディレクトリ
 * @param aspectType アスペクト比の種類 (square, landscape, mobile)
 * @param quality 画像品質設定 ('low' | medium |  'high') 
 * @returns オリジナル画像とサムネイル画像の公開URLとGCSパス
 */
export async function uploadCompressedImageWithThumbnailSignedUrl(
    file: File,
    orgId: string,
    directory: string,
    aspectType: AspectType,
    quality: ImageQuality
    ): Promise<{ original: { publicUrl: string; filePath: string }; thumbnail: { publicUrl: string; filePath: string } }> {
    
    // ⏱️ パフォーマンス計測開始
    const performanceStart = performance.now();
    const timings = {
        compressionStart: 0,
        compressionEnd: 0,
        signedUrlStart: 0,
        signedUrlEnd: 0,
        uploadStart: 0,
        uploadEnd: 0,
        totalStart: performanceStart
    };
    
    console.log('[画像アップロード] 開始:', {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        orgId,
        directory,
        aspectType,
        quality,
        currentOrigin: typeof window !== 'undefined' ? window.location.origin : 'サーバーサイド',
        currentHostname: typeof window !== 'undefined' ? window.location.hostname : 'サーバーサイド'
    })
    
    // 圧縮品質＆幅設定
    const settings = qualityTable[quality];

    try {
        // ⏱️ 圧縮処理時間計測
        timings.compressionStart = performance.now();
        
        // オリジナル画像圧縮
        console.log('[画像アップロード] オリジナル画像圧縮開始')
        const compressed = await compressAndCropImage(file, settings.original.width, aspectType, settings.original.quality);
        console.log('[画像アップロード] オリジナル画像圧縮完了:', compressed.name)

        // サムネイル圧縮
        console.log('[画像アップロード] サムネイル画像圧縮開始')
        const thumbnail = await compressAndCropImage(file, settings.thumb.width, aspectType, settings.thumb.quality);
        console.log('[画像アップロード] サムネイル画像圧縮完了:', thumbnail.name)
        
        timings.compressionEnd = performance.now();
        const compressionTime = timings.compressionEnd - timings.compressionStart;
        console.log(`[パフォーマンス] 圧縮処理時間: ${compressionTime.toFixed(2)}ms`)

        // 実際の圧縮ファイルのContent-Typeを取得（署名とPUTで一致させるため）
        const actualContentType = compressed.type;
        const ext = actualContentType === 'image/jpeg' ? '.jpg' : '.webp';
        // 安全なファイル名を生成（オリジナルとサムネイルで同じベース名を使用）
        const safeFileName = sanitizeFileName(file.name, ext);
        console.log('[画像アップロード] 安全なファイル名:', safeFileName)

        console.log('[画像アップロード] 実際のContent-Type:', actualContentType)
        console.log('[画像アップロード] サムネイルContent-Type:', thumbnail.type)

        // Content-Type整合性チェック
        if (compressed.type !== thumbnail.type) {
            console.warn('[画像アップロード] 警告: オリジナルとサムネイルのContent-Typeが異なります', {
                original: compressed.type,
                thumbnail: thumbnail.type
            });
        }

        // ⏱️ 署名付きURL取得時間計測
        timings.signedUrlStart = performance.now();

        // オリジナル画像の署名付きURL取得
        console.log('[画像アップロード] オリジナル署名付きURL取得開始')
        console.log('[画像アップロード] 署名に使用するContent-Type:', actualContentType)
        const res = await fetch('/api/storage/signed-url', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
            fileName: safeFileName,
            contentType: actualContentType,  // 実際のファイルタイプを使用
            orgId,
            directory: `${directory}/original`,
            }),
        });
        
        if (!res.ok) {
            const errorText = await res.text();
            console.error('[画像アップロード] オリジナル署名付きURL取得失敗:', {
                status: res.status,
                statusText: res.statusText,
                errorText
            })
            throw new Error(`オリジナル署名付きURLの取得に失敗: ${res.status} ${res.statusText} - ${errorText}`);
        }
        
        const { url: originalUrl, filePath: originalFilePath } = await res.json();
        console.log('[画像アップロード] オリジナル署名付きURL取得完了:', { originalFilePath })

        // サムネイル画像の署名付きURL取得
        console.log('[画像アップロード] サムネイル署名付きURL取得開始')
        const thumbRes = await fetch('/api/storage/signed-url', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
            fileName: safeFileName,
            contentType: actualContentType,  // 同じContent-Typeを使用
            orgId,
            directory: `${directory}/thumbnail`,
            }),
        });
        
        if (!thumbRes.ok) {
            const errorText = await thumbRes.text();
            console.error('[画像アップロード] サムネイル署名付きURL取得失敗:', {
                status: thumbRes.status,
                statusText: thumbRes.statusText,
                errorText
            })
            throw new Error(`サムネイル署名付きURLの取得に失敗: ${thumbRes.status} ${thumbRes.statusText} - ${errorText}`);
        }
        
        const { url: thumbUrl, filePath: thumbFilePath } = await thumbRes.json();
        console.log('[画像アップロード] サムネイル署名付きURL取得完了:', { thumbFilePath })
        
        timings.signedUrlEnd = performance.now();
        const signedUrlTime = timings.signedUrlEnd - timings.signedUrlStart;
        console.log(`[パフォーマンス] 署名付きURL取得時間: ${signedUrlTime.toFixed(2)}ms`)

        // ⏱️ アップロード時間計測
        timings.uploadStart = performance.now();
        
        // オリジナル＆サムネイルをそれぞれPUT直送（一時的に順次実行でテスト）
        console.log('[画像アップロード] GCSへの直送アップロード開始')
        console.log('[画像アップロード] オリジナルURL:', originalUrl.substring(0, 100) + '...')
        console.log('[画像アップロード] サムネイルURL:', thumbUrl.substring(0, 100) + '...')
        console.log('[画像アップロード] ファイルサイズ - オリジナル:', compressed.size, 'サムネイル:', thumbnail.size)
        
        // 並列アップロードで速度測定
        const uploadPromises = [
            // オリジナル画像アップロード
            (async () => {
                const uploadStartTime = performance.now();
                console.log('[画像アップロード] オリジナルPUT開始')
                try {
                    const originalResponse = await fetch(originalUrl, { 
                        method: 'PUT', 
                        headers: { 
                            'Content-Type': actualContentType,  // 署名時と同じContent-Typeを使用
                        }, 
                        body: compressed 
                    })
                    const uploadEndTime = performance.now();
                    const uploadDuration = uploadEndTime - uploadStartTime;
                    const speedMbps = (compressed.size * 8) / (uploadDuration / 1000) / (1024 * 1024);
                    
                    console.log(`[パフォーマンス] オリジナル画像アップロード: ${uploadDuration.toFixed(2)}ms, 速度: ${speedMbps.toFixed(2)}Mbps`)
                    
                    if (!originalResponse.ok) {
                        const errorText = await originalResponse.text().catch(() => 'レスポンス読み取り失敗')
                        console.error('[画像アップロード] オリジナルPUTエラー詳細:', {
                            status: originalResponse.status,
                            statusText: originalResponse.statusText,
                            errorText
                        })
                        throw new Error(`オリジナル画像のアップロードに失敗: ${originalResponse.status} ${originalResponse.statusText} - ${errorText}`)
                    }
                } catch (fetchError) {
                    console.error('[画像アップロード] オリジナルPUTネットワークエラー:', fetchError)
                    throw new Error(`オリジナル画像のPUTリクエストが失敗: ${fetchError instanceof Error ? fetchError.message : 'ネットワークエラー'}`)
                }
            })(),
            
            // サムネイル画像アップロード
            (async () => {
                const uploadStartTime = performance.now();
                console.log('[画像アップロード] サムネイルPUT開始')
                try {
                    const thumbnailResponse = await fetch(thumbUrl, { 
                        method: 'PUT', 
                        headers: { 
                            'Content-Type': actualContentType,  // 署名時と同じContent-Typeを使用
                        }, 
                        body: thumbnail 
                    })
                    const uploadEndTime = performance.now();
                    const uploadDuration = uploadEndTime - uploadStartTime;
                    const speedMbps = (thumbnail.size * 8) / (uploadDuration / 1000) / (1024 * 1024);
                    
                    console.log(`[パフォーマンス] サムネイル画像アップロード: ${uploadDuration.toFixed(2)}ms, 速度: ${speedMbps.toFixed(2)}Mbps`)
                    
                    if (!thumbnailResponse.ok) {
                        const errorText = await thumbnailResponse.text().catch(() => 'レスポンス読み取り失敗')
                        console.error('[画像アップロード] サムネイルPUTエラー詳細:', {
                            status: thumbnailResponse.status,
                            statusText: thumbnailResponse.statusText,
                            errorText
                        })
                        throw new Error(`サムネイル画像のアップロードに失敗: ${thumbnailResponse.status} ${thumbnailResponse.statusText} - ${errorText}`)
                    }
                } catch (fetchError) {
                    console.error('[画像アップロード] サムネイルPUTネットワークエラー:', fetchError)
                    throw new Error(`サムネイル画像のPUTリクエストが失敗: ${fetchError instanceof Error ? fetchError.message : 'ネットワークエラー'}`)
                }
            })()
        ];
        
        // 並列アップロード実行
        await Promise.all(uploadPromises);
        
        timings.uploadEnd = performance.now();
        const uploadTime = timings.uploadEnd - timings.uploadStart;
        console.log(`[パフォーマンス] 並列アップロード時間: ${uploadTime.toFixed(2)}ms`)
        
        console.log('[画像アップロード] GCSへの直送アップロード完了')

        const bucket = process.env.NEXT_PUBLIC_GCP_STORAGE_BUCKET_NAME!;
        
        if (!bucket) {
            console.error('[画像アップロード] バケット名が設定されていません')
            throw new Error('NEXT_PUBLIC_GCP_STORAGE_BUCKET_NAME環境変数が設定されていません')
        }
        
        const result = {
            original: { publicUrl: `https://storage.googleapis.com/${bucket}/${originalFilePath}`, filePath: originalFilePath },
            thumbnail: { publicUrl: `https://storage.googleapis.com/${bucket}/${thumbFilePath}`, filePath: thumbFilePath },
        };
        
        // ⏱️ 最終パフォーマンス報告
        const totalTime = performance.now() - timings.totalStart;
        const totalSize = compressed.size + thumbnail.size;
        const avgSpeedMbps = (totalSize * 8) / (uploadTime / 1000) / (1024 * 1024);
        
        console.log('[パフォーマンス] === 最終レポート ===');
        console.log(`[パフォーマンス] 画像圧縮: ${compressionTime.toFixed(2)}ms`);
        console.log(`[パフォーマンス] 署名付きURL: ${signedUrlTime.toFixed(2)}ms`);
        console.log(`[パフォーマンス] アップロード: ${uploadTime.toFixed(2)}ms`);
        console.log(`[パフォーマンス] 合計時間: ${totalTime.toFixed(2)}ms`);
        console.log(`[パフォーマンス] 合計サイズ: ${(totalSize / 1024 / 1024).toFixed(2)}MB`);
        console.log(`[パフォーマンス] 平均速度: ${avgSpeedMbps.toFixed(2)}Mbps`);
        
        console.log('[画像アップロード] 完了:', result)
        return result;
        
    } catch (error) {
        const totalErrorTime = performance.now() - timings.totalStart;
        console.error(`[画像アップロード] エラー発生 (${totalErrorTime.toFixed(2)}ms経過):`, error)
        throw error; // 呼び出し元でハンドリングするためにエラーを再throw
    }
}