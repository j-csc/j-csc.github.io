import Link from 'next/link';
import { getAllPosts, type PostMeta } from '@/lib/posts';

const bioParagraphs = [
  `Jason is a software engineer that works in Electronic Trading, focused on low-latency systems. He builds strategy optimizers that reduce execution costs and experiments with agents plus large-scale RAG infrastructure for a living.`,
  `Before working in the trading space, he interned at Apple's SaLT as a machine learning engineer on Siri, worked on CV research, and built U-Net-based models for geospatial landcover prediction.`,
  `In his free time, he contributes to open source projects like LangChain and MLX.`
];

function formatDate(input?: string) {
  if (!input) {
    return null;
  }
  const date = new Date(input);
  return Number.isNaN(date.getTime()) ? null : date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

const ROOT_SECTION_KEY = '__root__';

function formatSectionHeading(folderSegments: string[]) {
  if (folderSegments.length === 0) {
    return 'General';
  }

  return folderSegments
    .map((segment) => segment.replace(/[-_]/g, ' '))
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' / ');
}

function groupPostsByFolder(posts: PostMeta[]) {
  const grouped = new Map<string, { headingSegments: string[]; posts: PostMeta[] }>();

  posts.forEach((post) => {
    const headingSegments = post.segments.slice(0, -1);
    const key = headingSegments.length === 0 ? ROOT_SECTION_KEY : headingSegments.join('/');
    const existing = grouped.get(key);

    if (existing) {
      existing.posts.push(post);
      return;
    }

    grouped.set(key, { headingSegments, posts: [post] });
  });

  return Array.from(grouped.entries())
    .sort(([aKey], [bKey]) => {
      if (aKey === ROOT_SECTION_KEY) {
        return -1;
      }
      if (bKey === ROOT_SECTION_KEY) {
        return 1;
      }
      return aKey.localeCompare(bKey);
    })
    .map(([key, value]) => ({
      key,
      heading: formatSectionHeading(value.headingSegments),
      posts: value.posts
    }));
}

export default async function HomePage() {
  const posts = await getAllPosts();
  const sections = groupPostsByFolder(posts);

  return (
    <div className="space-y-10">
      <section className="space-y-4 text-base leading-relaxed text-slate-600">
        {bioParagraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </section>
      <section className="space-y-8">
        {posts.length === 0 ? (
          <p className="text-sm text-slate-500">No markdown files yet.</p>
        ) : (
          sections.map((section) => (
            <div key={section.key} className="space-y-4">
              <h2 className="text-base font-semibold tracking-wide text-slate-500">
                {section.key === ROOT_SECTION_KEY ? 'General' : section.heading}
              </h2>
              <ul className="divide-y divide-slate-200 space-y-6">
                {section.posts.map((post) => (
                  <li key={post.slug}>
                    <article className="space-y-2 pb-6">
                      <Link
                        href={`/${post.slug}`}
                        className="group inline-flex flex-col gap-1 text-slate-900 no-underline visited:text-slate-900"
                      >
                        <h3 className="text-xl font-semibold tracking-tight transition-colors group-hover:text-slate-600">
                          {post.title}
                        </h3>
                      </Link>
                      <div className="text-sm text-slate-500">
                        {post.date && <time dateTime={post.date}>{formatDate(post.date)}</time>}
                      </div>
                      {post.description && <p className="text-slate-600">{post.description}</p>}
                    </article>
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
