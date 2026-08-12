import React from 'react';
import katex from 'katex';

// Escape HTML entities to prevent XSS in non-math text
function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Auto format common plain text math into LaTeX
function autoFormatMath(text) {
  if (!text) return '';
  const M_START = '\uE000';
  const M_END = '\uE001';

  let formatted = text;

  // Split by existing math blocks to avoid formatting inside them
  const parts = formatted.split(/(\$\$[\s\S]*?\$\$|\$[\s\S]*?\$)/g);
  for (let i = 0; i < parts.length; i++) {
    if (i % 2 === 0) { // Outside math blocks
      let p = parts[i];

      // Logarithms and Trig
      // log_A/B -> \log_{\frac{A}{B}}
      p = p.replace(/\b(log|ln|sin|cos|tan|cot|lim)_([a-zA-Z0-9.\-]+)\/([a-zA-Z0-9.\-]+)/g, '\\$1_{\\frac{$2}{$3}}');
      // log_A -> \log_{A}
      p = p.replace(/\b(log|ln|sin|cos|tan|cot|lim)_([a-zA-Z0-9.\-]+)/g, '\\$1_{$2}');
      // log -> \log
      p = p.replace(/\b(log|ln|sin|cos|tan|cot|lim)\b(?!_)/g, '\\$1');

      // 0. Roots with balanced parentheses: √( ... ) or sqrt( ... )
      while (true) {
        let match1 = p.indexOf('√(');
        let match2 = p.indexOf('sqrt(');
        if (match1 === -1 && match2 === -1) break;
        
        let isSymbol = match1 !== -1 && (match2 === -1 || match1 < match2);
        let startIdx = isSymbol ? match1 : match2;
        let prefixLen = isSymbol ? 2 : 5; // '√(' or 'sqrt('
        
        let openCount = 1;
        let endIdx = -1;
        for (let j = startIdx + prefixLen; j < p.length; j++) {
          if (p[j] === '(') openCount++;
          if (p[j] === ')') openCount--;
          if (openCount === 0) {
            endIdx = j;
            break;
          }
        }
        
        if (endIdx !== -1) {
          let inner = p.substring(startIdx + prefixLen, endIdx);
          p = p.substring(0, startIdx) + M_START + '\\sqrt{' + inner + '}' + M_END + p.substring(endIdx + 1);
        } else {
          // Unmatched, just replace the rest
          p = p.substring(0, startIdx) + M_START + '\\sqrt{' + p.substring(startIdx + prefixLen) + '}' + M_END;
          break;
        }
      }
      
      // Simple √N without parentheses
      p = p.replace(/√([a-zA-Z0-9.\-]+)/g, M_START + '\\sqrt{$1}' + M_END);

      // 1. simple a/b without parentheses (using lookarounds to not break existing \frac)
      p = p.replace(/(?<![a-zA-Z0-9])([a-zA-Z0-9.\-]+)\s*\/\s*([a-zA-Z0-9.\-]+)(?![a-zA-Z0-9])/g, M_START + '\\frac{$1}{$2}' + M_END);
      
      // 2. a / (B)
      p = p.replace(/(?<![a-zA-Z0-9])([a-zA-Z0-9.\-]+)\s*\/\s*\(([^()]+)\)/g, M_START + '\\frac{$1}{$2}' + M_END);
      
      // 3. (A) / b
      p = p.replace(/\(([^()]+)\)\s*\/\s*([a-zA-Z0-9.\-]+)(?![a-zA-Z0-9])/g, M_START + '\\frac{$1}{$2}' + M_END);

      // 4. (A) / (B) - loop to handle nesting
      let prev;
      do {
        prev = p;
        p = p.replace(/\(([^()]+)\)\s*\/\s*\(([^()]+)\)/g, M_START + '\\frac{$1}{$2}' + M_END);
      } while(p !== prev);

      // Exponents
      p = p.replace(/\b([a-zA-Z0-9]+)\^\(([^()]+)\)/g, M_START + '$1^{$2}' + M_END);
      p = p.replace(/\b([a-zA-Z0-9]+)\^([a-zA-Z0-9.\-]+)\b/g, M_START + '$1^{$2}' + M_END);

      // Multiplication
      p = p.replace(/·/g, M_START + '\\cdot' + M_END);
      p = p.replace(/(\d+)\s*\*\s*(\d+)/g, M_START + '$1 \\cdot $2' + M_END);
      p = p.replace(/(\d+)\s*\*\s*([a-zA-Z]+)/g, M_START + '$1 \\cdot $2' + M_END);
      p = p.replace(/([a-zA-Z)]+)\s*\*\s*([0-9a-zA-Z(]+)/g, M_START + '$1 \\cdot $2' + M_END);

      // Raw LaTeX commands (supports 1 level of nested braces for complex subscripts like \log_{\frac{1}{5}})
      const nb = '(?:\\{(?:[^{}]|\\{[^{}]*\\})*\\})';
      const cmdRegex = new RegExp(`(\\\\(?:frac|sqrt|sin|cos|tan|cot|log|ln|lim|int|sum|alpha|beta|gamma|theta|pi|infty|mu|lambda|sigma|Delta|Omega|degree|circ)\\b(?:_[a-zA-Z0-9]+|_${nb})?(?:\\^[a-zA-Z0-9]+|\\^${nb})?${nb}*)`, 'g');
      p = p.replace(cmdRegex, M_START + '$1' + M_END);

      // Absolute values | ... |
      p = p.replace(/\|([^|]+)\|/g, M_START + '|$1|' + M_END);

      // Resolve M_START and M_END into $ $
      let tokens = p.split(new RegExp(`(${M_START}|${M_END})`));
      let mathDepth = 0;
      let finalStr = '';
      for (let t of tokens) {
        if (t === M_START) {
          if (mathDepth === 0) finalStr += '$';
          mathDepth++;
        } else if (t === M_END) {
          mathDepth--;
          if (mathDepth === 0) finalStr += '$';
        } else {
          finalStr += t;
        }
      }
      parts[i] = finalStr;
    }
  }
  return parts.join('');
}

// Heuristic to wrap bare LaTeX in $ $
function fixMissingDollarSigns(text) {
  if (!text) return '';
  if (text.includes('$')) return text; 
  
  const mathRegex = /(\\int|\\frac|\\sum|\\sqrt|\\lim|\\log|\\alpha|\\beta|\\gamma|\\theta|\\[a-zA-Z]+_[a-zA-Z0-9]+|\\\^\{?[a-zA-Z0-9.\-]+\}?|\^[0-9]+|\\cdot)/;
  if (mathRegex.test(text)) {
    if (text.length < 50 && !text.includes('?')) {
      return `$${text}$`;
    }
    // Attempt to wrap the math part before common Uzbek text
    let replaced = text.replace(/((?:\\int|\\lim|\\sum|\\frac|\\log|\\sqrt).*?)(?=\s+(?:integralni|funksiyaning|ni|qiymatini|toping|hisoblang|bo'lsa|qanday|qaysi|$))/i, '$$$1$$');
    if (replaced !== text) return replaced;
  }
  return text;
}

export default function MathText({ children, style, className }) {
  if (!children) return null;
  
  const rawText = typeof children === 'string' ? children : String(children);
  const formattedMath = autoFormatMath(rawText);
  const fixedText = fixMissingDollarSigns(formattedMath);

  // Split text by $$ ... $$ and $ ... $
  const parts = fixedText.split(/(\$\$[\s\S]*?\$\$|\$[\s\S]*?\$)/g);
  
  return (
    <div className={`math-text-container ${className || ''}`} style={{ ...style, lineHeight: '1.6', display: 'inline-block', width: '100%' }}>
      {parts.map((part, index) => {
        if (part.startsWith('$$') && part.endsWith('$$')) {
          const math = part.slice(2, -2);
          try {
            const html = katex.renderToString(math, { displayMode: true, throwOnError: false });
            return <span key={index} dangerouslySetInnerHTML={{ __html: html }} />;
          } catch (e) {
            return <span key={index}>{part}</span>;
          }
        } else if (part.startsWith('$') && part.endsWith('$')) {
          const math = part.slice(1, -1);
          try {
            const html = katex.renderToString(math, { displayMode: false, throwOnError: false });
            return <span key={index} dangerouslySetInnerHTML={{ __html: html }} />;
          } catch (e) {
            return <span key={index}>{part}</span>;
          }
        } else {
          return <span key={index} dangerouslySetInnerHTML={{ __html: escapeHtml(part).replace(/\n/g, '<br/>') }} />;
        }
      })}
    </div>
  );
}
