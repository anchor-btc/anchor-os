'use client';

import { Highlight, themes } from 'prism-react-renderer';

interface CodeBlockProps {
  code: string;
  language: 'typescript' | 'rust' | 'bash' | 'json';
  title?: string;
}

export function CodeBlock({ code, language, title }: CodeBlockProps) {
  return (
    <div className="rounded-lg overflow-hidden border border-gray-700">
      {title && (
        <div className="bg-gray-800 px-4 py-2 border-b border-gray-700">
          <span className="text-xs text-gray-400 font-mono">{title}</span>
        </div>
      )}
      <Highlight theme={themes.nightOwl} code={code.trim()} language={language}>
        {({ className, style, tokens, getLineProps, getTokenProps }) => (
          <pre
            className={`${className} p-4 overflow-x-auto text-sm`}
            style={{ ...style, margin: 0, background: '#011627' }}
          >
            {tokens.map((line, i) => (
              <div key={i} {...getLineProps({ line })}>
                <span className="text-gray-500 select-none mr-4 text-xs w-6 inline-block text-right">
                  {i + 1}
                </span>
                {line.map((token, key) => (
                  <span key={key} {...getTokenProps({ token })} />
                ))}
              </div>
            ))}
          </pre>
        )}
      </Highlight>
    </div>
  );
}
