import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'

const docsDirectory = path.join(process.cwd(), 'content/docs')

export interface DocMeta {
  slug: string
  title: string
  description?: string
  order?: number
  category?: string
  badge?: string
}

function getAllMdxFiles(dir: string, baseDir: string = ''): string[] {
  const files: string[] = []
  const items = fs.readdirSync(dir)

  for (const item of items) {
    const fullPath = path.join(dir, item)
    const stat = fs.statSync(fullPath)

    if (stat.isDirectory()) {
      // Recursively get files from subdirectories
      const subFiles = getAllMdxFiles(fullPath, path.join(baseDir, item))
      files.push(...subFiles)
    } else if (item.endsWith('.mdx')) {
      // Add the relative path from content/docs
      files.push(path.join(baseDir, item))
    }
  }

  return files
}

export async function getAllDocs(): Promise<DocMeta[]> {
  const files = getAllMdxFiles(docsDirectory)

  const docs = files.map(file => {
    const slug = file.replace(/\.mdx$/, '')
    const fullPath = path.join(docsDirectory, file)
    const fileContents = fs.readFileSync(fullPath, 'utf8')
    const { data } = matter(fileContents)

    return {
      slug,
      title: data.title || slug.split('/').pop()?.replace(/-/g, ' ') || '',
      description: data.description,
      order: data.order || 999,
      category: data.category,
      badge: data.badge
    }
  }).sort((a, b) => {
    // Sort by category first, then by order
    if (a.category !== b.category) {
      return (a.category || '').localeCompare(b.category || '')
    }
    return a.order - b.order
  })

  return docs
}

export async function getDocBySlug(slug: string) {
  const fullPath = path.join(docsDirectory, `${slug}.mdx`)

  if (!fs.existsSync(fullPath)) {
    return null
  }

  const fileContents = fs.readFileSync(fullPath, 'utf8')
  const { data, content } = matter(fileContents)

  return {
    slug,
    meta: data,
    content
  }
}