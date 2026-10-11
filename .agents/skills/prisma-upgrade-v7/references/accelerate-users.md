# Prisma Accelerate Users

Special migration instructions for Prisma Accelerate users and supported Prisma Postgres workflows using `prisma://` or `prisma+postgres://` URLs.

## Important

Hosted Accelerate connections using `prisma://` or `prisma+postgres://`
URLs are scheduled to retire on December 1, 2026. Plan to move application
connections to pooled TCP or the supported Prisma serverless driver.
For standard Node.js apps, use a pooled PostgreSQL TCP connection with
`@prisma/adapter-pg` and `pg`; for supported serverless deployments, use
`@prisma/adapter-ppg` with `@prisma/ppg`. Keep a direct database URL
configured for Prisma Migrate and introspection.

**Do NOT pass Accelerate URLs to driver adapters.**

Driver adapters (like `PrismaPg`) expect direct database connection strings. They will fail with `prisma://` or `prisma+postgres://` URLs.

## Correct v7 Setup for Accelerate

### 1. Keep your Accelerate URL

```env
# .env
DATABASE_URL="prisma://accelerate.prisma-data.net/?api_key=..."  # Accelerate
# For the supported Prisma Postgres workflow only:
# DATABASE_URL="prisma+postgres://..."
```

### 2. Install Accelerate extension

```bash
npm install @prisma/extension-accelerate
```

### 3. Configure prisma.config.ts

```typescript
import 'dotenv/config'
import { defineConfig, env } from 'prisma/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: env('DIRECT_DATABASE_URL'),  // Direct URL for CLI migrations and introspection
  },
})
```

### 4. Instantiate client with accelerateUrl

```typescript
import { PrismaClient } from '../generated/client'
import { withAccelerate } from '@prisma/extension-accelerate'

// Use accelerateUrl instead of adapter
export const prisma = new PrismaClient({
  accelerateUrl: process.env.DATABASE_URL,  // prisma:// for Accelerate; prisma+postgres:// only for supported Prisma Postgres workflow
}).$extends(withAccelerate())
```

## What NOT to Do

```typescript
// ❌ WRONG - Don't use adapter with Accelerate URL
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL  // This will fail with prisma://
})
```

## Migrations with Accelerate

`prisma://` URLs cannot be used with Prisma Migrate or introspection. Configure
a direct database URL in `prisma.config.ts` for those workflows. The
`prisma+postgres://` URL is supported only in the documented Prisma Postgres
workflow; do not assume it works for other Accelerate workflows or CLI
commands.

```env
DATABASE_URL="prisma://..."  # For the application while still using Accelerate
DIRECT_DATABASE_URL="postgresql://..."  # Direct database connection for CLI workflows
```

```typescript
// prisma.config.ts
export default defineConfig({
  datasource: {
    url: env('DIRECT_DATABASE_URL'),
  },
})
```

## Prisma Postgres (Cloud)

If using Prisma Postgres cloud database:

### Supported Prisma Postgres workflow

```typescript
import { PrismaClient } from '../generated/client'
import { withAccelerate } from '@prisma/extension-accelerate'

export const prisma = new PrismaClient({
  accelerateUrl: process.env.DATABASE_URL,  // prisma+postgres:// in the Prisma Postgres workflow
}).$extends(withAccelerate())
```

## Switching Away from Accelerate

If you later switch to direct TCP connection:

```typescript
// Change from accelerateUrl to adapter
import { PrismaClient } from '../generated/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL  // Direct postgres:// URL
})

export const prisma = new PrismaClient({ adapter })
```

## Caching with Accelerate

The extension enables caching:

```typescript
const users = await prisma.user.findMany({
  cacheStrategy: {
    ttl: 60,  // Cache for 60 seconds
    swr: 120, // Stale-while-revalidate for 120 seconds
  },
})
```

## Edge Runtime

Accelerate works great in edge runtimes:

```typescript
// Works in Vercel Edge, Cloudflare Workers, etc.
import { PrismaClient } from '../generated/client'
import { withAccelerate } from '@prisma/extension-accelerate'

export const prisma = new PrismaClient({
  accelerateUrl: process.env.DATABASE_URL,
}).$extends(withAccelerate())
```
