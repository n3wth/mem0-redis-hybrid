import { notFound } from 'next/navigation'
import { MDXRemote } from 'next-mdx-remote/rsc'
import { getDocBySlug, getAllDocs } from '@/lib/mdx'
import Link from 'next/link'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { ArchitectureDiagram } from '@/components/ArchitectureDiagram'
import { CodeTabs } from '@/components/CodeTabs'

export async function generateStaticParams() {
  const docs = await getAllDocs()
  return docs.map((doc) => ({
    slug: doc.slug.split('/'),
  }))
}

const components = {
  ArchitectureDiagram,
  CodeTabs,
  h1: ({ children }: any) => (
    <h1 className="text-4xl font-normal text-white mb-6">{children}</h1>
  ),
  h2: ({ children }: any) => (
    <h2 className="text-2xl font-normal text-white mt-12 mb-4">{children}</h2>
  ),
  h3: ({ children }: any) => (
    <h3 className="text-lg font-medium text-white mt-8 mb-3">{children}</h3>
  ),
  p: ({ children }: any) => (
    <p className="text-gray-400 mb-4 leading-relaxed">{children}</p>
  ),
  ul: ({ children }: any) => (
    <ul className="text-gray-400 mb-4 space-y-2 list-disc list-inside">{children}</ul>
  ),
  li: ({ children }: any) => (
    <li className="text-gray-400">{children}</li>
  ),
  code: ({ children }: any) => (
    <code className="bg-white/5 text-white px-1.5 py-0.5 rounded text-sm font-mono">{children}</code>
  ),
  pre: ({ children }: any) => (
    <div className="relative group mb-6">
      <div className="relative rounded-lg overflow-hidden border border-white/10 bg-white/[0.01]">
        <pre className="p-4 overflow-x-auto">
          {children}
        </pre>
      </div>
    </div>
  ),
  a: ({ href, children }: any) => {
    // Handle external links
    if (href?.startsWith('http')) {
      return (
        <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 transition-colors">
          {children}
        </a>
      )
    }
    // Handle internal links
    return (
      <Link href={href || '#'} className="text-blue-400 hover:text-blue-300 transition-colors">
        {children}
      </Link>
    )
  },
  strong: ({ children }: any) => (
    <strong className="text-white font-medium">{children}</strong>
  ),
  table: ({ children }: any) => (
    <div className="overflow-x-auto mb-6">
      <table className="min-w-full divide-y divide-white/10">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }: any) => (
    <thead className="bg-white/[0.02]">{children}</thead>
  ),
  tbody: ({ children }: any) => (
    <tbody className="divide-y divide-white/10">{children}</tbody>
  ),
  tr: ({ children }: any) => (
    <tr>{children}</tr>
  ),
  th: ({ children }: any) => (
    <th className="px-4 py-3 text-left text-sm font-medium text-white">{children}</th>
  ),
  td: ({ children }: any) => (
    <td className="px-4 py-3 text-sm text-gray-400">{children}</td>
  ),
}

export default async function DocPage({ params }: { params: Promise<{ slug?: string[] }> }) {
  const resolvedParams = await params
  const slugPath = resolvedParams.slug ? resolvedParams.slug.join('/') : 'introduction'
  const doc = await getDocBySlug(slugPath)
  const allDocs = await getAllDocs()

  if (!doc) {
    notFound()
  }

  const currentIndex = allDocs.findIndex(d => d.slug === slugPath)
  const prevDoc = currentIndex > 0 ? allDocs[currentIndex - 1] : null
  const nextDoc = currentIndex < allDocs.length - 1 ? allDocs[currentIndex + 1] : null

  return (
    <>
      <article className="prose prose-invert max-w-none">
        <MDXRemote source={doc.content} components={components} />
      </article>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-16 pt-8 border-t border-white/10">
        {prevDoc ? (
          <Link
            href={`/docs/${prevDoc.slug}`}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            {prevDoc.title}
          </Link>
        ) : (
          <div />
        )}

        {nextDoc && (
          <Link
            href={`/docs/${nextDoc.slug}`}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            {nextDoc.title}
            <ArrowRight className="h-4 w-4" />
          </Link>
        )}
      </div>
    </>
  )
}