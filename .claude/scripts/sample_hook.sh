#!/bin/bash

# フック対象のツール呼び出し情報を JSON で受け取る
INPUT_JSON=$(cat)

# 任意のメッセージを標準エラー出力（stderr）に出力する
# PreToolUse では stderr に出力されると Claude にメッセージが反映される仕様のため
echo "Hello, world!" >&2

# 正常終了ステータスを返して、ツール実行を継続させる（exit 0）
exit 0
