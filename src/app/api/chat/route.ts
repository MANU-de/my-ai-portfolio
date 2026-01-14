import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge'; // Use Edge for speed

export async function POST(req: Request) {
  // Validate required environment variables early to avoid module init errors
  if (!process.env.OPENAI_API_KEY) {
    return new Response(JSON.stringify({ error: 'OPENAI_API_KEY is missing' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !/^https?:\/\//i.test(process.env.NEXT_PUBLIC_SUPABASE_URL)) {
    return new Response(JSON.stringify({ error: 'NEXT_PUBLIC_SUPABASE_URL is invalid' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return new Response(JSON.stringify({ error: 'NEXT_PUBLIC_SUPABASE_ANON_KEY is missing' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Create clients after env validation to avoid module initialization errors
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

  try {
    const { messages } = await req.json();
    const lastMessage = messages[messages.length - 1];

    // 1. Embed the user's latest query
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: lastMessage.content.replace(/\n/g, ' '),
    });
    const embedding = embeddingResponse.data[0].embedding;

    // 2. Retrieve relevant context from Supabase
    const { data: documents } = await supabase.rpc('match_documents', {
      query_embedding: embedding,
      match_threshold: 0.5, // Sensitivity
      match_count: 3, // Number of chunks to retrieve
    });

    // Ensure documents is an array and has consistent typing
    type Document = {
      content: string;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      [key: string]: any;
    };

    const contextText = Array.isArray(documents)
      ? documents.map((doc) => (doc as Document).content).join('\n\n')
      : '';

    // 3. Construct the System Prompt
    const systemPrompt = `
    You are an AI assistant for Manuela's Portfolio. 
    You act as a professional representative.
    Use the following pieces of context to answer the user's question.
    If the answer is not in the context, politely say you don't have that information.
    
    CONTEXT:
    ${contextText}
  `;

    // 4. Generate Response with OpenAI
    const response = await openai.chat.completions.create({
      model: 'gpt-4o', // or gpt-3.5-turbo
      stream: true,
      messages: [
        { role: 'system', content: systemPrompt },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...messages.filter((m: any) => m.role !== 'system'),
      ],
    });

    // 5. Stream back to client
    const stream = OpenAIStream(response);
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err: unknown) {
    // Provide a clearer JSON error for the frontend to display
    // eslint-disable-next-line no-console
    console.error('Chat API error', err);
    
    const error = err as { status?: number; code?: string; message?: string };
    
    // Handle quota exceeded errors gracefully
    if (error.status === 429 || error.code === 'insufficient_quota' || error.message?.includes('quota')) {
      return new Response(JSON.stringify({ 
        error: 'AI service is temporarily unavailable due to quota limits. Please try again later or contact the site administrator.' 
      }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    const message = error.message || String(err);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

function OpenAIStream(response: AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>) {
  // Convert OpenAI stream to a ReadableStream of Server-Sent Events
  const encoder = new TextEncoder();

  const readableStream = new ReadableStream({
    async start(controller) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for await (const chunk of response as any) {
          const content = chunk.choices?.[0]?.delta?.content;
          if (content !== undefined) {
            controller.enqueue(encoder.encode(`data: ${content}\n\n`));
          }
        }
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    }
  });

  return readableStream;
}

