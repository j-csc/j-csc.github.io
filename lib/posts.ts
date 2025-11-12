import fs from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';
import { remark } from 'remark';
import html from 'remark-html';

const contentDirectory = path.join(process.cwd(), 'content');

export type PostMeta = {
  slug: string;
  title: string;
  description?: string;
  date?: string;
};

export type Post = PostMeta & {
  content: string;
};

async function readMarkdownFile(filePath: string) {
  try {
    return await fs.readFile(filePath, 'utf8');
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error && (error as { code?: string }).code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

function normalizeSlug(fileName: string): string {
  return fileName.replace(/\.md$/, '');
}

export async function getPostSlugs(): Promise<string[]> {
  const entries = await fs.readdir(contentDirectory, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
    .map((entry) => normalizeSlug(entry.name));
}

export async function getAllPosts(): Promise<PostMeta[]> {
  const slugs = await getPostSlugs();
  const posts = await Promise.all(
    slugs.map(async (slug): Promise<PostMeta | null> => {
      const filePath = path.join(contentDirectory, `${slug}.md`);
      const file = await readMarkdownFile(filePath);
      if (!file) {
        return null;
      }

      const { data } = matter(file);
      const meta: PostMeta = {
        slug,
        title: data.title ?? slug,
        description: data.description,
        date: data.date,
      };

      return meta;
    })
  );

  const definedPosts = posts.filter((post): post is PostMeta => post !== null);

  return definedPosts.sort((a, b) => {
    const dateA = a.date ? new Date(a.date).getTime() : 0;
    const dateB = b.date ? new Date(b.date).getTime() : 0;
    return dateB - dateA;
  });
}

export async function getPostBySlug(slug: string): Promise<Post | null> {
  const filePath = path.join(contentDirectory, `${slug}.md`);
  const file = await readMarkdownFile(filePath);

  if (!file) {
    return null;
  }

  const { data, content } = matter(file);
  const processed = await remark().use(html).process(content);

  return {
    slug,
    title: data.title ?? slug,
    description: data.description,
    date: data.date,
    content: processed.toString(),
  } satisfies Post;
}
