import Link from 'next/link';
import { getAllPosts } from '@/lib/posts';

const bioParagraphs = [
  `Jason is a software engineer that works in Electronic Trading, focused on low-latency systems. He builds strategy optimizers that reduce execution costs and experiments with agents plus large-scale RAG infrastructure for a living.`,
  `Before selling his soul, he interned at Apple's SaLT as a machine learning engineer on Siri, worked on CV research, and built U-Net-based models for geospatial landcover prediction.`,
  `In his free time, he contributes to open source projects like LangChain and MLX.`
];

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
    <div className="space-y-10">
      <section className="space-y-4 text-base leading-relaxed text-slate-600">
        {bioParagraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </section>
      <section className="space-y-4">
        {posts.length === 0 ? (
          <p className="text-sm text-slate-500">
            No markdown files yet.
          </p>
        ) : (
          <ul className="divide-y divide-slate-200 space-y-6">
            {posts.map((post) => (
              <li key={post.slug}>
                <article className="space-y-2 pb-6">
                  <Link
                    href={`/${post.slug}`}
                    className="group inline-flex flex-col gap-1 text-slate-900 no-underline visited:text-slate-900"
                  >
                    <h2 className="text-xl font-semibold tracking-tight transition-colors group-hover:text-slate-600">
                      {post.title}
                    </h2>
                  </Link>
                  <div className="text-sm text-slate-500">
                    {post.date && <time dateTime={post.date}>{formatDate(post.date)}</time>}
                  </div>
                  {post.description && <p className="text-slate-600">{post.description}</p>}
                </article>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
