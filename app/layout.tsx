import type { Metadata } from 'next';
import localFont from 'next/font/local';
import Script from 'next/script';
import './globals.css';
import 'katex/dist/katex.min.css';

const newsreader = localFont({
  src: [
    {
      path: './fonts/Newsreader.woff2',
      weight: '200 800',
      style: 'normal'
    },
    {
      path: './fonts/Newsreader-italic.woff2',
      weight: '200 800',
      style: 'italic'
    }
  ],
  display: 'swap'
});

const socialLinks = [
  { label: 'GitHub', href: 'https://github.com/j-csc' },
  { label: 'X', href: 'https://x.com/jason_cs1' }
];

export const metadata: Metadata = {
  title: 'Jason',
  description: "Jason's personal website.",
  icons: {
    icon: '/favicon.svg'
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${newsreader.className} bg-white leading-relaxed text-slate-900 antialiased`}>
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-EW9XQZESS2"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-EW9XQZESS2');
          `}
        </Script>
        <div className="mx-auto flex min-h-screen max-w-2xl flex-col px-5 pb-16 pt-12 sm:px-6 lg:px-0">
          <header className="flex flex-col gap-3">
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Jason</h1>
          </header>
          <main className="flex-1 py-8">{children}</main>
          <footer className="border-t border-slate-200 pt-6 text-sm text-slate-500">
            <span className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p>
              Views are my own.
              </p>
              <ul className="flex flex-wrap gap-4 text-sm text-slate-600">
                {socialLinks.map((link) => (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noreferrer"
                      className="transition hover:text-slate-800"
                      aria-label={link.label}
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </span>
          </footer>
        </div>
      </body>
    </html>
  );
}
