

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

export type FontSize = 'small' | 'medium' | 'large';

export interface Note {
  id: string; // UUID from Supabase
  folder_id: string; // UUID from Supabase
  title: string;
  content: ContentBlock[];
  created_at: string; // ISO 8601 date string
  updated_at: string; // ISO 8601 date string
  paper_style: PaperStyle;
  paper_color: 'white' | 'yellow';
  font_size: FontSize;
  is_pinned?: boolean;
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