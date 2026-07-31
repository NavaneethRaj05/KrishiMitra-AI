import React, { useState, useEffect } from 'react'
import { StyleSheet, View, TouchableOpacity, Alert, ScrollView } from 'react-native'
import * as LocalAuthentication from 'expo-local-authentication'
import { secureStore } from '../../utils/secureStore'
import { Fingerprint } from 'lucide-react-native'
import { colors, spacing, radii } from '../../components/ui/tokens'
import { VaaniText } from '../../components/ui/VaaniText'
import { VaaniInput } from '../../components/ui/VaaniInput'
import { VaaniButton } from '../../components/ui/VaaniButton'
import { useAuthStore } from '../../store/useAuthStore'
import { authService } from '../../services/authService'

export const LoginScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [phone, setPhone] = useState('')
  const [pin, setPin] = useState('')
  const [loading, setLoading] = useState(false)
  const [hasBiometrics, setHasBiometrics] = useState(false)

  useEffect(() => {
    checkBiometricAvailability()
    // Pre-fill phone if cached in MMKV
    const savedFarmer = useAuthStore.getState().farmer
    if (savedFarmer?.phone) {
      setPhone(savedFarmer.phone)
    }
  }, [])

  const checkBiometricAvailability = async () => {
    const compatible = await LocalAuthentication.hasHardwareAsync()
    const enrolled = await LocalAuthentication.isEnrolledAsync()
    setHasBiometrics(compatible && enrolled)
  }

  const handleBiometricLogin = async () => {
    try {
      const savedToken = await secureStore.getItemAsync('auth_token')
      if (!savedToken) {
        Alert.alert('Error', 'Please log in with your phone and OTP first to register biometrics.')
        return
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock KrishiMitra AI with biometrics',
        fallbackLabel: 'Enter PIN instead',
      })

      if (result.success) {
        setLoading(true)
        const valid = await authService.verifyBiometricToken()
        setLoading(false)
        if (valid) {
          navigation.replace('Home')
        } else {
          Alert.alert('Session Expired', 'Please register again using OTP.')
        }
      }
    } catch (e) {
      console.warn('Biometric authentication failed:', e)
    }
  }

  const handlePinLogin = async () => {
    if (phone.length < 10) {
      Alert.alert('Error', 'Please enter a valid phone number.')
      return
    }
    if (pin.length < 4) {
      Alert.alert('Error', 'PIN must be at least 4 digits.')
      return
    }

    setLoading(true)
    // For demo purposes, PIN triggers verifyOTP or mock check.
    // If PIN matches saved PIN in SecureStore, login directly.
    const savedPin = await secureStore.getItemAsync(`pin:${phone}`)
    if (savedPin === pin || pin === '1234') {
      // Successful login
      const res = await authService.verifyOTP(phone, '123456') // bypass with master OTP
      setLoading(false)
      if (res.success) {
        // Save PIN
        await secureStore.setItemAsync(`pin:${phone}`, pin)
        if (res.isNewUser || !useAuthStore.getState().isOnboarded) {
          navigation.replace('FarmerSetup')
        } else {
          navigation.replace('Home')
        }
      } else {
        Alert.alert('Error', 'Login failed. Please check credentials.')
      }
    } else {
      setLoading(false)
      Alert.alert('Error', 'Invalid PIN. Hint: Use 1234 to bypass.')
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.card}>
        <VaaniText size="xl" weight="bold" color={colors.green.bright} style={styles.title}>
          Sign In
        </VaaniText>
        
        <VaaniText size="sm" color={colors.text.secondary} style={styles.subTitle}>
          Enter your registered phone and PIN to unlock Vaani.
        </VaaniText>

        <VaaniInput
          keyboardType="phone-pad"
          maxLength={10}
          placeholder="Phone Number"
          value={phone}
          onChangeText={setPhone}
          label="Registered Phone"
        />

        <VaaniInput
          keyboardType="number-pad"
          maxLength={4}
          secureTextEntry
          placeholder="4-digit PIN"
          value={pin}
          onChangeText={setPin}
          label="Secure PIN"
        />

        <VaaniButton
          title="Sign In"
          onPress={handlePinLogin}
          loading={loading}
          style={styles.button}
        />

        <VaaniButton
          title="Login with Demo Account"
          variant="secondary"
          onPress={async () => {
            setLoading(true)
            const demoPhone = '9999999999'
            const demoPin = '1234'
            setPhone(demoPhone)
            setPin(demoPin)
            const res = await authService.verifyOTP(demoPhone, '123456')
            setLoading(false)
            if (res.success) {
              await secureStore.setItemAsync(`pin:${demoPhone}`, demoPin)
              if (res.isNewUser || !useAuthStore.getState().isOnboarded) {
                navigation.replace('FarmerSetup')
              } else {
                navigation.replace('Home')
              }
            } else {
              Alert.alert('Error', 'Demo login failed.')
            }
          }}
          loading={loading}
          style={styles.demoButton}
        />

        {hasBiometrics && (
          <TouchableOpacity onPress={handleBiometricLogin} style={styles.biometricButton}>
            <Fingerprint size={32} color={colors.green.bright} />
            <VaaniText size="sm" color={colors.text.secondary} style={styles.biometricText}>
              Unlock with fingerprint/face
            </VaaniText>
          </TouchableOpacity>
        )}

        <TouchableOpacity onPress={() => navigation.navigate('Register')} style={styles.registerLink}>
          <VaaniText size="sm" color={colors.text.secondary} align="center">
            New user? <VaaniText size="sm" weight="semibold" color={colors.green.bright}>Register here</VaaniText>
          </VaaniText>
        </TouchableOpacity>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.bg.base,
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  card: {
    backgroundColor: colors.bg.card,
    borderColor: colors.border.default,
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: spacing.xl,
  },
  title: {
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subTitle: {
    marginBottom: spacing.xl,
    textAlign: 'center',
  },
  button: {
    marginTop: spacing.md,
    width: '100%',
  },
  demoButton: {
    marginTop: spacing.sm,
    width: '100%',
  },
  biometricButton: {
    alignItems: 'center',
    marginTop: spacing.xl,
    padding: spacing.sm,
  },
  biometricText: {
    marginTop: spacing.sm,
  },
  registerLink: {
    marginTop: spacing.xl,
  },
})
export default LoginScreen;
