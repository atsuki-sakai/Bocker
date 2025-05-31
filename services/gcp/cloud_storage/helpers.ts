import { AspectType } from "@/convex/types";
import { ImageQuality } from "./types";

const qualityTable = {
    low: { original: { width: 700, quality: 0.4 }, thumb: { width: 150, quality: 0.3 }},
    medium: { original: { width: 1280, quality: 0.55 }, thumb: { width: 240, quality: 0.4 }},
    high: { original: { width: 1920, quality: 0.75 }, thumb: { width: 360, quality: 0.5 }},
};

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
            file.name.replace(/\.[^.]+$/, '') + '.webp',
            { type: 'image/webp' }
        );
        resolve(compressedFile);
        },
        'image/webp',
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
    // 圧縮品質＆幅設定
    const settings = qualityTable[quality];

    // オリジナル画像圧縮
    const compressed = await compressAndCropImage(file, settings.original.width, aspectType, settings.original.quality);

    // サムネイル圧縮
    const thumbnail = await compressAndCropImage(file, settings.thumb.width, aspectType, settings.thumb.quality);

    // オリジナル画像の署名付きURL取得
    const res = await fetch('/api/storage/signed-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
        fileName: compressed.name,
        contentType: compressed.type,
        orgId,
        directory: `${directory}/original`,
        }),
    });
    if (!res.ok) throw new Error('オリジナル署名付きURLの取得に失敗');
    const { url: originalUrl, filePath: originalFilePath } = await res.json();

    // サムネイル画像の署名付きURL取得
    const thumbRes = await fetch('/api/storage/signed-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
        fileName: thumbnail.name,
        contentType: thumbnail.type,
        orgId,
        directory: `${directory}/thumbnail`,
        }),
    });
    if (!thumbRes.ok) throw new Error('サムネイル署名付きURLの取得に失敗');
    const { url: thumbUrl, filePath: thumbFilePath } = await thumbRes.json();

    // オリジナル＆サムネイルをそれぞれPUT直送
    await Promise.all([
        fetch(originalUrl, { method: 'PUT', headers: { 'Content-Type': compressed.type }, body: compressed }),
        fetch(thumbUrl, { method: 'PUT', headers: { 'Content-Type': thumbnail.type }, body: thumbnail }),
    ]);

    const bucket = process.env.NEXT_PUBLIC_GCP_STORAGE_BUCKET_NAME!;
    return {
        original: { publicUrl: `https://storage.googleapis.com/${bucket}/${originalFilePath}`, filePath: originalFilePath },
        thumbnail: { publicUrl: `https://storage.googleapis.com/${bucket}/${thumbFilePath}`, filePath: thumbFilePath },
    };

    }