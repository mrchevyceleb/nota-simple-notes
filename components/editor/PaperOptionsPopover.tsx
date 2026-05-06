import React from 'react';
import { PaperStyle, FontSize } from '../../types';

interface PaperOptionsPopoverProps {
  popoverRef: React.RefObject<HTMLDivElement | null>;
  paperColor: 'white' | 'yellow';
  paperStyle: PaperStyle;
  fontSize: FontSize;
  onPaperColorChange: (color: 'white' | 'yellow') => void;
  onPaperStyleChange: (style: PaperStyle) => void;
  onFontSizeChange: (size: FontSize) => void;
}

const PaperOptionsPopover: React.FC<PaperOptionsPopoverProps> = ({
  popoverRef,
  paperColor,
  paperStyle,
  fontSize,
  onPaperColorChange,
  onPaperStyleChange,
  onFontSizeChange,
}) => {
  return (
    <div ref={popoverRef} className="absolute top-full right-0 mt-2 w-56 bg-white dark:bg-charcoal-dark rounded-lg shadow-xl border border-chrome/50 dark:border-border-dark p-2 z-30 animate-slide-in-down">
      <div className='p-2 text-sm font-semibold text-charcoal/70 dark:text-text-dark/70'>Paper Color</div>
      <div className="grid grid-cols-2 gap-2 p-2">
        <button onClick={() => onPaperColorChange('white')} className={`h-10 w-full rounded border-2 ${paperColor === 'white' ? 'border-accent' : 'border-chrome dark:border-border-dark'}`} style={{backgroundColor: '#FAFAF7'}}></button>
        <button onClick={() => onPaperColorChange('yellow')} className={`h-10 w-full rounded border-2 ${paperColor === 'yellow' ? 'border-accent' : 'border-chrome dark:border-border-dark'}`} style={{backgroundColor: '#FEF9E7'}}></button>
      </div>
      <div className='p-2 text-sm font-semibold text-charcoal/70 dark:text-text-dark/70'>Paper Style</div>
      <div className="grid grid-cols-3 gap-2 p-2">
        {Object.values(PaperStyle).map(style => (
          <button key={style} onClick={() => onPaperStyleChange(style)} className={`capitalize h-12 text-xs rounded border-2 flex items-center justify-center ${paperStyle === style ? 'border-accent' : 'border-chrome dark:border-border-dark'}`}>
            {style}
          </button>
        ))}
      </div>
      <div className="h-px bg-chrome/50 dark:bg-border-dark/50 my-1"></div>
      <div className='p-2 text-sm font-semibold text-charcoal/70 dark:text-text-dark/70'>Text Size</div>
      <div className="grid grid-cols-3 gap-2 p-2">
        <button onClick={() => onFontSizeChange('small')} className={`h-10 text-sm rounded border-2 flex items-center justify-center ${fontSize === 'small' ? 'border-accent' : 'border-chrome dark:border-border-dark'}`}>Small</button>
        <button onClick={() => onFontSizeChange('medium')} className={`h-10 text-base rounded border-2 flex items-center justify-center ${fontSize === 'medium' ? 'border-accent' : 'border-chrome dark:border-border-dark'}`}>Medium</button>
        <button onClick={() => onFontSizeChange('large')} className={`h-10 text-lg rounded border-2 flex items-center justify-center ${fontSize === 'large' ? 'border-accent' : 'border-chrome dark:border-border-dark'}`}>Large</button>
      </div>
    </div>
  );
};

export default PaperOptionsPopover;
