import React from 'react';

const Logo: React.FC = () => {
  return (
    <div className="flex items-center gap-2.5">
      <div
        className="w-8 h-8 flex-shrink-0"
        style={{ filter: 'drop-shadow(0 0 6px rgba(74, 144, 226, 0.6))' }}
      >
        <div className="w-full h-full bg-accent rounded-lg relative overflow-hidden">
          <svg
            className="absolute bottom-0 right-0 w-4 h-4 text-white"
            viewBox="0 0 10 10"
            fill="currentColor"
            style={{ opacity: 0.3 }}
          >
            <path d="M10 0 L0 10 L10 10 Z" />
          </svg>
        </div>
      </div>
      <span
        className="text-2xl font-bold text-charcoal dark:text-text-dark tracking-tight"
        style={{ fontFamily: "'Georgia', serif" }}
      >
        Nota
      </span>
    </div>
  );
};

export default Logo;