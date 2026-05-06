import React from 'react';
import { TEXT_COLORS } from '../../constants';

interface TextColorPopoverProps {
  isMobileView: boolean;
  popoverStyle: React.CSSProperties;
  popoverRef: React.RefObject<HTMLDivElement | null>;
  onColorChange: (color: string) => void;
}

const TextColorPopover: React.FC<TextColorPopoverProps> = ({
  isMobileView,
  popoverStyle,
  popoverRef,
  onColorChange,
}) => {
  return (
    <div
      style={isMobileView ? {} : popoverStyle}
      className={
        isMobileView
        ? 'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[calc(100vw-2rem)] max-w-xs'
        : 'fixed z-50'
      }
    >
      <div
        ref={popoverRef}
        className="bg-white dark:bg-charcoal-dark rounded-lg shadow-xl border border-chrome/50 dark:border-border-dark p-3 animate-slide-in-down w-64"
      >
        <div className="text-sm font-semibold text-charcoal/80 dark:text-text-dark/80 mb-2 px-1">Text Color</div>
        <div className="grid grid-cols-5 gap-2">
          {TEXT_COLORS.map(c => (
            <button
              key={c}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onColorChange(c)}
              className="h-8 w-8 rounded-full border border-black/10 dark:border-white/10 hover:scale-110 transition-transform"
              style={{ backgroundColor: c }}
              title={c}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default TextColorPopover;
