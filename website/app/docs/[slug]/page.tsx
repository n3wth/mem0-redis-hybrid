import { notFound } from 'next/navigation'
import { MDXRemote } from 'next-mdx-remote/rsc'
import { Navigation } from '@/components/Navigation'
import { Footer } from '@/components/Footer'
import { getDocBySlug, getAllDocs } from '@/lib/mdx'
import Link from 'next/link'
import { ArrowLeft, ArrowRight } from 'lucide-react'

export async function generateStaticParams() {
  const docs = await getAllDocs()
  return docs.map((doc) => ({
    slug: doc.slug,
  }))
}

const components = {
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
    <code className="bg-white/5 text-blue-400 px-1.5 py-0.5 rounded text-sm font-mono">{children}</code>
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
  a: ({ href, children }: any) => (
    <Link href={href} className="text-blue-400 hover:text-blue-300 transition-colors">
      {children}
    </Link>
  ),
  strong: ({ children }: any) => (
    <strong className="text-white font-medium">{children}</strong>
  ),
}

export default async function DocPage({ params }: { params: { slug: string } }) {
  const doc = await getDocBySlug(params.slug)
  const allDocs = await getAllDocs()

  if (!doc) {
    notFound()
  }

  const currentIndex = allDocs.findIndex(d => d.slug === params.slug)
  const prevDoc = currentIndex > 0 ? allDocs[currentIndex - 1] : null
  const nextDoc = currentIndex < allDocs.length - 1 ? allDocs[currentIndex + 1] : null

  return (
    <div className="min-h-screen bg-black">
      <Navigation />

      <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
        <div className="flex gap-12">
          {/* Sidebar */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <div className="sticky top-20">
              <nav className="space-y-1">
                {allDocs.map((doc) => (
                  <Link
                    key={doc.slug}
                    href={`/docs/${doc.slug}`}
                    className={`
                      block px-3 py-2 text-sm font-medium rounded-lg transition-all
                      ${params.slug === doc.slug
                        ? 'bg-white/5 text-white'
                        : 'text-gray-400 hover:text-white hover:bg-white/[0.02]'
                      }
                    `}
                  >
                    {doc.title}
                  </Link>
                ))}
              </nav>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 min-w-0 max-w-none prose prose-invert">
            <article>
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
          </main>
        </div>
      </div>

      <Footer />
    </div>
  )
}