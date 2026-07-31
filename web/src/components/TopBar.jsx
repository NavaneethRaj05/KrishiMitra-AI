import { Menu, Sprout } from 'lucide-react';

export default function TopBar({ onMenuToggle, isOnline, threadCount }) {
  return (
    <header className="sticky top-0 z-40 bg-bg/85 backdrop-blur-md border-b border-border-subtle md:hidden select-none">
      <div className="px-4 h-14 flex items-center justify-between">
        {/* Left — Menu Hamburger & Brand */}
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuToggle}
            className="p-2 hover:bg-bg-hover rounded-xl text-text-secondary hover:text-text-primary active:scale-95 transition-all"
            title="Open Menu"
          >
            <Menu size={20} />
          </button>
          
          <div className="flex items-center gap-2">
            <div className="w-6.5 h-6.5 rounded-lg bg-accent flex items-center justify-center">
              <Sprout size={13} className="text-bg" />
            </div>
            <span className="text-xs font-bold text-text-primary tracking-tight">KrishiMitraAI</span>
          </div>
        </div>

        {/* Right — Connection Dot */}
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${
            isOnline ? 'bg-accent shadow-lg shadow-accent/55' : 'bg-warning animate-pulse'
          }`} />
          <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">
            {isOnline ? 'Online' : 'Offline'}
          </span>
        </div>
      </div>
    </header>
  );
}

