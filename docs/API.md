# API Documentation

This document describes the API endpoints available in the AI Portfolio application.

## Chat API

### Endpoint

```
POST /api/chat
```

### Description

Handles chat interactions with the AI assistant. This endpoint implements a complete RAG (Retrieval Augmented Generation) pipeline:

1. Receives user messages
2. Creates semantic embeddings for the query
3. Retrieves relevant context from Supabase
4. Constructs a prompt with context
5. Streams AI responses back to the client

### Request Headers

| Header | Value | Required |
|--------|-------|----------|
| Content-Type | application/json | Yes |
| Authorization | Bearer (optional) | No |

### Request Body

```json
{
  "messages": [
    {
      "id": "string",
      "role": "user" | "assistant" | "system",
      "content": "string"
    }
  ]
}
```

#### Body Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| messages | Array | Yes | Array of message objects representing the conversation history |
| messages[].id | string | Yes | Unique identifier for the message |
| messages[].role | string | Yes | Role of the message sender: `user`, `assistant`, or `system` |
| messages[].content | string | Yes | The message content |

#### Example Request

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {
        "id": "1",
        "role": "user",
        "content": "What is Manuela experience?"
      }
    ]
  }'
```

### Response

#### Success Response

**Status Code:** `200 OK`

**Content Type:** `text/event-stream` (Server-Sent Events)

The response is streamed as Server-Sent Events. Each chunk contains:

```
data: <content-chunk>\n\n
```

#### Example Stream

```
data: Manuela is a\n\n
data: Full Stack Developer\n\n
data: with 5 years of experience.\n\n
data: She specializes\n\n
data: in Agentic AI and\n\n
data: Python AI integration.\n\n
```

#### Error Response

**Status Code:** `400 Bad Request` | `500 Internal Server Error`

**Content Type:** `application/json`

```json
{
  "error": "Error message describing what went wrong"
}
```

### Processing Pipeline

#### Step 1: Message Extraction

```typescript
const { messages } = await req.json();
const lastMessage = messages[messages.length - 1];
```

The last message from the user is extracted for embedding generation.

#### Step 2: Embedding Generation

```typescript
const embeddingResponse = await openai.embeddings.create({
  model: 'text-embedding-3-small',
  input: lastMessage.content.replace(/\n/g, ' '),
});
const embedding = embeddingResponse.data[0].embedding;
```

The user's query is converted to a 1536-dimensional vector using OpenAI's `text-embedding-3-small` model.

#### Step 3: Context Retrieval

```typescript
const { data: documents } = await supabase.rpc('match_documents', {
  query_embedding: embedding,
  match_threshold: 0.5,
  match_count: 3,
});
```

Supabase pgvector performs cosine similarity search to find the most relevant documents.

#### Step 4: Prompt Construction

```typescript
const systemPrompt = `
You are an AI assistant for Manuela's Portfolio. 
You act as a professional representative.
Use the following pieces of context to answer the user's question.
If the answer is not in the context, politely say you don't have that information.

CONTEXT:
${contextText}
`;
```

The system prompt includes retrieved context to ground responses in facts.

#### Step 5: Response Streaming

```typescript
const response = await openai.chat.completions.create({
  model: 'gpt-4o',
  stream: true,
  messages: [
    { role: 'system', content: systemPrompt },
    ...messages.filter((m) => m.role !== 'system'),
  ],
});
```

GPT-4o generates a response that is streamed back to the client.

### Response Headers

| Header | Value | Description |
|--------|-------|-------------|
| Content-Type | text/event-stream | Indicates SSE format |
| Cache-Control | no-cache | Prevents caching |
| Connection | keep-alive | Maintains connection |
| Access-Control-Allow-Origin | * | CORS support |

### Error Handling

The endpoint handles several types of errors:

1. **Invalid Request**: Missing or malformed JSON body
2. **API Errors**: OpenAI API failures
3. **Database Errors**: Supabase query failures
4. **Streaming Errors**: Failures during response streaming

All errors return a JSON response with an `error` field describing the issue.

### Usage Example

#### JavaScript/TypeScript

```typescript
async function chatWithAI(messageHistory) {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: messageHistory }),
  });

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  
  while (reader) {
    const { done, value } = await reader.read();
    if (done) break;
    
    const chunk = decoder.decode(value);
    const lines = chunk.split('\n\n');
    
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const content = line.slice(6);
        process.stdout.write(content);
      }
    }
  }
}
```

#### Python

```python
import requests

def stream_chat(messages):
    response = requests.post(
        'http://localhost:3000/api/chat',
        json={'messages': messages},
        stream=True
    )
    
    for line in response.iter_lines():
        if line.startswith(b'data: '):
            content = line[6:].decode('utf-8')
            print(content, end='', flush=True)
```

### Rate Limiting

This implementation does not include built-in rate limiting. For production use, consider:

- Vercel Edge Functions rate limiting
- Upstash Redis for distributed rate limiting
- Supabase edge functions with rate limiting

### Related Files

- **Source**: [`src/app/api/chat/route.ts`](../src/app/api/chat/route.ts)
- **Frontend Component**: [`src/components/ChatWidget.tsx`](../src/components/ChatWidget.tsx)
- **Seed Script**: [`scripts/seed.ts`](../scripts/seed.ts)

