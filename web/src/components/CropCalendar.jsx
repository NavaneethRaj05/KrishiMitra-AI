import React, { useState, useEffect } from 'react';
import { Calendar, Sprout, AlertCircle, Sparkles } from 'lucide-react';

const CROP_PHASES = {
  default: [
    { name: 'Sowing', days: 0, tip: 'Ensure proper soil prep and depth.' },
    { name: 'Germination', days: 10, tip: 'Keep soil moist. Protect from pests/birds.' },
    { name: 'Vegetative', days: 30, tip: 'Apply nitrogen-rich fertilizer. Hand-weed field.' },
    { name: 'Flowering', days: 60, tip: 'Foliar spray Boron (0.2%). Maintain stable watering.' },
    { name: 'Harvesting', days: 95, tip: 'Stop irrigation. Prepare clean, dry storage spaces.' }
  ],
  Tomato: [
    { name: 'Sowing', days: 0, tip: 'Prepare nursery bed with vermicompost.' },
    { name: 'Germination', days: 8, tip: 'Water lightly. Look out for damping-off disease.' },
    { name: 'Vegetative', days: 25, tip: 'Stake the plants. Apply NPK (19:19:19) fertilizer.' },
    { name: 'Flowering', days: 50, tip: 'High potassium requirement. Spray Boron (0.2%) to prevent fruit cracking.' },
    { name: 'Harvesting', days: 85, tip: 'Harvest when pink-ripe. Handle fruit carefully to prevent bruising.' }
  ],
  Rice: [
    { name: 'Sowing', days: 0, tip: 'Treat seeds with fungicide. Prepare puddle nursery.' },
    { name: 'Tillering', days: 15, tip: 'Keep standing water at 2-3cm. Apply first dose of Urea.' },
    { name: 'Panicle Init', days: 55, tip: 'Apply second dose of Nitrogen/Potash. Watch for stem borer.' },
    { name: 'Flowering', days: 85, tip: 'Keep soil saturated but avoid deep flooding. Check for blast.' },
    { name: 'Harvesting', days: 115, tip: 'Drain field 10 days before harvest. Cut when grains are golden.' }
  ]
};

export default function CropCalendar({ crop = '', profile, onUpdateProfile, lang = 'en' }) {
  const [sowingDate, setSowingDate] = useState(() => {
    // If profile has a saved sowing date for this crop, use it. Otherwise, default to 40 days ago
    const savedDates = profile.sowingDates || {};
    if (savedDates[crop]) return savedDates[crop];
    
    const d = new Date();
    d.setDate(d.getDate() - 40);
    return d.toISOString().split('T')[0];
  });

  const [daysElapsed, setDaysElapsed] = useState(0);

  useEffect(() => {
    if (sowingDate) {
      const start = new Date(sowingDate);
      const today = new Date();
      const diffTime = Math.abs(today - start);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      setDaysElapsed(diffDays);

      // Persist to profile
      const updatedDates = { ...(profile.sowingDates || {}), [crop]: sowingDate };
      if (JSON.stringify(profile.sowingDates) !== JSON.stringify(updatedDates)) {
        onUpdateProfile({ ...profile, sowingDates: updatedDates });
      }
    }
  }, [sowingDate, crop]);

  const phases = CROP_PHASES[crop] || CROP_PHASES.default;
  
  // Determine current phase
  let currentPhaseIndex = 0;
  for (let i = phases.length - 1; i >= 0; i--) {
    if (daysElapsed >= phases[i].days) {
      currentPhaseIndex = i;
      break;
    }
  }

  const activePhase = phases[currentPhaseIndex];
  
  // No crop selected — show prompt
  if (!crop) {
    return (
      <div className="w-full max-w-2xl mx-auto bg-bg-elevated border border-border-subtle rounded-3xl p-6 mt-6 fade-in shadow-xl flex flex-col items-center gap-3 text-center">
        <div className="w-10 h-10 rounded-xl bg-accent-muted flex items-center justify-center">
          <Sprout size={20} className="text-accent" />
        </div>
        <h4 className="text-sm font-bold text-text-primary">🌱 Sowing Growth Calendar</h4>
        <p className="text-xs text-text-secondary leading-relaxed max-w-xs">
          No primary crop selected yet. Open your <span className="text-accent-text font-semibold">Profile Settings</span> and set your <span className="text-accent-text font-semibold">Primary Crop</span> to see the growth calendar and daily agronomy advice.
        </p>
        <div className="mt-1 px-3 py-1.5 bg-accent-muted border border-accent/20 rounded-xl text-[11px] text-accent-text font-semibold">
          ⚙️ Set crop in Profile Settings → Primary Crop
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto bg-bg-elevated border border-border-subtle rounded-3xl p-5 sm:p-6 mt-6 fade-in shadow-xl select-none relative overflow-hidden">
      {/* Visual Accent */}
      <div className="absolute -top-16 -right-16 w-32 h-32 bg-accent/5 rounded-full blur-2xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 border-b border-border/30 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-accent-muted flex items-center justify-center text-accent">
            <Sprout size={18} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-text-primary">🌱 Sowing Growth Calendar</h4>
            <p className="text-[11px] text-text-secondary mt-0.5">
              Active Crop: <span className="text-accent-text font-semibold">{crop}</span> · Day {daysElapsed} since sowing
            </p>
          </div>
        </div>

        {/* Sowing Date Selector */}
        <div className="flex items-center gap-2 bg-bg/50 border border-border/40 rounded-xl px-3 py-1.5 self-start sm:self-center">
          <Calendar size={13} className="text-text-tertiary" />
          <span className="text-[10px] font-semibold text-text-secondary uppercase">Sowed:</span>
          <input 
            type="date" 
            value={sowingDate}
            onChange={(e) => setSowingDate(e.target.value)}
            className="bg-transparent border-none text-xs text-text-primary focus:outline-none cursor-pointer font-medium font-mono"
          />
        </div>
      </div>

      {/* Progress Timeline */}
      <div className="relative flex items-center justify-between my-7 px-4">
        {/* Connection line behind steps */}
        <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 h-0.5 bg-border/40 pointer-events-none z-0">
          <div 
            className="h-full bg-accent transition-all duration-500" 
            style={{ width: `${(currentPhaseIndex / (phases.length - 1)) * 100}%` }}
          />
        </div>

        {/* Steps */}
        {phases.map((ph, idx) => {
          const isCompleted = idx < currentPhaseIndex;
          const isActive = idx === currentPhaseIndex;
          return (
            <div key={idx} className="flex flex-col items-center z-10 relative">
              <div 
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border transition-all duration-300 ${
                  isCompleted 
                    ? 'bg-accent border-accent text-bg' 
                    : isActive 
                      ? 'bg-bg-elevated border-accent text-accent-text ring-4 ring-accent/15 scale-110 font-bold' 
                      : 'bg-bg border-border-subtle text-text-tertiary'
                }`}
              >
                {isCompleted ? '✓' : idx + 1}
              </div>
              <span className={`text-[10px] font-medium mt-2 absolute top-6 whitespace-nowrap ${
                isActive ? 'text-accent-text font-bold' : isCompleted ? 'text-text-secondary' : 'text-text-tertiary'
              }`}>
                {ph.name}
              </span>
            </div>
          );
        })}
      </div>

      {/* Advisory Tip Box */}
      <div className="mt-8 p-3.5 bg-bg/50 border border-border/30 rounded-2xl flex items-start gap-3">
        <div className="mt-0.5 text-accent">
          <Sparkles size={14} className="animate-pulse" />
        </div>
        <div className="flex-1 text-xs text-left">
          <strong className="text-text-primary block font-semibold mb-1">
             Agronomy Advice ({activePhase.name} phase):
          </strong>
          <span className="text-text-secondary leading-relaxed">{activePhase.tip}</span>
        </div>
      </div>
    </div>
  );
}
