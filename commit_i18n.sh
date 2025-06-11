#!/usr/bin/env bash
set -euo pipefail

# ステータス一覧を取得して1行ずつ処理
git status --porcelain | while read -r status file; do
  st=$(echo "$status" | tr -d " ")
  case "$st" in
    M)
      git add -- "$file"
      git commit -m "refactor(i18n): update $file for multilingual support (taiyo)" ;;
    D)
      git rm -- "$file"
      git commit -m "chore(i18n): remove obsolete $file after multilingual refactor (taiyo)" ;;
    ??)
      git add -- "$file"
      git commit -m "feat(i18n): add $file for multilingual support (taiyo)" ;;
    *)
      echo "未知のステータス $st $file" ;;
  esac
done
