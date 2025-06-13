for scope in production preview development; do
  vercel env ls "$scope" | awk 'NR>4 {print $1}' \
    | grep -vxFf "$tmp" \
    | xargs -r -I{} vercel env rm --yes {} "$scope"

  grep -Ev '^\s*$|^\s*#|^NODE_ENV=' .env.local |
    while IFS= read -r line; do
      key=${line%%=*}; val=${line#*=}

      # 既存値を安全に削除（存在しなくてもエラーにしない）
      echo "$val" | vercel env rm --yes "$key" "$scope" >/dev/null 2>&1 || true

      # 変数タイプを明示して追加。--yes は不要
      echo -n "$val" | vercel env add plain "$key" "$scope" >/dev/null
    done
done