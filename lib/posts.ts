import fs from 'node:fs/promises';
import path from 'node:path';
import { cache } from 'react';
import matter from 'gray-matter';
import { remark } from 'remark';
import remarkMath from 'remark-math';
import remarkRehype from 'remark-rehype';
import rehypeKatex from 'rehype-katex';
import rehypeStringify from 'rehype-stringify';

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

async function readContentDirectory() {
  try {
    return await fs.readdir(contentDirectory, { withFileTypes: true });
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error && (error as { code?: string }).code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

export const getPostSlugs = cache(async (): Promise<string[]> => {
  const entries = await readContentDirectory();
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
    .map((entry) => normalizeSlug(entry.name));
});

export const getAllPosts = cache(async (): Promise<PostMeta[]> => {
  const slugs = await getPostSlugs();
  const posts = await Promise.all(
    slugs.map(async (slug): Promise<PostMeta | null> => {
      const filePath = path.join(contentDirectory, `${slug}.md`);
      const file = await readMarkdownFile(filePath);
      if (!file) {
        return null;
      }

      const { data } = matter(file);
      return {
        slug,
        title: data.title ?? slug,
        description: data.description,
        date: data.date
      } satisfies PostMeta;
    })
  );

  const definedPosts = posts.filter((post): post is PostMeta => post !== null);
  return definedPosts.sort((a, b) => {
    const dateA = a.date ? new Date(a.date).getTime() : 0;
    const dateB = b.date ? new Date(b.date).getTime() : 0;
    return dateB - dateA;
  });
});

export const getPostBySlug = cache(async (slug: string): Promise<Post | null> => {
  const filePath = path.join(contentDirectory, `${slug}.md`);
  const file = await readMarkdownFile(filePath);

  if (!file) {
    return null;
  }

  const { data, content } = matter(file);
  const processed = await remark()
    .use(remarkMath)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeKatex)
    .use(rehypeStringify, { allowDangerousHtml: true })
    .process(content);

  return {
    slug,
    title: data.title ?? slug,
    description: data.description,
    date: data.date,
    content: processed.toString()
  } satisfies Post;
});
