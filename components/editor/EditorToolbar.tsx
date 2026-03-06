import React, { useMemo } from 'react';
import { Tool } from '../../types';
import { ICONS } from '../../constants';

interface EditorToolbarProps {
  title: string;
  folderName: string;
  saveStatus: 'saved' | 'saving';
  activeTool: Tool;
  isRecording: boolean;
  isDrawingPopoverOpen: boolean;
  isTextColorPopoverOpen: boolean;
  onBack: () => void;
  onTitleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onToolChange: (tool: Tool) => void;
  onToggleDrawingPopover: () => void;
  onToggleTextColorPopover: () => void;
  onTogglePaperPopover: () => void;
  onTextCommand: (command: 'bold' | 'italic' | 'strikeThrough' | 'insertUnorderedList') => void;
  onImageUploadClick: () => void;
  onRecordToggle: () => void;
  drawingToolsRef: React.RefObject<HTMLDivElement | null>;
  paperToolsRef: React.RefObject<HTMLButtonElement | null>;
  textColorButtonRef: React.RefObject<HTMLButtonElement | null>;
  imageInputRef: React.RefObject<HTMLInputElement | null>;
  isPaperPopoverOpen: boolean;
  paperPopoverContent: React.ReactNode;
  onImageUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

const EditorToolbar: React.FC<EditorToolbarProps> = ({
  title,
  folderName,
  saveStatus,
  activeTool,
  isRecording,
  isDrawingPopoverOpen,
  isTextColorPopoverOpen,
  onBack,
  onTitleChange,
  onToolChange,
  onToggleDrawingPopover,
  onToggleTextColorPopover,
  onTogglePaperPopover,
  onTextCommand,
  onImageUploadClick,
  onRecordToggle,
  drawingToolsRef,
  paperToolsRef,
  textColorButtonRef,
  imageInputRef,
  isPaperPopoverOpen,
  paperPopoverContent,
  onImageUpload,
}) => {
  const isDrawingToolActive = useMemo(() => [Tool.Pen, Tool.Highlighter, Tool.Eraser].includes(activeTool), [activeTool]);

  return (
    <header className="shrink-0 z-20 bg-paper/80 dark:bg-paper-dark/80 backdrop-blur-sm sticky top-0 border-b border-chrome dark:border-border-dark">
      <div className="flex items-center p-3 gap-3">
        <button onClick={onBack} className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors shrink-0" aria-label="Go back">
          {ICONS.back}
        </button>
        <div className="flex flex-col flex-1">
          <input
            type="text"
            value={title}
            onChange={onTitleChange}
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
            <button ref={paperToolsRef} onClick={onTogglePaperPopover} className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors" aria-label="Paper options">
              {ICONS.paperOptions}
            </button>
            {isPaperPopoverOpen && paperPopoverContent}
          </div>
        </div>
      </div>
      <div className="border-t border-chrome dark:border-border-dark">
        <div className="flex items-center gap-2 p-2 overflow-x-auto no-scrollbar">
          <button
            onClick={() => onToolChange(Tool.Text)}
            className={`p-3 rounded-full transition-colors shrink-0 ${activeTool === Tool.Text ? 'bg-accent/10 text-accent dark:bg-accent/20' : 'hover:bg-black/10 dark:hover:bg-white/10 text-charcoal dark:text-text-dark'}`}
            aria-label="Text tool"
          >
            {ICONS.text}
          </button>

          <div className="relative shrink-0" ref={drawingToolsRef}>
            <button
              onClick={onToggleDrawingPopover}
              className={`p-3 rounded-full transition-colors flex items-center gap-1 ${isDrawingToolActive ? 'bg-accent/10 text-accent dark:bg-accent/20' : 'hover:bg-black/10 dark:hover:bg-white/10 text-charcoal dark:text-text-dark'}`}
              aria-label="Drawing tools"
            >
              {ICONS.pen}
              <svg className="h-3.5 w-3.5 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>
          </div>

          <div className="h-7 w-px bg-chrome dark:bg-border-dark shrink-0"></div>

          {activeTool === Tool.Text && (
            <>
              <button onMouseDown={(e) => { e.preventDefault(); onTextCommand('bold'); }} className="p-3 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors shrink-0 text-charcoal dark:text-text-dark">{ICONS.bold}</button>
              <button onMouseDown={(e) => { e.preventDefault(); onTextCommand('italic'); }} className="p-3 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors shrink-0 text-charcoal dark:text-text-dark">{ICONS.italic}</button>
              <button onMouseDown={(e) => { e.preventDefault(); onTextCommand('strikeThrough'); }} className="p-3 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors shrink-0 text-charcoal dark:text-text-dark">{ICONS.strikethrough}</button>
              <button ref={textColorButtonRef} onMouseDown={(e) => { e.preventDefault(); onToggleTextColorPopover(); }} className={`p-3 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors shrink-0 ${isTextColorPopoverOpen ? 'bg-accent/10 text-accent dark:bg-accent/20' : 'text-charcoal dark:text-text-dark'}`}>{ICONS.textColor}</button>
              <button onMouseDown={(e) => { e.preventDefault(); onTextCommand('insertUnorderedList'); }} className="p-3 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors shrink-0 text-charcoal dark:text-text-dark">{ICONS.bulletList}</button>

              <div className="h-7 w-px bg-chrome dark:bg-border-dark shrink-0"></div>
            </>
          )}

          <button onClick={onImageUploadClick} className="p-3 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors shrink-0 text-charcoal dark:text-text-dark" aria-label="Add image">{ICONS.image}</button>
          <input type="file" accept="image/*" ref={imageInputRef} onChange={onImageUpload} className="hidden" />

          <button onClick={onRecordToggle} className={`p-3 rounded-full transition-colors shrink-0 ${isRecording ? 'text-coral pulse-rec-animation' : 'hover:bg-black/10 dark:hover:bg-white/10 text-charcoal dark:text-text-dark'}`} aria-label={isRecording ? 'Stop recording' : 'Start recording'}>
            {isRecording ? ICONS.stop : ICONS.mic}
          </button>
        </div>
      </div>
    </header>
  );
};

export default EditorToolbar;
