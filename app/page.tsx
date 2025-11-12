import Link from 'next/link';
import { getAllPosts } from '@/lib/posts';

function formatDate(input?: string) {
  if (!input) {
    return null;
  }
  const date = new Date(input);
  return Number.isNaN(date.getTime()) ? null : date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export default async function HomePage() {
  const posts = await getAllPosts();

  return (
    <section className="stack">
      {posts.length === 0 ? (
        <p className="muted">No markdown files yet. Add one under <code>content/</code>.</p>
      ) : (
        <ul className="post-list">
          {posts.map((post) => (
            <li key={post.slug}>
              <Link href={`/${post.slug}`}>
                <h2>{post.title}</h2>
              </Link>
              <div className="post-meta">
                {post.date && <time dateTime={post.date}>{formatDate(post.date)}</time>}
              </div>
              {post.description && <p>{post.description}</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
