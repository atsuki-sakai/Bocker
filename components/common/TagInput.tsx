'use client';

import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Tag, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

// エラーメッセージコンポーネント
const ErrorMessage = ({ message }: { message: string | undefined }) => (
  <motion.p
    className="text-red-500 text-sm mt-1 flex items-center gap-1"
    initial={{ opacity: 0, height: 0 }}
    animate={{ opacity: 1, height: 'auto' }}
    exit={{ opacity: 0, height: 0 }}
  >
    <AlertCircle size={14} /> {message ?? 'NULL'}
  </motion.p>
);

type TagInputProps = {
  tags: string[];
  setTagsAction: (tags: string[]) => void;
  error?: string;
  title?: string;
  exampleText?: string;
};

export const TagInput: React.FC<TagInputProps> = ({
  tags,
  setTagsAction,
  error,
  exampleText,
  title,
}) => {
  const [input, setInput] = useState('');

  // タグ追加
  const addTag = (
    e: React.MouseEvent<HTMLButtonElement> | React.KeyboardEvent<HTMLInputElement>
  ) => {
    e.preventDefault();
    if (!input.trim()) return;

    const tagsToAdd = input
      .split(/[,、]/)
      .map((t) => t.trim())
      .filter((t) => t && !tags.includes(t));

    if (tags.length + tagsToAdd.length > 5) {
      toast.warning('タグは最大5つまでです');
      return;
    }

    const updated = [...tags, ...tagsToAdd].slice(0, 5);
    setTagsAction(updated);
    setInput('');
  };

  // タグ削除
  const removeTag = (index: number) => {
    const updated = [...tags];
    updated.splice(index, 1);
    setTagsAction(updated);
  };

  return (
    <div>
      <Label className="flex items-center gap-2 text-sm mb-2">
        <Tag size={16} className="text-gray-500" />
        {title ?? 'タグ'} (最大5つ)
      </Label>

      <div className="flex flex-wrap gap-2 mb-2">
        {tags.map((tag, idx) => (
          <div
            key={idx}
            className="p-1 px-2 bg-slate-100 text-slate-700 border text-xs tracking-wide border-slate-300 rounded-md flex items-center gap-1 cursor-pointer"
            onClick={() => removeTag(idx)}
          >
            {tag} <X size={16} className="text-gray-500" />
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addTag(e)}
          placeholder="タグを入力（カンマ区切りで複数入力可）"
          className="flex-1 px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:border-blue-500 transition-colors"
          disabled={tags.length >= 5}
        />
        <Button
          type="button"
          variant="default"
          onClick={(e) => addTag(e)}
          disabled={tags.length >= 5 || !input.trim()}
          className="text-sm"
        >
          追加
        </Button>
      </div>

      {error && <ErrorMessage message={error} />}
      <p className="text-xs text-gray-500 mt-1">
        例: {exampleText ?? 'カット, パーマ, トリートメント（最大5つ）'}
      </p>
    </div>
  );
};
