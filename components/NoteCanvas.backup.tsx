import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { CanvasBlock, CanvasTextBlock, CanvasDrawingBlock, CanvasImageBlock, Tool, DrawingPath, PaperStyle } from '../types';
import { getPaperPatternStyles, LINE_COLOR_ON_LIGHT, LINE_COLOR_ON_DARK } from '../constants';
import DrawingCanvas from './DrawingCanvas';
import { useTheme } from '../hooks/useTheme';

interface NoteCanvasProps {
  blocks: CanvasBlock[];
  onBlockUpdate: (block: CanvasBlock) => void;
  onBlockAdd: (block: CanvasBlock) => void;
  onBlockDelete: (blockId: string) => void;
  activeTool: Tool;
  paperStyle: PaperStyle;
  paperColor: 'white' | 'yellow';
  fontSize: 'small' | 'medium' | 'large';
  drawingColor: string;
  strokeWidth: number;
  onInteractionStart?: () => void;
  onInteractionEnd?: () => void;
  className?: string;
}

const SEGMENT_HEIGHT = 1200; // Keep segment virtualization for drawing performance
const MAX_PAPER_HEIGHT = 20000;

const NoteCanvas: React.FC<NoteCanvasProps> = ({
  blocks,
  onBlockUpdate,
  onBlockAdd,
  onBlockDelete,
  activeTool,
  paperStyle,
  paperColor,
  fontSize,
  drawingColor,
  strokeWidth,
  onInteractionStart,
  onInteractionEnd,
  className = '',
}) => {
  const [theme] = useTheme();
  const [paperHeight, setPaperHeight] = useState(window.innerHeight * 2);
  const [editorWidth, setEditorWidth] = useState(0);
  const [focusedTextBlockId, setFocusedTextBlockId] = useState<string | null>(null);
  
  const mainRef = useRef<HTMLDivElement | null>(null);
  const paperRef = useRef<HTMLDivElement>(null);
  const textBlockRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const previousBlocksRef = useRef<CanvasBlock[]>([]);
  
  // Extract drawing blocks and text blocks with safety checks
  const drawingBlocks = useMemo(
    () => (blocks || []).filter(b => b && b.type === 'canvas-drawing') as CanvasDrawingBlock[],
    [blocks]
  );
  
  const textBlocks = useMemo(
    () => (blocks || []).filter(b => b && b.type === 'canvas-text') as CanvasTextBlock[],
    [blocks]
  );
  
  const imageBlocks = useMemo(
    () => (blocks || []).filter(b => b && b.type === 'canvas-image') as CanvasImageBlock[],
    [blocks]
  );
  
  const audioBlocks = useMemo(
    () => (blocks || []).filter(b => b && b.type === 'audio'),
    [blocks]
  );
  
  // Collect all drawing paths from all drawing blocks
  const allDrawingPaths = useMemo(() => {
    return drawingBlocks.flatMap(block => block.paths);
  }, [drawingBlocks]);
  
  // Paper styling
  const paperStyleProps: React.CSSProperties = useMemo(() => {
    const isWhitePaper = paperColor === 'white';
    
    const backgroundColor = isWhitePaper
      ? (theme === 'dark' ? '#0F172A' : '#FAFAF7')
      : '#FEF9E7';

    const isEffectivelyDarkBackground = theme === 'dark' && isWhitePaper;
    const lineColor = isEffectivelyDarkBackground ? LINE_COLOR_ON_DARK : LINE_COLOR_ON_LIGHT;
    const patternStyles = getPaperPatternStyles(lineColor)[paperStyle];

    return {
        ...patternStyles,
        backgroundColor,
    };
  }, [paperStyle, paperColor, theme]);
  
  const fontSizeClass = useMemo(() => {
    const sizeMap = {
        small: 'prose-sm',
        medium: 'prose-xl',
        large: 'prose-2xl',
    };
    return sizeMap[fontSize] ?? 'prose-xl'; 
  }, [fontSize]);
  
  // Track paper width for responsive layout
  useEffect(() => {
    const resizeObserver = new ResizeObserver(entries => {
        if (entries[0]) {
            const { width } = entries[0].contentRect;
            setEditorWidth(width);
        }
    });
    if(paperRef.current) {
        resizeObserver.observe(paperRef.current);
    }
    return () => resizeObserver.disconnect();
  }, []);
  
  // Auto-focus first text block when note loads (if text tool is active)
  useEffect(() => {
    if (!isTextToolActive || textBlocks.length === 0) return;
    
    const firstTextBlock = textBlocks[0];
    // Only auto-focus if this is a new set of blocks (note changed)
    const currentBlockIds = textBlocks.map(b => b.id).join(',');
    const previousBlockIds = previousBlocksRef.current.map((b: any) => b.id).join(',');
    
    if (firstTextBlock && currentBlockIds !== previousBlockIds) {
      previousBlocksRef.current = blocks;
      // Small delay to ensure DOM is ready
      const timeoutId = setTimeout(() => {
        const element = textBlockRefs.current.get(firstTextBlock.id);
        if (element && document.activeElement !== element) {
          try {
            element.focus();
            // Move cursor to end of content
            const selection = window.getSelection();
            if (selection) {
              const range = document.createRange();
              range.selectNodeContents(element);
              range.collapse(false);
              selection.removeAllRanges();
              selection.addRange(range);
            }
          } catch (e) {
            console.error('Auto-focus error:', e);
          }
        }
      }, 200);
      
      return () => clearTimeout(timeoutId);
    }
  }, [isTextToolActive, textBlocks.length]);
  
  // Infinite scroll handler
  const handleScroll = useCallback(() => {
    if (!mainRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = mainRef.current;

    if (paperHeight < MAX_PAPER_HEIGHT && scrollTop + clientHeight >= scrollHeight - 50) {
      setPaperHeight(prev => Math.min(prev + window.innerHeight, MAX_PAPER_HEIGHT));
    }
  }, [paperHeight]);

  useEffect(() => {
    const mainEl = mainRef.current;
    mainEl?.addEventListener('scroll', handleScroll);
    return () => {
      mainEl?.removeEventListener('scroll', handleScroll);
    };
  }, [handleScroll]);
  
  // Drawing canvas virtualization (segments)
  const numSegments = Math.ceil(paperHeight / SEGMENT_HEIGHT);
  const canvasSegments = useMemo(() => Array.from({ length: numSegments }, (_, i) => i), [numSegments]);
  
  // Handle drawing path additions
  const handlePathAdd = useCallback((newPath: DrawingPath) => {
    // Find or create a drawing block
    let drawingBlock = drawingBlocks[0];
    
    if (!drawingBlock) {
      // Create new drawing block
      drawingBlock = {
        id: `drawing-${Date.now()}`,
        type: 'canvas-drawing',
        x: 0,
        y: 0,
        width: editorWidth,
        height: paperHeight,
        zIndex: 5,
        paths: [newPath],
      };
      onBlockAdd(drawingBlock);
    } else {
      // Update existing drawing block
      const updatedBlock: CanvasDrawingBlock = {
        ...drawingBlock,
        paths: [...drawingBlock.paths, newPath],
      };
      onBlockUpdate(updatedBlock);
    }
  }, [drawingBlocks, editorWidth, paperHeight, onBlockAdd, onBlockUpdate]);
  
  // Handle drawing path deletions (eraser)
  const handlePathsDelete = useCallback((pathIdsToDelete: string[]) => {
    drawingBlocks.forEach(block => {
      const updatedPaths = block.paths.filter(p => !pathIdsToDelete.includes(p.id));
      if (updatedPaths.length !== block.paths.length) {
        const updatedBlock: CanvasDrawingBlock = {
          ...block,
          paths: updatedPaths,
        };
        onBlockUpdate(updatedBlock);
      }
    });
  }, [drawingBlocks, onBlockUpdate]);
  
  const isDrawingToolActive = useMemo(
    () => [Tool.Pen, Tool.Highlighter, Tool.Eraser].includes(activeTool),
    [activeTool]
  );
  
  const isTextToolActive = useMemo(() => activeTool === Tool.Text, [activeTool]);
  
  // Handle canvas click for text tool (create new text block)
  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isTextToolActive || !paperRef.current) return;
    
    // Check if click is on empty space (not on an existing text block)
    const target = e.target as HTMLElement;
    if (target.closest('[data-text-block]')) {
      return; // Clicked on existing text block
    }
    
    // Create new text block at click position
    const rect = paperRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top + (mainRef.current?.scrollTop || 0);
    
    const newTextBlock: CanvasTextBlock = {
      id: `text-${Date.now()}`,
      type: 'canvas-text',
      x: Math.max(0, clickX - 50), // Center around click
      y: clickY,
      width: Math.min(editorWidth - 100, 700),
      height: 100, // Initial height
      zIndex: 10,
      content: '',
      style: { bold: false, italic: false },
    };
    
    onBlockAdd(newTextBlock);
    setFocusedTextBlockId(newTextBlock.id);
  }, [isTextToolActive, editorWidth, onBlockAdd]);
  
  return (
    <div ref={mainRef} className={`flex-1 overflow-auto flex justify-center bg-paper dark:bg-paper-dark ${className}`}>
      <div 
        ref={paperRef}
        style={{ 
          ...paperStyleProps,
          height: `${paperHeight}px`,
        }} 
        className="relative w-[150vw] max-w-[1600px] min-h-full transition-all duration-200"
        onClick={handleCanvasClick}
      >
        {/* Drawing canvas segments (virtualized) */}
        {editorWidth > 0 && canvasSegments.map(i => {
          const yOffset = i * SEGMENT_HEIGHT;
          return (
            <DrawingCanvas
              key={i}
              paths={allDrawingPaths}
              onPathAdd={handlePathAdd}
              onPathsDelete={handlePathsDelete}
              tool={activeTool}
              color={drawingColor}
              strokeWidth={strokeWidth}
              width={editorWidth}
              height={SEGMENT_HEIGHT}
              yOffset={yOffset}
              originalWidth={drawingBlocks[0]?.width || editorWidth}
              className={`z-10 ${isDrawingToolActive ? 'pointer-events-auto' : 'pointer-events-none'}`}
              onDrawStart={onInteractionStart}
              onDrawEnd={onInteractionEnd}
            />
          );
        })}
        
        {/* Text blocks (positioned absolutely) */}
        {textBlocks.map(block => (
          <div
            key={block.id}
            data-text-block
            className={`absolute px-4 md:px-8 py-8 ${isTextToolActive ? 'pointer-events-auto' : 'pointer-events-none'}`}
            style={{
              left: `${block.x}px`,
              top: `${block.y}px`,
              width: `${block.width}px`,
              minHeight: `${block.height}px`,
              zIndex: block.zIndex,
            }}
          >
            <div
              ref={(el) => {
                if (el) {
                  textBlockRefs.current.set(block.id, el);
                } else {
                  textBlockRefs.current.delete(block.id);
                }
              }}
              contentEditable={isTextToolActive}
              suppressContentEditableWarning
              onClick={() => {
                if (isTextToolActive) {
                  setFocusedTextBlockId(block.id);
                }
              }}
              onFocus={() => setFocusedTextBlockId(block.id)}
              onBlur={() => setFocusedTextBlockId(null)}
              onInput={(e) => {
                const updatedBlock: CanvasTextBlock = {
                  ...block,
                  content: e.currentTarget.innerHTML,
                };
                onBlockUpdate(updatedBlock);
              }}
              dangerouslySetInnerHTML={{ __html: block.content }}
              data-placeholder="Start typing..."
              className={`prose prose-stone dark:prose-invert prose-img:rounded-xl prose-img:shadow-md prose-img:my-4 w-full max-w-4xl mx-auto focus:outline-none font-body break-words min-h-[3em] rounded-md transition-all ${fontSizeClass}
                ${!block.content && isTextToolActive ? "before:content-[attr(data-placeholder)] before:text-charcoal/30 dark:before:text-text-dark/40 before:pointer-events-none p-2 border-2 border-dashed border-charcoal/10 dark:border-text-dark/10" : ""}
                ${isTextToolActive ? "cursor-text" : ""}`}
            />
          </div>
        ))}
        
        {/* Image blocks */}
        {imageBlocks.map(block => (
          <div
            key={block.id}
            style={{
              position: 'absolute',
              left: `${block.x}px`,
              top: `${block.y}px`,
              width: `${block.width}px`,
              height: `${block.height}px`,
              zIndex: block.zIndex,
            }}
          >
            <img 
              src={block.src} 
              alt={block.alt || ''} 
              className="w-full h-full object-contain rounded-lg shadow-md"
            />
          </div>
        ))}
        
        {/* Audio blocks (not positioned, rendered at bottom) */}
        {audioBlocks.length > 0 && (
          <div className="w-full max-w-4xl mx-auto relative px-4 md:px-8 z-20 pt-8 pb-8" style={{ marginTop: `${paperHeight - 200}px` }}>
            <div className="space-y-6">
              {audioBlocks.map(block => (
                <div key={block.id} className="relative group w-full flex justify-center items-center py-2">
                  <audio src={block.src} controls className="shadow-lg rounded-full w-full max-w-md" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NoteCanvas;

