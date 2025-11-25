import fs from 'node:fs/promises';
import type { Dirent } from 'node:fs';
import path from 'node:path';
import { cache } from 'react';
import matter from 'gray-matter';
import { remark } from 'remark';
import remarkMath from 'remark-math';
import remarkRehype from 'remark-rehype';
import rehypeKatex from 'rehype-katex';
import rehypeStringify from 'rehype-stringify';

const contentDirectory = path.join(process.cwd(), 'content');

type MarkdownEntry = {
  slug: string;
  segments: string[];
  filePath: string;
};

export type PostMeta = {
  slug: string;
  segments: string[];
  title: string;
  description?: string;
  date?: string;
  draft?: boolean;
  pinned?: boolean;
  sectionOrder?: number;
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

async function collectMarkdownEntries(dirPath: string, relativeSegments: string[] = []): Promise<MarkdownEntry[]> {
  let dirEntries: Dirent[];
  try {
    dirEntries = await fs.readdir(dirPath, { withFileTypes: true });
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error && (error as { code?: string }).code === 'ENOENT') {
      return [];
    }
    throw error;
  }

  const entries: MarkdownEntry[] = [];
  for (const entry of dirEntries) {
    const nextPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      const nestedEntries = await collectMarkdownEntries(nextPath, [...relativeSegments, entry.name]);
      entries.push(...nestedEntries);
      continue;
    }

    if (entry.isFile() && entry.name.endsWith('.md')) {
      const segments = [...relativeSegments, normalizeSlug(entry.name)];
      entries.push({
        slug: segments.join('/'),
        segments,
        filePath: nextPath
      });
    }
  }

  return entries;
}

function slugToSegments(slug: string): string[] | null {
  const segments = slug.split('/').filter(Boolean);
  if (segments.length === 0) {
    return null;
  }

  const isValid = segments.every((segment) => !segment.includes('..') && !segment.includes(path.sep));
  return isValid ? segments : null;
}

export const getPostSlugs = cache(async (): Promise<string[]> => {
  const entries = await collectMarkdownEntries(contentDirectory);
  const slugs = await Promise.all(
    entries.map(async ({ slug, filePath }) => {
      const file = await readMarkdownFile(filePath);
      if (!file) {
        return null;
      }

      const { data } = matter(file);

      // Filter out drafts
      if (data.draft === true) {
        return null;
      }

      return slug;
    })
  );

  return slugs
    .filter((slug): slug is string => slug !== null)
    .sort((a, b) => a.localeCompare(b));
});

export const getAllPosts = cache(async (): Promise<PostMeta[]> => {
  const entries = await collectMarkdownEntries(contentDirectory);
  const posts = await Promise.all(
    entries.map(async ({ slug, segments, filePath }): Promise<PostMeta | null> => {
      const file = await readMarkdownFile(filePath);
      if (!file) {
        return null;
      }

      const { data } = matter(file);

      // Filter out drafts
      if (data.draft === true) {
        return null;
      }

      return {
        slug,
        segments,
        title: data.title ?? slug,
        description: data.description,
        date: data.date,
        draft: data.draft,
        pinned: data.pinned,
        sectionOrder: data.sectionOrder
      } satisfies PostMeta;
    })
  );

  const definedPosts = posts.filter((post): post is PostMeta => post !== null);
  return definedPosts.sort((a, b) => {
    // Pinned posts come first
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;

    // Within each group (pinned or not), sort by date
    const dateA = a.date ? new Date(a.date).getTime() : 0;
    const dateB = b.date ? new Date(b.date).getTime() : 0;
    return dateB - dateA;
  });
});

export const getPostBySlug = cache(async (slug: string): Promise<Post | null> => {
  const segments = slugToSegments(slug);
  if (!segments) {
    return null;
  }

  const filePath = path.join(contentDirectory, ...segments) + '.md';
  const file = await readMarkdownFile(filePath);

  if (!file) {
    return null;
  }

  const { data, content } = matter(file);

  // Block access to draft posts
  if (data.draft === true) {
    return null;
  }

  const processed = await remark()
    .use(remarkMath)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeKatex)
    .use(rehypeStringify, { allowDangerousHtml: true })
    .process(content);

  return {
    slug,
    segments,
    title: data.title ?? slug,
    description: data.description,
    date: data.date,
    draft: data.draft,
    pinned: data.pinned,
    sectionOrder: data.sectionOrder,
    content: processed.toString()
  } satisfies Post;
});
