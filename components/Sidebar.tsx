import React, { useState, useRef, useEffect } from 'react';
import { Folder } from '../types';
import { ICONS, FOLDER_COLORS } from '../constants';
import Logo from './Logo';
import { useOnClickOutside } from '../hooks/useOnClickOutside';
import { supabase } from '../supabaseClient';
import { Theme } from '../hooks/useTheme';

interface SidebarProps {
    folders: Folder[];
    activeFolderId: string;
    onSelectFolder: (folderId: string) => void;
    onAddFolder: (name: string) => void;
    onDeleteFolder: (folderId: string) => void;
    onUpdateFolder: (folderId: string, updates: Partial<Folder>) => void;
    onReorderFolders: (reorderedFolders: Folder[]) => void;
    isOpen: boolean;
    onClose: () => void;
    userEmail?: string;
    theme: Theme;
    onToggleTheme: () => void;
    showNoteColorLabels: boolean;
    onToggleNoteColorLabels: () => void;
    onMoveNote: (noteId: string, sourceFolderId: string | null, destinationFolderId: string) => void;
}

interface NavItemProps {
    folder: Folder;
    index: number;
    totalFolders: number;
    isActive: boolean;
    onSelectFolder: (folderId: string) => void;
    onOpenActionMenu: (folderId: string, rect: DOMRect) => void;
    onMoveFolder: (index: number, direction: 'up' | 'down') => void;
    onDropNote: (noteId: string, folderId: string) => void;
}

const NavItem: React.FC<NavItemProps> = ({ folder, index, totalFolders, isActive, onSelectFolder, onOpenActionMenu, onMoveFolder, onDropNote }) => {
    const color = FOLDER_COLORS[folder.color_index ?? index % FOLDER_COLORS.length];
    const [isDragOver, setIsDragOver] = useState(false);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setIsDragOver(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        const noteId = e.dataTransfer.getData('text/plain');
        if (noteId) {
            onDropNote(noteId, folder.id);
        }
    };
    
    return (
        <div 
            className={`relative w-full group rounded-xl transition-all ${isDragOver ? 'ring-2 ring-accent bg-accent/5' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            <button 
                className={`w-full flex items-center gap-3 pl-3 pr-8 py-2.5 rounded-xl transition-all cursor-pointer text-left ${isActive ? 'bg-accent/10 text-accent dark:bg-accent/20' : 'text-charcoal/70 dark:text-text-dark/70 hover:bg-black/[0.03] dark:hover:bg-white/[0.03]'}`}
                 onClick={() => onSelectFolder(folder.id)}
            >
                <span className={color.icon}>
                    {ICONS.folder}
                </span>
                <span className="flex-grow truncate font-medium text-[14px]">{folder.name}</span>
            </button>
            <div className="absolute top-1/2 -translate-y-1/2 right-1 flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                {index > 0 && (
                    <button 
                        onClick={(e) => { e.stopPropagation(); onMoveFolder(index, 'up'); }}
                        className="p-1.5 rounded-lg text-charcoal/40 dark:text-text-dark/40 hover:bg-black/5 dark:hover:bg-white/5 hover:text-charcoal/70 dark:hover:text-text-dark/70 transition-all"
                        aria-label="Move folder up"
                    >
                        {ICONS.arrowUp}
                    </button>
                )}
                 {index < totalFolders - 1 && (
                    <button 
                        onClick={(e) => { e.stopPropagation(); onMoveFolder(index, 'down'); }}
                        className="p-1.5 rounded-lg text-charcoal/40 dark:text-text-dark/40 hover:bg-black/5 dark:hover:bg-white/5 hover:text-charcoal/70 dark:hover:text-text-dark/70 transition-all"
                        aria-label="Move folder down"
                    >
                        {ICONS.arrowDown}
                    </button>
                )}
                 <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onOpenActionMenu(folder.id, e.currentTarget.getBoundingClientRect());
                    }}
                    className="p-1.5 rounded-lg text-charcoal/40 dark:text-text-dark/40 hover:bg-black/5 dark:hover:bg-white/5 hover:text-charcoal/70 dark:hover:text-text-dark/70 transition-all"
                    aria-label="Folder options"
                >
                    {ICONS.ellipsisVertical}
                </button>
            </div>
        </div>
    )
};

const Sidebar: React.FC<SidebarProps> = ({ folders, activeFolderId, onSelectFolder, onAddFolder, onDeleteFolder, onUpdateFolder, onReorderFolders, isOpen, onClose, userEmail, theme, onToggleTheme, showNoteColorLabels, onToggleNoteColorLabels, onMoveNote }) => {
    const [newFolderName, setNewFolderName] = useState('');
    const [colorPickerState, setColorPickerState] = useState<{ folderId: string; rect: DOMRect } | null>(null);
    const [actionMenu, setActionMenu] = useState<{folderId: string, rect: DOMRect} | null>(null);
    const [folderToDelete, setFolderToDelete] = useState<Folder | null>(null);
    const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
    const [editingFolderName, setEditingFolderName] = useState('');

    const colorPickerRef = useRef<HTMLDivElement>(null);
    const actionMenuRef = useRef<HTMLDivElement>(null);
    const confirmationModalRef = useRef<HTMLDivElement>(null);
    const renameInputRef = useRef<HTMLInputElement>(null);

    useOnClickOutside(colorPickerRef, () => setColorPickerState(null));
    useOnClickOutside(actionMenuRef, () => setActionMenu(null));
    useOnClickOutside(confirmationModalRef, () => setFolderToDelete(null));

    useEffect(() => {
        if (editingFolderId && renameInputRef.current) {
            renameInputRef.current.focus();
            renameInputRef.current.select();
        }
    }, [editingFolderId]);

    const handleAddFolder = (e: React.FormEvent) => {
        e.preventDefault();
        if (newFolderName.trim()) {
            onAddFolder(newFolderName.trim());
            setNewFolderName('');
        }
    };

    const handleColorChange = (folderId: string, colorIndex: number) => {
        onUpdateFolder(folderId, { color_index: colorIndex });
        setColorPickerState(null);
    };

    const handleOpenColorPicker = (folderId: string, rect: DOMRect) => {
        setColorPickerState({ folderId, rect });
    };
    
    const handleOpenActionMenu = (folderId: string, rect: DOMRect) => {
        setActionMenu({ folderId, rect });
    };
    
    const handleMoveFolder = (index: number, direction: 'up' | 'down') => {
        const newFolders = [...folders];
        const [movedFolder] = newFolders.splice(index, 1);
        const newIndex = direction === 'up' ? index - 1 : index + 1;
        newFolders.splice(newIndex, 0, movedFolder);
        onReorderFolders(newFolders);
    };

    const handleStartRename = (folder: Folder) => {
        setActionMenu(null);
        setEditingFolderId(folder.id);
        setEditingFolderName(folder.name);
    };

    const handleFinishRename = () => {
        if (editingFolderId && editingFolderName.trim()) {
            onUpdateFolder(editingFolderId, { name: editingFolderName.trim() });
        }
        setEditingFolderId(null);
        setEditingFolderName('');
    };

    const handleSignOut = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) {
            console.error('Error signing out:', error.message);
            alert(`Could not sign out: ${error.message}`);
        }
    };

    const confirmDelete = () => {
        if (folderToDelete) {
            onDeleteFolder(folderToDelete.id);
            setFolderToDelete(null);
        }
    };

    const handleDropNote = (noteId: string, folderId: string) => {
        onMoveNote(noteId, null, folderId);
    };
    
    return (
        <>
            {isOpen && <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-30 md:hidden" onClick={onClose} aria-hidden="true"></div>}
            <aside className={`fixed top-0 left-0 h-full w-64 bg-paper dark:bg-paper-dark p-3 border-r border-chrome/50 dark:border-border-dark/50 z-40 flex flex-col transition-transform duration-300 ease-in-out md:static md:translate-x-0 md:shrink-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="px-3 pt-2 pb-5">
                    <Logo />
                </div>
                
                <nav className="flex-grow space-y-1 overflow-y-auto pr-1 -mr-1">
                    <button 
                        onClick={() => onSelectFolder('all')}
                        className={`w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all font-medium text-[14px] ${activeFolderId === 'all' ? 'bg-accent/10 text-accent dark:bg-accent/20' : 'text-charcoal/70 dark:text-text-dark/70 hover:bg-black/[0.03] dark:hover:bg-white/[0.03]'}`}
                    >
                        <span className={activeFolderId === 'all' ? 'text-accent' : 'text-charcoal/40 dark:text-text-dark/40'}>
                            {ICONS.folder}
                        </span>
                        <span className="flex-grow truncate">All Notes</span>
                    </button>
                    
                    <div className="h-px bg-chrome/60 dark:bg-border-dark/60 my-3 mx-2"></div>
                    
                    {folders.map((folder, index) => (
                       editingFolderId === folder.id ? (
                           <div key={folder.id} className="w-full pl-3 pr-2 py-1">
                               <input
                                   ref={renameInputRef}
                                   type="text"
                                   value={editingFolderName}
                                   onChange={(e) => setEditingFolderName(e.target.value)}
                                   onBlur={handleFinishRename}
                                   onKeyDown={(e) => {
                                       if (e.key === 'Enter') handleFinishRename();
                                       if (e.key === 'Escape') setEditingFolderId(null);
                                   }}
                                   className="w-full text-[14px] font-medium bg-white/70 dark:bg-charcoal-dark/70 border border-accent/50 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all"
                               />
                           </div>
                       ) : (
                           <NavItem
                              key={folder.id}
                              folder={folder}
                              index={index}
                              totalFolders={folders.length}
                              isActive={activeFolderId === folder.id}
                              onSelectFolder={onSelectFolder}
                              onOpenActionMenu={handleOpenActionMenu}
                              onMoveFolder={handleMoveFolder}
                              onDropNote={handleDropNote}
                           />
                       )
                    ))}
                </nav>

                <div className="mt-4 shrink-0 space-y-3">
                    <form onSubmit={handleAddFolder}>
                        <div className="relative">
                            <input
                                type="text"
                                value={newFolderName}
                                onChange={(e) => setNewFolderName(e.target.value)}
                                placeholder="New Folder..."
                                className="w-full bg-white/50 dark:bg-charcoal-dark/50 border border-chrome/50 dark:border-border-dark/50 rounded-xl text-[13px] px-3.5 py-2.5 pr-10 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/50 transition-all placeholder:text-charcoal/40 dark:placeholder:text-text-dark/40"
                            />
                            <button 
                                type="submit" 
                                className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 text-charcoal/40 dark:text-text-dark/40 hover:text-accent disabled:text-charcoal/20 dark:disabled:text-text-dark/20 transition-colors rounded-lg hover:bg-accent/10"
                                disabled={!newFolderName.trim()}
                                aria-label="Add new folder"
                            >
                                {React.cloneElement(ICONS.plus, { className: 'h-5 w-5'})}
                            </button>
                        </div>
                    </form>
                    <div className="px-2 py-3 border-t border-chrome/50 dark:border-border-dark/50 flex flex-col gap-2">
                        <div className="flex items-center justify-between w-full">
                            <div className="min-w-0 overflow-hidden mr-2">
                                <p className="text-[12px] text-charcoal/50 dark:text-text-dark/50 truncate font-medium" title={userEmail}>
                                    {userEmail}
                                </p>
                                <button onClick={handleSignOut} className="text-[12px] text-accent hover:text-accent/80 transition-colors mt-0.5 font-medium">
                                    Sign Out
                                </button>
                            </div>
                            <div className="flex items-center shrink-0 gap-0.5">
                                <button 
                                    onClick={onToggleNoteColorLabels} 
                                    className="p-2 rounded-lg text-charcoal/50 dark:text-text-dark/50 hover:bg-black/5 dark:hover:bg-white/5 transition-all"
                                    aria-label={`Turn folder color labels ${showNoteColorLabels ? 'off' : 'on'}`}
                                    title={`Folder labels: ${showNoteColorLabels ? 'On' : 'Off'}`}
                                >
                                    <span className={!showNoteColorLabels ? 'opacity-40' : 'text-accent'}>
                                        {ICONS.label}
                                    </span>
                                </button>
                                <button 
                                    onClick={onToggleTheme} 
                                    className="p-2 rounded-lg text-charcoal/50 dark:text-text-dark/50 hover:bg-black/5 dark:hover:bg-white/5 transition-all"
                                    aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
                                    title={`Theme: ${theme === 'light' ? 'Light' : 'Dark'}`}
                                >
                                    {theme === 'light' ? ICONS.moon : ICONS.sun}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </aside>
            {actionMenu && (
                <div
                    ref={actionMenuRef}
                    style={{
                        top: `${actionMenu.rect.bottom + 4}px`,
                        left: `${actionMenu.rect.left}px`,
                    }}
                    className="fixed z-50 bg-white dark:bg-charcoal-dark w-44 rounded-xl shadow-lg border border-chrome/30 dark:border-border-dark/30 animate-slide-in-down flex flex-col p-1.5"
                >
                    <button
                        onClick={() => {
                            if (actionMenu) {
                                const folder = folders.find(f => f.id === actionMenu.folderId);
                                if (folder) handleStartRename(folder);
                            }
                        }}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] text-left hover:bg-black/[0.03] dark:hover:bg-white/[0.03] w-full transition-colors"
                    >
                        <span className="text-charcoal/50 dark:text-text-dark/50">{React.cloneElement(ICONS.rename, {className: "h-4 w-4"})}</span>
                        <span className="font-medium">Rename</span>
                    </button>
                    <button
                        onClick={() => {
                            if (actionMenu) {
                                handleOpenColorPicker(actionMenu.folderId, actionMenu.rect);
                                setActionMenu(null);
                            }
                        }}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] text-left hover:bg-black/[0.03] dark:hover:bg-white/[0.03] w-full transition-colors"
                    >
                        <span className="text-charcoal/50 dark:text-text-dark/50">{React.cloneElement(ICONS.palette, {className: "h-4 w-4"})}</span>
                        <span className="font-medium">Change Color</span>
                    </button>
                    <div className="h-px bg-chrome/50 dark:bg-border-dark/50 my-1 mx-1"></div>
                    <button
                        onClick={() => {
                            if (actionMenu) {
                                const folder = folders.find(f => f.id === actionMenu.folderId);
                                if (folder) setFolderToDelete(folder);
                                setActionMenu(null);
                            }
                        }}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] text-left text-coral hover:bg-coral/5 w-full transition-colors"
                    >
                        <span className="text-coral">{React.cloneElement(ICONS.trash, {className: "h-4 w-4"})}</span>
                        <span className="font-medium">Delete Folder</span>
                    </button>
                </div>
            )}
            {colorPickerState && (
                <div
                    ref={colorPickerRef}
                    style={{
                        top: `${colorPickerState.rect.bottom + 4}px`,
                        left: `${colorPickerState.rect.left}px`,
                    }}
                    className="fixed z-50 bg-white dark:bg-charcoal-dark p-3 rounded-xl shadow-lg border border-chrome/30 dark:border-border-dark/30 animate-slide-in-down"
                >
                    <div className="flex gap-2.5">
                        {FOLDER_COLORS.map((color, index) => (
                            <button
                                key={index}
                                onClick={() => handleColorChange(colorPickerState.folderId, index)}
                                className={`h-8 w-8 rounded-full ${color.bg} transition-transform hover:scale-110 ring-2 ring-transparent hover:ring-charcoal/10 dark:hover:ring-white/10`}
                                aria-label={`Set folder color to option ${index + 1}`}
                            />
                        ))}
                    </div>
                </div>
            )}
            {folderToDelete && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center animate-fade-in">
                    <div ref={confirmationModalRef} className="bg-white dark:bg-charcoal-dark rounded-2xl shadow-2xl p-6 w-full max-w-sm m-4 text-center border border-chrome/20 dark:border-border-dark/20">
                        <div className="w-12 h-12 rounded-full bg-coral/10 flex items-center justify-center mx-auto mb-4">
                            {React.cloneElement(ICONS.trash, {className: "h-6 w-6 text-coral"})}
                        </div>
                        <h3 className="text-lg font-bold font-sans">Delete "{folderToDelete.name}"?</h3>
                        <p className="text-sm text-charcoal/60 dark:text-text-dark/60 mt-2">
                            All notes inside this folder will be permanently deleted. This action cannot be undone.
                        </p>
                        <div className="flex gap-3 mt-6">
                            <button onClick={() => setFolderToDelete(null)} className="flex-1 px-4 py-2.5 rounded-xl bg-chrome/30 dark:bg-border-dark/30 hover:bg-chrome/50 dark:hover:bg-border-dark/50 font-semibold transition-colors">
                                Cancel
                            </button>
                            <button onClick={confirmDelete} className="flex-1 px-4 py-2.5 rounded-xl bg-coral text-white font-semibold hover:bg-coral/90 transition-colors">
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default Sidebar;