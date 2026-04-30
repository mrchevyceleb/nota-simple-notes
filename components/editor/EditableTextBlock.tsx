import React, { useEffect, useRef } from 'react';
import { CanvasTextBlock } from '../../types';
import { sanitizeHtml } from '../../utils/sanitize';

interface EditableTextBlockProps {
  block: CanvasTextBlock;
  isTextToolActive: boolean;
  fontSizeClass: string;
  onUpdate: (block: CanvasTextBlock) => void;
  onFocus: () => void;
  onBlur: () => void;
  registerRef: (id: string, el: HTMLDivElement | null) => void;
}

const EditableTextBlock: React.FC<EditableTextBlockProps> = ({
  block,
  isTextToolActive,
  fontSizeClass,
  onUpdate,
  onFocus,
  onBlur,
  registerRef,
}) => {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const sanitized = sanitizeHtml(block.content);
    if (el.innerHTML !== sanitized && document.activeElement !== el) {
      el.innerHTML = sanitized;
    }
  }, [block.content]);

  return (
    <div
      ref={(el) => {
        ref.current = el;
        registerRef(block.id, el);
      }}
      contentEditable={isTextToolActive}
      suppressContentEditableWarning
      onMouseDown={(e) => {
        if (isTextToolActive) {
          e.stopPropagation();
        }
      }}
      onClick={(e) => {
        if (isTextToolActive) {
          e.stopPropagation();
        }
      }}
      onFocus={onFocus}
      onBlur={onBlur}
      onInput={(e) => {
        onUpdate({ ...block, content: e.currentTarget.innerHTML });
      }}
      data-placeholder="Start typing..."
      className={`prose prose-stone dark:prose-invert prose-img:rounded-xl prose-img:shadow-md prose-img:my-4 w-full max-w-4xl focus:outline-none font-body break-words min-h-[3em] rounded-md transition-all ${fontSizeClass}
        ${!block.content ? "before:content-[attr(data-placeholder)] before:text-charcoal/30 dark:before:text-text-dark/40 before:pointer-events-none p-2 border-2 border-dashed border-charcoal/10 dark:border-text-dark/10" : ""}
        ${isTextToolActive ? 'cursor-text' : 'cursor-default'}`}
      style={{ userSelect: 'text' } as React.CSSProperties}
    />
  );
};

export default EditableTextBlock;
