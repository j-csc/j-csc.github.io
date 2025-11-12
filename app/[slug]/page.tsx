import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getPostBySlug, getPostSlugs } from '@/lib/posts';

type PageProps = {
  params: { slug: string };
};

function formatDate(input?: string) {
  if (!input) {
    return null;
  }
  const date = new Date(input);
  return Number.isNaN(date.getTime()) ? null : date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export async function generateStaticParams() {
  const slugs = await getPostSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const post = await getPostBySlug(params.slug);
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

export default async function PostPage({ params }: PageProps) {
  const post = await getPostBySlug(params.slug);

  if (!post) {
    notFound();
  }

  return (
    <article className="post">
      <Link href="/" className="back-link">
        ← Back home
      </Link>
      <h1>{post.title}</h1>
      {post.date && <time dateTime={post.date}>{formatDate(post.date)}</time>}
      <div className="post-body" dangerouslySetInnerHTML={{ __html: post.content }} />
    </article>
  );
}
