'use client';

import { useEffect, useState } from 'react';

const RichTextViewer = ({ content }) => {
  const [processedContent, setProcessedContent] = useState('');

  useEffect(() => {
    if (!content || content.trim() === '') {
      setProcessedContent('');
      return;
    }

    // Processar syntax highlighting se houver blocos de código
    const processContent = async () => {
      if (/<pre class="ql-syntax"/.test(content)) {
        try {
          const hljs = await import('highlight.js');
          
          // Aplicar highlight aos blocos de código
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = content;
          
          const codeBlocks = tempDiv.querySelectorAll('pre.ql-syntax');
          codeBlocks.forEach(block => {
            const highlighted = hljs.default.highlightAuto(block.textContent);
            block.innerHTML = highlighted.value;
            block.classList.add('hljs');
          });
          
          setProcessedContent(tempDiv.innerHTML);
        } catch (error) {
          setProcessedContent(content);
        }
      } else {
        setProcessedContent(content);
      }
    };

    processContent();
  }, [content]);

  if (!content || content.trim() === '') {
    return (
      <div className="text-gray-500 italic text-sm">
        Esta nota não tem conteúdo.
      </div>
    );
  }

  // Se for HTML (contém tags), renderizar como HTML
  const isHtml = /<[a-z][\s\S]*>/i.test(content);
  
  if (isHtml) {
    return (
      <div className="rich-text-viewer prose prose-sm max-w-none">
        <div dangerouslySetInnerHTML={{ __html: processedContent }} />
      </div>
    );
  }

  // Se for texto simples, renderizar como texto com quebras de linha
  return (
    <div className="rich-text-viewer">
      <div className="whitespace-pre-wrap text-sm leading-relaxed">
        {content}
      </div>
    </div>
  );
};

export default RichTextViewer;
