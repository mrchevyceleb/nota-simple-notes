import React, { useRef, useEffect, useMemo } from 'react';
import { DrawingPath, Point, Tool } from '../types';

interface DrawingCanvasProps {
  paths: DrawingPath[];
  onPathAdd: (path: DrawingPath) => void;
  onPathsDelete: (pathIds: string[]) => void;
  tool: Tool;
  color: string;
  strokeWidth: number;
  width: number;
  height: number;
  yOffset: number;
  originalWidth?: number;
  className?: string;
  onDrawStart?: () => void;
  onDrawEnd?: () => void;
}

const getPathBounds = (path: DrawingPath): { minY: number; maxY: number } => {
    if (path.points.length === 0) return { minY: Infinity, maxY: -Infinity };
    let minY = path.points[0].y;
    let maxY = path.points[0].y;
    for (let i = 1; i < path.points.length; i++) {
        minY = Math.min(minY, path.points[i].y);
        maxY = Math.max(maxY, path.points[i].y);
    }
    return { minY, maxY };
};

const getTransformedPath = (path: DrawingPath, yOffset: number, scaleFactor: number): DrawingPath => {
  return {
    ...path,
    points: path.points.map(p => ({
        x: p.x * scaleFactor,
        y: p.y - yOffset,
    })),
    strokeWidth: path.strokeWidth * scaleFactor,
  };
};

const drawSmoothedPath = (ctx: CanvasRenderingContext2D, path: DrawingPath) => {
    if (!path || path.points.length < 1) return;
    const { points } = path;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = path.strokeWidth;
    
    if (path.tool === Tool.Highlighter) {
        ctx.globalCompositeOperation = 'multiply';
        ctx.globalAlpha = 0.5;
        ctx.strokeStyle = path.color;
    } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
        ctx.strokeStyle = path.color;
    }

    if (points.length < 2) {
        const p = points[0];
        const radius = path.strokeWidth / 2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, 0, 2 * Math.PI);
        ctx.fillStyle = path.color;
        ctx.fill();
    } else {
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);

        for (let i = 1; i < points.length - 2; i++) {
            const c = (points[i].x + points[i + 1].x) / 2;
            const d = (points[i].y + points[i + 1].y) / 2;
            ctx.quadraticCurveTo(points[i].x, points[i].y, c, d);
        }
        ctx.quadraticCurveTo(
            points[points.length - 2].x,
            points[points.length - 2].y,
            points[points.length - 1].x,
            points[points.length - 1].y
        );
        ctx.stroke();
    }

    ctx.restore();
};


const DrawingCanvas: React.FC<DrawingCanvasProps> = ({
  paths,
  onPathAdd,
  onPathsDelete,
  tool,
  color,
  strokeWidth,
  width,
  height,
  yOffset,
  originalWidth,
  className = '',
  onDrawStart,
  onDrawEnd,
}) => {
  const staticCanvasRef = useRef<HTMLCanvasElement>(null);
  const drawingCanvasRef = useRef<HTMLCanvasElement>(null);
  
  const isDrawingRef = useRef(false);
  const currentPathRef = useRef<DrawingPath | null>(null);

  const visiblePaths = useMemo(() => {
    return paths.filter(path => {
        const { minY, maxY } = getPathBounds(path);
        // Check for overlap between path's vertical bounds and this canvas segment's bounds
        return maxY >= yOffset && minY <= yOffset + height;
    });
  }, [paths, yOffset, height]);

  const transformedVisiblePaths = useMemo(() => {
    const scaleFactor = (originalWidth && originalWidth > 0) ? width / originalWidth : 1;
    return visiblePaths.map(path => ({
        originalId: path.id,
        ...getTransformedPath(path, yOffset, scaleFactor)
    }));
  }, [visiblePaths, yOffset, width, originalWidth]);


  // This effect handles rendering committed paths to the static canvas.
  useEffect(() => {
    const dpr = window.devicePixelRatio || 1;
    const staticCanvas = staticCanvasRef.current;
    const staticCtx = staticCanvas?.getContext('2d');
    
    if (!staticCanvas || !staticCtx) return;

    // A resize clears the canvas, so we always need to redraw everything.
    const needsStaticResize = staticCanvas.width !== width * dpr || staticCanvas.height !== height * dpr;
    if (needsStaticResize) {
        staticCanvas.width = width * dpr;
        staticCanvas.height = height * dpr;
        staticCanvas.style.width = `${width}px`;
        staticCanvas.style.height = `${height}px`;
        staticCtx.scale(dpr, dpr);
    }
    
    staticCtx.clearRect(0, 0, width, height);
    
    transformedVisiblePaths.forEach(path => {
        drawSmoothedPath(staticCtx, path);
    });
    
  }, [transformedVisiblePaths, width, height]);

  // This effect solely handles resizing of the temporary drawing canvas.
  useEffect(() => {
    const dpr = window.devicePixelRatio || 1;
    const drawingCanvas = drawingCanvasRef.current;
    if (!drawingCanvas) return;
    
    const needsResize = drawingCanvas.width !== width * dpr || drawingCanvas.height !== height * dpr;
    
    if (needsResize) {
        const ctx = drawingCanvas.getContext('2d');
        drawingCanvas.width = width * dpr;
        drawingCanvas.height = height * dpr;
        drawingCanvas.style.width = `${width}px`;
        drawingCanvas.style.height = `${height}px`;
        ctx?.scale(dpr, dpr);
    }
  }, [width, height]);

  // FIX: Implemented a critical memory management enhancement. This cleanup function
  // runs when the component unmounts (e.g., when switching notes).
  useEffect(() => {
    return () => {
      const staticCanvas = staticCanvasRef.current;
      const drawingCanvas = drawingCanvasRef.current;

      // By resizing the canvases to a minimal 1x1 size, we signal to the browser
      // that the large backing stores (the actual pixel data in memory, which can be
      // hundreds of MB) are no longer needed and can be garbage collected immediately.
      // This prevents the "lingering ghost" memory issue that caused performance to
      // degrade across the entire session.
      if (staticCanvas) {
        staticCanvas.width = 1;
        staticCanvas.height = 1;
      }
      if (drawingCanvas) {
        drawingCanvas.width = 1;
        drawingCanvas.height = 1;
      }
    };
  }, []); // Empty dependency array ensures this runs only on mount and unmount.

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    event.stopPropagation();
    onDrawStart?.();
    const isPenEraser = event.pointerType === 'pen' && (event.button === 5 || (event.buttons & 32) === 32);
    if (event.button !== 0 && !isPenEraser) return;
    
    if (isPenEraser) event.preventDefault();
    isDrawingRef.current = true;
    
    const activeTool = isPenEraser ? Tool.Eraser : tool;
    
    if (activeTool === Tool.Eraser) return;

    const canvas = drawingCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const localPoint = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
    };
    const absolutePoint = {
        x: localPoint.x,
        y: localPoint.y + yOffset,
    };

    const newPath: DrawingPath = {
      id: `path-${Date.now()}`,
      points: [absolutePoint],
      color: color,
      strokeWidth: strokeWidth,
      tool: activeTool,
    };
    currentPathRef.current = newPath;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = newPath.strokeWidth;
    
    if (newPath.tool === Tool.Highlighter) {
        ctx.globalCompositeOperation = 'multiply';
        ctx.globalAlpha = 0.5;
        ctx.strokeStyle = newPath.color;
    } else { // Pen
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
        ctx.strokeStyle = newPath.color;
    }

    // Start the path for the live drawing in local coordinates
    ctx.beginPath();
    ctx.moveTo(localPoint.x, localPoint.y);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;

    const canvas = drawingCanvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const getLocalPoint = (e: { clientX: number; clientY: number }) => ({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
    });
    
    const coalescedLocalPoints = (event.nativeEvent as PointerEvent).getCoalescedEvents?.().map(getLocalPoint) ?? [getLocalPoint(event)];
    if (coalescedLocalPoints.length === 0) return;
    
    const isPenEraser = event.pointerType === 'pen' && (event.buttons & 32) === 32;
    const activeTool = isPenEraser ? Tool.Eraser : tool;

    if (activeTool === Tool.Eraser) {
        const idsToDelete = new Set<string>();
        for (const localEraserPoint of coalescedLocalPoints) {
            for (const path of transformedVisiblePaths) {
                for (const pathPoint of path.points) {
                    const distance = Math.hypot(localEraserPoint.x - pathPoint.x, localEraserPoint.y - pathPoint.y);
                    const collisionThreshold = strokeWidth / 2;
                    if (distance < collisionThreshold) {
                        idsToDelete.add(path.originalId);
                        break;
                    }
                }
            }
        }
        if (idsToDelete.size > 0) {
            onPathsDelete(Array.from(idsToDelete));
        }
        return;
    }

    const ctx = canvas.getContext('2d');
    const path = currentPathRef.current;
    if (!ctx || !path) return;

    // Convert local points to absolute for storage
    const absolutePoints = coalescedLocalPoints.map(p => ({ x: p.x, y: p.y + yOffset }));
    path.points.push(...absolutePoints);

    // Draw new line segments immediately for lowest latency using local coordinates.
    coalescedLocalPoints.forEach(point => {
        ctx.lineTo(point.x, point.y);
    });
    
    ctx.stroke();
    // After stroking, we begin a new path starting from the last local point.
    ctx.beginPath();
    ctx.moveTo(coalescedLocalPoints[coalescedLocalPoints.length - 1].x, coalescedLocalPoints[coalescedLocalPoints.length - 1].y);
  };

  const handlePointerUp = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    
    if (currentPathRef.current && currentPathRef.current.points.length > 0) {
      // Commit the completed path with absolute coordinates. (Pen/Highlighter only)
      onPathAdd(currentPathRef.current);
    }

    const drawingCtx = drawingCanvasRef.current?.getContext('2d');
    if (drawingCtx) {
      // Clear the temporary drawing canvas.
      drawingCtx.clearRect(0, 0, width, height);
    }

    currentPathRef.current = null;
    onDrawEnd?.();
  };

  return (
     <div className={`absolute top-0 left-0 ${className}`} style={{ width, height, top: `${yOffset}px` }}>
      <canvas ref={staticCanvasRef} className="absolute top-0 left-0 pointer-events-none" />
      <canvas
        ref={drawingCanvasRef}
        className="absolute top-0 left-0 touch-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onClick={(e) => e.stopPropagation()}
        onContextMenu={(e) => {
          if (e.nativeEvent instanceof PointerEvent && e.nativeEvent.pointerType === 'pen') {
            e.preventDefault();
          }
        }}
      />
    </div>
  );
};

export default React.memo(DrawingCanvas);