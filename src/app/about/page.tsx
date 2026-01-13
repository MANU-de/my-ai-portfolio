import Link from 'next/link';
import Image from 'next/image';

export default function About() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24 bg-black relative">
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
        <h1 className="text-4xl font-bold text-white mb-6">About</h1>
        <p className="mt-6 text-xl text-white">Learn more about me and my journey.</p>
      </div>
    </main>
  );
}



