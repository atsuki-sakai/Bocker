// eslint-disable-next-line @typescript-eslint/no-var-requires
const fs = require('fs') as typeof import('fs')
// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require('path') as typeof import('path')

/**
 * 再帰的に ja.json に存在して en.json に存在しないキーを抽出して
 * en.json に TODO 付きの値として追加するユーティリティ。
 * 既存の英語訳は変更しません。
 */

// ---------- 設定 ----------
const JA_PATH = path.resolve('languages/ja.json')
const EN_PATH = path.resolve('languages/en.json')

// ---------- 型定義 ----------
interface JsonMap {
  [key: string]: JsonMap | string | number | boolean | null
}

// ---------- ヘルパー関数 ----------
function isObject(value: unknown): value is JsonMap {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * ja のキーを辿りつつ、en にキーが無ければ ja の値を TODO 付きでコピーする
 */
function mergeMissingKeys(jaNode: JsonMap, enNode: JsonMap): void {
  for (const [key, jaValue] of Object.entries(jaNode)) {
    const enValue = enNode[key]

    if (isObject(jaValue)) {
      // ネストされたオブジェクトの場合
      if (!isObject(enValue)) {
        // en に無い or 文字列などの場合はオブジェクトで初期化
        enNode[key] = {}
      }
      mergeMissingKeys(jaValue, enNode[key] as JsonMap)
    } else {
      // プリミティブ値の場合
      if (enValue === undefined) {
        enNode[key] = `${String(jaValue)}`
      }
    }
  }
}

function main(): void {
  const jaJson: JsonMap = JSON.parse(fs.readFileSync(JA_PATH, 'utf8'))
  const enJson: JsonMap = JSON.parse(fs.readFileSync(EN_PATH, 'utf8'))

  mergeMissingKeys(jaJson, enJson)

  // prettier 風に 2 スペースインデントで保存
  fs.writeFileSync(EN_PATH, JSON.stringify(enJson, null, 2) + '\n', 'utf8')

  console.log('✅  en.json を ja.json と同期しました (TODO 付き)')
}

main() 