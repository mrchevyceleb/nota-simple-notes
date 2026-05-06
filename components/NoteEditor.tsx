import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Note, Tool, CanvasBlock, PaperStyle, FontSize, CanvasTextBlock } from '../types';
import { PEN_COLORS, HIGHLIGHTER_COLORS, STROKE_WIDTHS } from '../constants';
import NoteCanvas from './NoteCanvas';
import EditorToolbar from './editor/EditorToolbar';
import DrawingPopover from './editor/DrawingPopover';
import TextColorPopover from './editor/TextColorPopover';
import PaperOptionsPopover from './editor/PaperOptionsPopover';
import { usePopover } from '../hooks/usePopover';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { isLegacyContent, migrateLegacyToCanvas, getDefaultCanvasWidth } from '../services/contentMigration';

interface NoteEditorProps {
  note: Note;
  folderName: string;
  onBack: () => void;
  onUpdateNote: (note: Note) => void;
}

const debounce = <T extends (...args: any[]) => any,>(func: T, delay: number) => {
  let timeout: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>): void => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), delay);
  };
};

const areNotesEqual = (a: Note, b: Note) => {
  if (!a || !b) return false;
  return a.title === b.title &&
    a.paper_style === b.paper_style &&
    a.paper_color === b.paper_color &&
    a.font_size === b.font_size &&
    JSON.stringify(a.content) === JSON.stringify(b.content);
};

const defaultCanvasBlock = (): CanvasBlock[] => [{
  id: `text-${Date.now()}`,
  type: 'canvas-text',
  x: 0, y: 0,
  width: getDefaultCanvasWidth(),
  height: 800,
  zIndex: 10,
  content: '',
  style: { bold: false, italic: false }
}];

const popoverPositioner = (rect: DOMRect): React.CSSProperties => ({
  position: 'fixed',
  top: `${rect.bottom + 12}px`,
  left: `${rect.left + rect.width / 2}px`,
  transform: 'translateX(-50%)',
});

const NoteEditor: React.FC<NoteEditorProps> = ({ note, folderName, onBack, onUpdateNote }) => {
  const migratedContent = useMemo(() => {
    try {
      if (!note.content || !Array.isArray(note.content)) {
        console.warn('Invalid note content, creating default');
        return defaultCanvasBlock();
      }
      if (isLegacyContent(note.content)) {
        console.log('Migrating legacy note to canvas format...');
        return migrateLegacyToCanvas(note.content, getDefaultCanvasWidth());
      }
      return note.content as CanvasBlock[];
    } catch (error) {
      console.error('Error migrating note:', error);
      return defaultCanvasBlock();
    }
  }, [note.id]);

  const [currentNote, setCurrentNote] = useState<Note>({ ...note, content: migratedContent });
  const [activeTool, setActiveTool] = useState<Tool>(Tool.Text);
  const [penColor, setPenColor] = useState(PEN_COLORS[0]);
  const [highlighterColor, setHighlighterColor] = useState(HIGHLIGHTER_COLORS[0]);
  const [strokeWidth, setStrokeWidth] = useState(STROKE_WIDTHS[1]);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');
  const [isMobileView, setIsMobileView] = useState(window.innerWidth < 768);
  const [isInteracting, setIsInteracting] = useState(false);

  const imageInputRef = useRef<HTMLInputElement | null>(null);

  const drawingPopover = usePopover({ onPositionUpdate: popoverPositioner });
  const paperPopover = usePopover();
  const textColorPopover = usePopover({ onPositionUpdate: popoverPositioner });

  const onUpdateNoteRef = useRef(onUpdateNote);
  useEffect(() => { onUpdateNoteRef.current = onUpdateNote; }, [onUpdateNote]);

  const debouncedOnUpdateNote = useRef(
    debounce((noteToSave: Note) => {
      onUpdateNoteRef.current(noteToSave);
      setSaveStatus('saved');
    }, 1000)
  ).current;

  useEffect(() => {
    if (isInteracting || saveStatus === 'saving') return;
    if (!areNotesEqual(note, currentNote)) {
      const newContent = isLegacyContent(note.content)
        ? migrateLegacyToCanvas(note.content, getDefaultCanvasWidth())
        : note.content as CanvasBlock[];
      setCurrentNote({ ...note, content: newContent });
    }
  }, [note, isInteracting, saveStatus]);

  const canvasBlocks = currentNote.content as CanvasBlock[];

  const updateNote = useCallback((updater: (prev: Note) => Note) => {
    setSaveStatus('saving');
    setCurrentNote(prev => {
      const updatedNote = updater(prev);
      debouncedOnUpdateNote(updatedNote);
      return updatedNote;
    });
  }, [debouncedOnUpdateNote]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateNote(prev => ({ ...prev, title: e.target.value }));
  };

  const handleBlockUpdate = useCallback((block: CanvasBlock) => {
    updateNote(prev => {
      const blocks = prev.content as CanvasBlock[];
      const blockExists = blocks.some(b => b.id === block.id);
      const newContent = blockExists
        ? blocks.map(b => b.id === block.id ? block : b)
        : [...blocks, block];
      return { ...prev, content: newContent };
    });
  }, [updateNote]);

  const handleBlockAdd = useCallback((block: CanvasBlock) => {
    updateNote(prev => ({ ...prev, content: [...(prev.content as CanvasBlock[]), block] }));
  }, [updateNote]);

  const handleBlockDelete = useCallback((blockId: string) => {
    updateNote(prev => ({ ...prev, content: (prev.content as CanvasBlock[]).filter(b => b.id !== blockId) }));
  }, [updateNote]);

  const handlePaperStyleChange = (style: PaperStyle) => {
    updateNote(prev => ({ ...prev, paper_style: style }));
    paperPopover.close();
  };

  const handlePaperColorChange = (color: 'white' | 'yellow') => {
    updateNote(prev => ({ ...prev, paper_color: color }));
    paperPopover.close();
  };

  const handleFontSizeChange = (size: FontSize) => {
    updateNote(prev => ({ ...prev, font_size: size }));
  };

  const handleClearDrawing = () => {
    const drawingBlocks = canvasBlocks.filter(b => b.type === 'canvas-drawing');
    if (drawingBlocks.length > 0 && window.confirm('Are you sure you want to clear all drawings on this note? This cannot be undone.')) {
      updateNote(prev => ({ ...prev, content: (prev.content as CanvasBlock[]).filter(b => b.type !== 'canvas-drawing') }));
      drawingPopover.close();
    } else if (drawingBlocks.length === 0) {
      alert("There are no drawings to clear.");
    }
  };

  const { isRecording, startRecording, stopRecording } = useAudioRecorder(handleBlockAdd);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      console.error('Image file too large. Maximum size is 10MB.');
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => { console.error('Failed to read image file.'); };
    reader.onload = (e) => {
      const imageHtml = `<img src="${e.target?.result}" alt="uploaded image" class="max-w-full h-auto rounded-lg shadow-md my-4" />`;
      const textBlocks = canvasBlocks.filter(b => b.type === 'canvas-text') as CanvasTextBlock[];
      if (textBlocks.length > 0) {
        handleBlockUpdate({ ...textBlocks[0], content: textBlocks[0].content + imageHtml });
      }
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    const handleResize = () => setIsMobileView(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleTextCommand = useCallback((command: 'bold' | 'italic' | 'strikeThrough' | 'insertUnorderedList') => {
    document.execCommand(command, false);
  }, []);

  const handleTextColorChange = (color: string) => {
    document.execCommand('styleWithCSS', false, 'true');
    document.execCommand('foreColor', false, color);
    textColorPopover.close();
  };

  const currentDrawingColor = activeTool === Tool.Pen ? penColor : highlighterColor;

  return (
    <div className="flex flex-col h-screen w-screen bg-paper dark:bg-paper-dark animate-fade-in">
      <EditorToolbar
        title={currentNote.title}
        folderName={folderName}
        saveStatus={saveStatus}
        activeTool={activeTool}
        isRecording={isRecording}
        isDrawingPopoverOpen={drawingPopover.isOpen}
        isTextColorPopoverOpen={textColorPopover.isOpen}
        onBack={onBack}
        onTitleChange={handleTitleChange}
        onToolChange={setActiveTool}
        onToggleDrawingPopover={drawingPopover.toggle}
        onToggleTextColorPopover={textColorPopover.toggle}
        onTogglePaperPopover={paperPopover.toggle}
        onTextCommand={handleTextCommand}
        onImageUploadClick={() => imageInputRef.current?.click()}
        onRecordToggle={isRecording ? stopRecording : startRecording}
        drawingToolsRef={drawingPopover.toggleRef as React.RefObject<HTMLDivElement | null>}
        paperToolsRef={paperPopover.toggleRef as React.RefObject<HTMLButtonElement | null>}
        textColorButtonRef={textColorPopover.toggleRef as React.RefObject<HTMLButtonElement | null>}
        imageInputRef={imageInputRef}
        isPaperPopoverOpen={paperPopover.isOpen}
        paperPopoverContent={
          <PaperOptionsPopover
            popoverRef={paperPopover.popoverRef}
            paperColor={currentNote.paper_color}
            paperStyle={currentNote.paper_style}
            fontSize={currentNote.font_size}
            onPaperColorChange={handlePaperColorChange}
            onPaperStyleChange={handlePaperStyleChange}
            onFontSizeChange={handleFontSizeChange}
          />
        }
        onImageUpload={handleImageUpload}
      />

      {drawingPopover.isOpen && (
        <DrawingPopover
          isMobileView={isMobileView}
          popoverStyle={drawingPopover.popoverStyle}
          popoverRef={drawingPopover.popoverRef}
          activeTool={activeTool}
          setActiveTool={setActiveTool}
          penColor={penColor}
          setPenColor={setPenColor}
          highlighterColor={highlighterColor}
          setHighlighterColor={setHighlighterColor}
          strokeWidth={strokeWidth}
          setStrokeWidth={setStrokeWidth}
          onClearDrawing={handleClearDrawing}
        />
      )}

      {textColorPopover.isOpen && (
        <TextColorPopover
          isMobileView={isMobileView}
          popoverStyle={textColorPopover.popoverStyle}
          popoverRef={textColorPopover.popoverRef}
          onColorChange={handleTextColorChange}
        />
      )}

      <NoteCanvas
        blocks={canvasBlocks}
        onBlockUpdate={handleBlockUpdate}
        onBlockAdd={handleBlockAdd}
        onBlockDelete={handleBlockDelete}
        activeTool={activeTool}
        paperStyle={currentNote.paper_style}
        paperColor={currentNote.paper_color}
        fontSize={currentNote.font_size}
        drawingColor={currentDrawingColor}
        strokeWidth={strokeWidth}
        onInteractionStart={() => setIsInteracting(true)}
        onInteractionEnd={() => setIsInteracting(false)}
      />
    </div>
  );
};

export default NoteEditor;
