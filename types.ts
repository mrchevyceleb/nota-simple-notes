

export interface Point {
  x: number;
  y: number;
}

export interface DrawingPath {
  id: string;
  points: Point[];
  color: string;
  strokeWidth: number;
  tool: Tool;
}

export interface TextBlock {
  id: string;
  type: 'text';
  content: string;
  style: {
    bold: boolean;
    italic: boolean;
  };
}

export interface DrawingBlock {
  id:string;
  type: 'drawing';
  paths: DrawingPath[];
  width: number;
  height: number;
}

export interface AudioBlock {
  id:string;
  type: 'audio';
  src: string; // base64
}

export type ContentBlock = TextBlock | DrawingBlock | AudioBlock;

// New Canvas Block types for unified infinite canvas experience
export interface CanvasBlockBase {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
}

export interface CanvasTextBlock extends CanvasBlockBase {
  type: 'canvas-text';
  content: string;
  style: {
    bold: boolean;
    italic: boolean;
  };
}

export interface CanvasDrawingBlock extends CanvasBlockBase {
  type: 'canvas-drawing';
  paths: DrawingPath[];
}

export interface CanvasImageBlock extends CanvasBlockBase {
  type: 'canvas-image';
  src: string; // base64 or URL
  alt?: string;
}

export type CanvasBlock = CanvasTextBlock | CanvasDrawingBlock | CanvasImageBlock | AudioBlock;

export type FontSize = 'small' | 'medium' | 'large';

export interface Note {
  id: string; // UUID from Supabase
  folder_id: string; // UUID from Supabase
  title: string;
  content: ContentBlock[] | CanvasBlock[]; // Support both legacy and new canvas format
  created_at: string; // ISO 8601 date string
  updated_at: string; // ISO 8601 date string
  paper_style: PaperStyle;
  paper_color: 'white' | 'yellow';
  font_size: FontSize;
  is_pinned?: boolean;
  user_id?: string;
}

export interface Folder {
  id: string; // UUID from Supabase
  name: string;
  notes: Note[];
  created_at: string; // ISO 8601 date string
  color_index?: number;
}

export enum Tool {
  Pen = 'pen',
  Highlighter = 'highlighter',
  Eraser = 'eraser',
  Text = 'text',
  Hand = 'hand',
}

export enum PaperStyle {
  Blank = 'blank',
  Wide = 'wide',
  College = 'college',
  Grid = 'grid',
  Dotted = 'dotted',
}