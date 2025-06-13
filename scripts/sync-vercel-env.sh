#!/usr/bin/env bash
set -euo pipefail

tmp=$(mktemp)
grep -Ev '^\s*$|^\s*#|^NODE_ENV=' .env.local | cut -d= -f1 > "$tmp"

for scope in production preview development; do
  vercel env ls $scope | awk 'NR>4 {print $1}' |
    grep -vxFf "$tmp" | xargs -r -I{} vercel env rm {} $scope --yes

  grep -Ev '^\s*$|^\s*#|^NODE_ENV=' .env.local |
    while IFS= read -r line; do
      key=${line%%=*}; val=${line#*=}
      echo "$val" | vercel env rm "$key" $scope --yes >/dev/null 2>&1 || true
      echo "$val" | vercel env add "$key" $scope --yes   >/dev/null
    done
done

rm "$tmp"
echo "✅ Vercel 環境変数を .env.local と完全同期しました"