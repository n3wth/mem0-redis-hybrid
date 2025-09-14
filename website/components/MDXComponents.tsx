import { CodeBlock } from './CodeBlock'
import { ArchitectureDiagram } from './ArchitectureDiagram'
import { CodeTabs } from './CodeTabs'

export const MDXComponents = {
  pre: ({ children, ...props }: any) => {
    const codeElement = children?.props
    if (codeElement?.children && typeof codeElement.children === 'string') {
      return (
        <CodeBlock
          language={codeElement.className?.replace('language-', '')}
          className={codeElement.className}
        >
          {codeElement.children}
        </CodeBlock>
      )
    }
    return <pre {...props}>{children}</pre>
  },
  code: ({ children, className, ...props }: any) => {
    // Inline code
    if (!className) {
      return (
        <code
          className="px-1.5 py-0.5 rounded bg-gray-800 text-gray-300 text-sm font-mono"
          {...props}
        >
          {children}
        </code>
      )
    }
    // Block code is handled by pre
    return <code className={className} {...props}>{children}</code>
  },
  // Make components available in MDX
  ArchitectureDiagram,
  CodeTabs,
}