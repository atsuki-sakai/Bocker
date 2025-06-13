#!/bin/bash

# 対象ファイルのリスト
files=(
  "/Users/atsukisakai/Desktop/bocker/app/[locale]/(dashboard)/dashboard/menu/[menu_id]/edit/MenuEditForm.tsx"
  "/Users/atsukisakai/Desktop/bocker/app/[locale]/(dashboard)/dashboard/option/add/OptionAddForm.tsx"
  "/Users/atsukisakai/Desktop/bocker/app/[locale]/(dashboard)/dashboard/option/[option_id]/edit/OptionEditForm.tsx"
  "/Users/atsukisakai/Desktop/bocker/app/[locale]/(dashboard)/dashboard/staff/[staff_id]/edit/StaffEditForm.tsx"
  "/Users/atsukisakai/Desktop/bocker/app/[locale]/(dashboard)/dashboard/setting/_components/OrgConfigForm.tsx"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "Processing: $file"
    
    # Import文の置換
    sed -i '' "s|import { uploadCompressedImageWithThumbnailSignedUrl } from '@/services/gcp/cloud_storage/helpers'|import { uploadCompressedImage } from '@/lib/upload-client'\nimport { fileToBase64 } from '@/lib/file-to-base64'|g" "$file"
    
    # 関数呼び出しの置換パターン1: 通常の呼び出し
    sed -i '' 's|uploadCompressedImageWithThumbnailSignedUrl(\([^,]*\),\([^,]*\),\([^,]*\),\([^,]*\),\([^)]*\))|fileToBase64(\1).then(base64Data => uploadCompressedImage({ base64Data, fileName: \1.name, directory: \3, orgId: \2, aspectType: \4, quality: \5 }))|g' "$file"
    
    # result.original.publicUrl -> result.originalUrl
    sed -i '' 's|result\.original\.publicUrl|result.originalUrl|g' "$file"
    
    # result.thumbnail.publicUrl -> result.thumbnailUrl
    sed -i '' 's|result\.thumbnail\.publicUrl|result.thumbnailUrl|g' "$file"
    
    echo "✅ Completed: $file"
  else
    echo "⚠️  File not found: $file"
  fi
done

echo "Migration completed!"