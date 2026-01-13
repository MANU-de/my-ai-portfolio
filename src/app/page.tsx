import ChatWidget from '@/components/ChatWidget';
import Image from 'next/image';
import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24 bg-black relative" style={{ fontFamily: 'var(--font-smooch-sans)' }}>
      {/* Navigation in upper left corner */}
      <nav className="absolute top-6 left-6 z-20">
        <ul className="flex gap-6 text-white">
          <li>
            <Link href="/portfolio" className="hover:text-gray-300 transition-colors">
              Portfolio
            </Link>
          </li>
          <li>
            <Link href="/about" className="hover:text-gray-300 transition-colors">
              About
            </Link>
          </li>
          <li>
            <Link href="/contact" className="hover:text-gray-300 transition-colors">
              Contact
            </Link>
          </li>
        </ul>
      </nav>

      {/* Logo in upper right corner */}
      <div className="absolute top-6 right-6 z-20">
        <Link href="/" className="block">
          <Image
            src="/neuralstackms_logo1.jpg"
            alt="Logo"
            width={80}
            height={80}
            className="object-contain hover:opacity-80 transition-opacity"
          />
        </Link>
      </div>
      <div className="z-10 max-w-5xl w-full items-center justify-center font-mono text-sm flex flex-col">
        <h1 className="text-4xl font-bold text-white mb-6">Welcome to My Portfolio</h1>
        <div className="my-6">
          <Image
            src="/-5884509876388563802_121.jpg"
            alt="Profile Photo"
            width={300}
            height={300}
            className="object-cover rounded-full"
          />
        </div>
        <p className="mt-6 text-xl text-white">I am a Full Stack AI Developer -  building the Future.</p>
      </div>
      <ChatWidget />
    </main>
  );
}

