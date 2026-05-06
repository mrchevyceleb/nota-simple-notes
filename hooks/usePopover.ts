import React, { useState, useRef, useEffect, useCallback } from 'react';

interface UsePopoverOptions {
  onPositionUpdate?: (rect: DOMRect) => React.CSSProperties;
}

export const usePopover = (options?: UsePopoverOptions) => {
  const [isOpen, setIsOpen] = useState(false);
  const toggleRef = useRef<HTMLElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const toggle = useCallback(() => setIsOpen(prev => !prev), []);
  const close = useCallback(() => setIsOpen(false), []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isOpen &&
        popoverRef.current && !popoverRef.current.contains(event.target as Node) &&
        toggleRef.current && !toggleRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    if (isOpen && toggleRef.current && options?.onPositionUpdate) {
      const rect = toggleRef.current.getBoundingClientRect();
      setPopoverStyle(options.onPositionUpdate(rect));
    }
  }, [isOpen]);

  return { isOpen, toggle, close, toggleRef, popoverRef, popoverStyle, setIsOpen };
};
