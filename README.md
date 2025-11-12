# Based Markdown Site

Barebones Next.js setup that turns Markdown files in `content/` into a fully static site.

## Getting started

```sh
npm install
npm run dev
```

Drop new `.md` files into `content/`. Each file can optionally include front matter:

```md
---
title: My Post
description: Optional summary
date: 2024-05-01
---

# Markdown goes here
```

Routes are generated automatically from the file name (`content/about.md` -> `/about`).

## Deploying

Run `npm run build` and deploy the `.next` output with any static hosting provider (Vercel, Netlify, etc.).
