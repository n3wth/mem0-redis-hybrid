import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'

const docsDirectory = path.join(process.cwd(), 'content/docs')

export interface DocMeta {
  slug: string
  title: string
  description?: string
  order?: number
}

export async function getAllDocs(): Promise<DocMeta[]> {
  const fileNames = fs.readdirSync(docsDirectory)

  const docs = fileNames
    .filter(fileName => fileName.endsWith('.mdx'))
    .map(fileName => {
      const slug = fileName.replace(/\.mdx$/, '')
      const fullPath = path.join(docsDirectory, fileName)
      const fileContents = fs.readFileSync(fullPath, 'utf8')
      const { data } = matter(fileContents)

      return {
        slug,
        title: data.title || slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, ' '),
        description: data.description,
        order: data.order || 999
      }
    })
    .sort((a, b) => a.order - b.order)

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