import { useRef, useEffect, useState } from 'react';
import { User, Sparkles, BookOpen, ExternalLink, Edit2, Volume2, VolumeX, Loader2, RotateCcw } from 'lucide-react';
import SourceCard from './SourceCard';
import SearchBar from './SearchBar';
import { translate } from '../utils/translations';
import { synthesizeSpeech, fetchMarketForecast } from '../api/queryRouter';

/* ── Rich Perplexity-style markdown→HTML renderer ── */
function renderMarkdown(text) {
  if (!text) return '';

  const lines = text.split('\n');
  const out = [];
  let inUl = false;
  let inOl = false;

  const closeList = () => {
    if (inUl) { out.push('</ul>'); inUl = false; }
    if (inOl) { out.push('</ol>'); inOl = false; }
  };

  const inlineFormat = (s) => s
    // Inline citations [1] [2] → styled badge
    .replace(/\[(\d+)\]/g, '<sup class="cite-badge">$1</sup>')
    // Bold
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // Inline code
    .replace(/`(.*?)`/g, '<code>$1</code>')
    // Horizontal rule
    .replace(/^---$/, '<hr class="answer-hr"/>')
    // Emoji bullet prefix kept as-is
    ;

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw.trimEnd();

    // H1
    if (/^# /.test(line)) {
      closeList();
      out.push(`<h1 class="ans-h1">${inlineFormat(line.slice(2))}</h1>`);
    }
    // H2
    else if (/^## /.test(line)) {
      closeList();
      out.push(`<h2 class="ans-h2">${inlineFormat(line.slice(3))}</h2>`);
    }
    // H3
    else if (/^### /.test(line)) {
      closeList();
      out.push(`<h3 class="ans-h3">${inlineFormat(line.slice(4))}</h3>`);
    }
    // Blockquote → callout card
    else if (/^> /.test(line)) {
      closeList();
      out.push(`<div class="ans-callout">${inlineFormat(line.slice(2))}</div>`);
    }
    // Horizontal rule
    else if (/^---+$/.test(line)) {
      closeList();
      out.push('<hr class="answer-hr"/>');
    }
    // Unordered list
    else if (/^[*\-] /.test(line)) {
      if (inOl) { out.push('</ol>'); inOl = false; }
      if (!inUl) { out.push('<ul class="ans-ul">'); inUl = true; }
      out.push(`<li>${inlineFormat(line.replace(/^[*\-] /, ''))}</li>`);
    }
    // Ordered list
    else if (/^\d+\. /.test(line)) {
      if (inUl) { out.push('</ul>'); inUl = false; }
      if (!inOl) { out.push('<ol class="ans-ol">'); inOl = true; }
      out.push(`<li>${inlineFormat(line.replace(/^\d+\. /, ''))}</li>`);
    }
    // Empty line → paragraph break
    else if (line.trim() === '') {
      closeList();
      out.push('<div class="ans-gap"></div>');
    }
    // Normal paragraph
    else {
      closeList();
      out.push(`<p class="ans-p">${inlineFormat(line)}</p>`);
    }
  }

  closeList();
  return out.join('\n');
}

/* ── Custom Horizontal SHAP Soil Advisor Chart ── */
function ShapChart({ shapValues }) {
  if (!shapValues) return null;
  const features = Object.entries(shapValues).map(([key, val]) => ({
    key,
    label: val.label || key,
    value: val.shap_value,
    paramVal: val.feature_value,
    impact: val.impact
  }));

  // Find max magnitude
  const maxVal = Math.max(...features.map(f => Math.abs(f.value)), 0.01);

  return (
    <div className="mt-4 p-4 bg-bg-elevated border border-border-subtle rounded-2xl select-none">
      <p className="text-xs font-bold text-text-primary mb-3 flex items-center gap-1.5">
        🧪 Soil Feature Impact Analysis (SHAP)
      </p>
      <div className="space-y-3">
        {features.map((f, i) => {
          const absPercentage = Math.min(100, Math.round((Math.abs(f.value) / maxVal) * 50));
          const isPositive = f.value >= 0;
          return (
            <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-1.5">
              <div className="w-full sm:w-28 text-text-secondary font-medium truncate" title={f.label}>
                {f.label} <span className="text-[10px] text-text-tertiary">({f.paramVal})</span>
              </div>
              <div className="flex-1 h-5 relative bg-bg/40 rounded-md border border-border/30 overflow-hidden flex items-center">
                <div className="absolute left-[50%] top-0 bottom-0 w-0.5 bg-border pointer-events-none" />
                {isPositive ? (
                  <div 
                    className="h-full bg-accent/80 rounded-r-sm"
                    style={{ left: '50%', width: `${absPercentage}%`, position: 'absolute' }}
                  />
                ) : (
                  <div 
                    className="h-full bg-danger/80 rounded-l-sm"
                    style={{ right: '50%', width: `${absPercentage}%`, position: 'absolute' }}
                  />
                )}
                <span className={`absolute text-[10px] font-mono px-1.5 ${isPositive ? 'left-[51%] text-accent-text' : 'right-[51%] text-red-400'}`}>
                  {isPositive ? '+' : ''}{f.value.toFixed(3)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex justify-between text-[10px] text-text-tertiary font-medium">
        <span>⬅️ Negative Impact</span>
        <span>Neutral (0.00)</span>
        <span>Positive Impact ➡️</span>
      </div>
    </div>
  );
}

/* ── Custom Interactive Mandi Price Trend & Forecast Chart ── */
function MandiForecastChart({ data }) {
  if (!data || !data.price_chart_data || data.price_chart_data.length === 0) return null;

  const chartPoints = data.price_chart_data.slice(-20);
  const prices = chartPoints.map(p => p.price);
  const minPrice = Math.min(...prices) * 0.98;
  const maxPrice = Math.max(...prices) * 1.02;
  const priceRange = maxPrice - minPrice || 1;

  const width = 500;
  const height = 150;
  const paddingLeft = 45;
  const paddingRight = 15;
  const paddingTop = 15;
  const paddingBottom = 25;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const coords = chartPoints.map((pt, index) => {
    const x = paddingLeft + (index / (chartPoints.length - 1)) * chartWidth;
    const y = paddingTop + chartHeight - ((pt.price - minPrice) / priceRange) * chartHeight;
    return { x, y, price: pt.price, date: pt.date, isForecast: pt.is_forecast };
  });

  const histCoords = coords.filter(c => !c.isForecast);
  const foreCoords = coords.filter(c => c.isForecast);
  
  if (histCoords.length > 0 && foreCoords.length > 0) {
    foreCoords.unshift(histCoords[histCoords.length - 1]);
  }

  const histPointsStr = histCoords.map(c => `${c.x},${c.y}`).join(' ');
  const forePointsStr = foreCoords.map(c => `${c.x},${c.y}`).join(' ');

  const [activePoint, setActivePoint] = useState(null);

  return (
    <div className="mt-4 p-4 bg-bg-elevated border border-border-subtle rounded-2xl select-none">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-bold text-text-primary">
          📊 Mandi Price Trend & Forecast ({data.commodity})
        </p>
        <div className="flex gap-3 text-[10px]">
          <span className="flex items-center gap-1"><span className="w-2.5 h-0.5 bg-accent inline-block" /> Historical</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-0.5 border-t border-dashed border-info inline-block" /> 7d Forecast</span>
        </div>
      </div>

      {data.optimal_sell_day && (
        <div className="mb-3.5 p-2.5 bg-accent-muted border border-accent/20 rounded-xl flex items-center justify-between text-xs">
          <span className="text-text-secondary font-medium">🎯 Optimal Sell Day Forecast:</span>
          <span className="font-bold text-accent-text">
            {new Date(data.optimal_sell_day).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })} (₹{data.optimal_sell_price}/q)
          </span>
        </div>
      )}

      <div className="relative">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
          {[0, 0.5, 1].map((r, i) => {
            const y = paddingTop + r * chartHeight;
            const val = Math.round(maxPrice - r * priceRange);
            return (
              <g key={i} className="opacity-30">
                <line x1={paddingLeft} y1={y} x2={width - paddingRight} y2={y} stroke="var(--color-border)" strokeWidth="0.8" />
                <text x={paddingLeft - 8} y={y + 3} textAnchor="end" className="fill-text-tertiary text-[9px] font-mono">₹{val}</text>
              </g>
            );
          })}

          {histPointsStr && (
            <polyline fill="none" stroke="var(--color-accent)" strokeWidth="2.2" strokeLinecap="round" points={histPointsStr} />
          )}
          {forePointsStr && (
            <polyline fill="none" stroke="var(--color-info)" strokeWidth="2.2" strokeLinecap="round" strokeDasharray="4 4" points={forePointsStr} />
          )}

          {coords.map((c, i) => (
            <g key={i}>
              <circle 
                cx={c.x} 
                cy={c.y} 
                r={activePoint?.date === c.date ? 4.5 : 2.5} 
                className={`${c.isForecast ? 'fill-info animate-pulse' : 'fill-accent'} transition-all`} 
              />
              <circle 
                cx={c.x} 
                cy={c.y} 
                r={10} 
                className="fill-transparent cursor-pointer"
                onMouseEnter={() => setActivePoint(c)}
                onMouseLeave={() => setActivePoint(null)}
              />
            </g>
          ))}
        </svg>

        {activePoint && (
          <div 
            className="absolute bg-bg border border-border rounded-xl p-2 shadow-2xl text-[10px] pointer-events-none fade-in font-medium"
            style={{
              left: `${(activePoint.x / width) * 100}%`,
              top: `${(activePoint.y / height) * 100 - 35}%`,
              transform: 'translateX(-50%)',
              zIndex: 10
            }}
          >
            <div className="text-text-tertiary font-mono">{activePoint.date}</div>
            <div className="font-bold text-text-primary mt-0.5">₹{activePoint.price}/q {activePoint.isForecast && <span className="text-[9px] text-info font-normal">(fc)</span>}</div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Container to fetch price forecast ── */
function MandiForecastContainer({ entry }) {
  const [forecastData, setForecastData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    async function loadForecast() {
      setLoading(true);
      try {
        const cropName = entry.recommended_crop || 'Tomato';
        const district = entry.location?.district || 'Hassan';
        const res = await fetchMarketForecast(cropName, district);
        if (res && res.success && res.data && active) {
          setForecastData(res.data);
        }
      } catch (e) {
        console.warn('Failed to load mandi forecast:', e);
      } finally {
        if (active) setLoading(false);
      }
    }
    loadForecast();
    return () => { active = false; };
  }, [entry]);

  if (loading) {
    return (
      <div className="mt-4 p-4 bg-bg-elevated border border-border-subtle rounded-2xl flex items-center justify-center gap-2 text-xs text-text-tertiary">
        <Loader2 size={14} className="animate-spin text-accent" />
        <span>Loading mandi forecast...</span>
      </div>
    );
  }

  return <MandiForecastChart data={forecastData} />;
}

/* ── Single Q&A Turn ── */
function QATurn({ entry, lang, isLast, onEditSubmit, turnIndex, onRelatedClick, onRevert }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(entry.query);

  // ── Voice Speech Synthesis State ──
  const [isPlaying, setIsPlaying] = useState(false);
  const [ttsLoading, setTtsLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const audioRef = useRef(null);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const handleSpeak = async () => {
    if (isPlaying) {
      if (audioRef.current) {
        audioRef.current.pause();
        setIsPlaying(false);
      }
      return;
    }

    if (audioUrl) {
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      audio.onended = () => setIsPlaying(false);
      audio.play();
      setIsPlaying(true);
      return;
    }

    setTtsLoading(true);
    try {
      const cleanText = entry.answer
        .replace(/### /g, '')
        .replace(/## /g, '')
        .replace(/\*\*/g, '')
        .replace(/\*/g, '')
        .replace(/- /g, '');
      const res = await synthesizeSpeech(cleanText, lang);
      if (res && res.success && res.data && res.data.audio_b64) {
        const url = `data:audio/wav;base64,${res.data.audio_b64}`;
        setAudioUrl(url);
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onended = () => setIsPlaying(false);
        audio.play();
        setIsPlaying(true);
      }
    } catch (e) {
      console.error('Speech synthesis error:', e);
      alert('Speech synthesis failed.');
    } finally {
      setTtsLoading(false);
    }
  };

  const handleSave = () => {
    if (editValue.trim() && editValue.trim() !== entry.query) {
      onEditSubmit(turnIndex, editValue.trim());
    }
    setIsEditing(false);
  };

  return (
    <div className="slide-up">
      {/* User Query */}
      <div className="flex items-start gap-3 mb-6">
        <div className="w-7 h-7 rounded-lg bg-bg-elevated border border-border flex items-center justify-center flex-shrink-0 mt-0.5">
          <User size={14} className="text-text-tertiary" />
        </div>
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <div className="flex flex-col gap-2 bg-bg-elevated p-3 rounded-2xl border border-border mt-1">
              <textarea
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="w-full bg-transparent text-text-primary text-sm leading-relaxed resize-none focus:outline-none min-h-[50px] max-h-[150px]"
                rows={2}
              />
              {entry.image && (
                <div className="relative w-fit mt-1">
                  <img src={entry.image} alt="Attached leaf" className="h-16 rounded-lg border border-border" />
                </div>
              )}
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => { setIsEditing(false); setEditValue(entry.query); }}
                  className="text-xs text-text-secondary hover:text-text-primary px-2.5 py-1.5 rounded-lg border border-border-subtle hover:bg-bg-hover transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="text-xs bg-accent text-bg hover:bg-accent-hover font-semibold px-3 py-1.5 rounded-lg transition-colors"
                >
                  Save & Submit
                </button>
              </div>
            </div>
          ) : (
            <div className="group flex items-start justify-between gap-4">
              <div>
                <p className="text-base font-semibold text-text-primary leading-snug">{entry.query}</p>
                {entry.image && (
                  <img src={entry.image} alt="Attached" className="mt-2 h-20 rounded-lg border border-border" />
                )}
              </div>
              {!entry.loading && (
                <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0">
                  <button
                    onClick={() => onRevert(entry.query, entry.imageFile)}
                    className="p-1 rounded-md text-text-tertiary hover:text-text-secondary hover:bg-bg-hover transition-colors"
                    title="Revert query to search input"
                  >
                    <RotateCcw size={13} />
                  </button>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="p-1 rounded-md text-text-tertiary hover:text-text-secondary hover:bg-bg-hover transition-colors"
                    title="Edit prompt"
                  >
                    <Edit2 size={13} />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* AI Answer */}
      <div className="flex items-start gap-3 mb-4">
        <div className="w-7 h-7 rounded-lg bg-accent-muted flex items-center justify-center flex-shrink-0 mt-0.5">
          <Sparkles size={14} className="text-accent" />
        </div>
        <div className="flex-1 min-w-0">
          {/* Loading state */}
          {entry.loading ? (
            <div className="py-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold text-accent tracking-wider uppercase">{translate(lang, 'thinking')}</span>
              </div>
              <div className="thinking-dots">
                <span></span><span></span><span></span>
              </div>
            </div>
          ) : (
            <>
              {/* Intent badge & Speaker Read Aloud */}
              <div className="flex items-center justify-between mb-2">
                {entry.intent ? (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-accent-muted text-accent-text">
                    {entry.intent.replace(/_/g, ' ')}
                  </span>
                ) : <div />}

                <button
                  onClick={handleSpeak}
                  className="p-1 rounded-md text-text-tertiary hover:text-text-primary hover:bg-bg-hover transition-colors flex items-center gap-1 text-[10px] font-semibold select-none"
                  title="Listen to response"
                  disabled={ttsLoading}
                >
                  {ttsLoading ? (
                    <Loader2 size={13} className="animate-spin text-accent" />
                  ) : isPlaying ? (
                    <>
                      <VolumeX size={13} className="text-danger" />
                      <span className="text-danger">Stop</span>
                    </>
                  ) : (
                    <>
                      <Volume2 size={13} className="text-accent" />
                      <span>Listen</span>
                    </>
                  )}
                </button>
              </div>

              {/* Answer content */}
              <div 
                className="answer-content text-sm text-text-secondary leading-relaxed"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(entry.answer) }}
              />

              {entry.location && (
                <div className="mt-3.5 flex flex-wrap items-center gap-1.5 text-[11px] text-text-tertiary bg-bg/50 border border-border/40 rounded-xl px-3 py-2 select-none w-fit">
                  <span>📍 Location context:</span>
                  <strong className="text-text-secondary">{entry.location.district}, {entry.location.state}</strong>
                  {entry.location.soil_type && (
                    <>
                      <span className="opacity-50">|</span>
                      <span>Soil: <strong className="text-text-secondary">{entry.location.soil_type}</strong></span>
                    </>
                  )}
                </div>
              )}

              {/* Interactive Soil SHAP Chart */}
              {entry.shap_values && <ShapChart shapValues={entry.shap_values} />}

              {/* Interactive Mandi Price Forecast Chart */}
              {entry.intent === 'market_query' && (
                <MandiForecastContainer entry={entry} />
              )}

              {/* Disease detection specific */}
              {entry.disease && (
                <div className="mt-3 p-3 bg-danger/5 border border-danger/15 rounded-xl">
                  <p className="text-xs font-bold text-danger mb-1">🔬 {translate(lang, 'detected_disease')}</p>
                  <p className="text-sm font-semibold text-text-primary">{entry.disease}</p>
                  {entry.confidence && (
                    <div className="flex items-center gap-2 mt-1.5">
                      <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden max-w-[100px]">
                        <div className="h-full bg-danger rounded-full" style={{ width: `${entry.confidence}%` }} />
                      </div>
                      <span className="text-[11px] text-text-tertiary">{entry.confidence}% confidence</span>
                    </div>
                  )}
                </div>
              )}

              {/* Crop recommendation specific */}
              {entry.recommended_crop && (
                <div className="mt-3 p-3 bg-accent-muted border border-accent/15 rounded-xl">
                  <p className="text-xs font-bold text-accent mb-1">🌱 {translate(lang, 'recommended_crop')}</p>
                  <p className="text-sm font-semibold text-text-primary">{entry.recommended_crop}</p>
                  {entry.confidence_score && (
                    <span className="text-[11px] text-text-tertiary">{Math.round(entry.confidence_score * 100)}% match</span>
                  )}
                </div>
              )}

              {/* Sources */}
              {entry.sources && entry.sources.length > 0 && (
                <div className="mt-5">
                  <div className="flex items-center gap-1.5 mb-3">
                    <BookOpen size={13} className="text-text-tertiary" />
                    <span className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">{translate(lang, 'sources')}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {entry.sources.slice(0, 4).map((src, i) => (
                      <SourceCard key={i} source={src} index={i} />
                    ))}
                  </div>
                </div>
              )}

              {/* Related questions */}
              {isLast && entry.relatedQuestions && entry.relatedQuestions.length > 0 && (
                <div className="mt-5">
                  <span className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">{translate(lang, 'related')}</span>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {entry.relatedQuestions.map((q, i) => (
                      <button
                        key={i}
                        onClick={() => onRelatedClick(q)}
                        className="text-xs text-text-secondary bg-bg-elevated border border-border-subtle rounded-lg px-3 py-1.5 hover:bg-bg-hover hover:border-border hover:text-text-primary transition-colors"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Offline indicator */}
              {entry.offline && (
                <div className="mt-3 flex items-center gap-1.5 text-[11px] text-warning">
                  <span>⚡</span>
                  <span>{translate(lang, 'offline_response')}</span>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Divider between turns */}
      {!isLast && <div className="border-t border-border-subtle my-6" />}
    </div>
  );
}

/* ── Thread View (full conversation) ── */
export default function ThreadView({ thread, lang, onFollowUp, onEditQuery, isLoading }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [attachedFile, setAttachedFile] = useState(null);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [thread]);

  const handleRelatedClick = (q) => {
    setSearchQuery(q);
  };

  const handleRevert = (query, file) => {
    setSearchQuery(query);
    setAttachedFile(file || null);
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="flex-1 flex flex-col w-full max-w-3xl mx-auto px-4">
      {/* Conversation turns */}
      <div className="flex-1 py-6">
        {thread.map((entry, idx) => (
          <QATurn 
            key={idx} 
            entry={entry} 
            lang={lang} 
            isLast={idx === thread.length - 1}
            onEditSubmit={onEditQuery}
            turnIndex={idx}
            onRelatedClick={handleRelatedClick}
            onRevert={handleRevert}
          />
        ))}
        <div ref={endRef} />
      </div>

      {/* Follow-up search bar */}
      <div className="sticky bottom-0 pb-4 pt-2 bg-gradient-to-t from-bg via-bg to-transparent">
        <SearchBar
          onSubmit={(payload) => {
            onFollowUp(payload);
            setAttachedFile(null); // Clear image after submit
          }}
          lang={lang}
          isLoading={isLoading}
          isCompact={true}
          value={searchQuery}
          onChange={setSearchQuery}
          attachedFile={attachedFile}
          onAttachedFileChange={setAttachedFile}
        />
      </div>
    </div>
  );
}
