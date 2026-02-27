import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Note, Tool, CanvasBlock, AudioBlock, PaperStyle, FontSize, CanvasTextBlock } from '../types';
import { ICONS, PEN_COLORS, HIGHLIGHTER_COLORS, STROKE_WIDTHS, TEXT_COLORS } from '../constants';
import NoteCanvas from './NoteCanvas';
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

const NoteEditor: React.FC<NoteEditorProps> = ({ note, folderName, onBack, onUpdateNote }) => {
  // Migrate legacy content on load with error handling
  const migratedContent = useMemo(() => {
    try {
      if (!note.content || !Array.isArray(note.content)) {
        console.warn('Invalid note content, creating default');
        return [{
          id: `text-${Date.now()}`,
          type: 'canvas-text',
          x: 0,
          y: 0,
          width: getDefaultCanvasWidth(),
          height: 800,
          zIndex: 10,
          content: '',
          style: { bold: false, italic: false }
        }] as CanvasBlock[];
      }
      
      if (isLegacyContent(note.content)) {
        console.log('Migrating legacy note to canvas format...');
        return migrateLegacyToCanvas(note.content, getDefaultCanvasWidth());
      }
      return note.content as CanvasBlock[];
    } catch (error) {
      console.error('Error migrating note:', error);
      // Return a safe default
      return [{
        id: `text-${Date.now()}`,
        type: 'canvas-text',
        x: 0,
        y: 0,
        width: getDefaultCanvasWidth(),
        height: 800,
        zIndex: 10,
        content: '',
        style: { bold: false, italic: false }
      }] as CanvasBlock[];
    }
  }, [note.id]); // Only re-migrate if note ID changes
  
  const [currentNote, setCurrentNote] = useState<Note>({ ...note, content: migratedContent });
  const [activeTool, setActiveTool] = useState<Tool>(Tool.Text);
  const [penColor, setPenColor] = useState(PEN_COLORS[0]);
  const [highlighterColor, setHighlighterColor] = useState(HIGHLIGHTER_COLORS[0]);
  const [strokeWidth, setStrokeWidth] = useState(STROKE_WIDTHS[1]);
  const [isRecording, setIsRecording] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');
  const [isDrawingPopoverOpen, setIsDrawingPopoverOpen] = useState(false);
  const [isPaperPopoverOpen, setIsPaperPopoverOpen] = useState(false);
  const [isTextColorPopoverOpen, setIsTextColorPopoverOpen] = useState(false);
  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({});
  const [textColorPopoverStyle, setTextColorPopoverStyle] = useState<React.CSSProperties>({});
  const [isMobileView, setIsMobileView] = useState(window.innerWidth < 768);
  const [isInteracting, setIsInteracting] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  
  const drawingToolsRef = useRef<HTMLDivElement>(null);
  const drawingPopoverRef = useRef<HTMLDivElement>(null);
  const paperToolsRef = useRef<HTMLButtonElement>(null);
  const paperPopoverRef = useRef<HTMLDivElement>(null);
  const textColorButtonRef = useRef<HTMLButtonElement>(null);
  const textColorPopoverRef = useRef<HTMLDivElement>(null);
  
  // Popover click outside handlers
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isDrawingPopoverOpen &&
        drawingPopoverRef.current && !drawingPopoverRef.current.contains(event.target as Node) &&
        drawingToolsRef.current && !drawingToolsRef.current.contains(event.target as Node)
      ) {
        setIsDrawingPopoverOpen(false);
      }
      if (
        isPaperPopoverOpen &&
        paperPopoverRef.current && !paperPopoverRef.current.contains(event.target as Node) &&
        paperToolsRef.current && !paperToolsRef.current.contains(event.target as Node)
      ) {
        setIsPaperPopoverOpen(false);
      }
      if (
        isTextColorPopoverOpen &&
        textColorPopoverRef.current && !textColorPopoverRef.current.contains(event.target as Node) &&
        textColorButtonRef.current && !textColorButtonRef.current.contains(event.target as Node)
      ) {
        setIsTextColorPopoverOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDrawingPopoverOpen, isPaperPopoverOpen, isTextColorPopoverOpen]);
  
  const debouncedOnUpdateNote = useCallback(
    debounce((noteToSave: Note) => {
      onUpdateNote(noteToSave);
      setSaveStatus('saved');
    }, 1000),
    [onUpdateNote]
  );
  
  // Sync external note changes (but not during interaction or saving)
  useEffect(() => {
    if (isInteracting || saveStatus === 'saving') {
      return;
    }
    
    if (!areNotesEqual(note, currentNote)) {
      // Re-migrate if external note is still in legacy format
      const newContent = isLegacyContent(note.content) 
        ? migrateLegacyToCanvas(note.content, getDefaultCanvasWidth())
        : note.content as CanvasBlock[];
      setCurrentNote({ ...note, content: newContent });
    }
  }, [note, isInteracting, saveStatus]);
  
  const canvasBlocks = currentNote.content as CanvasBlock[];
  
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSaveStatus('saving');
    const newTitle = e.target.value;
    setCurrentNote(prev => {
      const updatedNote = { ...prev, title: newTitle };
      debouncedOnUpdateNote(updatedNote);
      return updatedNote;
    });
  };
  
  const handleBlockUpdate = useCallback((block: CanvasBlock) => {
    setSaveStatus('saving');
    setCurrentNote(prev => {
      const blockExists = prev.content.some((b: any) => b.id === block.id);
      let newContent: CanvasBlock[];
      if (blockExists) {
        newContent = (prev.content as CanvasBlock[]).map(b => b.id === block.id ? block : b);
      } else {
        newContent = [...(prev.content as CanvasBlock[]), block];
      }
      const updatedNote = { ...prev, content: newContent };
      debouncedOnUpdateNote(updatedNote);
      return updatedNote;
    });
  }, [debouncedOnUpdateNote]);
  
  const handleBlockAdd = useCallback((block: CanvasBlock) => {
    setSaveStatus('saving');
    setCurrentNote(prev => {
      const newContent = [...(prev.content as CanvasBlock[]), block];
      const updatedNote = { ...prev, content: newContent };
      debouncedOnUpdateNote(updatedNote);
      return updatedNote;
    });
  }, [debouncedOnUpdateNote]);
  
  const handleBlockDelete = useCallback((blockId: string) => {
    setSaveStatus('saving');
    setCurrentNote(prev => {
      const updatedNote = {
        ...prev,
        content: (prev.content as CanvasBlock[]).filter((b: any) => b.id !== blockId)
      };
      debouncedOnUpdateNote(updatedNote);
      return updatedNote;
    });
  }, [debouncedOnUpdateNote]);
  
  const handlePaperStyleChange = (style: PaperStyle) => {
    setSaveStatus('saving');
    setCurrentNote(prev => {
      const updatedNote = { ...prev, paper_style: style };
      debouncedOnUpdateNote(updatedNote);
      return updatedNote;
    });
    setIsPaperPopoverOpen(false);
  };
  
  const handlePaperColorChange = (color: 'white' | 'yellow') => {
    setSaveStatus('saving');
    setCurrentNote(prev => {
      const updatedNote = { ...prev, paper_color: color };
      debouncedOnUpdateNote(updatedNote);
      return updatedNote;
    });
    setIsPaperPopoverOpen(false);
  };
  
  const handleFontSizeChange = (size: FontSize) => {
    setSaveStatus('saving');
    setCurrentNote(prev => {
      const updatedNote = { ...prev, font_size: size };
      debouncedOnUpdateNote(updatedNote);
      return updatedNote;
    });
  };
  
  const handleClearDrawing = () => {
    const drawingBlocks = canvasBlocks.filter(b => b.type === 'canvas-drawing');
    if (drawingBlocks.length > 0 && window.confirm('Are you sure you want to clear all drawings on this note? This cannot be undone.')) {
      setSaveStatus('saving');
      setCurrentNote(prev => {
        const newContent = (prev.content as CanvasBlock[]).filter(b => b.type !== 'canvas-drawing');
        const updatedNote = { ...prev, content: newContent };
        debouncedOnUpdateNote(updatedNote);
        return updatedNote;
      });
      setIsDrawingPopoverOpen(false);
    } else if (drawingBlocks.length === 0) {
      alert("There are no drawings to clear.");
    }
  };
  
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];
      mediaRecorderRef.current.ondataavailable = event => {
        audioChunksRef.current.push(event.data);
      };
      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onload = (e) => {
          const newAudioBlock: AudioBlock = {
            id: `audio-${Date.now()}`,
            type: 'audio',
            src: e.target?.result as string,
          };
          handleBlockAdd(newAudioBlock);
        };
        reader.readAsDataURL(audioBlob);
      };
      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Error starting recording:", err instanceof Error ? err.message : err);
    }
  };
  
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };
  
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        // For now, we'll add images to the first text block's content as HTML
        // In a future version, we can create CanvasImageBlock elements
        const imageHtml = `<img src="${e.target?.result}" alt="${file.name}" class="max-w-full h-auto rounded-lg shadow-md my-4" />`;
        
        // Find first text block and append image
        const textBlocks = canvasBlocks.filter(b => b.type === 'canvas-text') as CanvasTextBlock[];
        if (textBlocks.length > 0) {
          const firstTextBlock = textBlocks[0];
          const updatedBlock: CanvasTextBlock = {
            ...firstTextBlock,
            content: firstTextBlock.content + imageHtml,
          };
          handleBlockUpdate(updatedBlock);
        }
      };
      reader.readAsDataURL(file);
    }
  };
  
  useEffect(() => {
    const handleResize = () => setIsMobileView(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  useEffect(() => {
    if (isDrawingPopoverOpen && !isMobileView && drawingToolsRef.current) {
      const rect = drawingToolsRef.current.getBoundingClientRect();
      setPopoverStyle({
        position: 'fixed',
        top: `${rect.bottom + 12}px`,
        left: `${rect.left + rect.width / 2}px`,
        transform: 'translateX(-50%)',
      });
    }
  }, [isDrawingPopoverOpen, isMobileView]);
  
  useEffect(() => {
    if (isTextColorPopoverOpen && !isMobileView && textColorButtonRef.current) {
      const rect = textColorButtonRef.current.getBoundingClientRect();
      setTextColorPopoverStyle({
        position: 'fixed',
        top: `${rect.bottom + 12}px`,
        left: `${rect.left + rect.width / 2}px`,
        transform: 'translateX(-50%)',
      });
    }
  }, [isTextColorPopoverOpen, isMobileView]);
  
  const handleTextCommand = useCallback((command: 'bold' | 'italic' | 'strikeThrough' | 'insertUnorderedList') => {
    document.execCommand(command, false);
  }, []);
  
  const handleTextColorChange = (color: string) => {
    document.execCommand('styleWithCSS', false, 'true');
    document.execCommand('foreColor', false, color);
    setIsTextColorPopoverOpen(false);
  };
  
  const isDrawingToolActive = useMemo(() => [Tool.Pen, Tool.Highlighter, Tool.Eraser].includes(activeTool), [activeTool]);
  const currentDrawingColor = activeTool === Tool.Pen ? penColor : highlighterColor;
  
  return (
    <div className="flex flex-col h-screen w-screen bg-paper dark:bg-paper-dark animate-fade-in">
      <header className="shrink-0 z-20 bg-paper/80 dark:bg-paper-dark/80 backdrop-blur-sm sticky top-0 border-b border-chrome dark:border-border-dark">
        <div className="flex items-center p-3 gap-3">
          <button onClick={onBack} className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors shrink-0" aria-label="Go back">
            {ICONS.back}
          </button>
          <div className="flex flex-col flex-1">
            <input 
              type="text" 
              value={currentNote.title} 
              onChange={handleTitleChange}
              className="font-sans font-bold text-lg bg-transparent focus:outline-none focus:bg-black/5 dark:focus:bg-white/5 rounded px-2 py-1 w-full"
              placeholder="Untitled Note"
            />
            <p className="text-xs text-charcoal/60 dark:text-text-dark/60 px-2">{folderName}</p>
          </div>
          <div className="flex items-center gap-4 shrink-0">
            {saveStatus === 'saved' ? (
              <div className="flex items-center gap-1.5 text-charcoal/60 dark:text-text-dark/60">
                {React.cloneElement(ICONS.checkmark, { className: "h-5 w-5"})}
                <span className="text-sm font-medium hidden sm:inline">Saved</span>
              </div>
            ) : (
              <span className="text-sm font-medium text-charcoal/60 dark:text-text-dark/60 animate-pulse">Saving...</span>
            )}
            
            <div className="relative">
              <button ref={paperToolsRef} onClick={() => setIsPaperPopoverOpen(p => !p)} className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors" aria-label="Paper options">
                {ICONS.paperOptions}
              </button>
              {isPaperPopoverOpen && (
                <div ref={paperPopoverRef} className="absolute top-full right-0 mt-2 w-56 bg-white dark:bg-charcoal-dark rounded-lg shadow-xl border border-chrome/50 dark:border-border-dark p-2 z-30 animate-slide-in-down">
                  <div className='p-2 text-sm font-semibold text-charcoal/70 dark:text-text-dark/70'>Paper Color</div>
                  <div className="grid grid-cols-2 gap-2 p-2">
                    <button onClick={() => handlePaperColorChange('white')} className={`h-10 w-full rounded border-2 ${currentNote.paper_color === 'white' ? 'border-accent' : 'border-chrome dark:border-border-dark'}`} style={{backgroundColor: '#FAFAF7'}}></button>
                    <button onClick={() => handlePaperColorChange('yellow')} className={`h-10 w-full rounded border-2 ${currentNote.paper_color === 'yellow' ? 'border-accent' : 'border-chrome dark:border-border-dark'}`} style={{backgroundColor: '#FEF9E7'}}></button>
                  </div>
                  <div className='p-2 text-sm font-semibold text-charcoal/70 dark:text-text-dark/70'>Paper Style</div>
                  <div className="grid grid-cols-3 gap-2 p-2">
                    {Object.values(PaperStyle).map(style => (
                      <button key={style} onClick={() => handlePaperStyleChange(style)} className={`capitalize h-12 text-xs rounded border-2 flex items-center justify-center ${currentNote.paper_style === style ? 'border-accent' : 'border-chrome dark:border-border-dark'}`}>
                        {style}
                      </button>
                    ))}
                  </div>
                  <div className="h-px bg-chrome/50 dark:bg-border-dark/50 my-1"></div>
                  <div className='p-2 text-sm font-semibold text-charcoal/70 dark:text-text-dark/70'>Text Size</div>
                  <div className="grid grid-cols-3 gap-2 p-2">
                    <button onClick={() => handleFontSizeChange('small')} className={`h-10 text-sm rounded border-2 flex items-center justify-center ${currentNote.font_size === 'small' ? 'border-accent' : 'border-chrome dark:border-border-dark'}`}>Small</button>
                    <button onClick={() => handleFontSizeChange('medium')} className={`h-10 text-base rounded border-2 flex items-center justify-center ${currentNote.font_size === 'medium' ? 'border-accent' : 'border-chrome dark:border-border-dark'}`}>Medium</button>
                    <button onClick={() => handleFontSizeChange('large')} className={`h-10 text-lg rounded border-2 flex items-center justify-center ${currentNote.font_size === 'large' ? 'border-accent' : 'border-chrome dark:border-border-dark'}`}>Large</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="border-t border-chrome dark:border-border-dark">
          <div className="flex items-center gap-2 p-2 overflow-x-auto no-scrollbar">
            {/* Tool Selection */}
            <button 
              onClick={() => setActiveTool(Tool.Text)}
              className={`p-2 rounded-full transition-colors shrink-0 ${activeTool === Tool.Text ? 'bg-accent/10 text-accent dark:bg-accent/20' : 'hover:bg-black/10 dark:hover:bg-white/10 text-charcoal dark:text-text-dark'}`}
              aria-label="Text tool"
            >
              {ICONS.text}
            </button>
            
            <div className="relative shrink-0" ref={drawingToolsRef}>
              <button 
                onClick={() => setIsDrawingPopoverOpen(p => !p)} 
                className={`p-2 rounded-full transition-colors flex items-center gap-1 ${isDrawingToolActive ? 'bg-accent/10 text-accent dark:bg-accent/20' : 'hover:bg-black/10 dark:hover:bg-white/10 text-charcoal dark:text-text-dark'}`}
                aria-label="Drawing tools"
              >
                {ICONS.pen}
                <svg className="h-3 w-3 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>
            </div>
            
            <div className="h-6 w-px bg-chrome dark:bg-border-dark shrink-0"></div>
            
            {/* Text Formatting (only show when text tool is active) */}
            {activeTool === Tool.Text && (
              <>
                <button onMouseDown={(e) => { e.preventDefault(); handleTextCommand('bold'); }} className={`p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors shrink-0 text-charcoal dark:text-text-dark`}>{ICONS.bold}</button>
                <button onMouseDown={(e) => { e.preventDefault(); handleTextCommand('italic'); }} className={`p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors shrink-0 text-charcoal dark:text-text-dark`}>{ICONS.italic}</button>
                <button onMouseDown={(e) => { e.preventDefault(); handleTextCommand('strikeThrough'); }} className={`p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors shrink-0 text-charcoal dark:text-text-dark`}>{ICONS.strikethrough}</button>
                <button ref={textColorButtonRef} onMouseDown={(e) => { e.preventDefault(); setIsTextColorPopoverOpen(p => !p); }} className={`p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors shrink-0 ${isTextColorPopoverOpen ? 'bg-accent/10 text-accent dark:bg-accent/20' : 'text-charcoal dark:text-text-dark'}`}>{ICONS.textColor}</button>
                <button onMouseDown={(e) => { e.preventDefault(); handleTextCommand('insertUnorderedList'); }} className={`p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors shrink-0 text-charcoal dark:text-text-dark`}>{ICONS.bulletList}</button>
                
                <div className="h-6 w-px bg-chrome dark:bg-border-dark shrink-0"></div>
              </>
            )}
            
            <button onClick={() => imageInputRef.current?.click()} className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors shrink-0 text-charcoal dark:text-text-dark" aria-label="Add image">{ICONS.image}</button>
            <input type="file" accept="image/*" ref={imageInputRef} onChange={handleImageUpload} className="hidden" />
            
            <button onClick={isRecording ? stopRecording : startRecording} className={`p-2 rounded-full transition-colors shrink-0 ${isRecording ? 'text-coral pulse-rec-animation' : 'hover:bg-black/10 dark:hover:bg-white/10 text-charcoal dark:text-text-dark'}`} aria-label={isRecording ? 'Stop recording' : 'Start recording'}>
              {isRecording ? ICONS.stop : ICONS.mic}
            </button>
          </div>
        </div>
      </header>
      
      {isDrawingPopoverOpen && (
        <div
          style={isMobileView ? {} : popoverStyle}
          className={
            isMobileView
            ? 'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[calc(100vw-2rem)] max-w-sm'
            : 'fixed z-50'
          }
        >
          <div
            ref={drawingPopoverRef}
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
                  onClick={handleClearDrawing}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold text-coral bg-coral/10 hover:bg-coral/20 transition-colors"
                >
                  {React.cloneElement(ICONS.clearCanvas, { className: "h-5 w-5"})}
                  <span>Clear All Drawings</span>
                </button>
              </>
            )}
          </div>
        </div>
      )}
      
      {isTextColorPopoverOpen && (
        <div
          style={isMobileView ? {} : textColorPopoverStyle}
          className={
            isMobileView
            ? 'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[calc(100vw-2rem)] max-w-xs'
            : 'fixed z-50'
          }
        >
          <div
            ref={textColorPopoverRef}
            className="bg-white dark:bg-charcoal-dark rounded-lg shadow-xl border border-chrome/50 dark:border-border-dark p-3 animate-slide-in-down w-64"
          >
            <div className="text-sm font-semibold text-charcoal/80 dark:text-text-dark/80 mb-2 px-1">Text Color</div>
            <div className="grid grid-cols-5 gap-2">
              {TEXT_COLORS.map(c => (
                <button
                  key={c}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleTextColorChange(c)}
                  className="h-8 w-8 rounded-full border border-black/10 dark:border-white/10 hover:scale-110 transition-transform"
                  style={{ backgroundColor: c }}
                  title={c}
                />
              ))}
            </div>
          </div>
        </div>
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
