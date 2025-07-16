import React, { useEffect, useRef } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import './MathRenderer.css';

interface MathRendererProps {
  math: string;
  displayMode?: boolean;
  className?: string;
  inline?: boolean;
  errorColor?: string;
  throwOnError?: boolean;
}

export const MathRenderer: React.FC<MathRendererProps> = ({
  math,
  displayMode = false,
  className = '',
  inline = false,
  errorColor = '#dc2626',
  throwOnError = false
}) => {
  const mathRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (mathRef.current && math) {
      try {
        // Clear previous content
        mathRef.current.innerHTML = '';
        
        // Render the math expression
        katex.render(math, mathRef.current, {
          displayMode: displayMode || !inline,
          throwOnError,
          errorColor,
          strict: false,
          trust: false, // Security: don't trust user input for HTML
          output: 'html'
        });
        
        // Add success class for styling
        mathRef.current.classList.remove('math-error');
        mathRef.current.classList.add('math-success');
        
      } catch (error) {
        console.warn('KaTeX rendering error:', error);
        
        // Show error message
        if (mathRef.current) {
          mathRef.current.innerHTML = `
            <span class="math-error-content">
              <span class="math-error-icon">⚠️</span>
              <span class="math-error-text">Math Error: ${(error as Error).message}</span>
            </span>
          `;
          mathRef.current.classList.add('math-error');
          mathRef.current.classList.remove('math-success');
        }
      }
    }
  }, [math, displayMode, inline, errorColor, throwOnError]);

  if (!math || math.trim() === '') {
    return null;
  }

  return (
    <div 
      ref={mathRef}
      className={`math-renderer ${inline ? 'inline' : 'block'} ${className}`}
      title={`LaTeX: ${math}`}
    />
  );
};

// Text processor component that can handle mixed text and math
interface MathTextProps {
  text: string;
  className?: string;
  mathDelimiters?: {
    inline: [string, string];
    display: [string, string];
  };
}

export const MathText: React.FC<MathTextProps> = ({
  text,
  className = '',
  mathDelimiters = {
    inline: ['$', '$'],
    display: ['$$', '$$']
  }
}) => {
  const processText = (input: string) => {
    const parts: Array<{ type: 'text' | 'math'; content: string; displayMode: boolean }> = [];
    let remaining = input;
    let key = 0;

    while (remaining.length > 0) {
      // Look for display math first ($$...$$ or \[...\])
      const displayStart = remaining.indexOf(mathDelimiters.display[0]);
      const bracketDisplayStart = remaining.indexOf('\\[');
      
      let displayIndex = -1;
      let displayDelim = mathDelimiters.display;
      let displayEnd = '';
      
      if (displayStart !== -1 && (bracketDisplayStart === -1 || displayStart < bracketDisplayStart)) {
        displayIndex = displayStart;
        displayEnd = mathDelimiters.display[1];
      } else if (bracketDisplayStart !== -1) {
        displayIndex = bracketDisplayStart;
        displayDelim = ['\\[', '\\]'];
        displayEnd = '\\]';
      }

      // Look for inline math ($...$  or \(...\))
      const inlineStart = remaining.indexOf(mathDelimiters.inline[0]);
      const bracketInlineStart = remaining.indexOf('\\(');
      
      let inlineIndex = -1;
      let inlineDelim = mathDelimiters.inline;
      let inlineEnd = '';
      
      if (inlineStart !== -1 && (bracketInlineStart === -1 || inlineStart < bracketInlineStart)) {
        inlineIndex = inlineStart;
        inlineEnd = mathDelimiters.inline[1];
      } else if (bracketInlineStart !== -1) {
        inlineIndex = bracketInlineStart;
        inlineDelim = ['\\(', '\\)'];
        inlineEnd = '\\)';
      }

      // Determine which comes first
      let mathStart = -1;
      let mathType: 'inline' | 'display' = 'inline';
      let startDelim = '';
      let endDelim = '';

      if (displayIndex !== -1 && (inlineIndex === -1 || displayIndex < inlineIndex)) {
        mathStart = displayIndex;
        mathType = 'display';
        startDelim = displayDelim[0];
        endDelim = displayEnd;
      } else if (inlineIndex !== -1) {
        mathStart = inlineIndex;
        mathType = 'inline';
        startDelim = inlineDelim[0];
        endDelim = inlineEnd;
      }

      if (mathStart === -1) {
        // No more math, add remaining text
        if (remaining.trim()) {
          parts.push({ type: 'text', content: remaining, displayMode: false });
        }
        break;
      }

      // Add text before math
      if (mathStart > 0) {
        const textPart = remaining.substring(0, mathStart);
        if (textPart.trim()) {
          parts.push({ type: 'text', content: textPart, displayMode: false });
        }
      }

      // Find the end of the math expression
      const mathContentStart = mathStart + startDelim.length;
      const mathEnd = remaining.indexOf(endDelim, mathContentStart);

      if (mathEnd === -1) {
        // No closing delimiter, treat as text
        parts.push({ type: 'text', content: remaining, displayMode: false });
        break;
      }

      // Extract math content
      const mathContent = remaining.substring(mathContentStart, mathEnd);
      if (mathContent.trim()) {
        parts.push({ 
          type: 'math', 
          content: mathContent, 
          displayMode: mathType === 'display' 
        });
      }

      // Continue with remaining text
      remaining = remaining.substring(mathEnd + endDelim.length);
    }

    return parts.map((part, index) => {
      if (part.type === 'text') {
        return <span key={`text-${key++}`}>{part.content}</span>;
      } else {
        return (
          <MathRenderer
            key={`math-${key++}`}
            math={part.content}
            displayMode={part.displayMode}
            inline={!part.displayMode}
          />
        );
      }
    });
  };

  return (
    <div className={`math-text ${className}`}>
      {processText(text)}
    </div>
  );
};

export default MathRenderer; 