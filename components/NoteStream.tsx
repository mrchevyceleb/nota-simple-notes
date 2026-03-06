import React, { useState, useRef } from 'react';
import { NoteWithFolder } from '../App';
import { Note, TextBlock, CanvasTextBlock } from '../types';
import { ICONS, FOLDER_COLOR_VALUES } from '../constants';
import { ViewMode } from '../hooks/useViewMode';
import { useOnClickOutside } from '../hooks/useOnClickOutside';

const getPlainText = (html: string | undefined) => {
    if (!html) return '';
    const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    return text.length > 150 ? text.substring(0, 150) : text;
}

const getNoteTextPreview = (note: Note): string => {
    // Look for both legacy 'text' blocks and canvas 'canvas-text' blocks
    const textBlock = note.content.find(b => b.type === 'text' || b.type === 'canvas-text') as TextBlock | CanvasTextBlock | undefined;
    return getPlainText(textBlock?.content);
}

const NotePreviewGrid: React.FC<{ note: Note; accentColor: string; showNoteColorLabels: boolean; }> = ({ note, accentColor, showNoteColorLabels }) => {
  const textPreview = getNoteTextPreview(note);

  return (
    <div
      className={`bg-white dark:bg-charcoal-dark rounded-xl shadow-card hover:shadow-card-hover dark:shadow-card-dark dark:hover:shadow-card-hover-dark transition-all duration-300 overflow-hidden h-44 flex flex-col border border-chrome/30 dark:border-border-dark/30 ${showNoteColorLabels ? 'border-t-[3px]' : ''}`}
      style={showNoteColorLabels ? { borderTopColor: accentColor } : {}}
    >
      <div className="p-4 flex-grow flex flex-col">
        <h3 className="font-semibold font-sans text-[15px] leading-snug text-charcoal dark:text-text-dark mb-2 line-clamp-2 pr-8">{note.title}</h3>
        <p className="text-[13px] text-charcoal/55 dark:text-text-dark/55 line-clamp-2 leading-relaxed flex-grow">
            {textPreview || <span className="italic text-charcoal/40 dark:text-text-dark/40">No content</span>}
        </p>
        <p className="text-[11px] text-charcoal/40 dark:text-text-dark/40 mt-3 font-medium tracking-wide">
          {new Date(note.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </p>
      </div>
    </div>
  );
};

const NotePreviewList: React.FC<{ note: Note; accentColor: string; showNoteColorLabels: boolean; }> = ({ note, accentColor, showNoteColorLabels }) => {
    const textPreview = getNoteTextPreview(note);
  
    return (
      <div
        className={`bg-white dark:bg-charcoal-dark rounded-xl shadow-card hover:shadow-card-hover dark:shadow-card-dark dark:hover:shadow-card-hover-dark transition-all duration-200 flex items-center p-4 pr-20 border border-chrome/30 dark:border-border-dark/30 ${showNoteColorLabels ? 'border-l-[3px]' : ''}`}
        style={showNoteColorLabels ? { borderLeftColor: accentColor } : {}}
      >
        <div className="flex-grow min-w-0">
            <h3 className="font-semibold font-sans text-[15px] truncate text-charcoal dark:text-text-dark">{note.title}</h3>
            <p className="text-[13px] text-charcoal/55 dark:text-text-dark/55 truncate mt-1">
                {textPreview || <span className="italic text-charcoal/40 dark:text-text-dark/40">No content</span>}
            </p>
        </div>
        <p className="text-[11px] text-charcoal/40 dark:text-text-dark/40 ml-4 shrink-0 hidden sm:block font-medium tracking-wide">
          {new Date(note.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </p>
      </div>
    );
};


interface NoteCardProps {
    note: NoteWithFolder;
    viewMode: ViewMode;
    onSelect: () => void;
    onTogglePin: (noteId: string, folderId: string) => void;
    onDelete: () => void;
    showNoteColorLabels: boolean;
}

const NoteCard: React.FC<NoteCardProps> = ({ note, viewMode, onSelect, onTogglePin, onDelete, showNoteColorLabels }) => {
    const commonButtonClasses = "p-2 bg-white/90 dark:bg-charcoal-dark/90 backdrop-blur-sm rounded-lg text-charcoal/50 dark:text-text-dark/50 transition-all duration-200 shadow-sm";
    const pinButtonClasses = `${commonButtonClasses} hover:bg-accent/10 hover:text-accent hover:scale-105`;
    const deleteButtonClasses = `${commonButtonClasses} hover:bg-coral/10 hover:text-coral hover:scale-105`;

    const accentColor = FOLDER_COLOR_VALUES[note.folderColorIndex ?? 0];

    const handleDragStart = (e: React.DragEvent) => {
        e.dataTransfer.setData('text/plain', note.id);
        e.dataTransfer.effectAllowed = 'move';
    };

    // Handle click on the card - separate from drag to ensure clicks work reliably
    const handleClick = (e: React.MouseEvent) => {
        // Don't trigger if clicking on action buttons
        if ((e.target as HTMLElement).closest('.note-action-btn')) {
            return;
        }
        onSelect();
    };

    return (
        <div 
            className="relative group cursor-grab active:cursor-grabbing" 
            draggable 
            onDragStart={handleDragStart}
            onClick={handleClick}
        >
            <div 
                className="w-full h-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-accent rounded-xl transform transition-transform duration-200 hover:-translate-y-1"
            >
                {viewMode === 'grid' 
                    ? <NotePreviewGrid note={note} accentColor={accentColor} showNoteColorLabels={showNoteColorLabels} /> 
                    : <NotePreviewList note={note} accentColor={accentColor} showNoteColorLabels={showNoteColorLabels} />}
            </div>
            {/* Action buttons - hidden until hover, with pointer-events-none when hidden */}
            <div className={`absolute flex items-center gap-1.5 z-10 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none group-hover:pointer-events-auto ${
                viewMode === 'grid' 
                    ? 'top-3 right-3 flex-row' 
                    : 'top-1/2 -translate-y-1/2 right-3 flex-row'
            }`}>
                <button
                    onClick={(e) => { e.stopPropagation(); onTogglePin(note.id, note.folderId); }}
                    className={`${pinButtonClasses} note-action-btn`}
                    aria-label={note.is_pinned ? 'Unpin note' : 'Pin note'}
                >
                    {note.is_pinned 
                        ? React.cloneElement(ICONS.pinFilled, {className: "h-4 w-4 text-accent"}) 
                        : React.cloneElement(ICONS.pin, {className: "h-4 w-4"})}
                </button>
                <button
                    onClick={(e) => { e.stopPropagation(); onDelete(); }}
                    className={deleteButtonClasses}
                    aria-label="Delete note"
                >
                    {React.cloneElement(ICONS.trash, {className: "h-4 w-4"})}
                </button>
            </div>
            {/* Pinned indicator badge - always visible when pinned */}
            {note.is_pinned && (
                <div className="absolute top-3 right-3 opacity-100 group-hover:opacity-0 transition-opacity duration-200 pointer-events-none">
                    <div className="p-1.5 bg-accent/10 rounded-lg">
                        {React.cloneElement(ICONS.pinFilled, {className: "h-4 w-4 text-accent"})}
                    </div>
                </div>
            )}
        </div>
    )
};


interface NoteStreamProps {
  title: string;
  notes: NoteWithFolder[];
  onSelectNote: (note: NoteWithFolder) => void;
  onAddNote: () => void;
  onDeleteNote: (noteId: string, folderId: string) => void;
  onTogglePin: (noteId: string, folderId: string) => void;
  onMenuClick: () => void;
  viewMode: ViewMode;
  onToggleViewMode: () => void;
  showNoteColorLabels: boolean;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

const NoteStream: React.FC<NoteStreamProps> = ({ title, notes, onSelectNote, onAddNote, onDeleteNote, onTogglePin, onMenuClick, viewMode, onToggleViewMode, showNoteColorLabels, searchQuery, onSearchChange }) => {
    const [noteToDelete, setNoteToDelete] = useState<NoteWithFolder | null>(null);
    const confirmationModalRef = useRef<HTMLDivElement>(null);
    useOnClickOutside(confirmationModalRef, () => setNoteToDelete(null));

    const pinnedNotes = notes.filter(n => n.is_pinned);
    const otherNotes = notes.filter(n => !n.is_pinned);

    const confirmDelete = () => {
        if (noteToDelete) {
            onDeleteNote(noteToDelete.id, noteToDelete.folderId);
            setNoteToDelete(null);
        }
    };

    const renderNotes = (notesToRender: NoteWithFolder[]) => {
        const gridClasses = "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6";
        const listClasses = "flex flex-col gap-3";

        return (
            <div className={viewMode === 'grid' ? gridClasses : listClasses}>
                {notesToRender.map(note => (
                    <NoteCard 
                        key={note.id}
                        note={note}
                        viewMode={viewMode}
                        onSelect={() => onSelectNote(note)}
                        onTogglePin={onTogglePin}
                        onDelete={() => setNoteToDelete(note)}
                        showNoteColorLabels={showNoteColorLabels}
                    />
                ))}
            </div>
        )
    };

    // Section header component for consistent styling
    const SectionHeader: React.FC<{ children: React.ReactNode }> = ({ children }) => (
        <div className="flex items-center gap-3 mb-5">
            <h2 className="text-xs font-semibold font-sans uppercase tracking-wider text-charcoal/50 dark:text-text-dark/50">
                {children}
            </h2>
            <div className="flex-grow h-px bg-gradient-to-r from-chrome/60 dark:from-border-dark/60 to-transparent"></div>
        </div>
    );

    return (
    <>
        <div className="p-4 sm:p-6 lg:p-8 w-full animate-slide-in-right">
        <header className="flex items-center justify-between mb-8 sticky top-0 bg-paper/90 dark:bg-paper-dark/90 backdrop-blur-md z-10 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-4 border-b border-chrome/50 dark:border-border-dark/50">
            <div className="flex items-center gap-3 flex-1 min-w-0">
                <button onClick={onMenuClick} className="p-2 -ml-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors md:hidden" aria-label="Open menu">
                    {ICONS.menu}
                </button>
                <h1 className="text-2xl sm:text-3xl font-bold font-sans text-charcoal dark:text-text-dark truncate hidden sm:block tracking-tight">{title}</h1>
                <div className="relative w-full sm:max-w-xs sm:ml-4">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-charcoal/40 dark:text-text-dark/40">
                        {React.cloneElement(ICONS.search, {className: "h-4 w-4"})}
                    </span>
                    <input
                        type="search"
                        placeholder="Search notes..."
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="w-full bg-chrome/40 dark:bg-charcoal-dark/40 border border-chrome/50 dark:border-border-dark/30 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/50 transition-all placeholder:text-charcoal/40 dark:placeholder:text-text-dark/40"
                    />
                </div>
            </div>
            <div className="flex items-center gap-2 ml-3">
                <button 
                    onClick={onToggleViewMode} 
                    className="p-2.5 rounded-xl text-charcoal/50 dark:text-text-dark/50 hover:bg-black/5 dark:hover:bg-white/5 hover:text-charcoal dark:hover:text-text-dark transition-all" 
                    aria-label={`Switch to ${viewMode === 'grid' ? 'list' : 'grid'} view`}
                >
                    {viewMode === 'grid' ? React.cloneElement(ICONS.list, {className: "h-5 w-5"}) : React.cloneElement(ICONS.grid, {className: "h-5 w-5"})}
                </button>
                <button 
                    onClick={onAddNote} 
                    className="bg-accent hover:bg-accent/90 text-white font-semibold py-2.5 px-4 rounded-xl flex items-center gap-2 transition-all shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] shrink-0"
                >
                    {React.cloneElement(ICONS.plus, {className: 'h-5 w-5'})}
                    <span className="font-sans hidden sm:inline">New Note</span>
                </button>
            </div>
        </header>
        
        {notes.length === 0 ? (
            <div className="flex-grow flex flex-col items-center justify-center text-center text-charcoal/60 dark:text-text-dark/60 mt-24">
                {searchQuery ? (
                    <>
                        {React.cloneElement(ICONS.search, { className: "w-16 h-16 mb-4 text-charcoal/20 dark:text-text-dark/20", strokeWidth: 1 })}
                        <h2 className="text-xl font-semibold font-sans mb-2">No Results Found</h2>
                        <p className="font-body max-w-xs text-charcoal/50 dark:text-text-dark/50">Your search for "{searchQuery}" did not match any notes.</p>
                    </>
                ) : (
                    <>
                        <svg className="w-16 h-16 mb-4 text-charcoal/20 dark:text-text-dark/20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        <h2 className="text-xl font-semibold font-sans mb-2">No Notes Yet</h2>
                        <p className="font-body text-charcoal/50 dark:text-text-dark/50">Click "New Note" to get started.</p>
                    </>
                )}
            </div>
        ) : (
            <div className="space-y-10">
                {pinnedNotes.length > 0 && (
                    <section>
                        <SectionHeader>Pinned</SectionHeader>
                        {renderNotes(pinnedNotes)}
                    </section>
                )}
                {otherNotes.length > 0 && (
                    <section>
                        {pinnedNotes.length > 0 && <SectionHeader>Recent</SectionHeader>}
                        {renderNotes(otherNotes)}
                    </section>
                )}
            </div>
        )}
        </div>
        {noteToDelete && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center animate-fade-in">
                <div ref={confirmationModalRef} className="bg-white dark:bg-charcoal-dark rounded-2xl shadow-2xl p-6 w-full max-w-sm m-4 text-center border border-chrome/20 dark:border-border-dark/20">
                    <div className="w-12 h-12 rounded-full bg-coral/10 flex items-center justify-center mx-auto mb-4">
                        {React.cloneElement(ICONS.trash, {className: "h-6 w-6 text-coral"})}
                    </div>
                    <h3 className="text-lg font-bold font-sans">Delete Note?</h3>
                    <p className="text-sm text-charcoal/60 dark:text-text-dark/60 mt-2">
                        Are you sure you want to permanently delete "{noteToDelete.title}"? This cannot be undone.
                    </p>
                    <div className="flex gap-3 mt-6">
                        <button 
                            onClick={() => setNoteToDelete(null)} 
                            className="flex-1 px-4 py-2.5 rounded-xl bg-chrome/30 dark:bg-border-dark/30 hover:bg-chrome/50 dark:hover:bg-border-dark/50 font-semibold transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={confirmDelete} 
                            className="flex-1 px-4 py-2.5 rounded-xl bg-coral text-white font-semibold hover:bg-coral/90 transition-colors"
                        >
                            Delete
                        </button>
                    </div>
                </div>
            </div>
        )}
    </>
  );
};

export default NoteStream;
