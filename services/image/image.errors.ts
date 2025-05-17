import { throwConvexError } from '@/lib/error';

// throwConvexError の引数の型を動的に取得
type ConvexErrorArgs = Parameters<typeof throwConvexError>[0];

// 画像処理サービス固有のエラーのベースクラス
export class ImageServiceError extends Error {
  public status: number | null;
  public code: ConvexErrorArgs['code'];
  public callFunc: string;
  public title: string;
  public severity: ConvexErrorArgs['severity'];
  public details: Record<string, any> | null; // 型を ConvexErrorArgs に合わせる

  constructor(args: ConvexErrorArgs) {
    super(args.message);
    this.name = this.constructor.name;
    this.status = args.status;
    this.code = args.code;
    this.callFunc = args.callFunc;
    this.title = args.title;
    this.severity = args.severity;
    this.details = args.details ?? null; // undefined の場合に null を設定
  }

  toConvexErrorArgs(): ConvexErrorArgs {
    return {
      message: this.message,
      status: this.status,
      code: this.code,
      callFunc: this.callFunc,
      title: this.title,
      severity: this.severity,
      details: this.details,
    };
  }
}

export class EmptyFileError extends ImageServiceError {
  constructor(fileName?: string) {
    super({
      message: 'ファイルデータが空です',
      status: 400,
      code: 'INVALID_ARGUMENT',
      callFunc: 'ImageService.constructor', // エラー発生箇所をより具体的に
      title: 'ファイルデータが空です',
      severity: 'low',
      details: { fileName },
    });
  }
}

export class ImageProcessingError extends ImageServiceError {
  constructor(fileName?: string, originalError?: Error) {
    super({
      message: '画像圧縮に失敗しました',
      status: 500,
      code: 'INTERNAL_ERROR',
      callFunc: 'ImageService.compressImage',
      title: '画像圧縮失敗',
      severity: 'high',
      details: { fileName, error: originalError?.message, stack: originalError?.stack },
    });
  }
}

export class ImageUploadError extends ImageServiceError {
  constructor(fileName?: string, originalError?: Error) {
    super({
      message: '画像アップロードに失敗しました',
      status: 500,
      code: 'INTERNAL_ERROR',
      callFunc: 'ImageService.uploadToGCS',
      title: '画像アップロード失敗',
      severity: 'high',
      details: { fileName, error: originalError?.message, stack: originalError?.stack },
    });
  }
} 