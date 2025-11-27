import { useState, useEffect, useCallback, useRef } from 'react';
import { Folder, Note, PaperStyle, TextBlock } from '../types';
import { supabase } from '../supabaseClient';
import { Session, User } from '@supabase/supabase-js';

const FOLDER_ORDER_KEY = 'nota-folder-order';

const getFoldersWithNotes = async (user: User): Promise<Folder[]> => {
    // Parallelize fetching for performance
    const [foldersResult, notesResult] = await Promise.all([
        supabase.from('folders').select('*').eq('user_id', user.id),
        supabase.from('notes').select('*').eq('user_id', user.id).order('updated_at', { ascending: false })
    ]);

    const { data: foldersData, error: foldersError } = foldersResult;
    const { data: notesData, error: notesError } = notesResult;

    if (foldersError) throw foldersError;
    if (notesError) throw notesError;

    const folders: Folder[] = foldersData.map(f => ({
        ...f,
        notes: notesData.filter(n => n.folder_id === f.id) as Note[],
    }));
    
    // Apply local storage order if it exists
    try {
        const savedOrder = localStorage.getItem(FOLDER_ORDER_KEY);
        if (savedOrder) {
            const orderedIds = JSON.parse(savedOrder) as string[];
            return folders.sort((a, b) => {
                const indexA = orderedIds.indexOf(a.id);
                const indexB = orderedIds.indexOf(b.id);
                // If a folder isn't in the saved order, put it at the end
                if (indexA === -1) return 1;
                if (indexB === -1) return -1;
                return indexA - indexB;
            });
        }
    } catch (e) {
        console.error("Failed to parse folder order from localStorage", e);
    }
    
    return folders.sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
};


export const useNoteTaker = (session: Session | null) => {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchedUserId = useRef<string | null>(null);
  
  const user = session?.user;
  const userId = user?.id;

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      try {
        setError(null);
        setLoading(true);
        const data = await getFoldersWithNotes(user);
        if (data.length === 0) {
          // Create a default folder if none exist
          const { data: newFolderData } = await supabase.from('folders').insert({ name: 'Quick Notes', user_id: user.id }).select().single();
          if (newFolderData) {
              const defaultFolder: Folder = { ...newFolderData, notes: [] };
              setFolders([defaultFolder]);
          }
        } else {
          setFolders(data);
        }
      } catch (error) {
        const errorMessage = error && typeof error === 'object' && 'message' in error
          ? (error as { message: string }).message
          : String(error);

        console.error('Error fetching data:', errorMessage);
        console.error('Full error details:', error);

        if (errorMessage.toLowerCase().includes('fetch')) {
          setError('Could not fetch your notes. The server may be unavailable or there might be a network issue.');
        } else {
          setError('An unexpected error occurred while loading your notes.');
        }
      } finally {
        setLoading(false);
      }
    };

    if (userId && userId !== fetchedUserId.current) {
        fetchData();
        fetchedUserId.current = userId;
    } else if (!userId) {
        setFolders([]);
        fetchedUserId.current = null;
        setLoading(false); 
    } else {
        setLoading(false);
    }
  }, [userId]); 
  

  useEffect(() => {
    if (!userId) return;

    const handleDbChange = (payload: any) => {
      const { eventType, table, new: newRecord, old: oldRecord } = payload;

      setFolders(currentFolders => {
        // --- FOLDER CHANGES ---
        if (table === 'folders') {
          if (eventType === 'INSERT') {
            const newFolder = { ...(newRecord as Folder), notes: [] };
            if (currentFolders.some(f => f.id === newFolder.id)) return currentFolders;
            const updatedFolders = [newFolder, ...currentFolders];
            localStorage.setItem(FOLDER_ORDER_KEY, JSON.stringify(updatedFolders.map(f => f.id)));
            return updatedFolders;
          }
          if (eventType === 'UPDATE') {
            return currentFolders.map(f => f.id === newRecord.id ? { ...f, ...newRecord } : f);
          }
          if (eventType === 'DELETE') {
             const updatedFolders = currentFolders.filter(f => f.id !== oldRecord.id);
             localStorage.setItem(FOLDER_ORDER_KEY, JSON.stringify(updatedFolders.map(f => f.id)));
             return updatedFolders;
          }
        }

        // --- NOTE CHANGES ---
        if (table === 'notes') {
          if (eventType === 'INSERT') {
            const newNote = newRecord as Note;
            return currentFolders.map(folder => {
              if (folder.id === newNote.folder_id) {
                if (folder.notes.some(n => n.id === newNote.id)) return folder;
                const updatedNotes = [newNote, ...folder.notes].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
                return { ...folder, notes: updatedNotes };
              }
              return folder;
            });
          }

          if (eventType === 'UPDATE') {
            const updatedNote = newRecord as Note;
            let foldersWithNoteRemoved = currentFolders.map(f => {
              if (f.notes.some(n => n.id === updatedNote.id)) {
                return { ...f, notes: f.notes.filter(n => n.id !== updatedNote.id) };
              }
              return f;
            });
            
            return foldersWithNoteRemoved.map(f => {
              if (f.id === updatedNote.folder_id) {
                const updatedNotes = [updatedNote, ...f.notes].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
                return { ...f, notes: updatedNotes };
              }
              return f;
            });
          }
          
          if (eventType === 'DELETE') {
            return currentFolders.map(folder => ({
                ...folder,
                notes: folder.notes.filter(n => n.id !== oldRecord.id)
            }));
          }
        }

        return currentFolders;
      });
    };

    const channel = supabase.channel('public-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notes' }, handleDbChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'folders' }, handleDbChange)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]); 


  const addFolder = useCallback(async (name: string) => {
    if (!user) return;
    
    const { data, error } = await supabase
        .from('folders')
        .insert({ name, user_id: user.id })
        .select()
        .single();

    if (error) {
        console.error("Error adding folder:", error.message);
        alert(`Failed to create folder: ${error.message}`);
        return;
    }
    
    if (data) {
        const newFolder = { ...(data as Folder), notes: [] };
        setFolders(currentFolders => {
            if (currentFolders.some(f => f.id === newFolder.id)) {
                return currentFolders;
            }
            const updatedFolders = [newFolder, ...currentFolders];
            localStorage.setItem(FOLDER_ORDER_KEY, JSON.stringify(updatedFolders.map(f => f.id)));
            return updatedFolders;
        });
    }
  }, [user]);
  
  const deleteFolder = useCallback(async (folderId: string) => {
    const originalFolders = folders;
    
    setFolders(currentFolders => {
        const updatedFolders = currentFolders.filter(f => f.id !== folderId);
        localStorage.setItem(FOLDER_ORDER_KEY, JSON.stringify(updatedFolders.map(f => f.id)));
        return updatedFolders;
    });

    const { error: notesError } = await supabase.from('notes').delete().eq('folder_id', folderId);

    if (notesError) {
        console.error('Error deleting notes in folder:', notesError.message);
        alert(`Failed to delete folder: could not remove associated notes. ${notesError.message}`);
        setFolders(originalFolders);
        localStorage.setItem(FOLDER_ORDER_KEY, JSON.stringify(originalFolders.map(f => f.id)));
        return;
    }

    const { error: folderError } = await supabase.from('folders').delete().eq('id', folderId);
    if (folderError) {
        console.error('Error deleting folder:', folderError.message);
        alert(`Failed to delete folder: ${folderError.message}`);
        setFolders(originalFolders);
        localStorage.setItem(FOLDER_ORDER_KEY, JSON.stringify(originalFolders.map(f => f.id)));
    }
  }, [folders]);

  const updateFolder = useCallback(async (folderId: string, updates: Partial<Pick<Folder, 'name' | 'color_index'>>) => {
    setFolders(currentFolders =>
        currentFolders.map(f =>
            f.id === folderId ? { ...f, ...updates } : f
        )
    );
    const { error } = await supabase.from('folders').update(updates).eq('id', folderId);
    if (error) {
        console.error('Error updating folder:', error.message);
    }
  }, []);

  const reorderFolders = useCallback((reorderedFolders: Folder[]) => {
      setFolders(reorderedFolders);
      const newOrder = reorderedFolders.map(f => f.id);
      localStorage.setItem(FOLDER_ORDER_KEY, JSON.stringify(newOrder));
  }, []);

  const addNote = useCallback(async (folderId?: string): Promise<{note: Note, folderId: string} | null> => {
    if (!user) return null;
    const targetFolderId = folderId || (folders.length > 0 ? folders[0].id : null);

    if (!targetFolderId) {
      console.error("No folder available to add a note to.");
      alert("Could not find a folder to add the note to. Please create a folder first.");
      return null;
    }

    const newNotePartial = {
      folder_id: targetFolderId,
      user_id: user.id,
      title: 'Untitled Note',
      content: [{
        id: `text-${Date.now()}`,
        type: 'text',
        content: '',
        style: { bold: false, italic: false }
      } as TextBlock],
      paper_style: PaperStyle.Blank,
      paper_color: 'white' as const,
      font_size: 'medium' as const,
      is_pinned: false,
    };
    
    const { data, error } = await supabase.from('notes').insert(newNotePartial).select().single();
    if(error) {
        console.error("Error adding note:", error.message);
        alert(`Failed to create note: ${error.message}`);
        return null;
    }

    const newNote = data as Note;
    
    setFolders(currentFolders => {
        return currentFolders.map(folder => {
            if (folder.id === targetFolderId) {
                if (folder.notes.some(n => n.id === newNote.id)) return folder;
                const updatedNotes = [newNote, ...folder.notes]
                  .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
                return { ...folder, notes: updatedNotes };
            }
            return folder;
        });
    });
    
    return { note: newNote, folderId: targetFolderId };
  }, [user, folders]);

  const deleteNote = useCallback(async (folderId: string, noteId: string) => {
    const originalFolders = folders;

    setFolders(currentFolders =>
      currentFolders.map(f => {
        if (f.id === folderId) {
          return { ...f, notes: f.notes.filter(n => n.id !== noteId) };
        }
        return f;
      })
    );
    
    const { error } = await supabase.from('notes').delete().eq('id', noteId);
    
    if (error) {
      console.error('Error deleting note:', error.message);
      alert(`Failed to delete note: ${error.message}.`);
      setFolders(originalFolders);
    }
  }, [folders]);

  const updateNote = useCallback(async (folderId: string, updatedNote: Note) => {
    const finalUpdatedNote = {
      ...updatedNote,
      updated_at: new Date().toISOString(),
    };
    const { id: noteId, folder_id: noteFolderId } = finalUpdatedNote;

    setFolders(currentFolders => {
        const foldersWithNoteRemoved = currentFolders.map(f => ({
            ...f,
            notes: f.notes.filter(n => n.id !== noteId)
        }));

        return foldersWithNoteRemoved.map(f => {
            if (f.id === noteFolderId) {
                const newNotes = [finalUpdatedNote, ...f.notes]
                  .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
                return { ...f, notes: newNotes };
            }
            return f;
        });
    });
    
    const updatesForDb = {
      folder_id: finalUpdatedNote.folder_id,
      title: finalUpdatedNote.title,
      content: finalUpdatedNote.content,
      updated_at: finalUpdatedNote.updated_at,
      paper_style: finalUpdatedNote.paper_style,
      paper_color: finalUpdatedNote.paper_color,
      font_size: finalUpdatedNote.font_size,
      is_pinned: finalUpdatedNote.is_pinned,
    };

    const { error } = await supabase
      .from('notes')
      .update(updatesForDb)
      .eq('id', finalUpdatedNote.id);


    if (error) {
      console.error('Error updating note:', error.message);
    }
  }, []);
  
  const togglePinNote = useCallback(async (folderId: string, noteId: string) => {
    const note = folders.flatMap(f => f.notes).find(n => n.id === noteId);
    if (!note) return;

    const newPinStatus = !note.is_pinned;

    setFolders(currentFolders =>
      currentFolders.map(folder => {
        if (folder.id === folderId) {
          return {
            ...folder,
            notes: folder.notes.map(n =>
              n.id === noteId ? { ...n, is_pinned: newPinStatus } : n
            )
          };
        }
        return folder;
      })
    );

    const { error } = await supabase.from('notes').update({ is_pinned: newPinStatus }).eq('id', noteId);
    
    if (error) {
      console.error('Error toggling pin status:', error.message);
      setFolders(currentFolders =>
        currentFolders.map(folder => {
          if (folder.id === folderId) {
            return {
              ...folder,
              notes: folder.notes.map(n =>
                n.id === noteId ? { ...n, is_pinned: !newPinStatus } : n
              )
            };
          }
          return folder;
        })
      );
    }
  }, [folders]);

  const moveNote = useCallback(async (noteId: string, sourceFolderId: string | null, destinationFolderId: string) => {
      if (sourceFolderId === destinationFolderId) return;

      // Optimistic update
      setFolders(currentFolders => {
          let noteToMove: Note | undefined;
          
          // Remove from old folder
          const foldersWithoutNote = currentFolders.map(f => {
             const note = f.notes.find(n => n.id === noteId);
             if (note) {
                 noteToMove = { ...note, folder_id: destinationFolderId };
                 return { ...f, notes: f.notes.filter(n => n.id !== noteId) };
             }
             return f;
          });

          if (!noteToMove) return currentFolders;

          // Add to new folder
          return foldersWithoutNote.map(f => {
              if (f.id === destinationFolderId) {
                  return { ...f, notes: [noteToMove!, ...f.notes].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()) };
              }
              return f;
          });
      });

      const { error } = await supabase.from('notes').update({ folder_id: destinationFolderId }).eq('id', noteId);
      if(error) {
          console.error("Error moving note:", error.message);
          // We should probably revert here in a real app, but relying on re-fetch/subscription correction for now
      }
  }, []);

  return {
    folders,
    loading,
    error,
    addFolder,
    deleteFolder,
    updateFolder,
    reorderFolders,
    addNote,
    deleteNote,
    updateNote,
    togglePinNote,
    moveNote,
  };
};