import React from 'react';
import { Tool } from '../../types';
import { ICONS, PEN_COLORS, HIGHLIGHTER_COLORS, STROKE_WIDTHS } from '../../constants';

interface DrawingPopoverProps {
  isMobileView: boolean;
  popoverStyle: React.CSSProperties;
  popoverRef: React.RefObject<HTMLDivElement | null>;
  activeTool: Tool;
  setActiveTool: (tool: Tool) => void;
  penColor: string;
  setPenColor: (color: string) => void;
  highlighterColor: string;
  setHighlighterColor: (color: string) => void;
  strokeWidth: number;
  setStrokeWidth: (width: number) => void;
  onClearDrawing: () => void;
}

const DrawingPopover: React.FC<DrawingPopoverProps> = ({
  isMobileView,
  popoverStyle,
  popoverRef,
  activeTool,
  setActiveTool,
  penColor,
  setPenColor,
  highlighterColor,
  setHighlighterColor,
  strokeWidth,
  setStrokeWidth,
  onClearDrawing,
}) => {
  const currentDrawingColor = activeTool === Tool.Pen ? penColor : highlighterColor;

  return (
    <div
      style={isMobileView ? {} : popoverStyle}
      className={
        isMobileView
        ? 'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[calc(100vw-2rem)] max-w-sm'
        : 'fixed z-50'
      }
    >
      <div
        ref={popoverRef}
        className="w-full bg-white dark:bg-charcoal-dark rounded-lg shadow-xl border border-chrome/50 dark:border-border-dark p-3 animate-slide-in-down"
      >
        <div className="text-sm font-semibold text-charcoal/80 dark:text-text-dark/80 mb-2 px-1">Tool</div>
        <div className="grid grid-cols-3 gap-2 mb-3">
          <button
            onClick={() => setActiveTool(Tool.Pen)}
            className={`h-10 rounded-lg flex items-center justify-center gap-2 transition-colors ${activeTool === Tool.Pen ? 'bg-accent/10 text-accent dark:bg-accent/20' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}
          >
            {ICONS.pen}
            <span className="text-xs font-medium">Pen</span>
          </button>
          <button
            onClick={() => setActiveTool(Tool.Highlighter)}
            className={`h-10 rounded-lg flex items-center justify-center gap-2 transition-colors ${activeTool === Tool.Highlighter ? 'bg-accent/10 text-accent dark:bg-accent/20' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}
          >
            {ICONS.highlighter}
            <span className="text-xs font-medium">Highlight</span>
          </button>
          <button
            onClick={() => setActiveTool(Tool.Eraser)}
            className={`h-10 rounded-lg flex items-center justify-center gap-2 transition-colors ${activeTool === Tool.Eraser ? 'bg-accent/10 text-accent dark:bg-accent/20' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}
          >
            {ICONS.eraser}
            <span className="text-xs font-medium">Eraser</span>
          </button>
        </div>
        {activeTool !== Tool.Eraser && activeTool !== Tool.Text && (
          <>
            <div className="text-sm font-semibold text-charcoal/80 dark:text-text-dark/80 mb-2 px-1">Color</div>
            <div className="flex items-center justify-center flex-wrap gap-2 mb-3">
              {(activeTool === Tool.Pen ? PEN_COLORS : HIGHLIGHTER_COLORS).map(c => (
                <button key={c} onClick={() => activeTool === Tool.Pen ? setPenColor(c) : setHighlighterColor(c)} className={`h-8 w-8 rounded-full border-2 transition-all ${currentDrawingColor === c ? 'border-accent scale-110' : 'border-transparent hover:border-chrome'}`} style={{backgroundColor: c}}></button>
              ))}
            </div>
          </>
        )}
        {activeTool !== Tool.Text && (
          <>
            <div className="text-sm font-semibold text-charcoal/80 dark:text-text-dark/80 mb-2 px-1">Stroke Width</div>
            <div className="grid grid-cols-3 gap-2">
              {STROKE_WIDTHS.map(w => (
                <button key={w} onClick={() => setStrokeWidth(w)} className={`h-10 rounded-lg flex items-center justify-center transition-colors ${strokeWidth === w ? 'bg-accent/10 dark:bg-accent/20' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}>
                  <span className="h-1 rounded-full bg-charcoal dark:bg-text-dark" style={{ width: `${w}px` }}></span>
                </button>
              ))}
            </div>
            <div className="h-px bg-chrome dark:bg-border-dark my-3"></div>
            <button
              onClick={onClearDrawing}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold text-coral bg-coral/10 hover:bg-coral/20 transition-colors"
            >
              {React.cloneElement(ICONS.clearCanvas, { className: "h-5 w-5"})}
              <span>Clear All Drawings</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default DrawingPopover;
