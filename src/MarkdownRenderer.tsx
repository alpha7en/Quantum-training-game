import React, { useEffect, useRef } from 'react';

interface MarkdownRendererProps {
  content: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Trigger KaTeX rendering on the container whenever content changes
  useEffect(() => {
    let active = true;
    
    const tryRender = () => {
      if (!active) return;
      if (containerRef.current) {
        if ((window as any).renderMathInElement) {
          try {
            (window as any).renderMathInElement(containerRef.current, {
              delimiters: [
                { left: '$$', right: '$$', display: true },
                { left: '$', right: '$', display: false }
              ],
              throwOnError: false
            });
          } catch (err) {
            console.error("KaTeX rendering error inside MarkdownRenderer:", err);
          }
        } else {
          // Script might still be loading, retry in 100ms
          setTimeout(tryRender, 100);
        }
      }
    };

    tryRender();
    return () => {
      active = false;
    };
  }, [content]);

  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  
  let listItems: string[] = [];

  const renderTextWithFormatting = (text: string): React.ReactNode[] => {
    const parts: React.ReactNode[] = [];
    const tokenRegex = /(\*\*.*?\*\*|\*.*?\*|`.*?`)/g;
    const splitParts = text.split(tokenRegex);
    
    splitParts.forEach((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        parts.push(<strong key={index} style={{ color: 'var(--text-primary)', fontWeight: '700' }}>{part.slice(2, -2)}</strong>);
      } else if (part.startsWith('*') && part.endsWith('*')) {
        parts.push(<em key={index} style={{ fontStyle: 'italic' }}>{part.slice(1, -1)}</em>);
      } else if (part.startsWith('`') && part.endsWith('`')) {
        parts.push(
          <code key={index} style={{
            background: 'rgba(0,0,0,0.4)',
            padding: '2px 6px',
            borderRadius: '4px',
            fontFamily: 'var(--font-mono)',
            fontSize: '12px',
            color: 'var(--accent-cyan)',
            border: '1px solid rgba(0, 242, 254, 0.2)',
            wordBreak: 'break-all'
          }}>{part.slice(1, -1)}</code>
        );
      } else {
        parts.push(part);
      }
    });

    return parts;
  };

  const flushList = (key: number) => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`list-${key}`} style={{ 
          paddingLeft: '24px', 
          margin: '8px 0 16px 0', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '8px',
          listStyleType: 'disc'
        }}>
          {listItems.map((item, idx) => (
            <li key={idx} style={{ color: 'var(--text-secondary)', fontSize: '13.5px', lineHeight: '1.6' }}>
              {renderTextWithFormatting(item)}
            </li>
          ))}
        </ul>
      );
      listItems = [];
    }
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    
    if (trimmed.startsWith('# ')) {
      flushList(index);
      elements.push(
        <h1 key={index} style={{ 
          fontSize: '22px', 
          fontWeight: '800', 
          color: 'var(--text-primary)', 
          margin: '28px 0 14px 0', 
          borderBottom: '1px solid var(--border-muted)', 
          paddingBottom: '8px' 
        }}>
          {renderTextWithFormatting(trimmed.slice(2))}
        </h1>
      );
    } else if (trimmed.startsWith('## ')) {
      flushList(index);
      elements.push(
        <h2 key={index} style={{ 
          fontSize: '18px', 
          fontWeight: '700', 
          color: 'var(--accent-cyan)', 
          margin: '24px 0 12px 0' 
        }}>
          {renderTextWithFormatting(trimmed.slice(3))}
        </h2>
      );
    } else if (trimmed.startsWith('### ')) {
      flushList(index);
      elements.push(
        <h3 key={index} style={{ 
          fontSize: '15px', 
          fontWeight: '600', 
          color: 'var(--accent-purple)', 
          margin: '20px 0 10px 0' 
        }}>
          {renderTextWithFormatting(trimmed.slice(4))}
        </h3>
      );
    } else if (trimmed.startsWith('#### ')) {
      flushList(index);
      elements.push(
        <h4 key={index} style={{ 
          fontSize: '13.5px', 
          fontWeight: '600', 
          color: 'var(--text-primary)', 
          margin: '16px 0 8px 0' 
        }}>
          {renderTextWithFormatting(trimmed.slice(5))}
        </h4>
      );
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      listItems.push(trimmed.slice(2));
    } else if (trimmed.startsWith('> ')) {
      flushList(index);
      elements.push(
        <blockquote key={index} style={{
          borderLeft: '4px solid var(--accent-purple)',
          padding: '10px 18px',
          margin: '16px 0',
          background: 'linear-gradient(90deg, rgba(168, 85, 247, 0.05) 0%, transparent 100%)',
          borderRadius: '0 8px 8px 0',
          color: 'var(--text-secondary)',
          fontStyle: 'italic',
          lineHeight: '1.6'
        }}>
          {renderTextWithFormatting(trimmed.slice(2))}
        </blockquote>
      );
    } else if (trimmed === '') {
      flushList(index);
    } else {
      flushList(index);
      elements.push(
        <p key={index} style={{ margin: '0 0 12px 0', color: 'var(--text-secondary)', fontSize: '13.5px', lineHeight: '1.7' }}>
          {renderTextWithFormatting(line)}
        </p>
      );
    }
  });

  flushList(lines.length);

  return (
    <div 
      key={content}
      ref={containerRef} 
      className="markdown-body" 
      style={{ 
        textAlign: 'left',
        wordBreak: 'break-word',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}
    >
      {elements}
    </div>
  );
};
