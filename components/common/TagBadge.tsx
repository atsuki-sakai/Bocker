import { Badge } from '@/components/ui/badge';
// タグバッジコンポーネント
const TagBadge = ({ text, onRemove }: { text: string; onRemove: () => void }) => (
  <Badge variant="secondary" className="px-3 py-1 mr-2 mb-2 flex items-center gap-1 text-sm">
    {text}
    <button onClick={onRemove} className="ml-1 text-gray-500 hover:text-gray-700">
      ×
    </button>
  </Badge>
);

export default TagBadge;
