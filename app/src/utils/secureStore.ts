import { Platform } from 'react-native'
import * as ExpoSecureStore from 'expo-secure-store'

export const secureStore = {
  getItemAsync: async (key: string): Promise<string | null> => {
    if (Platform.OS === 'web') {
      try {
        return localStorage.getItem(key)
      } catch (e) {
        return null
      }
    }
    try {
      return await ExpoSecureStore.getItemAsync(key)
    } catch (e) {
      return null
    }
  },

  setItemAsync: async (key: string, value: string): Promise<void> => {
    if (Platform.OS === 'web') {
      try {
        localStorage.setItem(key, value)
      } catch (e) {}
      return
    }
    try {
      await ExpoSecureStore.setItemAsync(key, value)
    } catch (e) {}
  },

  deleteItemAsync: async (key: string): Promise<void> => {
    if (Platform.OS === 'web') {
      try {
        localStorage.removeItem(key)
      } catch (e) {}
      return
    }
    try {
      await ExpoSecureStore.deleteItemAsync(key)
    } catch (e) {}
  }
}
