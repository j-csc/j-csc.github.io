import type { Metadata } from 'next';
import { Newsreader } from 'next/font/google';
import './globals.css';

const newsreader = Newsreader({
  subsets: ['latin'],
  variable: '--font-newsreader',
  display: 'swap'
});

export const metadata: Metadata = {
  title: 'Jason Chen',
  description: 'Jason Chen\'s personal website.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={newsreader.variable}>
      <body>
        <div className="site-shell">
          <header className="site-header">
            <p className="site-eyebrow"></p>
            <h1>Jason Chen</h1>
            <p>Jason is a Software Engineer working in Electronic Trading at Bloomberg.</p>
          </header>
          <main>{children}</main>
          <footer className="site-footer">
            <p>Drop a .md into <code>content/</code> to publish.</p>
          </footer>
        </div>
      </body>
    </html>
  );
}
