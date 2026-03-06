import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Note, Folder, TextBlock, CanvasTextBlock } from './types';
import { useNoteTaker } from './hooks/useNoteTaker';
import Sidebar from './components/Sidebar';
import NoteStream from './components/NoteStream';
import NoteEditor from './components/NoteEditor';
import { supabase, supabaseInitError } from './supabaseClient';
import { Session } from '@supabase/supabase-js';
import Auth from './components/Auth';
import Logo from './components/Logo';
import { useTheme } from './hooks/useTheme';
import { useViewMode } from './hooks/useViewMode';
import { FOLDER_COLOR_VALUES } from './constants';
import { useNoteColorLabels } from './hooks/useNoteColorLabels';
import PWAStatus from './components/PWAStatus';

interface Toast {
  id: number;
  message: string;
  type: 'error' | 'success' | 'info';
}

let toastId = 0;

const ToastContainer: React.FC<{ toasts: Toast[]; onDismiss: (id: number) => void }> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`px-4 py-3 rounded-xl shadow-lg text-sm font-medium animate-slide-in-right flex items-center gap-3 ${
            toast.type === 'error' ? 'bg-coral text-white' :
            toast.type === 'success' ? 'bg-green-500 text-white' :
            'bg-charcoal text-white dark:bg-charcoal-dark dark:text-text-dark'
          }`}
        >
          <span className="flex-1">{toast.message}</span>
          <button onClick={() => onDismiss(toast.id)} className="opacity-70 hover:opacity-100 transition-opacity text-lg leading-none">&times;</button>
        </div>
      ))}
    </div>
  );
};

export interface NoteWithFolder extends Note {
  folderId: string;
  folderColorIndex?: number;
}

const getPlainText = (html: string | undefined): string => {
    if (!html) return '';
    try {
        return html.replace(/<[^>]+>/g, '');
    } catch (e) {
        console.error("Error parsing HTML for plain text", e);
        return '';
    }
};

const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [networkError, setNetworkError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: Toast['type'] = 'error') => {
    const id = ++toastId;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5000);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  useEffect(() => {
    if (supabaseInitError) {
      console.error('Supabase initialization failed:', supabaseInitError);
      setNetworkError('Could not initialize the database client. Please verify your Supabase configuration and try again.');
      setAuthLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
    }).catch(error => {
      const errorMessage = error && typeof error === 'object' && 'message' in error
        ? (error as { message: string }).message
        : String(error);

      console.error('Failed to connect to Supabase:', errorMessage);
      console.error('Full connection error details:', error);
      
      setNetworkError('Could not connect to the database. This might be a temporary issue. Please check your internet connection and try refreshing the page.');
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) setNetworkError(null);
    });

    return () => subscription.unsubscribe();
  }, []);

  let content: React.ReactNode = null;

  if (authLoading) {
    content = (
      <div className="flex items-center justify-center h-screen w-screen bg-paper dark:bg-paper-dark">
        <div className="text-xl font-semibold font-sans text-charcoal dark:text-text-dark">Connecting...</div>
      </div>
    );
  } else if (networkError && !session) {
    content = (
      <div className="flex items-center justify-center h-screen w-screen bg-paper dark:bg-paper-dark">
        <div className="max-w-md p-8 bg-white dark:bg-charcoal-dark rounded-xl shadow-soft border border-coral text-center">
            <h1 className="text-xl font-bold font-sans text-coral mb-3">Connection Error</h1>
            <p className="text-charcoal/80 dark:text-text-dark/80">{networkError}</p>
            <button onClick={() => window.location.reload()} className="mt-6 px-5 py-2 bg-accent text-white font-semibold rounded-lg hover:bg-accent/90 transition-colors">
                Refresh Page
            </button>
        </div>
      </div>
    );
  } else if (!session) {
    content = <Auth />;
  } else {
    content = <NotaApp session={session} />;
  }

  return (
    <>
      {content}
      <PWAStatus />
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </>
  );
};

interface NotaAppProps {
  session: Session;
}

const NotaApp: React.FC<NotaAppProps> = ({ session }) => {
  const { folders, loading, error: noteTakerError, addFolder, deleteFolder, updateFolder, reorderFolders, addNote, deleteNote, updateNote, togglePinNote, moveNote } = useNoteTaker(session);
  const [theme, toggleTheme] = useTheme();
  const [viewMode, toggleViewMode] = useViewMode();
  const [showNoteColorLabels, toggleShowNoteColorLabels] = useNoteColorLabels();
  
  const [activeFolderId, setActiveFolderId] = useState<string>('all');
  const [activeNote, setActiveNote] = useState<NoteWithFolder | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const initialUrlChecked = useRef(false);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);

  const LOADING_MESSAGES = [
    "Loading your notes...",
    "Waking up the database...",
    "Organizing your thoughts...",
    "Fetching your latest edits...",
    "This can take a moment if the server was sleeping.",
    "Almost there...",
  ];

  useEffect(() => {
    let interval: number;
    if (loading) {
      interval = window.setInterval(() => {
        setLoadingMessageIndex(prevIndex => (prevIndex + 1) % LOADING_MESSAGES.length);
      }, 3000);
    }
    return () => {
      if (interval) {
        window.clearInterval(interval);
      }
    };
  }, [loading]);

  const allNotes: NoteWithFolder[] = useMemo(() => {
    return folders
      .flatMap((f, folderIndex) =>
        f.notes.map((n) => ({
          ...n,
          folderId: f.id,
          folderColorIndex: f.color_index ?? folderIndex % FOLDER_COLOR_VALUES.length,
        }))
      )
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  }, [folders]);

  const searchTextMap = useMemo(() => {
    const map = new Map<string, string>();
    allNotes.forEach(note => {
      const textContent = note.content
        .filter(block => block.type === 'text' || block.type === 'canvas-text')
        .map(textBlock => {
          if (textBlock.type === 'text') {
            return getPlainText((textBlock as TextBlock).content);
          } else if (textBlock.type === 'canvas-text') {
            return getPlainText((textBlock as CanvasTextBlock).content);
          }
          return '';
        })
        .join(' ');
      map.set(note.id, (note.title + ' ' + textContent).toLowerCase());
    });
    return map;
  }, [allNotes]);

  useEffect(() => {
    if (!loading && allNotes.length > 0 && !initialUrlChecked.current) {
        const hash = window.location.hash;
        const noteIdMatch = hash.match(/^#\/note\/(.+)$/);
        if (noteIdMatch) {
            const noteId = noteIdMatch[1];
            const noteToOpen = allNotes.find(n => n.id === noteId);
            if (noteToOpen) {
                setActiveNote(noteToOpen);
            }
        }
        initialUrlChecked.current = true;
    }
  }, [loading, allNotes]);

  useEffect(() => {
    setActiveNote(currentActiveNote => {
      if (!currentActiveNote) return null;
      const updatedNoteInList = allNotes.find(n => n.id === currentActiveNote.id);
      if (!updatedNoteInList) {
          return null; // Note was deleted
      }
      if (
        updatedNoteInList.id !== currentActiveNote.id ||
        updatedNoteInList.updated_at !== currentActiveNote.updated_at ||
        updatedNoteInList.title !== currentActiveNote.title ||
        updatedNoteInList.is_pinned !== currentActiveNote.is_pinned ||
        updatedNoteInList.paper_style !== currentActiveNote.paper_style ||
        updatedNoteInList.paper_color !== currentActiveNote.paper_color ||
        updatedNoteInList.font_size !== currentActiveNote.font_size ||
        updatedNoteInList.content.length !== currentActiveNote.content.length ||
        updatedNoteInList.folderId !== currentActiveNote.folderId ||
        updatedNoteInList.folder_id !== currentActiveNote.folder_id
      ) {
        return updatedNoteInList;
      }
      return currentActiveNote;
    });
  }, [allNotes]);


  const filteredNotes = useMemo(() => {
    let notesToFilter: NoteWithFolder[];

    if (activeFolderId === 'all') {
      notesToFilter = allNotes;
    } else {
      const folder = folders.find(f => f.id === activeFolderId);
      notesToFilter = folder ? folder.notes.map(n => {
        const folderIndex = folders.findIndex(fo => fo.id === folder.id);
        const nonNegativeFolderIndex = folderIndex < 0 ? 0 : folderIndex;
        return {
          ...n,
          folderId: folder.id,
          folderColorIndex: folder.color_index ?? (nonNegativeFolderIndex % FOLDER_COLOR_VALUES.length)
        };
      }) : [];
    }

    if (!debouncedSearchQuery.trim()) {
      return notesToFilter;
    }

    const lowerCaseQuery = debouncedSearchQuery.toLowerCase();

    return notesToFilter.filter(note => {
      const searchText = searchTextMap.get(note.id) || '';
      return searchText.includes(lowerCaseQuery);
    });
  }, [allNotes, activeFolderId, folders, debouncedSearchQuery, searchTextMap]);

  const handleSelectNote = (note: NoteWithFolder) => {
    setActiveNote(note);
    window.location.hash = `#/note/${note.id}`;
  };

  const handleAddNote = async () => {
    let targetFolderId = activeFolderId;
    if (activeFolderId === 'all') {
        const quickNotesFolder = folders.find(f => f.name === 'Quick Notes');
        targetFolderId = quickNotesFolder ? quickNotesFolder.id : (folders[0]?.id || null);
    }

    if (targetFolderId) {
        const result = await addNote(targetFolderId);
        if (result) {
          const folder = folders.find(f => f.id === result.folderId);
          const folderIndex = folders.findIndex(f => f.id === result.folderId);
          const nonNegativeFolderIndex = folderIndex < 0 ? 0 : folderIndex;
          const newNoteWithFolder = {
              ...result.note,
              folderId: result.folderId,
              folderColorIndex: folder?.color_index ?? (nonNegativeFolderIndex % FOLDER_COLOR_VALUES.length)
          };
          setActiveNote(newNoteWithFolder);
          window.location.hash = `#/note/${newNoteWithFolder.id}`;
        }
    }
  };

  const handleDeleteNote = (noteId: string, folderId: string) => {
    deleteNote(folderId, noteId);
  };

  const handleUpdateNote = useCallback((updatedNote: Note) => {
    updateNote(updatedNote.folder_id, updatedNote);
  }, [updateNote]);
  
  const handleTogglePin = (noteId: string, folderId: string) => {
    togglePinNote(folderId, noteId);
  }

  const handleBackFromEditor = useCallback(() => {
    setActiveNote(null);
    window.location.hash = '';
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen w-screen bg-paper dark:bg-paper-dark text-center">
          <div className="animate-pulse-slow">
              <Logo />
          </div>
          <p className="text-lg font-medium font-sans text-charcoal/80 dark:text-text-dark/80 mt-4 px-4 transition-opacity duration-500">
              {LOADING_MESSAGES[loadingMessageIndex]}
          </p>
      </div>
    );
  }

  if (noteTakerError) {
     return (
      <div className="flex items-center justify-center h-screen w-screen bg-paper dark:bg-paper-dark">
        <div className="max-w-md p-8 bg-white dark:bg-charcoal-dark rounded-xl shadow-soft border border-coral text-center">
            <h1 className="text-xl font-bold font-sans text-coral mb-3">Error Loading Notes</h1>
            <p className="text-charcoal/80 dark:text-text-dark/80">{noteTakerError}</p>
            <p className="text-sm text-charcoal/60 dark:text-text-dark/60 mt-4">Please try to refresh the page. If the problem persists, the service may be temporarily unavailable.</p>

            <button onClick={() => window.location.reload()} className="mt-6 px-5 py-2 bg-accent text-white font-semibold rounded-lg hover:bg-accent/90 transition-colors">
                Refresh Page
            </button>
        </div>
      </div>
    );
  }

  const activeFolderName = activeFolderId === 'all' ? 'All Notes' : folders.find(f => f.id === activeFolderId)?.name || 'Notes';

  const currentFolder = folders.find(f => f.id === activeNote?.folderId);
  const noteEditorFolderName = currentFolder ? currentFolder.name : (folders.length > 0 ? folders[0].name : 'Notes');
  
  return (
    <div className="h-screen w-screen font-body text-charcoal dark:text-text-dark bg-paper dark:bg-paper-dark flex overflow-hidden">
      {activeNote && activeNote.id ? (
        <NoteEditor 
            key={activeNote.id}
            note={activeNote}
            folderName={noteEditorFolderName}
            onBack={handleBackFromEditor}
            onUpdateNote={handleUpdateNote}
        />
      ) : (
        <>
            <Sidebar 
                folders={folders}
                activeFolderId={activeFolderId}
                onSelectFolder={(folderId) => {
                    setActiveFolderId(folderId);
                    setIsSidebarOpen(false);
                }}
                onAddFolder={addFolder}
                onDeleteFolder={deleteFolder}
                onUpdateFolder={updateFolder}
                onReorderFolders={reorderFolders}
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
                userEmail={session.user.email}
                theme={theme}
                onToggleTheme={toggleTheme}
                showNoteColorLabels={showNoteColorLabels}
                onToggleNoteColorLabels={toggleShowNoteColorLabels}
                onMoveNote={moveNote}
            />
            <main className="flex-1 h-screen overflow-y-auto">
                <NoteStream
                    title={activeFolderName}
                    notes={filteredNotes}
                    onSelectNote={handleSelectNote}
                    onAddNote={handleAddNote}
                    onDeleteNote={handleDeleteNote}
                    onTogglePin={handleTogglePin}
                    onMenuClick={() => setIsSidebarOpen(true)}
                    viewMode={viewMode}
                    onToggleViewMode={toggleViewMode}
                    showNoteColorLabels={showNoteColorLabels}
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                />
            </main>
        </>
      )}
    </div>
  );
};

export default App;