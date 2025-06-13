/**
 * FileオブジェクトをBase64文字列に変換する
 * @param file Fileオブジェクト
 * @returns Base64エンコードされた文字列（data URLプレフィックスなし）
 */
export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onloadend = () => {
      const result = reader.result as string;
      // data:image/png;base64,xxxxx の xxxxx 部分のみを返す
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    
    reader.onerror = () => {
      reject(new Error('ファイルの読み込みに失敗しました'));
    };
    
    reader.readAsDataURL(file);
  });
}