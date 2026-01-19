
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import remarkGfm from 'remark-gfm'
import rehypeKatex from 'rehype-katex'
import { Components } from 'react-markdown'

interface MarkdownRendererProps {
  content: string
  className?: string
}

const components: Components = {
  h1: ({node, ...props}) => <h1 className="text-2xl font-bold mt-6 mb-4 text-foreground" {...props} />,
  h2: ({node, ...props}) => <h2 className="text-xl font-semibold mt-5 mb-3 text-foreground" {...props} />,
  h3: ({node, ...props}) => <h3 className="text-lg font-medium mt-4 mb-2 text-foreground" {...props} />,
  p: ({node, ...props}) => <p className="mb-4 leading-relaxed last:mb-0 text-foreground/90" {...props} />,
  ul: ({node, ...props}) => <ul className="list-disc pl-5 mb-4 space-y-1 text-foreground/90" {...props} />,
  ol: ({node, ...props}) => <ol className="list-decimal pl-5 mb-4 space-y-1 text-foreground/90" {...props} />,
  li: ({node, ...props}) => <li className="pl-1" {...props} />,
  blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-primary/30 pl-4 italic text-muted-foreground my-4 bg-primary/5 py-2 rounded-r" {...props} />,
  hr: ({node, ...props}) => <hr className="my-6 border-border/50" {...props} />,
  code: ({node, className, children, ...props}: any) => {
    const match = /language-(\w+)/.exec(className || '')
    return !match ? (
      <code className="bg-muted/50 border border-border/50 px-1.5 py-0.5 rounded font-mono text-sm text-foreground/90" {...props}>
        {children}
      </code>
    ) : (
      <pre className="bg-muted/50 border border-border/50 p-4 rounded-lg overflow-x-auto mb-4 text-sm font-mono text-muted-foreground">
        <code className={className} {...props}>
          {children}
        </code>
      </pre>
    )
  },
}

export function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {

  return (
    <div className={`markdown-content ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkMath, remarkGfm]}
        rehypePlugins={[rehypeKatex]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
