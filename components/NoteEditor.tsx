
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Note, Tool, ContentBlock, DrawingBlock, AudioBlock, PaperStyle, TextBlock, DrawingPath, FontSize } from '../types';
import { ICONS, PEN_COLORS, HIGHLIGHTER_COLORS, STROKE_WIDTHS, getPaperPatternStyles, LINE_COLOR_ON_LIGHT, LINE_COLOR_ON_DARK, TEXT_COLORS } from '../constants';
import DrawingCanvas from './DrawingCanvas';
import { useTheme } from '../hooks/useTheme';


interface NoteEditorProps {
  note: Note;
  folderName: string;
  onBack: () => void;
  onUpdateNote: (note: Note) => void;
}

// Moved debounce outside the component to prevent it from being recreated on every render.
const debounce = <T extends (...args: any[]) => any,>(func: T, delay: number) => {
    let timeout: ReturnType<typeof setTimeout>;
    return (...args: Parameters<T>): void => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), delay);
    };
};

const areNotesEqual = (a: Note, b: Note) => {
    if (!a || !b) return false;
    // A more robust check than stringify on the whole object
    return a.title === b.title &&
            a.paper_style === b.paper_style &&
            a.paper_color === b.paper_color &&
            a.font_size === b.font_size &&
            JSON.stringify(a.content) === JSON.stringify(b.content);
};

const MAX_PAPER_HEIGHT = 20000; // Cap height to prevent browser rendering engine from crashing.
const SEGMENT_HEIGHT = 1200; // The fixed height for each virtualized canvas segment.

const NoteEditor: React.FC<NoteEditorProps> = ({ note, folderName, onBack, onUpdateNote }) => {
  const [theme] = useTheme();
  const [currentNote, setCurrentNote] = useState<Note>(note);
  const [activeTool, setActiveTool] = useState<Tool>(Tool.Text);
  const [penColor, setPenColor] = useState(PEN_COLORS[0]);
  const [highlighterColor, setHighlighterColor] = useState(HIGHLIGHTER_COLORS[0]);
  const [strokeWidth, setStrokeWidth] = useState(STROKE_WIDTHS[1]);
  const [isRecording, setIsRecording] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');
  const [isDrawingPopoverOpen, setIsDrawingPopoverOpen] = useState(false);
  const [isPaperPopoverOpen, setIsPaperPopoverOpen] = useState(false);
  const [isTextColorPopoverOpen, setIsTextColorPopoverOpen] = useState(false);
  const [paperHeight, setPaperHeight] = useState(window.innerHeight * 2);
  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({});
  const [textColorPopoverStyle, setTextColorPopoverStyle] = useState<React.CSSProperties>({});
  const [isMobileView, setIsMobileView] = useState(window.innerWidth < 768);
  const [isInteracting, setIsInteracting] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const mainRef = useRef<HTMLDivElement | null>(null);
  const paperRef = useRef<HTMLDivElement | null>(null);
  const contentEditableRef = useRef<HTMLDivElement>(null);
  const [editorWidth, setEditorWidth] = useState(0);

  const drawingToolsRef = useRef<HTMLDivElement>(null);
  const drawingPopoverRef = useRef<HTMLDivElement>(null);
  const paperToolsRef = useRef<HTMLButtonElement>(null);
  const paperPopoverRef = useRef<HTMLDivElement>(null);
  const textColorButtonRef = useRef<HTMLButtonElement>(null);
  const textColorPopoverRef = useRef<HTMLDivElement>(null);
  const isSelectingRef = useRef(false);
  const selectionStartTargetRef = useRef<EventTarget | null>(null);

  useEffect(() => {
    const handleMouseUp = () => {
        isSelectingRef.current = false;
        selectionStartTargetRef.current = null;
    };
    const handleMouseDown = (e: MouseEvent) => {
        selectionStartTargetRef.current = e.target;
        // If mouse down is inside editor, we might be selecting
        if (contentEditableRef.current && contentEditableRef.current.contains(e.target as Node)) {
            isSelectingRef.current = true;
        }
    };

    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('mousedown', handleMouseDown);
    return () => {
        window.removeEventListener('mouseup', handleMouseUp);
        window.removeEventListener('mousedown', handleMouseDown);
    };
  }, []);


  // Save scroll position when the tab becomes hidden or when the component unmounts
  useEffect(() => {
    const mainEl = mainRef.current;
    const saveScrollPosition = () => {
        if (mainEl && note?.id) {
            sessionStorage.setItem(`nota-scroll-pos-${note.id}`, String(mainEl.scrollTop));
        }
    };
    const handleVisibilityChange = () => {
        if (document.visibilityState === 'hidden') {
            saveScrollPosition();
        }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
        saveScrollPosition(); // Save one last time on unmount
        document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [note?.id]);

  // Restore scroll position when the note editor is mounted
  useEffect(() => {
    const mainEl = mainRef.current;
    if (!mainEl || !note?.id) return;

    const savedScrollPos = sessionStorage.getItem(`nota-scroll-pos-${note.id}`);
    if (savedScrollPos) {
      const scrollValue = parseInt(savedScrollPos, 10);
      if (isNaN(scrollValue)) return;

      const attemptScroll = (retries = 5) => {
        if (!mainRef.current || retries <= 0) return;
        if (mainRef.current.scrollHeight > scrollValue) {
          mainRef.current.scrollTop = scrollValue;
        } else {
          setTimeout(() => attemptScroll(retries - 1), 150);
        }
      };

      const frameId = requestAnimationFrame(() => {
        attemptScroll();
      });
      
      return () => cancelAnimationFrame(frameId);
    }
  }, [note?.id]);

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
  
  useEffect(() => {
      const editor = contentEditableRef.current;
      if (document.activeElement === editor || isInteracting || saveStatus === 'saving') {
          return;
      }
      
      if (!areNotesEqual(note, currentNote)) {
          setCurrentNote(note);
      }
  }, [note, isInteracting, saveStatus]);
  
  const textBlock = useMemo(() => {
    return (currentNote.content.find(b => b.type === 'text') as TextBlock | undefined)
      || { id: `text-${Date.now()}`, type: 'text' as const, content: '', style: { bold: false, italic: false } };
  }, [currentNote.content]);

  const drawingBlock = useMemo(() => {
    return currentNote.content.find(b => b.type === 'drawing') as DrawingBlock | undefined;
  }, [currentNote.content]);

  useEffect(() => {
      const editor = contentEditableRef.current;
      if (editor && document.activeElement !== editor && editor.innerHTML !== textBlock.content) {
          editor.innerHTML = textBlock.content;
      }
  }, [textBlock.content]);

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

  const handleScroll = useCallback(() => {
    if (!mainRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = mainRef.current;

    if (!isSelectingRef.current && paperHeight < MAX_PAPER_HEIGHT && scrollTop + clientHeight >= scrollHeight - 50) {
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

  const updateContentBlock = useCallback((updatedBlock: ContentBlock) => {
    setSaveStatus('saving');
    setCurrentNote(prev => {
        const blockExists = prev.content.some(b => b.id === updatedBlock.id);
        let newContent: ContentBlock[];
        if (blockExists) {
            newContent = prev.content.map(b => b.id === updatedBlock.id ? updatedBlock : b);
        } else {
            newContent = [...prev.content, updatedBlock];
        }
        const updatedNote = { ...prev, content: newContent };
        debouncedOnUpdateNote(updatedNote);
        return updatedNote;
    });
  }, [debouncedOnUpdateNote]);
  
  const deleteContentBlock = (blockId: string) => {
    setSaveStatus('saving');
    setCurrentNote(prev => {
        const updatedNote = {
            ...prev,
            content: prev.content.filter(b => b.id !== blockId)
        };
        debouncedOnUpdateNote(updatedNote);
        return updatedNote;
    });
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSaveStatus('saving');
    const newTitle = e.target.value;
    setCurrentNote(prev => {
        const updatedNote = { ...prev, title: newTitle };
        debouncedOnUpdateNote(updatedNote);
        return updatedNote;
    });
  };

  const handleTextChange = (e: React.FormEvent<HTMLDivElement>) => {
    const newContent = e.currentTarget.innerHTML;
    
    const updatedTextBlock: TextBlock = { ...textBlock, content: newContent };
    
    setSaveStatus('saving');
    setCurrentNote(prev => {
        const blockExists = prev.content.some(b => b.id === updatedTextBlock.id);
        const newContent = blockExists
            ? prev.content.map(b => b.id === updatedTextBlock.id ? updatedTextBlock : b)
            : [...prev.content, updatedTextBlock];
        const updatedNote = { ...prev, content: newContent };
        debouncedOnUpdateNote(updatedNote);
        return updatedNote;
    });
  };

  const handlePathAdd = useCallback((newPath: DrawingPath) => {
    const newDrawingBlock: DrawingBlock = {
        id: drawingBlock?.id || `drawing-${Date.now()}`,
        type: 'drawing',
        paths: [...(drawingBlock?.paths || []), newPath],
        width: editorWidth,
        height: paperHeight
    };
    updateContentBlock(newDrawingBlock);
  }, [drawingBlock, editorWidth, paperHeight, updateContentBlock]);
  
  const handlePathsDelete = useCallback((pathIdsToDelete: string[]) => {
    if (!drawingBlock || pathIdsToDelete.length === 0) return;
    
    setSaveStatus('saving');
    setCurrentNote(prev => {
        const currentDrawingBlock = prev.content.find(b => b.type === 'drawing') as DrawingBlock | undefined;
        if (!currentDrawingBlock) return prev;

        const updatedPaths = currentDrawingBlock.paths.filter(p => !pathIdsToDelete.includes(p.id));
        
        const newDrawingBlock: DrawingBlock = {
            ...currentDrawingBlock,
            paths: updatedPaths,
        };
        
        const newContent = prev.content.map(b => b.id === newDrawingBlock.id ? newDrawingBlock : b);
        const updatedNote = { ...prev, content: newContent };
        debouncedOnUpdateNote(updatedNote);
        return updatedNote;
    });
  }, [drawingBlock, debouncedOnUpdateNote]);

  const handleClearDrawing = () => {
    if (drawingBlock && window.confirm('Are you sure you want to clear all drawings on this note? This cannot be undone.')) {
        const clearedBlock: DrawingBlock = {
            ...drawingBlock,
            paths: [],
        };
        updateContentBlock(clearedBlock);
        setIsDrawingPopoverOpen(false);
    } else if (!drawingBlock) {
        alert("There are no drawings to clear.");
    }
  };


  const isDrawingToolActive = useMemo(() => [Tool.Pen, Tool.Highlighter, Tool.Eraser].includes(activeTool), [activeTool]);
  const isTextToolActive = useMemo(() => activeTool === Tool.Text, [activeTool]);
  
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
    contentEditableRef.current?.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
  }, []);

  const handleTextColorChange = (color: string) => {
    document.execCommand('styleWithCSS', false, 'true');
    document.execCommand('foreColor', false, color);
    setIsTextColorPopoverOpen(false);
    contentEditableRef.current?.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
  };

  const handleFormatChecklist = useCallback(() => {
    const editor = contentEditableRef.current;
    if (!editor) return;
    
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    
    const range = selection.getRangeAt(0);
    let node: Node | null = range.startContainer;
    
    // Traverse up to find a block element
    while (node && node !== editor && node.nodeName !== 'DIV' && node.nodeName !== 'P' && node.nodeName !== 'LI') {
        node = node.parentNode;
    }
    
    if (!node || node === editor) {
        // Use a div with a space to ensure it doesn't collapse
        document.execCommand('insertHTML', false, '<div class="checklist-item" data-checked="false">&nbsp;</div>');
    } else {
        const el = node as HTMLElement;
        if (el.classList.contains('checklist-item')) {
            // Toggle off
            el.classList.remove('checklist-item');
            el.removeAttribute('data-checked');
        } else {
            // Toggle on
            el.classList.add('checklist-item');
            el.setAttribute('data-checked', 'false');
        }
    }
    
    editor.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
    editor.focus();
  }, []);

  const insertImage = useCallback((file: File, clientX?: number, clientY?: number) => {
    const reader = new FileReader();
    reader.onload = (e) => {
        const imageUrl = e.target?.result as string;
        const editor = contentEditableRef.current;
        if (!editor) return;

        editor.focus();
        const selection = window.getSelection();
        if (!selection) return;

        let range: Range | undefined;

        if (typeof clientX === 'number' && typeof clientY === 'number' && document.caretRangeFromPoint) {
            range = document.caretRangeFromPoint(clientX, clientY);
        }

        if (!range && selection.rangeCount > 0) {
            range = selection.getRangeAt(0);
        }
        
        if (!range || !editor.contains(range.commonAncestorContainer)) {
            range = document.createRange();
            range.selectNodeContents(editor);
            range.collapse(false);
        }

        selection.removeAllRanges();
        selection.addRange(range);
        range.deleteContents();

        const img = document.createElement('img');
        img.src = imageUrl;
        img.alt = file.name;
        img.className = "max-w-full h-auto rounded-lg shadow-md my-4";

        range.insertNode(img);

        range.setStartAfter(img);
        range.collapse(true);

        selection.removeAllRanges();
        selection.addRange(range);

        editor.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
    };
    reader.readAsDataURL(file);
  }, []);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      insertImage(file);
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
                updateContentBlock(newAudioBlock);
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

  const paperStyleProps: React.CSSProperties = useMemo(() => {
    const isWhitePaper = currentNote.paper_color === 'white';
    
    const backgroundColor = isWhitePaper
      ? (theme === 'dark' ? '#0F172A' : '#FAFAF7') // paper-dark or paper
      : '#FEF9E7'; // legal-yellow

    const isEffectivelyDarkBackground = theme === 'dark' && isWhitePaper;
    
    const lineColor = isEffectivelyDarkBackground ? LINE_COLOR_ON_DARK : LINE_COLOR_ON_LIGHT;

    const patternStyles = getPaperPatternStyles(lineColor)[currentNote.paper_style];

    return {
        ...patternStyles,
        backgroundColor,
    };
  }, [currentNote.paper_style, currentNote.paper_color, theme]);

  const fontSizeClass = useMemo(() => {
    const sizeMap: Record<FontSize, string> = {
        small: 'prose-sm',  // 14px
        medium: 'prose-xl', // 20px
        large: 'prose-2xl', // 24px
    };
    return sizeMap[currentNote.font_size] ?? 'prose-xl'; 
  }, [currentNote.font_size]);

  const currentDrawingColor = activeTool === Tool.Pen ? penColor : highlighterColor;
  
  const numSegments = Math.ceil(paperHeight / SEGMENT_HEIGHT);
  const canvasSegments = useMemo(() => Array.from({ length: numSegments }, (_, i) => i), [numSegments]);
  

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if(e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDraggingOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);

    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
        insertImage(file, e.clientX, e.clientY);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();

    // Check for image data first
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
            const file = items[i].getAsFile();
            if (file) {
                insertImage(file);
                return; 
            }
        }
    }

    // Try to get HTML content first for rich text support
    const html = e.clipboardData.getData('text/html');
    const text = e.clipboardData.getData('text/plain');
    
    if (html) {
        // Minimal sanitization to allow rich text but prevent basic XSS
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        // Remove scripts and potentially harmful elements, but leave formatting
        doc.querySelectorAll('script, iframe, object, embed, form, input, button').forEach(el => el.remove());
        
        const sanitizedHtml = doc.body.innerHTML;
        if (sanitizedHtml) {
            document.execCommand('insertHTML', false, sanitizedHtml);
            return;
        }
    }

    // Fallback to text/plain parsing if no HTML or parsing failed
    if (!text) return;

    const escapeHtml = (unsafe: string): string => {
        const div = document.createElement('div');
        div.textContent = unsafe;
        return div.innerHTML;
    };
    
    const urlRegex = /\b(https?|ftp|file):\/\/[^\s,;"'<>()]+/gi;
    
    const lines = text.split('\n');

    const processLine = (line: string): string => {
        if (!line) return '';

        const parts = [];
        let lastIndex = 0;
        let match;
        const lineUrlRegex = new RegExp(urlRegex); 

        while ((match = lineUrlRegex.exec(line)) !== null) {
            if (match.index > lastIndex) {
                parts.push(escapeHtml(line.substring(lastIndex, match.index)));
            }
            
            const url = match[0];
            parts.push(`<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-accent underline hover:opacity-80">${escapeHtml(url)}</a>`);
            lastIndex = lineUrlRegex.lastIndex;
        }

        if (lastIndex < line.length) {
            parts.push(escapeHtml(line.substring(lastIndex)));
        }
        
        return parts.join('');
    }

    const htmlLines = lines.map(processLine);
    const finalHtml = htmlLines.join('<br>');
    
    if (finalHtml) {
        document.execCommand('insertHTML', false, finalHtml);
    }
  };

  const handleEditorClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;

    // Handle link clicks
    const link = target.closest('a');
    if (link && link.href) {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
        return;
      }
      e.preventDefault();
      window.open(link.href, '_blank', 'noopener,noreferrer');
      return; 
    }

    const item = target.closest('.checklist-item');

    if (item && contentEditableRef.current?.contains(item)) {
        const rect = item.getBoundingClientRect();
        if (e.clientX < rect.left + 30) {
            e.preventDefault(); 
            const isChecked = item.getAttribute('data-checked') === 'true';
            item.setAttribute('data-checked', String(!isChecked));
            contentEditableRef.current?.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
        }
    }
  }, []);

  const handlePaperClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const editor = contentEditableRef.current;
    
    // If we were selecting text (dragged mouse inside editor), don't refocus or clear selection
    if (isSelectingRef.current) {
        const sel = window.getSelection();
        // If there is an active selection, we do nothing, letting the user keep their selection.
        if (sel && !sel.isCollapsed && sel.rangeCount > 0) {
           return;
        }
    }

    if (
      !isTextToolActive || 
      !editor || 
      editor.contains(e.target as Node) || 
      (e.target as HTMLElement).closest('audio, button, a, img, .checklist-item')
    ) {
      return;
    }
    
    // If user clicked exactly on the paper (background), focus the editor at the end
    editor.focus();
    const selection = window.getSelection();
    if (selection) {
      const range = document.createRange();
      range.selectNodeContents(editor);
      range.collapse(false); 
      selection.removeAllRanges();
      selection.addRange(range);
    }
  };

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
            <div className="flex items-center gap-4 p-2 overflow-x-auto no-scrollbar">
                <button onMouseDown={(e) => { e.preventDefault(); handleTextCommand('bold'); }} className={`p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors shrink-0 text-charcoal dark:text-text-dark`}>{ICONS.bold}</button>
                <button onMouseDown={(e) => { e.preventDefault(); handleTextCommand('italic'); }} className={`p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors shrink-0 text-charcoal dark:text-text-dark`}>{ICONS.italic}</button>
                <button onMouseDown={(e) => { e.preventDefault(); handleTextCommand('strikeThrough'); }} className={`p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors shrink-0 text-charcoal dark:text-text-dark`}>{ICONS.strikethrough}</button>
                <button ref={textColorButtonRef} onMouseDown={(e) => { e.preventDefault(); setIsTextColorPopoverOpen(p => !p); }} className={`p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors shrink-0 ${isTextColorPopoverOpen ? 'bg-accent/10 text-accent dark:bg-accent/20' : 'text-charcoal dark:text-text-dark'}`}>{ICONS.textColor}</button>
                <button onMouseDown={(e) => { e.preventDefault(); handleTextCommand('insertUnorderedList'); }} className={`p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors shrink-0 text-charcoal dark:text-text-dark`}>{ICONS.bulletList}</button>
                <button onMouseDown={(e) => { e.preventDefault(); handleFormatChecklist(); }} className={`p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors shrink-0 text-charcoal dark:text-text-dark`}>{ICONS.checklist}</button>

                <div className="h-6 w-px bg-chrome dark:bg-border-dark shrink-0"></div>

                <div className="relative shrink-0" ref={drawingToolsRef}>
                    <button 
                        onClick={() => setIsDrawingPopoverOpen(p => !p)} 
                        className={`p-2 rounded-full transition-colors flex items-center gap-1 ${isDrawingToolActive ? 'bg-accent/10 text-accent dark:bg-accent/20' : 'hover:bg-black/10 dark:hover:bg-white/10'}`}
                        aria-label="Drawing tools"
                    >
                        {ICONS.pen}
                        <svg className="h-3 w-3 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </button>
                </div>
                
                <div className="h-6 w-px bg-chrome dark:bg-border-dark shrink-0"></div>

                <button onClick={() => imageInputRef.current?.click()} className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors shrink-0" aria-label="Add image">{ICONS.image}</button>
                <input type="file" accept="image/*" ref={imageInputRef} onChange={handleImageUpload} className="hidden" />

                <button onClick={isRecording ? stopRecording : startRecording} className={`p-2 rounded-full transition-colors shrink-0 ${isRecording ? 'text-coral pulse-rec-animation' : 'hover:bg-black/10 dark:hover:bg-white/10'}`} aria-label={isRecording ? 'Stop recording' : 'Start recording'}>
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

      <main ref={mainRef} className="flex-1 overflow-auto flex justify-center bg-paper dark:bg-paper-dark">
        <div 
            ref={paperRef}
            style={{ 
                ...paperStyleProps,
                height: `${paperHeight}px`,
            }} 
            className={`relative w-[150vw] max-w-[1600px] min-h-full transition-all duration-200 ${isDraggingOver ? 'outline-dashed outline-2 outline-accent outline-offset-[-12px] m-2' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handlePaperClick}
        >
             {isDraggingOver && (
                <div className="absolute inset-0 bg-accent/10 pointer-events-none flex items-center justify-center z-50 backdrop-blur-sm">
                    <p className="text-accent font-bold text-2xl bg-white/50 dark:bg-paper-dark/50 px-6 py-3 rounded-lg">Drop image to upload</p>
                </div>
             )}
             {/* Page Separators */}
             {canvasSegments.slice(0, numSegments - 1).map(i => (
                <div 
                    key={`separator-${i}`}
                    className="page-top-shadow absolute left-0 w-full h-4 pointer-events-none z-[5]"
                    style={{ top: `${(i + 1) * SEGMENT_HEIGHT}px` }}
                />
            ))}

             {editorWidth > 0 && canvasSegments.map(i => {
                const yOffset = i * SEGMENT_HEIGHT;
                return (
                    <DrawingCanvas
                        key={i}
                        paths={drawingBlock?.paths || []}
                        onPathAdd={handlePathAdd}
                        onPathsDelete={handlePathsDelete}
                        tool={activeTool}
                        color={currentDrawingColor}
                        strokeWidth={strokeWidth}
                        width={editorWidth}
                        height={SEGMENT_HEIGHT}
                        yOffset={yOffset}
                        originalWidth={drawingBlock?.width || editorWidth}
                        className={`z-10 ${isDrawingToolActive ? 'pointer-events-auto' : 'pointer-events-none'}`}
                        onDrawStart={() => setIsInteracting(true)}
                        onDrawEnd={() => setIsInteracting(false)}
                    />
                );
            })}
            
            <div className="w-full max-w-4xl mx-auto relative px-4 md:px-8 z-20 pt-8 pb-8">
              <div
                ref={contentEditableRef}
                contentEditable={true}
                onInput={handleTextChange}
                onPaste={handlePaste}
                onClick={handleEditorClick}
                data-placeholder="Start typing, or drop an image..."
                className={`prose prose-stone dark:prose-invert prose-img:rounded-xl prose-img:shadow-md prose-img:my-4 w-full max-w-none focus:outline-none font-body break-words ${fontSizeClass}
                    ${!isTextToolActive ? 'caret-transparent pointer-events-none' : ''}
                    ${(!textBlock.content && isTextToolActive) ? "before:content-[attr(data-placeholder)] before:absolute before:text-charcoal/30 dark:before:text-text-dark/40 before:pointer-events-none" : ""}`
                }
              />
              <div className="space-y-6 pt-6">
                {currentNote.content.map(block => {
                    if (block.type === 'audio') {
                        return (
                            <div key={block.id} className="relative group w-full flex justify-center items-center py-2">
                                 <audio src={block.src} controls className="shadow-lg rounded-full w-full max-w-md" />
                                 <button
                                    onClick={() => deleteContentBlock(block.id)}
                                    aria-label="Delete audio recording"
                                    className="ml-4 p-1.5 bg-white/80 backdrop-blur-sm rounded-full text-charcoal/70 hover:bg-coral hover:text-white transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                                >
                                    {ICONS.trash}
                                </button>
                            </div>
                        );
                    }
                    return null;
                })}
              </div>
            </div>
        </div>
      </main>
    </div>
  );
};

export default NoteEditor;
