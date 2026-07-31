import { Sprout, Plus, Wifi, WifiOff, Settings, Menu, X, Home, Calendar, TrendingUp, CloudRain } from 'lucide-react';
import LanguageSelector from './LanguageSelector';
import { translate } from '../utils/translations';

export default function Sidebar({
  isOpen,
  onClose,
  lang,
  onLangChange,
  isOnline,
  onNewThread,
  onOpenSettings,
  activeNav,
  onNavChange,
  profile
}) {
  const navItems = [
    { key: 'home', label: 'Home / Ask', icon: Home },
    { key: 'calendar', label: 'Crop Calendar', icon: Calendar },
  ];

  return (
    <>
      {/* Sidebar container */}
      <aside className={`fixed inset-y-0 left-0 z-50 flex flex-col w-64 glass-sidebar border-r border-border/80 transition-transform duration-300 md:translate-x-0 md:static ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        {/* Sidebar Header */}
        <div className="flex items-center justify-between px-5 h-16 border-b border-border/40">
          <div className="flex items-center gap-2.5 select-none">
            <div className="w-8 h-8 rounded-xl bg-accent flex items-center justify-center shadow-lg shadow-accent/10">
              <Sprout size={18} className="text-bg font-bold" />
            </div>
            <span className="text-sm font-bold text-text-primary tracking-tight">KrishiMitraAI</span>
          </div>
          {/* Close button for mobile drawer */}
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-bg-hover rounded-lg text-text-tertiary hover:text-text-primary md:hidden transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Action button */}
        <div className="px-4 py-4">
          <button
            onClick={() => {
              onNewThread();
              onNavChange('home');
              onClose();
            }}
            className="w-full flex items-center justify-center gap-2 bg-accent hover:bg-accent-hover text-bg text-xs font-semibold py-2.5 px-4 rounded-xl shadow-lg shadow-accent/15 active:scale-95 transition-all"
          >
            <Plus size={15} strokeWidth={2.5} />
            <span>New Thread</span>
          </button>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeNav === item.key;
            return (
              <button
                key={item.key}
                onClick={() => {
                  onNavChange(item.key);
                  onClose();
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-accent-muted text-accent-text'
                    : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
                }`}
              >
                <Icon size={16} className={isActive ? 'text-accent' : 'text-text-tertiary'} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Bottom Panel */}
        <div className="p-4 border-t border-border/40 bg-bg-elevated/40 space-y-3.5">
          {/* Connection status */}
          <div className="flex items-center justify-between px-2.5 py-2 rounded-xl bg-bg/50 border border-border-subtle">
            <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">System</span>
            <div className={`flex items-center gap-1.5 text-[10px] font-bold ${
              isOnline ? 'text-accent-text' : 'text-warning'
            }`}>
              {isOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
              <span>{isOnline ? 'Online' : 'Offline'}</span>
            </div>
          </div>

          {/* Language Selector */}
          <div className="flex flex-col gap-1 px-1">
            <span className="text-[9px] font-bold text-text-tertiary uppercase tracking-wider mb-1">Language</span>
            <LanguageSelector currentLang={lang} onChange={onLangChange} />
          </div>

          {/* Settings option */}
          <button
            onClick={() => {
              onOpenSettings();
              onClose();
            }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors"
          >
            <Settings size={16} className="text-text-tertiary" />
            <span>Profile Settings</span>
          </button>
        </div>
      </aside>

      {/* Overlay backdrop for mobile when sidebar drawer is open */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden transition-opacity duration-300"
        />
      )}
    </>
  );
}
