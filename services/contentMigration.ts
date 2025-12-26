import { ContentBlock, CanvasBlock, CanvasTextBlock, CanvasDrawingBlock, TextBlock, DrawingBlock, AudioBlock } from '../types';

/**
 * Checks if content is in the legacy format (ContentBlock[]) or new canvas format (CanvasBlock[])
 */
export function isLegacyContent(content: ContentBlock[] | CanvasBlock[]): content is ContentBlock[] {
  if (!content || !Array.isArray(content) || content.length === 0) return false;
  
  const firstBlock = content[0];
  if (!firstBlock || !firstBlock.type) return false;
  
  // Check if it's a canvas block (has x, y, width, height, zIndex)
  if ('x' in firstBlock && 'y' in firstBlock && 'width' in firstBlock && 'height' in firstBlock && 'zIndex' in firstBlock) {
    return false; // It's already a canvas block
  }
  
  // Legacy blocks have type 'text', 'drawing', or 'audio' but no positioning info
  return firstBlock.type === 'text' || firstBlock.type === 'drawing' || firstBlock.type === 'audio';
}

/**
 * Migrates legacy ContentBlock[] to CanvasBlock[] format in memory.
 * This is NON-DESTRUCTIVE: all original content is preserved.
 * 
 * Strategy:
 * - Text blocks become full-width CanvasTextBlock at the top
 * - Drawing blocks become CanvasDrawingBlock beneath text
 * - Audio blocks remain as-is (they don't need positioning)
 * - Images embedded in HTML are preserved within the text content
 */
export function migrateLegacyToCanvas(
  legacyContent: ContentBlock[], 
  defaultWidth: number = 1600
): CanvasBlock[] {
  try {
    if (!legacyContent || !Array.isArray(legacyContent)) {
      console.error('Invalid legacy content:', legacyContent);
      return [];
    }
    
    const canvasBlocks: CanvasBlock[] = [];
    let currentY = 0;
    const defaultHeight = 800; // Starting height for text blocks
    const zIndexText = 10;
    const zIndexDrawing = 5;
    
    // Find and migrate text block (should be first in legacy format)
    const textBlock = legacyContent.find(b => b && b.type === 'text') as TextBlock | undefined;
    if (textBlock) {
      const canvasTextBlock: CanvasTextBlock = {
        id: textBlock.id || `text-${Date.now()}`,
        type: 'canvas-text',
        x: 32,
        y: currentY,
        width: Math.min(defaultWidth - 64, 900),
        height: defaultHeight,
        zIndex: zIndexText,
        content: textBlock.content || '', // Preserve all HTML, images, formatting
        style: textBlock.style || { bold: false, italic: false },
      };
      canvasBlocks.push(canvasTextBlock);
      currentY += defaultHeight;
    } else {
      // Create a default text block if none exists
      const canvasTextBlock: CanvasTextBlock = {
        id: `text-${Date.now()}`,
        type: 'canvas-text',
        x: 32,
        y: currentY,
        width: Math.min(defaultWidth - 64, 900),
        height: defaultHeight,
        zIndex: zIndexText,
        content: '',
        style: { bold: false, italic: false },
      };
      canvasBlocks.push(canvasTextBlock);
    }
    
    // Find and migrate drawing block
    const drawingBlock = legacyContent.find(b => b && b.type === 'drawing') as DrawingBlock | undefined;
    if (drawingBlock && drawingBlock.paths && Array.isArray(drawingBlock.paths) && drawingBlock.paths.length > 0) {
      // Use the original drawing block dimensions if available
      const drawingHeight = drawingBlock.height || 2000;
      const drawingWidth = drawingBlock.width || defaultWidth;
      
      const canvasDrawingBlock: CanvasDrawingBlock = {
        id: drawingBlock.id || `drawing-${Date.now()}`,
        type: 'canvas-drawing',
        x: 0,
        y: 0, // Drawings should start from top and overlay the entire canvas
        width: drawingWidth,
        height: drawingHeight,
        zIndex: zIndexDrawing, // Lower z-index so drawings appear behind text
        paths: drawingBlock.paths, // Preserve all drawing paths exactly as-is
      };
      canvasBlocks.push(canvasDrawingBlock);
    }
    
    // Migrate audio blocks (keep them as-is, no positioning needed)
    const audioBlocks = legacyContent.filter(b => b && b.type === 'audio') as AudioBlock[];
    if (audioBlocks.length > 0) {
      canvasBlocks.push(...audioBlocks);
    }
    
    return canvasBlocks;
  } catch (error) {
    console.error('Error in migrateLegacyToCanvas:', error);
    // Return a safe default
    return [{
      id: `text-${Date.now()}`,
      type: 'canvas-text',
      x: 32,
      y: 0,
      width: Math.min(defaultWidth - 64, 900),
      height: 800,
      zIndex: 10,
      content: '',
      style: { bold: false, italic: false },
    }];
  }
}

/**
 * Helper to determine the appropriate canvas width based on viewport or default
 */
export function getDefaultCanvasWidth(): number {
  if (typeof window !== 'undefined') {
    // Use a sensible max width similar to the current paper width
    return Math.min(window.innerWidth * 1.5, 1600);
  }
  return 1600; // Default to max width for server-side
}

