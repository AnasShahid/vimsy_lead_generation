interface TagBadgesProps {
  tags: string[];
  size?: 'sm' | 'md';
}

const TAG_COLORS: Record<string, string> = {
  discovered: 'bg-gray-100 text-gray-600 border-gray-200',
  enriched: 'bg-blue-100 text-blue-700 border-blue-200',
  analyzing: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  analyzed: 'bg-green-100 text-green-700 border-green-200',
  error: 'bg-red-100 text-red-700 border-red-200',
};

const DEFAULT_COLOR = 'bg-purple-100 text-purple-700 border-purple-200';

export function TagBadges({ tags, size = 'sm' }: TagBadgesProps) {
  if (!tags || tags.length === 0) return null;

  const maxVisible = 3;
  const visible = tags.slice(0, maxVisible);
  const overflow = tags.length - maxVisible;

  const sizeClass = size === 'sm' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-0.5';

  return (
    <div className="flex flex-wrap gap-1">
      {visible.map(tag => (
        <span
          key={tag}
          className={`inline-flex items-center rounded border font-medium ${sizeClass} ${TAG_COLORS[tag] || DEFAULT_COLOR}`}
        >
          {tag}
        </span>
      ))}
      {overflow > 0 && (
        <span className={`inline-flex items-center rounded border font-medium bg-gray-50 text-gray-500 border-gray-200 ${sizeClass}`}>
          +{overflow} more
        </span>
      )}
    </div>
  );
}
