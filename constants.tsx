
import React from 'react';
import { PaperStyle } from './types';

export const ICONS = {
    folder: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>,
    plus: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>,
    trash: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>,
    back: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>,
    pen: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z" /></svg>,
    highlighter: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6.5l4 4"/><path strokeLinecap="round" strokeLinejoin="round" d="M19.34 7.66a2 2 0 00-2.83-2.83l-1.83 1.83 4 4 1.83-1.83a2 2 0 000-2.83z"/><path strokeLinecap="round" strokeLinejoin="round" d="M3 21h4L17.5 10.5l-4-4L3 17v4z"/><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 9.5l-4 4"/></svg>,
    eraser: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M19 20h-10.5l-4.21 -4.3a1 1 0 0 1 0 -1.41l10 -10a1 1 0 0 1 1.41 0l5 5a1 1 0 0 1 0 1.41l-9.2 9.3" /><path d="M18 13.3l-6.3 -6.3" /></svg>,
    text: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7V4h16v3M12 4v16M9 20h6" /></svg>,
    image: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
    mic: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-14 0m7 6v4m0 0H9m4 0h2m-2-12a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1h-2a1 1 0 01-1-1v-4z" /></svg>,
    stop: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10h6v4H9z" /></svg>,
    paperclip: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>,
    hand: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M8 13v-8.5a1.5 1.5 0 0 1 3 0v7.5" /><path d="M11 8v-5.5a1.5 1.5 0 0 1 3 0v8.5" /><path d="M14 10.5v-6.5a1.5 1.5 0 0 1 3 0v10.5" /><path d="M17 16.5a1.5 1.5 0 0 1 3 0v2.5a6 6 0 0 1 -6 6h-2h.208a6 6 0 0 1 -5.012 -2.7l-1.996 -3.3a1.7 1.7 0 0 1 .3 -2.4a1.7 1.7 0 0 1 2.4 .3l1.598 2.6" /></svg>,
    // Use simple typographic glyphs for text formatting so the toolbar icons are immediately clear.
    bold: <span className="font-semibold text-[15px] leading-none">B</span>,
    italic: <span className="italic text-[15px] leading-none">I</span>,
    strikethrough: <span className="line-through text-[15px] leading-none">S</span>,
    textColor: (
        <span className="relative inline-flex items-center justify-center">
            <span className="text-[15px] leading-none">A</span>
            <span className="absolute -bottom-1 left-0 right-0 h-[2px] rounded-full bg-current" />
        </span>
    ),
    bulletList: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 17.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" /></svg>,
    checklist: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    paperOptions: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
    checkmark: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>,
    clearCanvas: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9.75L14.25 12m0 0l2.25 2.25M14.25 12L12 14.25m-2.25 2.25L7.5 12m0 0l2.25-2.25M7.5 12l2.25 2.25M3 12a9 9 0 1118 0 9 9 0 01-18 0z" /></svg>,
    close: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>,
    addPage: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3h-6" /></svg>,
    pin: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 3.75V16.5L12 14.25 7.5 16.5V3.75m9 0H12H7.5h9z" /></svg>,
    pinFilled: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path fillRule="evenodd" d="M16.5 3.75a.75.75 0 01.75.75v11.19l-4.445-2.223a.75.75 0 00-.61 0L7.75 15.69V4.5a.75.75 0 01.75-.75h8z" clipRule="evenodd" /></svg>,
    menu: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg>,
    grid: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 8.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25v2.25A2.25 2.25 0 018.25 20.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6A2.25 2.25 0 0115.75 3.75h2.25A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25A2.25 2.25 0 0113.5 8.25V6zM13.5 15.75A2.25 2.25 0 0115.75 13.5h2.25a2.25 2.25 0 012.25 2.25v2.25a2.25 2.25 0 01-2.25 2.25H15.75A2.25 2.25 0 0113.5 18v-2.25z" /></svg>,
    list: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.125 1.125 0 010 2.25H5.625a1.125 1.125 0 010-2.25z" /></svg>,
    arrowUp: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" /></svg>,
    arrowDown: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>,
    ellipsisVertical: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z" /></svg>,
    palette: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M4.098 19.902a3.75 3.75 0 005.304 0l6.401-6.402a3.75 3.75 0 00-.615-5.898L8.384 4.098a3.75 3.75 0 00-5.898.615l-2.25 3.548a.75.75 0 00.294 1.006l4.006 2.491a.75.75 0 001.006-.294l3.548-2.25a.75.75 0 00-.294-1.006l-2.491-4.006a.75.75 0 00-1.006.294l-3.548 2.25z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 7.5l3 3M3.375 21a2.25 2.25 0 01-2.25-2.25v-1.5c0-1.242 1.008-2.25 2.25-2.25h1.5a2.25 2.25 0 012.25 2.25v1.5c0 1.242-1.008 2.25-2.25 2.25h-1.5z" /></svg>,
    moon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" /></svg>,
    sun: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.95-4.243l-1.59-1.591M3 12h2.25m.386-6.364l1.591 1.591M12 12a4.5 4.5 0 100 9 4.5 4.5 0 000-9z" /></svg>,
    rename: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg>,
    search: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>,
    label: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" /><path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" /></svg>,
};

export const PEN_COLORS = ['#2E2E2E', '#FF6B6B', '#4A90E2', '#22C55E', '#EAB308', '#A855F7'];
export const HIGHLIGHTER_COLORS = ['#FEF9E7', '#FDE7F3', '#E8F0FE', '#E6F4EA'];
export const STROKE_WIDTHS = [2, 4, 8];

export const TEXT_COLORS = [
    '#2E2E2E', // Charcoal
    '#E2E8F0', // Light Grey
    '#EF4444', // Red
    '#F97316', // Orange
    '#EAB308', // Yellow
    '#22C55E', // Green
    '#3B82F6', // Blue
    '#A855F7', // Purple
    '#EC4899', // Pink
    '#64748B', // Slate
    '#ffffff', // White
];

// Centralized source for folder colors
export const FOLDER_COLORS_DATA = [
  { hex: '#4A90E2', bg: 'bg-pastel-blue-bg', icon: 'text-pastel-blue-icon' },
  { hex: '#EAB308', bg: 'bg-pastel-yellow-bg', icon: 'text-pastel-yellow-icon' },
  { hex: '#22C55E', bg: 'bg-pastel-green-bg', icon: 'text-pastel-green-icon' },
  { hex: '#DB2777', bg: 'bg-pastel-pink-bg', icon: 'text-pastel-pink-icon' },
];

// For sidebar component styling
export const FOLDER_COLORS = FOLDER_COLORS_DATA.map(c => ({ bg: c.bg, icon: c.icon }));

// For note accent colors
export const FOLDER_COLOR_VALUES = FOLDER_COLORS_DATA.map(c => c.hex);

export const LINE_COLOR_ON_LIGHT = '#334155'; // slate-700
export const LINE_COLOR_ON_DARK = '#94A3B8';  // slate-400

const createSvgBackground = (svgContent: string, lineColor: string) => {
    // Inject the final line color into the SVG string.
    const finalSvg = svgContent.replace(/__LINE_COLOR__/g, lineColor);
    
    // btoa is a more robust method for encoding SVG for data URIs than encodeURIComponent.
    if (typeof window !== 'undefined') {
        const base64Svg = window.btoa(finalSvg);
        return `url("data:image/svg+xml;base64,${base64Svg}")`;
    }
    return 'none';
};

// By matching the SVG viewBox to the background-size, we can define the patterns
// in a more direct and reliable way, avoiding scaling issues.
export const getPaperPatternStyles = (lineColor: string): Record<PaperStyle, React.CSSProperties> => ({
    [PaperStyle.Blank]: {},
    [PaperStyle.Wide]: {
        backgroundImage: createSvgBackground(
            // Use a small, repeatable tile instead of a full-width SVG to prevent stroke scaling.
            `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 10 40'><path d='M0 20h10' stroke='__LINE_COLOR__' stroke-width='0.5'/></svg>`,
            lineColor
        ),
        // Repeat the 10px wide tile horizontally, with a height of 40px for wide ruling.
        backgroundSize: '10px 40px',
    },
    [PaperStyle.College]: {
        backgroundImage: createSvgBackground(
             // Use a small, repeatable tile.
            `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 10 28'><path d='M0 14h10' stroke='__LINE_COLOR__' stroke-width='0.5'/></svg>`,
            lineColor
        ),
        // Repeat the 10px wide tile horizontally, with a height of 28px for college ruling.
        backgroundSize: '10px 28px',
    },
    [PaperStyle.Grid]: {
        backgroundImage: createSvgBackground(
            `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20'><path d='M0 10h20M10 0v20' stroke='__LINE_COLOR__' stroke-width='0.5'/></svg>`,
            lineColor
        ),
        backgroundSize: '20px 20px',
    },
    [PaperStyle.Dotted]: {
        backgroundImage: createSvgBackground(
            `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20'><circle cx='10' cy='10' r='0.75' fill='__LINE_COLOR__'/></svg>`,
            lineColor
        ),
        backgroundSize: '20px 20px',
    },
});