import { X, Save, User, MapPin, Sprout, Phone, Compass } from 'lucide-react';
import { useState } from 'react';
import { translate } from '../utils/translations';
import { fetchLocationDetails } from '../api/queryRouter';

const KNOWN_CROPS = [
  'Tomato', 'Rice', 'Wheat', 'Maize', 'Potato', 'Cotton', 'Soybean', 'Banana', 
  'Mango', 'Coffee', 'Onion', 'Sugarcane', 'Groundnut', 'Ragi', 'Chilli'
];

export default function SettingsPanel({ isOpen, onClose, profile, onSave, lang = 'en' }) {
  const [formData, setFormData] = useState({ ...profile });
  const [isDetecting, setIsDetecting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    let updatedProfile = { ...formData };
    
    // Auto-fetch district details if district name changed and user didn't enter custom coordinates
    const hasDistrictChanged = formData.district?.toLowerCase().trim() !== (profile.district || '').toLowerCase().trim();
    if (hasDistrictChanged) {
      try {
        const res = await fetchLocationDetails(formData.district);
        if (res && res.success) {
          updatedProfile.lat = parseFloat(res.lat);
          updatedProfile.lng = parseFloat(res.lon);
          updatedProfile.majorCrops = res.major_crops;
          updatedProfile.state = res.state || formData.state;
          // Auto-set crop ONLY when the user has left the crop field blank
          if (!formData.crop?.trim() && res.major_crops && res.major_crops.length > 0) {
            const topCrop = res.major_crops[0];
            updatedProfile.crop = topCrop.charAt(0).toUpperCase() + topCrop.slice(1);
          }
        }
      } catch (err) {
        console.warn('Could not auto-fetch district details:', err);
      }
    }
    
    onSave(updatedProfile);
    onClose();
  };

  const handleDetectGPS = () => {
    if ('geolocation' in navigator) {
      setIsDetecting(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData(prev => ({
            ...prev,
            lat: parseFloat(position.coords.latitude.toFixed(6)),
            lng: parseFloat(position.coords.longitude.toFixed(6))
          }));
          setIsDetecting(false);
        },
        (err) => {
          alert('GPS detection failed. Make sure location permissions are enabled.');
          setIsDetecting(false);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else {
      alert('Geolocation is not supported by your browser.');
    }
  };

  const inputClass = "w-full bg-bg border border-border rounded-xl px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all placeholder-text-tertiary";

  return (
    <div className="fixed inset-0 z-50 flex justify-end fade-in">
      {/* Backdrop */}
      <div 
        onClick={onClose}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
      />

      {/* Panel */}
      <div className="relative w-full max-w-md h-full bg-bg-elevated border-l border-border p-6 flex flex-col z-10 shadow-2xl overflow-y-auto slide-up">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-border-subtle">
          <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
            ⚙️ {translate(lang, 'settings_title')}
          </h3>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-bg-hover rounded-lg text-text-tertiary hover:text-text-primary transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col gap-5">
          {/* Farmer Name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider flex items-center gap-1.5">
              <User size={12} className="text-accent" /> {translate(lang, 'name')}
            </label>
            <input 
              type="text" required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={inputClass}
              placeholder="e.g. Ramesh Kumar"
            />
          </div>

          {/* Phone */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider flex items-center gap-1.5">
              <Phone size={12} className="text-accent" /> {translate(lang, 'phone')}
            </label>
            <input 
              type="tel"
              value={formData.phone || ''}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className={inputClass}
              placeholder="e.g. 9876543210"
            />
          </div>

          {/* Country */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider flex items-center gap-1.5">
              <MapPin size={12} className="text-accent" /> {translate(lang, 'country')}
            </label>
            <input 
              type="text" required
              value={formData.country || ''}
              onChange={(e) => setFormData({ ...formData, country: e.target.value })}
              className={inputClass}
              placeholder="e.g. India"
            />
          </div>

          {/* State */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider flex items-center gap-1.5">
              <MapPin size={12} className="text-accent" /> {translate(lang, 'state')}
            </label>
            <input 
              type="text" required
              value={formData.state}
              onChange={(e) => setFormData({ ...formData, state: e.target.value })}
              className={inputClass}
              placeholder="e.g. Karnataka"
            />
          </div>

          {/* District */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider flex items-center gap-1.5">
              <MapPin size={12} className="text-accent" /> {translate(lang, 'district')}
            </label>
            <input 
              type="text" required
              value={formData.district}
              onChange={(e) => setFormData({ ...formData, district: e.target.value })}
              className={inputClass}
              placeholder="e.g. Hassan"
            />
          </div>

          {/* GPS Coordinates */}
          <div className="flex flex-col gap-2 bg-bg/30 p-3.5 rounded-2xl border border-border/40">
            <div className="flex justify-between items-center mb-1">
              <label className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider flex items-center gap-1.5">
                <Compass size={12} className="text-accent" /> Coordinates
              </label>
              <button
                type="button"
                onClick={handleDetectGPS}
                disabled={isDetecting}
                className="text-xs text-accent hover:text-accent-hover font-semibold flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-50"
              >
                <Compass size={12} className={isDetecting ? 'animate-spin' : ''} />
                {isDetecting ? 'Detecting...' : 'Detect GPS'}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <span className="text-[9px] font-bold text-text-tertiary uppercase tracking-wider">Latitude</span>
                <input
                  type="number" step="any" required
                  value={formData.lat !== undefined ? formData.lat : ''}
                  onChange={(e) => setFormData({ ...formData, lat: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-bg border border-border rounded-xl px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-accent"
                  placeholder="e.g. 13.0600"
                />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[9px] font-bold text-text-tertiary uppercase tracking-wider">Longitude</span>
                <input
                  type="number" step="any" required
                  value={formData.lng !== undefined ? formData.lng : ''}
                  onChange={(e) => setFormData({ ...formData, lng: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-bg border border-border rounded-xl px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-accent"
                  placeholder="e.g. 76.1000"
                />
              </div>
            </div>
          </div>

          {/* Preferred Crop */}
          <div className="flex flex-col gap-1.5 relative">
            <label className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider flex items-center gap-1.5">
              <Sprout size={12} className="text-accent" /> {translate(lang, 'crop')}
            </label>
            <input
              type="text" required
              value={formData.crop || ''}
              onChange={(e) => setFormData({ ...formData, crop: e.target.value })}
              onFocus={() => setFormData(prev => ({ ...prev, showSuggestions: true }))}
              onBlur={() => setTimeout(() => setFormData(prev => ({ ...prev, showSuggestions: false })), 200)}
              className={inputClass}
              placeholder="e.g. Tomato, Rice, Maize"
            />
            {formData.showSuggestions && (
              <div className="absolute top-[100%] left-0 right-0 z-50 bg-bg-elevated border border-border rounded-xl mt-1 max-h-40 overflow-y-auto shadow-2xl">
                {KNOWN_CROPS.filter(c => c.toLowerCase().includes((formData.crop || '').toLowerCase()))
                  .map((c) => (
                    <button
                      key={c}
                      type="button"
                      onMouseDown={() => setFormData(prev => ({ ...prev, crop: c, showSuggestions: false }))}
                      className="w-full text-left px-4 py-2.5 text-sm text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors"
                    >
                      🌱 {c}
                    </button>
                  ))}
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="mt-auto pt-5 border-t border-border-subtle flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-bg border border-border text-text-secondary rounded-xl py-2.5 hover:bg-bg-hover transition-colors font-medium text-sm"
            >
              {translate(lang, 'cancel')}
            </button>
            <button
              type="submit"
              className="flex-1 bg-accent text-bg font-semibold rounded-xl py-2.5 hover:bg-accent-hover transition-colors flex items-center justify-center gap-2 text-sm"
            >
              <Save size={16} /> {translate(lang, 'save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
