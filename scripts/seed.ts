// Run via: npx tsx scripts/seed.ts
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Use service key to write
);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const portfolioData = [
  "My name is Manuela. I am a Full Stack Developer with 5 years of experience.",
  "I specialize in Agentic AI, AI/ML and Python AI integration. ",
  "Project Alpha: A fine-tuned language model for generating SQL queries from natural language questions. .",
  "Project Beta: A Production-Ready Multi-Agent System for Intelligent Crypto Market Sentiment Analysis",
  "I am currently open to freelance work and consulting roles.",
  "Contact me via LinkedIn."
];

async function seed() {
  console.log("Starting seed...");
  
  // Optional: Clear existing data
  // await supabase.from('documents').delete().neq('id', 0);

  for (const text of portfolioData) {
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });

    const embedding = embeddingResponse.data[0].embedding;

    const { error } = await supabase.from('documents').insert({
      content: text,
      embedding: embedding,
    });

    if (error) console.error('Error inserting:', error);
    else console.log(`Inserted: "${text.substring(0, 20)}..."`);
  }
  console.log("Seeding complete.");
}

seed();