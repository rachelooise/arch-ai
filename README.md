This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

Realtime collaboration requires `LIVEBLOCKS_SECRET_KEY` in `.env.local` (and in
the deployment environment). Obtain a secret key from the Liveblocks dashboard;
keep it server-only. `POST /api/liveblocks-auth` accepts `{ "room": "<project-id>" }`
and issues a room-scoped session after checking Clerk authentication and project
access. Rooms are created privately on first authorized access and reused thereafter.

Run `npm run test:liveblocks` to verify the authentication and client setup with
mocked service boundaries.

Canvas autosave requires a **private Vercel Blob store** and its server-only
`BLOB_READ_WRITE_TOKEN` in `.env.local` and the deployment environment. See
[Vercel private Blob storage](https://vercel.com/docs/vercel-blob/private-storage).
Prisma's existing `Project.canvasJsonPath` stores the blob URL; the JSON itself
stays in Blob. The editor restores a snapshot only into an empty Liveblocks room,
debounces subsequent saves, and exposes save/retry status in the workspace navbar.

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
# arch-ai
# arch-ai
