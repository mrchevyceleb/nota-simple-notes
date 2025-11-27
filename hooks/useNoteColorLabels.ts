import { useState, useEffect, useCallback } from 'react';

const NOTE_COLOR_LABELS_KEY = 'nota-show-note-color-labels';

export const useNoteColorLabels = (): [boolean, () => void] => {
  const [showNoteColorLabels, setShowNoteColorLabels] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const storedPreference = localStorage.getItem(NOTE_COLOR_LABELS_KEY);
      // Default to true (visible) if not set
      return storedPreference !== 'false';
    }
    return true;
  });

  useEffect(() => {
    localStorage.setItem(NOTE_COLOR_LABELS_KEY, String(showNoteColorLabels));
  }, [showNoteColorLabels]);

  const toggleShowNoteColorLabels = useCallback(() => {
    setShowNoteColorLabels((prev) => !prev);
  }, []);

  return [showNoteColorLabels, toggleShowNoteColorLabels];
};
