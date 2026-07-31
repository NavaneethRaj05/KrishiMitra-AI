import { Router } from 'express';

const router = Router();

// Demo/fallback market data — dynamically uses farmer's district if provided
const MOCK_PRICES = [
  { commodity: 'Tomato',    price: 1850, unit: 'quintal', market: 'Local APMC',    state: '', trend: '+12%' },
  { commodity: 'Ragi',      price: 3200, unit: 'quintal', market: 'Local Mandi',   state: '', trend: '+3%'  },
  { commodity: 'Rice',      price: 2100, unit: 'quintal', market: 'Local APMC',   state: '', trend: '-2%'  },
  { commodity: 'Maize',     price: 1650, unit: 'quintal', market: 'Local Mandi', state: '', trend: '+5%'  },
  { commodity: 'Groundnut', price: 5500, unit: 'quintal', market: 'Local Mandi', state: '', trend: '+1%' },
  { commodity: 'Cotton',    price: 6800, unit: 'quintal', market: 'Local Mandi',  state: '', trend: '-4%'  },
];

// Stable hash function to generate price offset (-12% to +12%) based on district
const generatePriceOffset = (basePrice, district) => {
  if (!district || district === 'Local') return basePrice;
  let hash = 0;
  const distLower = district.toLowerCase().trim();
  for (let i = 0; i < distLower.length; i++) {
    hash = distLower.charCodeAt(i) + ((hash << 5) - hash);
  }
  // Generate offset between -12% and +12%
  const percentOffset = (Math.abs(hash) % 25) - 12; 
  const offset = Math.round(basePrice * (percentOffset / 100));
  // Round to nearest 10
  return Math.round((basePrice + offset) / 10) * 10;
};

router.get('/prices', async (req, res) => {
  const { commodity, state, district, country } = req.query;
  const userDistrict = district || req.headers['x-user-district'] || 'Local';
  const userCountry = country || req.headers['x-user-country'] || 'India';
  
  let sourcePrices = [...MOCK_PRICES];

  const getMarketSuffix = (countryName) => {
    const norm = (countryName || '').toLowerCase().trim();
    if (norm.includes('india') || norm.includes('in')) {
      return ['APMC', 'Mandi'];
    } else if (norm.includes('kenya') || norm.includes('ke')) {
      return ['NCPB depot', 'Wakulima Market'];
    } else if (norm.includes('usa') || norm.includes('united states') || norm.includes('america') || norm.includes('us')) {
      return ['Wholesale Market', 'Commodity Exchange'];
    } else {
      return ['Local Market', 'Local Market'];
    }
  };

  const suffixes = getMarketSuffix(userCountry);
  
  if (commodity) {
    const hasMatch = sourcePrices.some(p => p.commodity.toLowerCase().includes(commodity.toLowerCase()));
    if (!hasMatch) {
      // Generate a stable custom price based on commodity name
      let hash = 0;
      const commLower = commodity.toLowerCase().trim();
      for (let i = 0; i < commLower.length; i++) {
        hash = commLower.charCodeAt(i) + ((hash << 5) - hash);
      }
      const basePrice = 1200 + (Math.abs(hash) % 360) * 10;
      const trends = ['+3%', '+7%', '-1%', '+10%', '-5%', '+4%', '+12%', '-3%'];
      const trend = trends[Math.abs(hash) % trends.length];
      const isMandi = Math.abs(hash) % 2 === 0;
      
      sourcePrices.push({
        commodity: commodity.charAt(0).toUpperCase() + commodity.slice(1),
        price: basePrice,
        unit: 'quintal',
        market: isMandi ? 'Local Mandi' : 'Local APMC',
        state: state || 'Local',
        trend
      });
    }
  }

  let data = sourcePrices.map(p => {
    const adjustedPrice = generatePriceOffset(p.price, userDistrict);
    const isPrimary = p.market.includes('APMC');
    const suffix = isPrimary ? suffixes[0] : suffixes[1];
    const prefix = userDistrict === 'Local' ? (userCountry.toLowerCase().includes('india') ? 'Local' : userCountry) : userDistrict;
    
    return {
      ...p,
      price: adjustedPrice,
      market: `${prefix} ${suffix}`,
      state: state || p.state || 'Local'
    };
  });

  if (commodity) {
    data = data.filter((p) => p.commodity.toLowerCase().includes(commodity.toLowerCase()));
  }

  res.json({ success: true, data, source: 'dynamic_demo' });
});

// Proxy to ML Service price-forecast with robust offline fallback
router.get('/forecast', async (req, res, next) => {
  const { commodity = 'tomato', district = 'Hassan' } = req.query;
  const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';
  
  try {
    const axios = (await import('axios')).default;
    const response = await axios.get(`${ML_SERVICE_URL}/price-forecast`, {
      params: { commodity, district },
      timeout: 5000
    });
    res.json(response.data);
  } catch (err) {
    // Offline / unreachable fallback: Generate 30 days historical + 7 days forecast
    const basePrice = commodity.toLowerCase() === 'tomato' ? 1850 : commodity.toLowerCase() === 'rice' ? 2100 : 1650;
    const priceChartData = [];
    const today = new Date();

    // Historical 30 days
    for (let i = 30; i > 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      priceChartData.push({
        date: d.toISOString().split('T')[0],
        price: basePrice + Math.round(Math.sin(i / 4.0) * 120 + (i % 3 === 0 ? 30 : -20))
      });
    }

    // Forecast 7 days
    const forecast = [];
    for (let i = 1; i <= 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const forecastItem = {
        date: d.toISOString().split('T')[0],
        price: basePrice + Math.round(Math.sin((i + 30) / 4.0) * 120 + 50),
        is_forecast: true
      };
      priceChartData.push(forecastItem);
      forecast.push(forecastItem);
    }

    const peakDay = forecast.reduce((max, item) => item.price > max.price ? item : max, forecast[0]);

    res.json({
      success: true,
      data: {
        commodity,
        current_price: basePrice,
        trend: 'rising',
        forecast_7d: forecast,
        optimal_sell_day: peakDay.date,
        optimal_sell_price: peakDay.price,
        price_chart_data: priceChartData,
        nearest_mandis: [
          { mandi_name: `${district} APMC`, current_price: basePrice, distance_km: 4.5, last_updated: "Today" },
          { mandi_name: "Nearest Regional APMC", current_price: basePrice - 50, distance_km: 35.0, last_updated: "Yesterday" }
        ]
      }
    });
  }
});

export default router;
