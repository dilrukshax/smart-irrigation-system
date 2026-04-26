# Smart Irrigation Platform - Next.js Frontend

This directory contains a new frontend scaffold using **Next.js + TypeScript**.

The existing frontend in `/web` is still intact and unchanged.

## Stack

- Next.js 16 (App Router)
- TypeScript
- React 19
- ESLint

## Run Locally

```bash
cd web-next
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

Copy `.env.example` to `.env.local` and adjust values as needed:

```bash
cp .env.example .env.local
```

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1
```

## Scripts

- `npm run dev` - start development server
- `npm run build` - build production bundle
- `npm run start` - run production server
- `npm run lint` - run ESLint
