# Deployment Guide

This guide provides step-by-step instructions for deploying the AI Portfolio to production environments.

## Deployment Options

| Platform | Difficulty | Recommended For |
|----------|------------|-----------------|
| Vercel | Easy | Next.js projects, quick deployment |
| Docker | Medium | Custom hosting, containerized environments |
| Manual | Advanced | Full server control |

## Prerequisites

Before deploying, ensure you have:

- [ ] OpenAI API key
- [ ] Supabase account with project created
- [ ] Git repository with your code
- [ ] Node.js 18.17+ for local testing

## Option 1: Deploy to Vercel (Recommended)

Vercel is the creators of Next.js and offers the easiest deployment experience.

### Step 1: Push to Git

```bash
git add .
git commit -m "Prepare for deployment"
git push origin main
```

### Step 2: Import to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click "Add New..." → "Project"
3. Import your Git repository
4. Configure the project settings (Vercel auto-detects Next.js)

### Step 3: Configure Environment Variables

In the Vercel dashboard:

1. Go to **Settings** → **Environment Variables**
2. Add the following variables:

| Name | Value | Environment |
|------|-------|-------------|
| `OPENAI_API_KEY` | `sk-...` | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxx.supabase.co` | All |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJ...` | All |

3. Click **Save**

### Step 4: Deploy

Vercel automatically deploys on push to main. To trigger manually:

1. Go to **Deployments**
2. Click **Deploy** on the latest commit
3. Wait for build and deployment to complete

### Step 5: Verify Deployment

Visit your Vercel URL (e.g., `https://my-ai-portfolio.vercel.app`) and verify:

- [ ] Pages load correctly
- [ ] Chat widget is visible
- [ ] AI responses work (if Supabase is seeded)

## Option 2: Deploy with Docker

### Step 1: Create Dockerfile

Create a `Dockerfile` in the root directory:

```dockerfile
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app
ENV NODE_ENV production

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
ENV PORT 3000

CMD ["node", "server.js"]
```

### Step 2: Update Next.js Config for Standalone

Modify `next.config.ts`:

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  output: 'standalone',  // Add this line
};

export default nextConfig;
```

### Step 3: Build and Run

```bash
# Build the Docker image
docker build -t ai-portfolio .

# Run the container
docker run -p 3000:3000 \
  -e OPENAI_API_KEY=sk-... \
  -e NEXT_PUBLIC_SUPABASE_URL=https://... \
  -e NEXT_PUBLIC_SUPABASE_ANON_KEY=... \
  ai-portfolio
```

### Step 4: Deploy to Container Service

Push to a container registry and deploy to:

- **AWS ECS**
- **Google Cloud Run**
- **Azure Container Apps**
- **DigitalOcean App Platform**

## Supabase Setup for Production

### Step 1: Enable pgvector

In Supabase SQL Editor, run:

```sql
-- Enable the pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;
```

### Step 2: Create Documents Table

```sql
-- Create the documents table for RAG
CREATE TABLE documents (
  id BIGSERIAL PRIMARY KEY,
  content TEXT NOT NULL,
  embedding VECTOR(1536)
);

-- Create index for faster similarity search
CREATE INDEX ON documents USING ivfflat (embedding vector_cosine_ops);
```

### Step 3: Create Match Function

```sql
-- Create the match_documents function for semantic search
CREATE OR REPLACE FUNCTION match_documents (
  query_embedding VECTOR(1536),
  match_threshold FLOAT,
  match_count INT
)
RETURNS TABLE (
  id BIGINT,
  content TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    documents.id,
    documents.content,
    1 - (documents.embedding <=> query_embedding) AS similarity
  FROM documents
  WHERE 1 - (documents.embedding <=> query_embedding) > match_threshold
  ORDER BY documents.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

### Step 4: Seed the Database

Run the seed script to populate initial content:

```bash
npx tsx scripts/seed.ts
```

> **Note:** For production, set `SUPABASE_SERVICE_ROLE_KEY` in your environment to run the seed script.

### Step 5: Secure the Database

Enable Row Level Security (RLS) for additional security:

```sql
-- Enable RLS
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Create policy (adjust based on your needs)
CREATE POLICY "Enable read access for all users" 
ON documents FOR SELECT TO anon USING (true);
```

## Environment-Specific Configurations

### Development

```env
OPENAI_API_KEY=sk-dev-key
NEXT_PUBLIC_SUPABASE_URL=https://dev.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=dev-anon-key
SUPABASE_SERVICE_ROLE_KEY=dev-service-key
```

### Production

```env
OPENAI_API_KEY=sk-prod-key
NEXT_PUBLIC_SUPABASE_URL=https://prod.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=prod-anon-key
```

## Monitoring & Troubleshooting

### Vercel Analytics

Enable Vercel Analytics in the dashboard for performance insights.

### OpenAI Usage

Monitor your OpenAI API usage at [platform.openai.com/usage](https://platform.openai.com/usage).

### Common Issues

#### Chat not working

1. Check browser console for errors
2. Verify environment variables are set
3. Confirm Supabase is seeded with data
4. Check OpenAI API key is valid

#### Slow responses

1. Check OpenAI API status
2. Consider using a faster embedding model
3. Reduce similarity threshold or match count

#### Build failures

1. Ensure Node.js version is 18.17+
2. Clear `.next` cache: `rm -rf .next`
3. Reinstall dependencies: `rm -node_modules && npm install`

### Logs

#### Vercel

View logs in Vercel Dashboard → **Deployments** → **Functions**

#### Docker

```bash
docker logs <container-id>
```

## CI/CD Pipeline Example

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Vercel

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Install Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          
      - name: Install dependencies
        run: npm ci
        
      - name: Build
        run: npm run build
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}
          
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

## Security Checklist

- [ ] Use environment variables for all secrets
- [ ] Enable RLS on Supabase tables
- [ ] Rotate API keys periodically
- [ ] Set up monitoring for unusual activity
- [ ] Use Vercel Edge Functions for reduced latency
- [ ] Implement rate limiting for production

## Post-Deployment

1. Test all pages and functionality
2. Verify AI chat responses
3. Set up custom domain (optional)
4. Configure SSL certificate
5. Enable CDN caching

