import { useAuthStore, FarmerContext } from '../store/useAuthStore'

const getApiBase = () => {
  if (typeof window !== 'undefined' && window.location && window.location.hostname) {
    const hostname = window.location.hostname
    return `http://${hostname}:5000/api`
  }
  return 'http://localhost:5000/api'
}
const API_BASE = getApiBase()

class AuthService {
  async sendOTP(phone: string): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE}/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
        signal: AbortSignal.timeout(5000)
      })
      const data = await response.json()
      return data.success
    } catch (e) {
      console.warn('sendOTP request failed, simulating SMS OTP console log local bypass:', e)
      console.log(`\n==========================================`);
      console.log(`[SMS OTP BYPASS] OTP is '123456'`);
      console.log(`==========================================\n`);
      return true
    }
  }

  async verifyOTP(phone: string, otp: string): Promise<{ success: boolean; token?: string; farmer?: any; isNewUser?: boolean }> {
    try {
      const response = await fetch(`${API_BASE}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, otp }),
        signal: AbortSignal.timeout(5000)
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          await useAuthStore.getState().setToken(data.token)
          
          const profile: Partial<FarmerContext> = {
            farmerId: data.farmer?._id || data.farmer?.farmerId || 'demo_farmer_id',
            name: data.farmer?.name || '',
            phone: data.farmer?.phone || phone,
            state: data.farmer?.location?.state || '',
            district: data.farmer?.location?.district || '',
            block: data.farmer?.location?.village || '',
            registeredCrops: data.farmer?.preferredCrops || [],
            landAcres: data.farmer?.farmSize || 1.5,
            soilType: 'Black Soil',
            irrigationType: 'Borewell',
            preferredLanguage: data.farmer?.language || 'en',
            cropPhase: 'vegetative'
          }
          
          useAuthStore.getState().setFarmer(profile)
          return { success: true, token: data.token, farmer: profile, isNewUser: data.isNewUser }
        }
      }
      return { success: false }
    } catch (e) {
      console.warn('verifyOTP request failed, running mock authentication bypass (code: 123456):', e)
      if (otp === '123456') {
        const mockToken = 'mock_jwt_token_for_offline_setup'
        const mockProfile: FarmerContext = {
          farmerId: 'farmer_' + Math.random().toString(36).substring(7),
          name: 'Rajesh Gowda',
          phone,
          state: 'Karnataka',
          district: 'Mandya',
          block: 'Maddi block',
          registeredCrops: ['Paddy'],
          landAcres: 2.5,
          soilType: 'Red Soil',
          irrigationType: 'Canal',
          preferredLanguage: 'kn',
          cropPhase: 'flowering'
        }
        await useAuthStore.getState().setToken(mockToken)
        useAuthStore.getState().setFarmer(mockProfile)
        return { success: true, token: mockToken, farmer: mockProfile, isNewUser: true }
      }
      return { success: false }
    }
  }

  async saveSetup(profile: FarmerContext): Promise<boolean> {
    try {
      const token = useAuthStore.getState().token
      const response = await fetch(`${API_BASE}/farmer/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: profile.name,
          location: {
            state: profile.state,
            district: profile.district,
            village: profile.block
          },
          language: profile.preferredLanguage,
          farmSize: profile.landAcres,
          preferredCrops: profile.registeredCrops
        }),
        signal: AbortSignal.timeout(5000)
      })

      if (response.ok) {
        useAuthStore.getState().setFarmer(profile)
        return true
      }
      return false
    } catch (e) {
      console.warn('saveSetup request failed, updating local Zustand state offline:', e)
      useAuthStore.getState().setFarmer(profile)
      return true
    }
  }

  async onboard(profile: FarmerContext): Promise<boolean> {
    try {
      const token = useAuthStore.getState().token
      const response = await fetch(`${API_BASE}/farmer/onboard`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: profile.name,
          location: {
            state: profile.state,
            district: profile.district,
            village: profile.block
          },
          language: profile.preferredLanguage,
          farmSize: profile.landAcres,
          preferredCrops: profile.registeredCrops,
          soilType: profile.soilType,
          irrigationType: profile.irrigationType,
          landAcres: profile.landAcres
        }),
        signal: AbortSignal.timeout(5000)
      })

      if (response.ok) {
        useAuthStore.getState().setFarmer(profile)
        useAuthStore.getState().setOnboarded(true)
        return true
      }
      return false
    } catch (e) {
      console.warn('onboard request failed, updating local Zustand state offline:', e)
      useAuthStore.getState().setFarmer(profile)
      useAuthStore.getState().setOnboarded(true)
      return true
    }
  }

  async verifyBiometricToken(): Promise<boolean> {
    try {
      const token = useAuthStore.getState().token
      if (!token) return false

      const response = await fetch(`${API_BASE}/auth/biometric-verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        signal: AbortSignal.timeout(3000)
      })

      if (response.ok) {
        const data = await response.json()
        return !!data.valid
      }
      return false
    } catch (e) {
      console.warn('Biometric verify server call failed, offline bypass using existing token state:', e)
      return useAuthStore.getState().isAuthenticated
    }
  }
}

export const authService = new AuthService()
export default authService;
