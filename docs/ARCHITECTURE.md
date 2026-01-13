# Architecture Overview

This document provides a comprehensive technical overview of the AI Portfolio architecture, including system components, data flow, and key design decisions.

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client Layer                              │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │   Home      │  │   About     │  │  Portfolio  │              │
│  │   Page      │  │   Page      │  │    Page     │              │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘              │
│         │                │                │                      │
│         └────────────────┼────────────────┘                      │
│                          ▼                                       │
│              ┌───────────────────────┐                           │
│              │   ChatWidget (React)  │                           │
│              │   - Message history   │                           │
│              │   - Input handling    │                           │
│              │   - Streaming UI      │                           │
│              └───────────┬───────────┘                           │
└──────────────────────────┼───────────────────────────────────────┘
                           │ HTTPS (SSE)
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                       API Layer                                  │
├─────────────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  POST /api/chat                                            │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │  1. Extract last user message                        │  │  │
│  │  │  2. Create embedding via OpenAI                      │  │  │
│  │  │  3. Query Supabase for similar documents             │  │  │
│  │  │  4. Construct system prompt with context             │  │  │
│  │  │  5. Stream response from GPT-4o                      │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                           │
                           │ HTTPS
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                      External Services                           │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────┐    ┌──────────────────────┐          │
│  │      OpenAI          │    │      Supabase        │          │
│  │  ┌────────────────┐  │    │  ┌────────────────┐  │          │
│  │  │ Embeddings API │  │    │  │ PostgreSQL     │  │          │
│  │  │ (text-embedding│  │    │  │ + pgvector     │  │          │
│  │  │  3-small)      │  │    │  │                │  │          │
│  │  └────────────────┘  │    │  │ documents table │  │          │
│  │  ┌────────────────┐  │    │  └────────────────┘  │          │
│  │  │ Chat Completions│  │    │  ┌────────────────┐  │          │
│  │  │ API (GPT-4o)   │  │    │  │ match_documents│  │          │
│  │  └────────────────┘  │    │  │ function       │  │          │
│  └──────────────────────┘    │  └────────────────┘  │          │
│                              └──────────────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Frontend (React/Next.js)

The frontend is built with Next.js 16 using the App Router architecture.

#### Pages
- **Home (`/`)**: Landing page with profile photo, navigation, and AI chat widget
- **About (`/about`)**: Personal information and background
- **Portfolio (`/portfolio`)**: Showcase of projects and work
- **Contact (`/contact`)**: Contact information

#### ChatWidget Component

The `ChatWidget` is a floating, always-available chat interface that provides:

- **State Management**: Tracks messages, input state, and loading status
- **Streaming UI**: Displays AI responses as they are generated
- **SSE Processing**: Parses Server-Sent Events for real-time updates
- **Auto-scroll**: Automatically scrolls to new messages

```typescript
// Key component features
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  // ...
}
```

### 2. API Layer (Next.js Route Handlers)

The chat API is implemented as a Next.js Route Handler at `/api/chat`.

#### Request Flow

```
Client Request → Extract Messages → Create Embedding → Query Vector DB
     ↓                                                      ↓
  SSE Stream ◄─── Construct Prompt ◄─── Retrieve Context ◄──
```

#### Key Operations

1. **Message Extraction**: Extracts the user's last message from the request
2. **Embedding Generation**: Creates a 1536-dimensional vector using OpenAI's `text-embedding-3-small`
3. **Semantic Search**: Queries Supabase for similar documents using cosine similarity
4. **Prompt Construction**: Builds a system prompt with retrieved context
5. **Response Streaming**: Streams GPT-4o responses back to the client

### 3. Data Layer (Supabase + pgvector)

#### Database Schema

```sql
CREATE TABLE documents (
  id BIGSERIAL PRIMARY KEY,
  content TEXT NOT NULL,
  embedding VECTOR(1536)  -- 1536 dimensions for text-embedding-3-small
);
```

#### Similarity Search Function

```sql
CREATE OR REPLACE FUNCTION match_documents (
  query_embedding VECTOR(1536),
  match_threshold FLOAT,
  match_count INT
)
RETURNS TABLE (id BIGINT, content TEXT, similarity FLOAT)
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

The `<=>` operator is pgvector's cosine distance operator. Lower values indicate greater similarity.

### 4. AI Services (OpenAI)

#### Embeddings API
- **Model**: `text-embedding-3-small`
- **Dimensions**: 1536
- **Usage**: Converting user queries and portfolio content to vectors

#### Chat Completions API
- **Model**: `gpt-4o`
- **Streaming**: Enabled for real-time responses
- **Runtime**: Edge (for low latency)

## Data Flow

### User Query Flow

1. User types a question in the ChatWidget
2. Message is sent to `/api/chat` via POST request
3. Server creates embedding from the query
4. Server queries Supabase for similar documents
5. Retrieved documents are injected into the system prompt
6. OpenAI generates a response with context awareness
7. Response is streamed back to the client
8. ChatWidget displays the streaming response

### Seed Data Flow

1. Run `npx tsx scripts/seed.ts`
2. For each piece of content:
   a. Create embedding via OpenAI
   b. Insert content + embedding into Supabase
3. AI assistant now has knowledge base to query

## Technology Decisions

### Why These Technologies?

| Technology | Rationale |
|------------|-----------|
| Next.js 16 | Latest features, App Router, built-in API routes |
| React 19 | Latest React with improved concurrency |
| TypeScript | Type safety, better developer experience |
| Tailwind CSS 4 | Utility-first, rapid UI development |
| Supabase | Easy PostgreSQL + pgvector setup |
| OpenAI | Industry-leading LLM and embeddings |
| Vercel | Seamless Next.js deployment |

### RAG Implementation Details

**Why RAG?**
- Provides accurate, context-aware responses
- Allows easy updating of portfolio information
- Reduces hallucinations by grounding responses in known facts

**Retrieval Parameters**
- **Threshold**: 0.5 (50% similarity)
- **Max Results**: 3 documents
- **Embedding Model**: text-embedding-3-small (optimized for speed and cost)

**Prompt Engineering**
```
You are an AI assistant for [Name]'s Portfolio.
You act as a professional representative.
Use the following pieces of context to answer the user's question.
If the answer is not in the context, politely say you don't have that information.

CONTEXT:
[Retrieved documents]
```

## Security Considerations

- Environment variables for all API keys
- Supabase RLS policies can be added for production
- Edge runtime for reduced attack surface
- Input validation on API endpoints

## Performance Optimizations

1. **Edge Runtime**: API runs on Vercel Edge for low latency
2. **Streaming**: Responses stream as they're generated
3. **Efficient Embeddings**: Using text-embedding-3-small (smaller, faster, cheaper)
4. **Connection Pooling**: Supabase handles connection management

## Future Improvements

- Add authentication for admin content management
- Implement caching for frequent queries
- Add analytics for chat interactions
- Support for multiple languages
- Image-based queries with vision models

