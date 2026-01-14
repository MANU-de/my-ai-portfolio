*Note: This project is proprietary. Please see the [LICENSE]() LICENSE file for usage restrictions.*

# AI Portfolio

A modern, AI-powered personal portfolio website built with Next.js 16, React 19, and TypeScript. This project features an intelligent AI chat assistant that answers questions about the portfolio owner using Retrieval Augmented Generation (RAG).


## Features

- 🤖 **AI Chat Assistant** - Interactive chat widget powered by OpenAI and RAG
- 📄 **Multi-page Layout** - Home, About, Portfolio, and Contact pages
- 🎨 **Modern Design** - Sleek dark theme with responsive UI
- ⚡ **Streaming Responses** - Real-time AI response streaming
- 🔍 **Semantic Search** - Context-aware answers using vector embeddings

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS 4 |
| AI | OpenAI (GPT-4o, text-embedding-3-small) |
| Database | Supabase (PostgreSQL + pgvector) |
| Icons | Lucide React |
| Fonts | Geist Sans, Geist Mono, Smooch Sans |

## Project Structure

```
my-ai-portfolio/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── chat/
│   │   │       └── route.ts      # Chat API endpoint
│   │   ├── about/
│   │   │   └── page.tsx          # About page
│   │   ├── contact/
│   │   │   └── page.tsx          # Contact page
│   │   ├── portfolio/
│   │   │   └── page.tsx          # Portfolio page
│   │   ├── layout.tsx            # Root layout
│   │   ├── page.tsx              # Home page
│   │   └── globals.css           # Global styles
│   ├── components/
│   │   └── ChatWidget.tsx        # AI chat widget component
│   └── ...
├── scripts/
│   └── seed.ts                   # Database seeding script
├── docs/                         # Documentation
├── public/                       # Static assets
├── package.json
├── next.config.ts
├── tsconfig.json
└── tailwind.config.ts
```

## Getting Started

### Prerequisites

- Node.js 18.17 or later
- npm, yarn, pnpm, or bun
- OpenAI API key
- Supabase account (with pgvector extension)

### Installation

1. **Clone the repository**

```bash
git clone <repository-url>
cd my-ai-portfolio
```

2. **Install dependencies**

```bash
npm install
# or
yarn install
# or
pnpm install
# or
bun install
```

3. **Configure environment variables**

Create a `.env` file in the root directory:

```env
# OpenAI
OPENAI_API_KEY=sk-your-openai-api-key

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

4. **Set up Supabase**

   a. Create a new Supabase project at [supabase.com](https://supabase.com)

   b. Enable the pgvector extension in the Supabase SQL editor:

   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```

   c. Create a documents table:

   ```sql
   CREATE TABLE documents (
     id BIGSERIAL PRIMARY KEY,
     content TEXT NOT NULL,
     embedding VECTOR(1536)
   );
   ```

   d. Create a function for similarity search:

   ```sql
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

5. **Seed the knowledge base**

```bash
npx tsx scripts/seed.ts
```

This will populate the database with portfolio information that the AI assistant can use to answer questions.

6. **Run the development server**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the portfolio.

## Usage

### Chat Widget

The AI chat widget is available on all pages. Click the chat icon in the bottom-right corner to open it. You can ask questions like:

- "What is Manuela's experience?"
- "What projects has Manuela worked on?"
- "How can I contact Manuela?"
- "What are Manuela's technical skills?"

### Customizing Content

To update the information the AI assistant knows about you, edit the `portfolioData` array in `scripts/seed.ts` and run the seed script again:

```bash
npx tsx scripts/seed.ts
```

## API Reference

### Chat API

**Endpoint:** `POST /api/chat`

**Request Body:**
```json
{
  "messages": [
    {
      "id": "1",
      "role": "user",
      "content": "What is Manuela's experience?"
    }
  ]
}
```

**Response:** Server-Sent Events (SSE) stream

See [docs/API.md](docs/API.md) for detailed API documentation.

## Deployment

### Vercel (Recommended)

1. Push your code to a Git repository
2. Import the project in [Vercel](https://vercel.com)
3. Add environment variables in the Vercel dashboard
4. Deploy

### Supabase Setup

Ensure your Supabase project is configured with:
- pgvector extension enabled
- documents table created
- match_documents function created

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for detailed deployment instructions.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npx tsx scripts/seed.ts` | Seed the knowledge base |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | Yes | Your OpenAI API key |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Your Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes* | Supabase service role key (for seeding) |

*Required only for running the seed script

## Documentation

- [Architecture Overview](docs/ARCHITECTURE.md)
- [API Documentation](docs/API.md)
- [Deployment Guide](docs/DEPLOYMENT.md)

## License

This project is private and proprietary.

## Acknowledgments

- [Next.js](https://nextjs.org/)
- [OpenAI](https://openai.com/)
- [Supabase](https://supabase.com/)
- [Tailwind CSS](https://tailwindcss.com/)

