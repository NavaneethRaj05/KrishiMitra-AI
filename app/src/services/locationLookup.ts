/**
 * On-device Offline Location & Reverse Geocoding Service
 * Uses the bundled 58-district geo dataset to map GPS coordinates
 * to district, state, agro-climatic zone, and soil type 100% offline.
 */
import districtsData from '../../assets/location/districts.json'

export interface DistrictInfo {
  name: string
  state: string
  lat: number
  lon: number
  agro_zone: string
  typical_soil: string
  major_crops: string[]
  avg_rainfall_mm: number
  nearest_kvk: string
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371 // Earth's radius in km
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

export function getOfflineDistrict(lat?: number | null, lon?: number | null): DistrictInfo | null {
  if (lat == null || lon == null || isNaN(lat) || isNaN(lon)) {
    return null
  }

  const list: DistrictInfo[] = (districtsData as any).districts || []
  if (list.length === 0) return null

  let bestMatch: DistrictInfo | null = null
  let minDistance = Infinity

  for (const d of list) {
    const dist = haversineKm(lat, lon, d.lat, d.lon)
    if (dist < minDistance) {
      minDistance = dist
      bestMatch = d
    }
  }

  return bestMatch
}
