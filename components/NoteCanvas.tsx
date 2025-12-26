import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { TransformWrapper, TransformComponent, ReactZoomPanPinchRef } from 'react-zoom-pan-pinch';
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

const SEGMENT_HEIGHT = 1200;
const CANVAS_PADDING = 500;
const MIN_CANVAS_SIZE = { width: 1600, height: 2000 };

interface DragState {
  blockId: string | null;
  startX: number;
  startY: number;
  blockStartX: number;
  blockStartY: number;
}

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
  const [editorWidth, setEditorWidth] = useState(0);
  const [focusedTextBlockId, setFocusedTextBlockId] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [dragState, setDragState] = useState<DragState>({
    blockId: null,
    startX: 0,
    startY: 0,
    blockStartX: 0,
    blockStartY: 0,
  });

  const mainRef = useRef<HTMLDivElement | null>(null);
  const paperRef = useRef<HTMLDivElement>(null);
  const textBlockRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const previousBlocksRef = useRef<CanvasBlock[]>([]);
  const transformRef = useRef<ReactZoomPanPinchRef>(null);

  // Tool state checks - define these early so they can be used in effects
  const isDrawingToolActive = useMemo(
    () => [Tool.Pen, Tool.Highlighter, Tool.Eraser].includes(activeTool),
    [activeTool]
  );

  const isTextToolActive = useMemo(() => activeTool === Tool.Text, [activeTool]);
  const isHandToolActive = useMemo(() => activeTool === Tool.Hand, [activeTool]);

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

  // Calculate canvas bounds based on content
  const canvasBounds = useMemo(() => {
    let maxX = MIN_CANVAS_SIZE.width;
    let maxY = MIN_CANVAS_SIZE.height;

    (blocks || []).forEach(block => {
      if ('x' in block && 'y' in block && 'width' in block && 'height' in block) {
        maxX = Math.max(maxX, block.x + block.width + CANVAS_PADDING);
        maxY = Math.max(maxY, block.y + block.height + CANVAS_PADDING);
      }
    });

    return { width: maxX, height: maxY };
  }, [blocks]);

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
    const currentBlockIds = textBlocks.map(b => b.id).join(',');
    const previousBlockIds = previousBlocksRef.current.map((b) => b.id).join(',');

    if (firstTextBlock && currentBlockIds !== previousBlockIds) {
      previousBlocksRef.current = blocks;
      const timeoutId = setTimeout(() => {
        const element = textBlockRefs.current.get(firstTextBlock.id);
        if (element && document.activeElement !== element) {
          try {
            element.focus();
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
  }, [isTextToolActive, textBlocks, blocks]);

  // Drawing canvas virtualization (segments)
  const numSegments = Math.ceil(canvasBounds.height / SEGMENT_HEIGHT);
  const canvasSegments = useMemo(() => Array.from({ length: numSegments }, (_, i) => i), [numSegments]);

  // Handle drawing path additions
  const handlePathAdd = useCallback((newPath: DrawingPath) => {
    let drawingBlock = drawingBlocks[0];

    if (!drawingBlock) {
      drawingBlock = {
        id: `drawing-${Date.now()}`,
        type: 'canvas-drawing',
        x: 0,
        y: 0,
        width: editorWidth,
        height: canvasBounds.height,
        zIndex: 5,
        paths: [newPath],
      };
      onBlockAdd(drawingBlock);
    } else {
      const updatedBlock: CanvasDrawingBlock = {
        ...drawingBlock,
        paths: [...drawingBlock.paths, newPath],
      };
      onBlockUpdate(updatedBlock);
    }
  }, [drawingBlocks, editorWidth, canvasBounds.height, onBlockAdd, onBlockUpdate]);

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

  // Block drag handlers for Hand tool
  const handleBlockDragStart = useCallback((e: React.MouseEvent | React.TouchEvent, block: CanvasBlock) => {
    if (!isHandToolActive) return;
    // Only handle positioned blocks (not AudioBlocks)
    if (!("x" in block) || !("y" in block)) return;
    e.preventDefault();
    e.stopPropagation();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setDragState({
      blockId: block.id,
      startX: clientX,
      startY: clientY,
      blockStartX: block.x,
      blockStartY: block.y,
    });
    onInteractionStart?.();
  }, [isHandToolActive, onInteractionStart]);

  const handleBlockDrag = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!dragState.blockId) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const deltaX = (clientX - dragState.startX) / scale;
    const deltaY = (clientY - dragState.startY) / scale;
    const block = blocks.find(b => b.id === dragState.blockId);
    if (block && 'x' in block && 'y' in block) {
      onBlockUpdate({
        ...block,
        x: Math.max(0, dragState.blockStartX + deltaX),
        y: Math.max(0, dragState.blockStartY + deltaY),
      } as CanvasBlock);
    }
  }, [dragState, scale, blocks, onBlockUpdate]);

  const handleBlockDragEnd = useCallback(() => {
    if (dragState.blockId) {
      setDragState({
        blockId: null,
        startX: 0,
        startY: 0,
        blockStartX: 0,
        blockStartY: 0,
      });
      onInteractionEnd?.();
    }
  }, [dragState.blockId, onInteractionEnd]);

  // Zoom controls
  const handleZoomIn = useCallback(() => {
    transformRef.current?.zoomIn(0.3);
  }, []);

  const handleZoomOut = useCallback(() => {
    transformRef.current?.zoomOut(0.3);
  }, []);

  const handleResetZoom = useCallback(() => {
    transformRef.current?.resetTransform();
  }, []);

  // Handle transform changes to track scale
  const handleTransformChange = useCallback((ref: ReactZoomPanPinchRef) => {
    setScale(ref.state.scale);
  }, []);

  // Panning is enabled with Hand tool or when not using drawing/text tools
  const isPanningEnabled = isHandToolActive || (!isDrawingToolActive && !isTextToolActive);

  // Handle canvas click for text tool (create new text block)
  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isTextToolActive || !paperRef.current) return;

    const target = e.target as HTMLElement;
    if (target.closest('[data-text-block]')) {
      return;
    }

    const rect = paperRef.current.getBoundingClientRect();
    const clickX = (e.clientX - rect.left) / scale;
    const clickY = (e.clientY - rect.top) / scale;

    const newTextBlock: CanvasTextBlock = {
      id: `text-${Date.now()}`,
      type: 'canvas-text',
      x: Math.max(0, clickX - 50),
      y: clickY,
      width: Math.min(editorWidth - 100, 700),
      height: 100,
      zIndex: 10,
      content: '',
      style: { bold: false, italic: false },
    };

    onBlockAdd(newTextBlock);
    setFocusedTextBlockId(newTextBlock.id);
  }, [isTextToolActive, editorWidth, scale, onBlockAdd]);

  return (
    <div
      ref={mainRef}
      className={`flex-1 overflow-hidden flex flex-col bg-paper dark:bg-paper-dark ${className}`}
      onMouseMove={handleBlockDrag}
      onMouseUp={handleBlockDragEnd}
      onMouseLeave={handleBlockDragEnd}
      onTouchMove={handleBlockDrag}
      onTouchEnd={handleBlockDragEnd}
    >
      {/* Zoom Controls */}
      <div className="absolute top-4 right-4 z-50 flex gap-2 bg-white dark:bg-charcoal-dark rounded-lg shadow-lg p-2">
        <button
          onClick={handleZoomOut}
          className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          title="Zoom Out"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
          </svg>
        </button>
        <button
          onClick={handleResetZoom}
          className="px-2 h-8 flex items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-sm font-medium"
          title="Reset Zoom"
        >
          {Math.round(scale * 100)}%
        </button>
        <button
          onClick={handleZoomIn}
          className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          title="Zoom In"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      <TransformWrapper
        ref={transformRef}
        initialScale={1}
        minScale={0.1}
        maxScale={3}
        limitToBounds={false}
        panning={{ disabled: !isPanningEnabled }}
        onTransformed={handleTransformChange}
        wheel={{ step: 0.1 }}
      >
        <TransformComponent
          wrapperStyle={{ width: '100%', height: '100%', overflow: 'visible' }}
          contentStyle={{ width: canvasBounds.width, height: canvasBounds.height }}
        >
          <div
            ref={paperRef}
            style={{
              ...paperStyleProps,
              width: `${canvasBounds.width}px`,
              height: `${canvasBounds.height}px`,
            }}
            className={`relative transition-all duration-200 ${isHandToolActive ? 'cursor-grab' : ''} ${dragState.blockId ? 'cursor-grabbing' : ''}`}
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
                  width={canvasBounds.width}
                  height={SEGMENT_HEIGHT}
                  yOffset={yOffset}
                  originalWidth={drawingBlocks[0]?.width || editorWidth}
                  className={`z-10 ${isDrawingToolActive ? 'pointer-events-auto' : 'pointer-events-none'}`}
                  onDrawStart={onInteractionStart}
                  onDrawEnd={onInteractionEnd}
                />
              );
            })}

            {/* Text blocks (positioned absolutely, draggable with Hand tool) */}
            {textBlocks.map(block => (
              <div
                key={block.id}
                data-text-block
                className={`absolute px-4 md:px-8 py-8 ${isTextToolActive ? 'pointer-events-auto' : 'pointer-events-none'} ${isHandToolActive ? 'pointer-events-auto cursor-grab' : ''}`}
                style={{
                  left: `${block.x}px`,
                  top: `${block.y}px`,
                  width: `${block.width}px`,
                  minHeight: `${block.height}px`,
                  zIndex: block.zIndex,
                }}
                onMouseDown={(e) => handleBlockDragStart(e, block)}
                onTouchStart={(e) => handleBlockDragStart(e, block)}
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
                  className={`prose prose-stone dark:prose-invert prose-img:rounded-xl prose-img:shadow-md prose-img:my-4 w-full max-w-4xl focus:outline-none font-body break-words min-h-[3em] rounded-md transition-all ${fontSizeClass}
                    ${!block.content && isTextToolActive ? "before:content-[attr(data-placeholder)] before:text-charcoal/30 dark:before:text-text-dark/40 before:pointer-events-none p-2 border-2 border-dashed border-charcoal/10 dark:border-text-dark/10" : ""}
                    ${isTextToolActive ? "cursor-text" : ""}`}
                />
              </div>
            ))}

            {/* Image blocks (draggable with Hand tool) */}
            {imageBlocks.map(block => (
              <div
                key={block.id}
                className={`${isHandToolActive ? 'cursor-grab pointer-events-auto' : 'pointer-events-none'}`}
                style={{
                  position: 'absolute',
                  left: `${block.x}px`,
                  top: `${block.y}px`,
                  width: `${block.width}px`,
                  height: `${block.height}px`,
                  zIndex: block.zIndex,
                }}
                onMouseDown={(e) => handleBlockDragStart(e, block)}
                onTouchStart={(e) => handleBlockDragStart(e, block)}
              >
                <img
                  src={block.src}
                  alt={block.alt || ''}
                  className="w-full h-full object-contain rounded-lg shadow-md"
                  draggable={false}
                />
              </div>
            ))}

            {/* Audio blocks (positioned at bottom of canvas) */}
            {audioBlocks.length > 0 && (
              <div
                className="absolute w-full max-w-4xl left-1/2 transform -translate-x-1/2 px-4 md:px-8 z-20 pt-8 pb-8"
                style={{ top: `${canvasBounds.height - 200}px` }}
              >
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
        </TransformComponent>
      </TransformWrapper>
    </div>
  );
};

export default NoteCanvas;
