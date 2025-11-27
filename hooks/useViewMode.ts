import { useState, useEffect, useCallback } from 'react';

export type ViewMode = 'grid' | 'list';

const VIEW_MODE_KEY = 'nota-view-mode';

export const useViewMode = (): [ViewMode, () => void] => {
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window !== 'undefined') {
      const storedMode = localStorage.getItem(VIEW_MODE_KEY);
      if (storedMode === 'grid' || storedMode === 'list') {
        return storedMode;
      }
    }
    return 'grid'; // Default to grid view
  });

  useEffect(() => {
    localStorage.setItem(VIEW_MODE_KEY, viewMode);
  }, [viewMode]);

  const toggleViewMode = useCallback(() => {
    setViewMode((prevMode) => (prevMode === 'grid' ? 'list' : 'grid'));
  }, []);

  return [viewMode, toggleViewMode];
};
