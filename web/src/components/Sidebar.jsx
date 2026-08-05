import { Sprout, Plus, Wifi, WifiOff, Settings, X, Home, Calendar, MessageSquare, Trash2, Clock } from 'lucide-react';
import LanguageSelector from './LanguageSelector';
import { translate } from '../utils/translations';

function formatRelativeTime(ts) {
  if (!ts) return '';
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

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
  profile,
  threadHistory = [],
  activeThreadId,
  onLoadThread,
  onDeleteThread,
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

        {/* New Thread button */}
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
        <nav className="px-3 space-y-1">
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

        {/* ── Conversation History ── */}
        <div className="flex-1 overflow-y-auto px-3 mt-3">
          {threadHistory.length > 0 && (
            <>
              <p className="text-[9px] font-bold text-text-tertiary uppercase tracking-wider px-2 mb-2">
                History
              </p>
              <div className="space-y-1">
                {threadHistory.map((t) => {
                  const isActive = activeThreadId === t.id;
                  return (
                    <div
                      key={t.id}
                      className={`group flex items-start gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-all ${
                        isActive
                          ? 'bg-accent-muted border border-accent/20'
                          : 'hover:bg-bg-hover'
                      }`}
                      onClick={() => onLoadThread?.(t.id)}
                    >
                      <MessageSquare
                        size={13}
                        className={`mt-0.5 flex-shrink-0 ${isActive ? 'text-accent' : 'text-text-tertiary'}`}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-medium text-text-primary truncate leading-tight">
                          {t.preview || '(empty thread)'}
                        </p>
                        <div className="flex items-center gap-1 mt-0.5">
                          <Clock size={9} className="text-text-tertiary" />
                          <span className="text-[9px] text-text-tertiary">{formatRelativeTime(t.updatedAt)}</span>
                        </div>
                      </div>
                      {/* Delete button — only shows on hover */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteThread?.(t.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-text-tertiary hover:text-danger transition-all flex-shrink-0"
                        title="Delete this conversation"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {threadHistory.length === 0 && (
            <div className="px-3 py-4 text-center">
              <MessageSquare size={20} className="text-text-tertiary/40 mx-auto mb-2" />
              <p className="text-[10px] text-text-tertiary">
                Past conversations appear here
              </p>
            </div>
          )}
        </div>

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
