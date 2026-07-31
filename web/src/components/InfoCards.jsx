import { CloudRain, TrendingUp, ShieldAlert, Sprout } from 'lucide-react';
import { translate } from '../utils/translations';

const CROP_ALERTS = {
  Tomato: { en: { d: 'Early Blight', r: 'High risk in monsoon' }, kn: { d: 'ಬೇಗನೆ ಬರುವ ಕೊಳೆರೋಗ', r: 'ಮಳೆಗಾಲದಲ್ಲಿ ಹೆಚ್ಚಿನ ಅಪಾಯ' }, hi: { d: 'अगेती झुलसा', r: 'मानसून में उच्च जोखिम' }, ta: { d: 'ஆரம்பகால கருகல் நோய்', r: 'மழைக்காலத்தில் அதிக ஆபத்து' }, te: { d: 'ఆకు మచ్చ తెగులు', r: 'వర్షాకాలంలో అధిక ప్రమాదం' } },
  Rice: { en: { d: 'Rice Blast', r: 'High risk in humid weather' }, kn: { d: 'ಭತ್ತದ ಬೆಂಕಿ ರೋಗ', r: 'ಆರ್ದ್ರತೆಯಲ್ಲಿ ಅಪಾಯ' }, hi: { d: 'धान का ब्लास्ट', r: 'आर्द्र मौसम में जोखिम' }, ta: { d: 'நெல் குலை நோய்', r: 'ஈரப்பதமான வானிலையில் ஆபத்து' }, te: { d: 'అగ్గి తెగులు', r: 'తేమలో ప్రమాదం' } },
  Mango: { en: { d: 'Anthracnose', r: 'Moderate risk this week' }, kn: { d: 'ಅಂಥ್ರಾಕ್ನೋಸ್', r: 'ಈ ವಾರ ಸಾಧಾರಣ ಅಪಾಯ' }, hi: { d: 'एंथ्रेक्नोस', r: 'इस सप्ताह मध्यम जोखिम' }, ta: { d: 'ஆந்த்ராக்னோஸ்', r: 'இந்த வாரம் மிதமான ஆபத்து' }, te: { d: 'కుళ్లు తెగులు', r: 'ఈ వారం మధ్యస్థ ప్రమాదం' } },
};

function InfoCard({ icon: Icon, label, value, sub, color }) {
  return (
    <div className="flex items-center gap-3 p-3.5 bg-bg-elevated border border-border-subtle rounded-xl hover:border-border transition-colors min-w-0">
      <div className={`p-2 rounded-lg ${color}`}>
        <Icon size={16} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-text-tertiary font-semibold uppercase tracking-wider">{label}</p>
        <p className="text-sm font-bold text-text-primary truncate mt-0.5">{value}</p>
        {sub && <p className="text-[11px] text-text-tertiary truncate">{sub}</p>}
      </div>
    </div>
  );
}

export default function InfoCards({ profile, lang, weather, market, geocodedLocation }) {
  let crop = profile.crop || 'Tomato';
  if (profile.majorCrops && profile.majorCrops.length > 0) {
    if (crop === 'Tomato') {
      const topCrop = profile.majorCrops[0];
      crop = topCrop.charAt(0).toUpperCase() + topCrop.slice(1);
    }
  }
  const alertData = CROP_ALERTS[crop]?.[lang] || CROP_ALERTS[crop]?.en || { d: `${crop} Alert`, r: 'Monitor weather' };

  const district = geocodedLocation?.district || profile.district || 'Hassan';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-2xl mx-auto">
      <InfoCard
        icon={CloudRain}
        label={`${translate(lang, 'weather')}: ${district}`}
        value={weather.loading ? '...' : weather.temp}
        sub={weather.loading ? '' : weather.desc}
        color="bg-info/10 text-info"
      />
      <InfoCard
        icon={TrendingUp}
        label={`${translate(lang, 'market')}: ${crop} (${district})`}
        value={market.loading ? '...' : market.price}
        sub={market.loading ? '' : market.trend}
        color="bg-accent-muted text-accent-text"
      />
      <InfoCard
        icon={ShieldAlert}
        label={`${translate(lang, 'crop_alert')}: ${crop}`}
        value={alertData.d}
        sub={alertData.r}
        color="bg-danger/10 text-danger"
      />
    </div>
  );
}
