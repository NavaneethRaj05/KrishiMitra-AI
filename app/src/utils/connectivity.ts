import { useOfflineStore } from '../store/useOfflineStore'

class ConnectivityManager {
  private isChecking = false

  async checkConnection(): Promise<boolean> {
    try {
      // Fast check by pinging a reliable domain with no-cors mode
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 3000)
      
      const getHealthUrl = () => {
        if (process.env.EXPO_PUBLIC_API_URL) {
          return process.env.EXPO_PUBLIC_API_URL.replace(/\/api\/?$/, '/health')
        }
        if (typeof window !== 'undefined' && window.location?.hostname) {
          return `http://${window.location.hostname}:5000/health`
        }
        return 'http://10.0.2.2:5000/health'
      }
      
      const healthUrl = getHealthUrl()
      const response = await fetch(healthUrl, {
        method: 'GET',
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      const connected = response.status >= 200 && response.status < 400
      useOfflineStore.getState().setConnected(connected)
      return connected
    } catch {
      useOfflineStore.getState().setConnected(false)
      return false
    }
  }

  startMonitoring() {
    if (this.isChecking) return
    this.isChecking = true

    // Check immediately on start, then poll every 15 seconds to conserve battery
    this.checkConnection()
    const intervalId = setInterval(() => {
      this.checkConnection()
    }, 15000)

    return () => {
      clearInterval(intervalId)
      this.isChecking = false
    }
  }
}

export const connectivityManager = new ConnectivityManager()
