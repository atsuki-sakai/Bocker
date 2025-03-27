import { Storage } from '@google-cloud/storage';
import { UploadResult } from './types';
import { BASE_URL } from './constants';
/**
 * GCSクライアントとバケット設定を管理するクラス
 */
export class GoogleStorageService {
  private storage: Storage | null = null;
  private bucketName: string | null = null;

  /**
   * 必要なときにGCSクライアントを初期化する
   */
  private initializeIfNeeded() {
    if (this.storage !== null) {
      return;
    }

    // 環境変数から値を取得
    const projectId = process.env.GCP_PROJECT;
    const clientEmail = process.env.GCP_CLIENT_EMAIL;
    const privateKey = process.env.GCP_PRIVATE_KEY;
    const bucketName = process.env.GCP_STORAGE_BUCKET_NAME;

    // 必要な環境変数が設定されているかチェック
    if (!projectId || !clientEmail || !privateKey || !bucketName) {
      throw new Error('必要な環境変数が設定されていません。');
    }

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
  }

  /**
   * ファイルをアップロードする
   */
  async uploadFile(file: File, directory: string): Promise<UploadResult> {
    this.initializeIfNeeded();

    try {
      const bucket = this.storage!.bucket(this.bucketName!);
      const timestamp = Date.now();
      const filePath = `${directory}/${timestamp}-${file.name}`;
      const blob = bucket.file(filePath);

      // ファイルをバッファに変換
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // アップロード
      await blob.save(buffer, {
        contentType: file.type,
        metadata: {
          cacheControl: 'public, max-age=31536000',
        },
      });

      // ファイルを公開状態に設定
      await blob.makePublic();

      // 公開URLを取得
      const publicUrl = `${BASE_URL}/${this.bucketName}/${filePath}`;

      return {
        publicUrl,
        filePath,
      };
    } catch (error) {
      console.error('Error uploading file:', error);
      throw new Error('ファイルのアップロードに失敗しました');
    }
  }

  /**
   * ファイルを削除する
   */
  async deleteFile(filename: string): Promise<void> {
    this.initializeIfNeeded();

    try {
      const bucket = this.storage!.bucket(this.bucketName!);
      const file = bucket.file(filename);
      await file.delete();
    } catch (error) {
      console.error('Error deleting file:', error);
      throw new Error('ファイルの削除に失敗しました');
    }
  }

  /**
   * ファイルの公開URLを取得する
   */
  getPublicUrl(filename: string): string {
    this.initializeIfNeeded();
    return `${BASE_URL}/${this.bucketName}/${filename}`;
  }
}
