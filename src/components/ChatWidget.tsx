/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send } from 'lucide-react';

import type { FormEvent, JSXElementConstructor, Key, ReactElement, ReactNode, ReactPortal } from 'react';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage: Message = {
      id: `${Date.now()}-user`,
      role: 'user',
      content: input,
    };

    // Append user message locally
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setInput('');

    try {
      const payload = { messages: [...messages, userMessage] };
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const contentType = res.headers.get('content-type') || '';
        let errorText = 'API error';
        if (contentType.includes('application/json')) {
          try {
            const data = await res.json();
            errorText = data?.error ?? JSON.stringify(data);
          } catch (e) {
            errorText = await res.text();
          }
        } else {
          errorText = await res.text();
        }

        setMessages((prev) => [
          ...prev,
          { id: `${Date.now()}-ai`, role: 'assistant', content: `Error: ${errorText}` },
        ]);
        setIsLoading(false);
        return;
      }

      if (!res.body) {
        setIsLoading(false);
        return;
      }

      // Create an empty assistant message to fill while streaming
      const assistantId = `${Date.now()}-ai`;
      setMessages((prev) => [...prev, { id: assistantId, role: 'assistant', content: '' }]);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // SSE-style chunks separated by double newline
        const parts = buffer.split(/\n\n/);
        buffer = parts.pop() || '';

        for (const part of parts) {
          const m = part.match(/^data:\s?([\s\S]*)$/);
          if (m && m[1]) {
            const chunk = m[1];
            setMessages((prev) =>
              prev.map((msg) => (msg.id === assistantId ? { ...msg, content: (msg.content ?? '') + chunk } : msg))
            );
          }
        }
      }

      setIsLoading(false);
    } catch (err) {
      // on error, append an error message
      // eslint-disable-next-line no-console
      console.error('Chat error', err);
      setMessages((prev) => [
        ...prev,
        { id: `${Date.now()}-ai-error`, role: 'assistant', content: 'Error contacting API' },
      ]);
      setIsLoading(false);
    }
  };

  return {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
  };
}

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {/* Chat Window */}
      {isOpen && (
        <div className="mb-4 w-[350px] h-[500px] bg-white border border-gray-200 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
            <h3 className="font-semibold text-sm">Ask my AI Assistant</h3>
            <button onClick={() => setIsOpen(false)} className="hover:text-gray-300">
              <X size={18} />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 bg-gray-50 space-y-4">
            {messages.length === 0 && (
              <p className="text-sm text-gray-500 text-center mt-10">
                Hi! Ask me about Manuelas projects, skills, or experience.
              </p>
            )}
            {messages.map((m: { id: Key | null | undefined; role: string; content: string | number | bigint | boolean | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | ReactPortal | Promise<string | number | bigint | boolean | ReactPortal | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | null | undefined> | null | undefined; }) => (
              <div
                key={m.id}
                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 text-sm ${
                    m.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white border border-gray-200 text-gray-800'
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {isLoading && <div className="text-xs text-gray-400">Thinking...</div>}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <form onSubmit={handleSubmit} className="p-3 bg-white border-t flex gap-2">
            <input
              className="flex-1 border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
              value={input}
              placeholder="Type your question..."
              onChange={handleInputChange}
            />
            <button
              type="submit"
              className="bg-slate-900 text-white p-2 rounded-md hover:bg-slate-700 transition"
              disabled={isLoading}
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      )}

      {/* Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-lg transition-all transform hover:scale-105"
        >
          <MessageCircle size={24} />
        </button>
      )}
    </div>
  );
}

