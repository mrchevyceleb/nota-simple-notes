import DOMPurify from 'dompurify';

export const sanitizeHtml = (html: string): string => {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'u', 's', 'em', 'strong', 'span', 'br', 'p', 'div', 'ul', 'ol', 'li', 'img', 'a', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'pre', 'code', 'hr', 'sub', 'sup'],
    ALLOWED_ATTR: ['style', 'class', 'href', 'src', 'alt', 'target', 'rel', 'data-checked'],
  });
};
