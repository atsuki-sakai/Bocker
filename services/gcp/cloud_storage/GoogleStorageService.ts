import { Storage } from '@google-cloud/storage';
import { STORAGE_URL } from './constants'
import { SystemError } from '@/lib/errors/custom_errors';
import { ERROR_STATUS_CODE, ERROR_SEVERITY } from '@/lib/errors/constants';
import { sanitizeFileName } from '@/lib/utils'
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import sharp from 'sharp';
import { Id } from '@/convex/_generated/dataModel';
import { ImageDirectory, ImageQuality, ProcessedImageResult, UploadedFileResult } from './types';
/**
 * GCSクライアントとバケット設定を管理し、画像処理機能も提供するクラス
 */
class GoogleStorageService {
  private storage: Storage | null = null
  private bucketName: string | null = null
  private readonly activeFormat: "webp" | "avif" = 'webp';
  // activeFormatに基づいて拡張子とMIMEタイプを定義
  private readonly extension = this.activeFormat === 'webp' ? '.webp' : '.avif';
  private readonly mimeType = this.activeFormat === 'webp' ? 'image/webp' : 'image/avif';

  /**
   * 必要な環境変数を取得し、存在しない場合はエラーを投げる
   */
  private getEnvConfig() {
    const projectId = process.env.GCP_PROJECT
    const clientEmail = process.env.GCP_CLIENT_EMAIL
    const privateKey = process.env.GCP_PRIVATE_KEY
    const bucketName = process.env.NEXT_PUBLIC_GCP_STORAGE_BUCKET_NAME
    if (!projectId || !clientEmail || !privateKey || !bucketName) {
      throw new SystemError(
        'GCS接続に必要な環境変数が不足しています。',
        {
          statusCode: ERROR_STATUS_CODE.INTERNAL_SERVER_ERROR,
          severity: ERROR_SEVERITY.ERROR,
          code: 'INTERNAL_SERVER_ERROR',
          status: 500,
          callFunc: 'GoogleStorageService.getEnvConfig',
          message: 'GCS接続に必要な環境変数が不足しています。',
          title: '環境変数設定エラー',
          details: {
            error: 'Required environment variables for GCS are missing.',
            projectIdExists: Boolean(projectId),
            clientEmailExists: Boolean(clientEmail),
            privateKeyExists: Boolean(privateKey),
            bucketNameExists: Boolean(bucketName),
          },
        }
      );
    }
    return { projectId, clientEmail, privateKey, bucketName }
  }

  /**
   * 必要なときにGCSクライアントを初期化する
   */
  private initializeIfNeeded() {
    if (this.storage !== null) {
      return
    }

    // 必要な環境変数をまとめて取得
    const { projectId, clientEmail, privateKey, bucketName } = this.getEnvConfig()
    try {
      // 改行のエスケープ解除（もし \n で設定している場合）
      const formattedPrivateKey = privateKey.replace(/\\n/g, '\n')

      // Storage クライアントの初期化
      this.storage = new Storage({
        projectId,
        credentials: {
          client_email: clientEmail,
          private_key: formattedPrivateKey,
        },
      })

      this.bucketName = bucketName
    } catch (error) {
      throw new SystemError(
        'GCPストレージクライアントの初期化に失敗しました',
        {
          statusCode: ERROR_STATUS_CODE.INTERNAL_SERVER_ERROR,
          severity: ERROR_SEVERITY.ERROR,
          callFunc: 'GoogleStorageService.initializeIfNeeded',
          message: 'GCPストレージクライアントの初期化に失敗しました',
          code: 'INTERNAL_SERVER_ERROR',
          status: 500,
          title: 'GCS初期化失敗',
          details: {
            error: this.formatErrorDetails(error),
          },
        }
      )
    }
  }

  /**
   * エラー詳細を抽出するユーティリティメソッド
   * any の使用を避け、より安全な型処理を行う
   */
  private formatErrorDetails(error: unknown): Record<string, unknown> {
    const errorDetails: Record<string, unknown> = { type: typeof error };
    if (error instanceof Error) {
      errorDetails.name = error.name;
      errorDetails.message = error.message;
      errorDetails.stack = error.stack;
      // Errorオブジェクトの追加プロパティを安全に取得
      Object.keys(error).forEach((key) => {
        if (key === 'name' || key === 'message' || key === 'stack') return;
        if (Object.prototype.hasOwnProperty.call(error, key)) {
          // unknown を経由して Record<string, unknown> にキャスト
          const value = (error as unknown as Record<string, unknown>)[key];
          if (typeof value !== 'function') {
            errorDetails[key] = value;
          }
        }
      });
      
    } else {
      try {
        errorDetails.stringified = JSON.stringify(error);
      } catch (stringifyError) {
        errorDetails.stringifyFailed = true;
        errorDetails.originalValue = String(error);
      }
    }
    return errorDetails;
  }

  /**
   * 画像品質に応じた圧縮設定を取得する
   * @param quality 画像品質 ('low' | 'medium' | 'high')
   * @returns 圧縮設定 (オリジナル品質、オリジナル幅、サムネイル品質、サムネイル幅)
   */
  private getCompressionSettings(quality?: ImageQuality) {
    const originalQualityValue = quality === "low" ? 40 : quality === "medium" ? 55 : 75;
    const originalWidth = quality === "low" ? 700 : quality === "medium" ? 1280 : 1920;
    const thumbnailQualityValue = quality === "low" ? 30 : quality === "medium" ? 40 : 50;
    const thumbnailWidth = quality === "low" ? 150 : quality === "medium" ? 240 : 360;
    return { originalQualityValue, originalWidth, thumbnailQualityValue, thumbnailWidth };
  }

  /**
 * 指定された設定で画像を圧縮する
 * @param inputBuffer 入力画像バッファ
 * @param maxWidth 最大幅
 * @param compressionQuality 圧縮品質
 * @returns 圧縮された画像バッファ
 */
private async compressImage(
  inputBuffer: Buffer,
  maxWidth: number,
  compressionQuality: number,
): Promise<Buffer> {
  if (inputBuffer.length === 0) {
    throw new SystemError(
      '圧縮対象の画像バッファが空です。',
      {
        statusCode: ERROR_STATUS_CODE.UNPROCESSABLE_ENTITY,
        severity: ERROR_SEVERITY.ERROR,
        callFunc: 'GoogleStorageService.compressImage',
        message: '圧縮対象の画像バッファが空です。',
        code: 'UNPROCESSABLE_ENTITY',
        status: 400,
        title: '空の画像データ',
        details: {
          error: 'Input buffer for image compression is empty.',
          maxWidth,
          compressionQuality,
        },
      }
    )
  }
  try {
    // 1. sharpインスタンス生成とメタデータ取得
    const sharpInstance = sharp(inputBuffer).withMetadata();
    const metadata = await sharpInstance.metadata();

    // 2. アスペクト比2:3（4:6）で中央トリミング
    let { width, height } = metadata;
    if (!width || !height) {
      throw new Error('画像サイズを取得できませんでした');
    }
    const targetAspect = 2 / 3; // 4:6 = 2:3
    let cropWidth = width;
    let cropHeight = height;

    if (width / height > targetAspect) {
      // 横長 → 横方向をカット
      cropHeight = height;
      cropWidth = Math.round(height * targetAspect);
    } else {
      // 縦長 → 縦方向をカット
      cropWidth = width;
      cropHeight = Math.round(width / targetAspect);
    }

    const left = Math.floor((width - cropWidth) / 2);
    const top = Math.floor((height - cropHeight) / 2);

    // 3. トリミング→リサイズ→圧縮
    let processed = sharp(inputBuffer)
      .extract({ left, top, width: cropWidth, height: cropHeight })
      .resize({ width: maxWidth, withoutEnlargement: true });

    // 4. 圧縮保存
    if (this.activeFormat === 'avif') {
      return await processed.avif({ quality: compressionQuality, effort: 4 }).toBuffer();
    } else {
      return await processed.webp({ quality: compressionQuality }).toBuffer();
    }
  } catch (originalError) {
    throw new SystemError(
      '画像圧縮処理中にエラーが発生しました。',
      {
        statusCode: ERROR_STATUS_CODE.INTERNAL_SERVER_ERROR,
        severity: ERROR_SEVERITY.ERROR,
        callFunc: 'GoogleStorageService.compressImage',
        message: '画像圧縮処理中にエラーが発生しました。',
        code: 'INTERNAL_SERVER_ERROR',
        status: 500,
        title: '画像圧縮失敗',
        details: {
          error: this.formatErrorDetails(originalError),
          inputBufferSize: inputBuffer.length,
          maxWidth,
          compressionQuality,
          activeFormat: this.activeFormat,
        },
    });
  }
}

  /**
   * バッファからファイルをアップロードする
   * (UploadedFileResult を返すように変更)
   */
  async uploadFileBuffer(
    buffer: Buffer,
    fileName: string, // ここで渡されるfileNameは拡張子を含むことを期待
    contentType: string, // このcontentTypeは圧縮後のもの(this.mimeType)を期待
    directory: string,
    org_id: Id<'organization'>,
    isHotSpot: boolean = false
  ): Promise<UploadedFileResult> {
    this.initializeIfNeeded()

    // サニタイズは行うが、拡張子はこの時点では変更しない
    const safeFileName = sanitizeFileName(fileName);

    if (buffer.length === 0) {
      throw new SystemError(
        'アップロードするファイルデータが空です。',
        {
          statusCode: ERROR_STATUS_CODE.UNPROCESSABLE_ENTITY,
          severity: ERROR_SEVERITY.ERROR,
          callFunc: 'GoogleStorageService.uploadFileBuffer',
          message: 'アップロードするファイルデータが空です。',
          code: 'UNPROCESSABLE_ENTITY',
          status: 400,
          title: '空ファイルエラー',
          details: {
            error: 'Attempted to upload an empty buffer.',
            fileName: safeFileName,
            contentType,
            directory,
            org_id,
            isHotSpot,
          },
      });
    }

    try {
      const bucket = this.storage!.bucket(this.bucketName!)
      let gcsFilePath: string; // GCS上の最終的なパス。拡張子はthis.extensionが使われる場合がある

      // ファイル名のベース部分（拡張子なし）と拡張子部分を取得
      // safeFileNameが 'example.png' の場合、base = 'example', ext = '.png' (元の拡張子)
      const lastDotIndex = safeFileName.lastIndexOf('.');
      let baseName = lastDotIndex === -1 ? safeFileName : safeFileName.substring(0, lastDotIndex);
      // let originalExt = lastDotIndex === -1 ? '' : safeFileName.substring(lastDotIndex);
      // このメソッドは汎用的なバッファアップロードなので、contentTypeに基づいて動作すべき。
      // 圧縮処理と組み合わせる uploadCompressedImageWithThumbnail で拡張子 (this.extension) は制御される。
      // fileName パラメータには既に意図した拡張子が含まれている想定とする。

      if (isHotSpot) {
        const uuid = uuidv4();
        const hash = crypto.createHash('sha1').update(uuid).digest('hex').slice(0, 6);
        const hashDir = `${hash.slice(0,2)}/${hash.slice(2,4)}/${hash.slice(4,6)}`;
        const now = new Date();
        const year = now.getFullYear();
        const month = ('0' + (now.getMonth() + 1)).slice(-2);
        const day = ('0' + now.getDate()).slice(-2);
        // isHotSpotの場合、ファイル名はUUIDとし、拡張子はfileNameから取得したものをそのまま使う
        gcsFilePath = `${org_id}/${directory}/${year}/${month}/${day}/${hashDir}/${uuid}${safeFileName.substring(safeFileName.lastIndexOf('.'))}`;
      } else {
        const timestamp = new Date().toISOString().replace(/[-:Z]/g, '').split('.')[0];
        // 通常時も、fileNameに含まれる拡張子をそのまま使用
        gcsFilePath = `${org_id}/${directory}/${timestamp}_${safeFileName}`;
      }
      const blob = bucket.file(gcsFilePath)

      await blob.save(buffer, {
        contentType: contentType, // 呼び出し元が正しいcontentTypeを指定することを信頼
        metadata: {
          cacheControl: 'public, max-age=31536000',
        },
      })

      const publicUrl = `${STORAGE_URL}/${this.bucketName}/${encodeURI(gcsFilePath)}`

      return {
        publicUrl,
        filePath: gcsFilePath, // GCS内の実際のパスを返す
      }
    } catch (error) {
      const errorDetails = this.formatErrorDetails(error)
      if ((error as any)?.isConvexError) {
        throw error;
      }
      throw new SystemError(
        'バッファからのファイルアップロードに失敗しました。',
        {
          statusCode: ERROR_STATUS_CODE.INTERNAL_SERVER_ERROR,
          severity: ERROR_SEVERITY.ERROR,
          callFunc: 'GoogleStorageService.uploadFileBuffer',
          message: 'バッファからのファイルアップロードに失敗しました。',
          code: 'INTERNAL_SERVER_ERROR',
          status: 500,
          title: 'ファイルアップロード失敗',
          details: {
            fileName: safeFileName,
            contentType,
            bufferSize: buffer.length,
            directory,
            org_id,
            isHotSpot,
            error: errorDetails,
          },
        }
      )
    }
  }

  /**
   * Base64エンコードされた画像を圧縮し、オリジナルとサムネイルをGCSにアップロードする
   * @param base64Data Base64エンコードされた画像データ
   * @param originalFileName 元のファイル名 (例: "myImage.jpg", "profile.png")。拡張子も含む。
   * @param directory 保存先ディレクトリ種別 (例: 'menu', 'staff')
   * @param org_id 組織ID
   * @param quality 画像品質設定 ('low' | 'high')
   * @param isHotSpot ホットスポット対策を適用するかどうか
   * @returns オリジナル画像とサムネイル画像の公開URLとGCSパス
   */
  async uploadCompressedImageWithThumbnail(
    base64Data: string,
    originalFileName: string, // 元のファイル名 (拡張子含む)
    directory: ImageDirectory,
    org_id: Id<'organization'>,
    quality?: ImageQuality,
    isHotSpot: boolean = false
  ): Promise<ProcessedImageResult> {
    this.initializeIfNeeded();

    const safeOriginalFileName = sanitizeFileName(originalFileName);

    if (!base64Data) { // null or empty string check
      throw new SystemError(
        '処理するBase64画像データが提供されていません。',
        {
          statusCode: ERROR_STATUS_CODE.UNPROCESSABLE_ENTITY,
          severity: ERROR_SEVERITY.ERROR,
          callFunc: 'GoogleStorageService.uploadCompressedImageWithThumbnail',
          message: '処理するBase64画像データが提供されていません。',
          code: 'UNPROCESSABLE_ENTITY',
          status: 400,
          title: 'Base64データ不備',
          details: {
            error: 'Base64 data for image processing is missing or empty.',
            originalFileName: safeOriginalFileName,
            directory,
            org_id,
            quality,
            isHotSpot,
          },
        }
      );
    }
    
    let imageBuffer: Buffer;
    try {
      imageBuffer = Buffer.from(base64Data, 'base64');
    } catch (bufferError) {
      throw new SystemError(
        'Base64データのデコードに失敗しました。',
        {
          statusCode: ERROR_STATUS_CODE.UNPROCESSABLE_ENTITY,
          severity: ERROR_SEVERITY.ERROR,
          callFunc: 'GoogleStorageService.uploadCompressedImageWithThumbnail',
          message: 'Base64データのデコードに失敗しました。',
          code: 'UNPROCESSABLE_ENTITY',
          status: 400,
          title: 'Base64デコード失敗',
          details: {
            error: this.formatErrorDetails(bufferError),
            originalFileName: safeOriginalFileName,
            directory, org_id, quality, isHotSpot
          },
        }
      );
    }

    if (imageBuffer.length === 0) {
      throw new SystemError(
        'デコード後の画像データが空です。',
        {
          statusCode: ERROR_STATUS_CODE.UNPROCESSABLE_ENTITY,
          severity: ERROR_SEVERITY.ERROR,
          callFunc: 'GoogleStorageService.uploadCompressedImageWithThumbnail',
          message: 'デコード後の画像データが空です。',
          code: 'UNPROCESSABLE_ENTITY',
          status: 400,
          title: '空画像データ',
          details: {
            error: 'Decoded image buffer is empty.',
            originalFileName: safeOriginalFileName,
            directory, org_id, quality, isHotSpot
          },
        }
      );
    }

    const { originalQualityValue, originalWidth, thumbnailQualityValue, thumbnailWidth } = this.getCompressionSettings(quality);

    let uploadedOriginalFile: UploadedFileResult | undefined = undefined;
    let uploadedThumbnailFile: UploadedFileResult | undefined = undefined;

    try {
      // 画像圧縮処理 (オリジナルとサムネイル)
      const originalCompressedBuffer = await this.compressImage(imageBuffer, originalWidth, originalQualityValue);
      const thumbnailCompressedBuffer = await this.compressImage(imageBuffer, thumbnailWidth, thumbnailQualityValue);

      if (originalCompressedBuffer.length === 0 || thumbnailCompressedBuffer.length === 0) {
        throw new SystemError(
          '画像圧縮後、バッファが空になりました。',
          {
            statusCode: ERROR_STATUS_CODE.INTERNAL_SERVER_ERROR,
            severity: ERROR_SEVERITY.ERROR,
            callFunc: 'GoogleStorageService.uploadCompressedImageWithThumbnail',
            message: '画像圧縮後、バッファが空になりました。',
            code: 'INTERNAL_SERVER_ERROR',
            status: 500,
            title: '画像圧縮エラー（空バッファ）',
            details: {
              error: 'Image compression resulted in an empty buffer.',
              originalFileName: safeOriginalFileName,
              originalBufferLength: originalCompressedBuffer.length,
              thumbnailBufferLength: thumbnailCompressedBuffer.length,
              directory, org_id, quality, isHotSpot, activeCompressFormat: this.activeFormat,
            },
          }
        );
      }

      // GCSにアップロードするファイル名を生成
      // 元のファイル名から拡張子を除いた部分を取得しサニタイズ
      const lastDotIndex = safeOriginalFileName.lastIndexOf('.');
      const baseName = sanitizeFileName(lastDotIndex === -1 ? safeOriginalFileName : safeOriginalFileName.substring(0, lastDotIndex));

      let finalOriginalName: string;
      let finalThumbnailName: string;

      if (isHotSpot) {
        // ホットスポット回避: UUIDベースのファイル名 + 圧縮後の拡張子 (this.extension)
        finalOriginalName = `${uuidv4()}${this.extension}`;
        finalThumbnailName = `${uuidv4()}${this.extension}`;
      } else {
        // 通常: タイムスタンプ + サニタイズされたベース名 + 圧縮後の拡張子 (this.extension)
        const timestamp = new Date().toISOString().replace(/[-:Z]/g, '').split('.')[0];
        finalOriginalName = `${timestamp}_${baseName}${this.extension}`;
        finalThumbnailName = `${timestamp}_${baseName}${this.extension}`;
      }

      // GCSへのアップロード (Promise.allで並列処理)
      // uploadFileBuffer に渡すディレクトリパスを具体的に指定
      const [originalResult, thumbnailResult] = await Promise.all([
        this.uploadFileBuffer(
          originalCompressedBuffer,
          finalOriginalName,      // 拡張子(this.extension) を含んだユニークなファイル名
          this.mimeType,          // 圧縮後のMIMEタイプ (this.mimeType)
          directory + '/original', // GCS上の具体的なディレクトリパス
          org_id,
          isHotSpot
        ),
        this.uploadFileBuffer(
          thumbnailCompressedBuffer,
          finalThumbnailName,     // 拡張子(this.extension) を含んだユニークなファイル名 (サムネイル用)
          this.mimeType,          // 圧縮後のMIMEタイプ (this.mimeType)
          directory + '/thumbnail',// GCS上の具体的なディレクトリパス
          org_id,
          isHotSpot             // サムネイルも同様にホットスポット対策を適用
        ),
      ]);
      uploadedOriginalFile = originalResult;
      uploadedThumbnailFile = thumbnailResult;

      return {
        originalUrl: uploadedOriginalFile.publicUrl,
        thumbnailUrl: uploadedThumbnailFile.publicUrl,
      };
    } catch (error) {
      // エラー発生時、アップロード済みのファイルを削除する試み (ロールバック)
      const deletionPromises: Promise<void>[] = [];
      if (uploadedOriginalFile?.filePath) {
        deletionPromises.push(this.deleteObjectByPath(uploadedOriginalFile.filePath).catch(delErr => {
          console.error('ロールバック：オリジナル画像の削除失敗:', uploadedOriginalFile?.filePath, this.formatErrorDetails(delErr));
        }));
      }
      if (uploadedThumbnailFile?.filePath) {
        deletionPromises.push(this.deleteObjectByPath(uploadedThumbnailFile.filePath).catch(delErr => {
          console.error('ロールバック：サムネイル画像の削除失敗:', uploadedThumbnailFile?.filePath, this.formatErrorDetails(delErr));
        }));
      }
      if (deletionPromises.length > 0) {
        // ロールバック処理の完了を待つが、ここでのエラーはキャッチしてログ出力に留める
        // 主エラーをユーザーに返すため
        Promise.allSettled(deletionPromises).then(results => {
            results.forEach(result => {
                if(result.status === 'rejected') {
                    console.error("ロールバック中のファイル削除でエラー:", result.reason);
                }
            });
        });
      }

      if ((error as any)?.isConvexError) {
          throw error; // 既にConvexErrorならそのままスロー
      }
      // それ以外のエラーはここで throwConvexError を使ってラップ
      throw new SystemError(
        '画像とサムネイルのアップロード処理中に予期せぬエラーが発生しました。',
        {
          statusCode: ERROR_STATUS_CODE.INTERNAL_SERVER_ERROR,
          severity: ERROR_SEVERITY.ERROR,
          callFunc: 'GoogleStorageService.uploadCompressedImageWithThumbnail',
          message: '画像とサムネイルのアップロード処理中に予期せぬエラーが発生しました。',
          code: 'INTERNAL_SERVER_ERROR',
          status: 500,
          title: '画像アップロード包括エラー',
          details: {
            error: this.formatErrorDetails(error),
            originalFileName: safeOriginalFileName,
            directory,
            org_id,
            isHotSpot,
            quality,
            activeCompressFormat: this.activeFormat,
            uploadedOriginalPath: uploadedOriginalFile?.filePath,
            uploadedThumbnailPath: uploadedThumbnailFile?.filePath,
          },
        }
      );
    }
  }

  /**
   * imgUrl から GCS 内のファイルパスを抽出する
   */
  private extractFilePath(imgUrl: string): string {
    if (!imgUrl || typeof imgUrl !== 'string') {
        throw new SystemError(
          'imgUrlが有効な文字列ではありません。',
          {
            statusCode: ERROR_STATUS_CODE.UNPROCESSABLE_ENTITY,
            severity: ERROR_SEVERITY.ERROR,
            callFunc: 'GoogleStorageService.extractFilePath',
            message: 'imgUrlが有効な文字列ではありません。',
            code: 'UNPROCESSABLE_ENTITY',
            status: 400,
            title: '不正な画像URL',
            details: { error: 'imgUrl must be a non-empty string.', receivedImgUrl: imgUrl }
          }
        );
    }
    try {
      const url = new URL(imgUrl);
      const segments = url.pathname.split('/');
      if (segments.length < 3 || segments[1] !== this.bucketName) {
          throw new Error('URLが期待されるGCSの形式ではありません。');
      }
      return segments.slice(2).join('/');
    } catch (e) {
       // URL解析失敗時はimgUrl自体がパスであると仮定するが、基本的な検証は行う
       if (imgUrl.includes('://') || imgUrl.startsWith('/')) {
           throw new SystemError(
            'imgUrlをファイルパスとして解析できませんでした。',
            {
              statusCode: ERROR_STATUS_CODE.UNPROCESSABLE_ENTITY,
              severity: ERROR_SEVERITY.ERROR,
              callFunc: 'GoogleStorageService.extractFilePath',
              message: 'imgUrlをファイルパスとして解析できませんでした。',
              code: 'UNPROCESSABLE_ENTITY',
              status: 400,
              title: '不正なパス形式',
              details: { error: this.formatErrorDetails(e), imgUrl }
            }
        );
       }
      return imgUrl;
    }
  }

  /**
   * ファイルを削除する (imgUrl指定)
   * GCSオブジェクトが見つからない(404)場合は警告ログを出力し、エラーをスローしない。
   */
  async deleteImage(imgUrl: string): Promise<void> {
    this.initializeIfNeeded()

    // decode in case imgUrl or stored key is URL‑encoded
    const filePath = decodeURIComponent(this.extractFilePath(imgUrl))
    console.log('GCSオブジェクトを削除します (imgUrl指定):', filePath);

    try {
      const bucket = this.storage!.bucket(this.bucketName!)
      const file = bucket.file(filePath)
      await file.delete()
      console.log('GCSオブジェクトが正常に削除されました:', filePath);
    } catch (error) {
      const errorDetails = this.formatErrorDetails(error)
      const errAny = error as any;
      if (errAny.code === 404 || (errorDetails.originalError as any)?.code === 404 || String(errorDetails.message).includes('No such object')) {
        console.warn(`GCSオブジェクトが見つからなかったため、削除をスキップしました: ${filePath}`);
        return;
      }
      throw new SystemError(
        'GCSからのファイル削除中にエラーが発生しました (imgUrl指定)。',
        {
          statusCode: ERROR_STATUS_CODE.INTERNAL_SERVER_ERROR,
          severity: ERROR_SEVERITY.ERROR,
          callFunc: 'GoogleStorageService.deleteImage',
          message: 'GCSからのファイル削除中にエラーが発生しました (imgUrl指定)。',
          code: 'INTERNAL_SERVER_ERROR',
          title: 'ファイル削除失敗',
          details: { error: errorDetails, imgUrl, filePath },
        }
      );
    }
  }

  /**
   * GCS内のファイルパスを指定してオブジェクトを直接削除するプライベートメソッド
   * 主にロールバック処理で使用。404エラーは警告ログのみとし、エラーをスローしない。
   */
  private async deleteObjectByPath(filePath: string): Promise<void> {
    if (!filePath || typeof filePath !== 'string') {
      console.warn('削除対象のファイルパスが無効です。スキップします。', { filePath });
      return;
    }
    this.initializeIfNeeded();
    console.log('GCSオブジェクトを削除します (filePath指定):', filePath);
    try {
      const bucket = this.storage!.bucket(this.bucketName!);
      const file = bucket.file(filePath);
      await file.delete();
      console.log('GCSオブジェクトが正常に削除されました:', filePath);
    } catch (originalError) {
      // 404以外のエラーはロールバック処理のコンテキストではログ出力に留める
      console.error(`GCSオブジェクトの削除に失敗しました (filePath指定): ${filePath}`, this.formatErrorDetails(originalError));
    }
  }

  /**
   * オリジナル画像とサムネイル画像の両方を削除する
   * （ファイルパスの命名規則からサムネイルパスを推測）
   * imgUrl はオリジナル画像のものを期待する。
   */
  async deleteImageWithThumbnail(imgUrl: string): Promise<void> {
    this.initializeIfNeeded()

    let originalPath: string | undefined = undefined;
    let thumbnailPath: string | undefined = undefined;

    try {
      // オリジナル画像のパスを抽出 (URLデコードも行う)
      originalPath = decodeURIComponent(this.extractFilePath(imgUrl));

      // サムネイルのパスを推測
      // GCSのパス構造 'salonId/directory/original/...' から 'salonId/directory/thumbnail/...' へ
      if (originalPath.includes('/original/')) {
        thumbnailPath = originalPath.replace('/original/', '/thumbnail/');
      } else {
        console.warn(`オリジナル画像のパスからサムネイルパスを推測できませんでした: ${originalPath}`);
        await this.deleteObjectByPath(originalPath);
        return;
      }

      console.log('オリジナル画像を削除します:', originalPath);
      console.log('サムネイル画像を削除します:', thumbnailPath);

      // 両方のファイルを削除 (Promise.allSettled を使い、片方の失敗がもう片方に影響しないようにする)
      const results = await Promise.allSettled([
        this.deleteObjectByPath(originalPath),
        this.deleteObjectByPath(thumbnailPath),
      ]);

      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          const path = index === 0 ? originalPath : thumbnailPath;
          console.warn(`${index === 0 ? 'オリジナル' : 'サムネイル'}画像の削除処理で問題が発生しました (詳細は先行ログ参照): ${path}`);
        }
      });

    } catch (error) {
      const errorDetails = this.formatErrorDetails(error)
      throw new SystemError(
        'オリジナル画像とサムネイル画像の削除処理中に予期せぬエラーが発生しました。',
        {
          statusCode: ERROR_STATUS_CODE.INTERNAL_SERVER_ERROR,
          severity: ERROR_SEVERITY.ERROR,
          callFunc: 'GoogleStorageService.deleteImageWithThumbnail',
          message: 'オリジナル画像とサムネイル画像の削除処理中に予期せぬエラーが発生しました。',
          code: 'INTERNAL_SERVER_ERROR',
          status: 500,
          title: '画像一括削除失敗',
          details: {
          error: errorDetails,
          originalImgUrl: imgUrl,
          derivedOriginalPath: originalPath,
          derivedThumbnailPath: thumbnailPath,
        },
      })
    }
  }
}

export const gcsService = new GoogleStorageService();