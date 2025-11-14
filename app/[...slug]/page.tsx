import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getPostBySlug, getPostSlugs } from '@/lib/posts';

type PageProps = {
  params: Promise<{ slug: string[] }>;
};

function formatDate(input?: string) {
  if (!input) {
    return null;
  }
  const date = new Date(input);
  return Number.isNaN(date.getTime()) ? null : date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const slugPath = Array.isArray(slug) ? slug.join('/') : '';
  if (!slugPath) {
    return {
      title: 'Not found'
    };
  }

  const post = await getPostBySlug(slugPath);
  if (!post) {
    return {
      title: 'Not found'
    };
  }

  return {
    title: post.title,
    description: post.description
  };
}

export async function generateStaticParams() {
  const slugs = await getPostSlugs();
  return slugs.map((slug) => ({ slug: slug.split('/') }));
}

export default async function PostPage({ params }: PageProps) {
  const { slug } = await params;
  const slugPath = Array.isArray(slug) ? slug.join('/') : '';
  if (!slugPath) {
    notFound();
  }

  const post = await getPostBySlug(slugPath);

  if (!post) {
    notFound();
  }

  return (
    <article className="space-y-4">
      <span className='flex items-center justify-between'>
        <Link href="/" className="inline-flex items-center text-sm text-slate-500 transition hover:text-slate-900">
          ← Back home
        </Link>
        {post.date && (
          <time className="text-sm text-slate-500" dateTime={post.date}>
            {formatDate(post.date)}
          </time>
        )}
      </span>
      <div className="markdown" dangerouslySetInnerHTML={{ __html: post.content }} />
    </article>
  );
}
