export default function SourceCard({ source, index }) {
  const getTypeStyle = (type) => {
    switch (type) {
      case 'icar':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'kvk':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'agmarknet':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'research':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      default:
        return 'bg-bg-elevated text-text-secondary border-border';
    }
  };

  const typeName = (type) => {
    switch (type) {
      case 'icar': return 'ICAR';
      case 'kvk': return 'KVK';
      case 'agmarknet': return 'APMC';
      case 'research': return 'Research';
      default: return 'Web';
    }
  };

  return (
    <div className="flex items-start gap-3 p-3 bg-bg-elevated border border-border-subtle rounded-xl hover:border-border hover:bg-bg-hover transition-all cursor-default group">
      {/* Index number */}
      <span className="flex-shrink-0 w-5 h-5 rounded-md bg-accent-muted text-accent text-[10px] font-bold flex items-center justify-center mt-0.5">
        {index + 1}
      </span>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h4 className="text-xs font-semibold text-text-primary truncate">{source.title}</h4>
          <span className={`source-badge border ${getTypeStyle(source.source_type)}`}>
            {typeName(source.source_type)}
          </span>
        </div>
        <p className="text-[11px] text-text-tertiary line-clamp-2 leading-relaxed">
          {source.excerpt}
        </p>
        {source.score > 0 && (
          <div className="flex items-center gap-2 mt-1.5">
            <div className="flex-1 h-1 bg-border rounded-full overflow-hidden max-w-[60px]">
              <div 
                className="h-full bg-accent rounded-full transition-all"
                style={{ width: `${Math.min(source.score * 100, 100)}%` }}
              />
            </div>
            <span className="text-[10px] text-text-tertiary">{Math.round(source.score * 100)}%</span>
          </div>
        )}
      </div>
    </div>
  );
}
