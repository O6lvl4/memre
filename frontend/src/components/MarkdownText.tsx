import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";

interface MarkdownTextProps {
  children: string;
  className?: string;
}

/**
 * Markdown対応テキスト表示コンポーネント
 * - **太字**, *斜体*, `コード` などをサポート
 * - 1行改行を <br> として認識（remarkBreaks）
 * - GFM（GitHub Flavored Markdown）対応
 */
export function MarkdownText({ children, className = "" }: MarkdownTextProps) {
  return (
    <div className={`markdown-content ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        components={{
        // 段落: デフォルトのマージンを調整
        p: ({ children }) => (
          <p className="mb-2 last:mb-0">{children}</p>
        ),
        // 太字
        strong: ({ children }) => (
          <strong className="font-semibold">{children}</strong>
        ),
        // 斜体
        em: ({ children }) => (
          <em className="italic">{children}</em>
        ),
        // インラインコード
        code: ({ children, className }) => {
          // コードブロックかインラインコードかを判定
          const isCodeBlock = className?.includes("language-");
          if (isCodeBlock) {
            return (
              <code className="block bg-gray-100 p-3 rounded-md text-sm overflow-x-auto my-2">
                {children}
              </code>
            );
          }
          return (
            <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono">
              {children}
            </code>
          );
        },
        // リスト
        ul: ({ children }) => (
          <ul className="list-disc list-inside my-2 space-y-1">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="list-decimal list-inside my-2 space-y-1">{children}</ol>
        ),
        li: ({ children }) => (
          <li className="pl-1">{children}</li>
        ),
        // リンク
        a: ({ href, children }) => (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#4A90E2] hover:underline"
          >
            {children}
          </a>
        ),
        // 引用
        blockquote: ({ children }) => (
          <blockquote className="border-l-4 border-gray-300 pl-4 my-2 text-gray-600 italic">
            {children}
          </blockquote>
        ),
      }}
    >
        {children}
      </ReactMarkdown>
    </div>
  );
}
