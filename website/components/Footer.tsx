"use client";

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-black">
      <div className="mx-auto px-6 py-12 md:flex md:items-center md:justify-between lg:px-8">
        <div className="flex justify-center space-x-4 md:order-2">
          <a
            href="/docs"
            className="text-sm text-gray-300 hover:text-white transition-colors px-3 py-2 min-h-[44px] flex items-center"
          >
            Documentation
          </a>
          <a
            href="https://github.com/n3wth/r3call"
            className="text-sm text-gray-300 hover:text-white transition-colors px-3 py-2 min-h-[44px] flex items-center"
          >
            GitHub
          </a>
          <a
            href="https://www.npmjs.com/package/@n3wth/recall"
            className="text-sm text-gray-300 hover:text-white transition-colors px-3 py-2 min-h-[44px] flex items-center"
          >
            NPM
          </a>
        </div>
        <div className="mt-8 md:order-1 md:mt-0">
          <p className="text-center text-sm text-gray-400">
            &copy; 2025{" "}
            <a
              href="https://newth.ai"
              className="hover:text-white transition-colors"
            >
              Oliver Newth
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
