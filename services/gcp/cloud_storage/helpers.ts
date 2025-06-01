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

  return `${timestamp}_${base}_${uuid}${preferredExt}`;
}

/**
 * フロントエンドで画像を指定のアスペクト比＆幅でリサイズ・圧縮する
 * @param file File 元画像
 * @param maxWidth number 最大幅
 * @param aspectType 'square' | 'landscape' | 'mobile'
 * @param quality 0〜1 圧縮率
 */
export async function compressAndCropImage(
  file: File,
  maxWidth: number,
  aspectType: 'square' | 'landscape' | 'mobile',
  quality: number
): Promise<File> {
  // --- エンコード可否を機能検出で判定 --------------------
  const canWebp = await canEncodeWebp();      // ← await OK  (functionは async)
  const mime = canWebp ? 'image/webp' : 'image/jpeg';
  const ext  = canWebp ? '.webp' : '.jpg';
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => {
      let { width, height } = img;
      let targetAspect = 1; // square
      if (aspectType === 'landscape') targetAspect = 16 / 9;
      if (aspectType === 'mobile') targetAspect = 2 / 3;

      let cropWidth = width, cropHeight = height;
      if (width / height > targetAspect) {
        cropHeight = height;
        cropWidth = Math.round(height * targetAspect);
      } else {
        cropWidth = width;
        cropHeight = Math.round(width / targetAspect);
      }

      const left = Math.floor((width - cropWidth) / 2);
      const top = Math.floor((height - cropHeight) / 2);

      // 切り抜き & リサイズ
      const canvas = document.createElement('canvas');
      const scale = maxWidth / cropWidth;
      canvas.width = maxWidth;
      canvas.height = cropHeight * scale;

      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, left, top, cropWidth, cropHeight, 0, 0, canvas.width, canvas.height);

      canvas.toBlob(
        (blob) => {
          if (!blob) return reject(new Error('圧縮失敗'));
          const compressedFile = new File(
            [blob],
            sanitizeFileName(file.name, ext),
            { type: mime }
          );
          resolve(compressedFile);
        },
        mime,
        quality
      );
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
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