import { Storage } from '@google-cloud/storage';
import { UploadResult } from './types';
import { STORAGE_URL } from './constants';

/**
 * GCSクライアントとバケット設定を管理するクラス
 */
class GoogleStorageService {
  private storage: Storage | null = null;
  private bucketName: string | null = null;

  /**
   * 必要な環境変数を取得し、存在しない場合はエラーを投げる
   */
  private getEnvConfig() {
    const projectId = process.env.GCP_PROJECT;
    const clientEmail = process.env.GCP_CLIENT_EMAIL;
    const privateKey = process.env.GCP_PRIVATE_KEY;
    const bucketName = process.env.NEXT_PUBLIC_GCP_STORAGE_BUCKET_NAME;
    if (!projectId || !clientEmail || !privateKey || !bucketName) {
      console.error('必要な環境変数が不足しています', {
        projectId: Boolean(projectId),
        clientEmail: Boolean(clientEmail),
        privateKey: Boolean(privateKey),
        bucketName: Boolean(bucketName),
      });
      throw new Error('必要な環境変数が設定されていません。');
    }
    return { projectId, clientEmail, privateKey, bucketName };
  }

  /**
   * 必要なときにGCSクライアントを初期化する
   */
  private initializeIfNeeded() {
    if (this.storage !== null) {
      return;
    }
    console.log('GCSクライアントの初期化開始');

    // 必要な環境変数をまとめて取得
    const { projectId, clientEmail, privateKey, bucketName } = this.getEnvConfig();
    console.log('環境変数取得完了', { projectId, clientEmail, bucketName });

    try {
      // 改行のエスケープ解除（もし \n で設定している場合）
      const formattedPrivateKey = privateKey.replace(/\\n/g, '\n');

      // Storage クライアントの初期化
      this.storage = new Storage({
        projectId,
        credentials: {
          client_email: clientEmail,
          private_key: formattedPrivateKey,
        },
      });

      this.bucketName = bucketName;
      console.log('GCSクライアントの初期化完了');
    } catch (error) {
      console.error('GCPストレージクライアントの初期化に失敗しました:', error);
      throw new Error(
        `GCPストレージクライアントの初期化に失敗しました: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * エラー詳細を抽出するユーティリティメソッド
   */
  private formatErrorDetails(error: unknown): Record<string, any> {
    const errorDetails: Record<string, any> = { type: typeof error };
    if (error instanceof Error) {
      errorDetails.name = error.name;
      errorDetails.message = error.message;
      errorDetails.stack = error.stack;
      Object.keys(error).forEach((key) => {
        try {
          const value = (error as any)[key];
          if (typeof value !== 'function') {
            errorDetails[key] = value;
          }
        } catch (e) {}
      });
    } else {
      try {
        errorDetails.stringified = JSON.stringify(error);
      } catch (e) {
        errorDetails.stringifyFailed = true;
      }
    }
    return errorDetails;
  }

  /**
   * バッファからファイルをアップロードする
   */
  async uploadFileBuffer(
    buffer: Buffer,
    fileName: string,
    contentType: string,
    directory: string
  ): Promise<UploadResult> {
    this.initializeIfNeeded();

    try {
      const bucket = this.storage!.bucket(this.bucketName!);
      console.log('Bucket取得成功', { bucketName: this.bucketName });
      const timestamp = Date.now();
      const filePath = `${directory}/${timestamp}-${fileName}`;
      console.log('生成されたファイルパス:', filePath);
      const blob = bucket.file(filePath);

      console.log(
        `バッファのアップロード開始: ${filePath}, サイズ: ${buffer.length} バイト, タイプ: ${contentType}`
      );

      // バッファから直接アップロード
      await blob.save(buffer, {
        contentType: contentType,
        metadata: {
          cacheControl: 'public, max-age=31536000',
        },
      });

      console.log(`バッファのアップロードが完了しました: ${filePath}`);

      // ファイルを公開状態に設定
      try {
        await blob.makePublic();
        console.log(`ファイルを公開状態に設定しました: ${filePath}`);
      } catch (publicError) {
        // エラーの詳細を出力
        console.warn(
          `個別ファイルの公開設定に失敗しました:`,
          publicError instanceof Error
            ? {
                message: publicError.message,
                stack: publicError.stack,
                name: publicError.name,
              }
            : publicError
        );

        // バケットレベルのアクセス制御が設定されていれば問題ない
        console.log('バケットレベルのIAMポリシーでの公開アクセスを使用します');
      }

      // 公開URLを取得
      const publicUrl = `${STORAGE_URL}/${this.bucketName}/${filePath}`;

      return {
        publicUrl,
        filePath,
      };
    } catch (error) {
      const errorDetails = this.formatErrorDetails(error);
      console.error('バッファからのアップロードに失敗しました:', errorDetails, {
        fileName,
        contentType,
        bufferSize: buffer.length,
        directory,
      });
      throw new Error(
        `バッファからのアップロードに失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * imgUrl から GCS 内のファイルパスを抽出する
   */
  private extractFilePath(imgUrl: string): string {
    const storageUrl = `${STORAGE_URL}/${process.env.NEXT_PUBLIC_GCP_STORAGE_BUCKET_NAME}`;
    if (imgUrl.startsWith(storageUrl)) {
      return imgUrl.substring(storageUrl.length + 1);
    }
    return imgUrl;
  }

  /**
   * ファイルを削除する
   */
  async deleteImage(imgUrl: string): Promise<void> {
    this.initializeIfNeeded();

    const filePath = this.extractFilePath(imgUrl);

    try {
      const bucket = this.storage!.bucket(this.bucketName!);
      const file = bucket.file(filePath);
      await file.delete();
    } catch (error) {
      console.error('Error deleting file:', error);
      throw new Error('ファイルの削除に失敗しました');
    }
  }
}

export const gcsService = new GoogleStorageService();