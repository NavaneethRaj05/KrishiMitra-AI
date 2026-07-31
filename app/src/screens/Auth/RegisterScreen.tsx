import React, { useState } from 'react'
import { StyleSheet, View, TouchableOpacity, ScrollView, Alert } from 'react-native'
import { colors, spacing, radii } from '../../components/ui/tokens'
import { VaaniText } from '../../components/ui/VaaniText'
import { VaaniInput } from '../../components/ui/VaaniInput'
import { VaaniButton } from '../../components/ui/VaaniButton'
import { authService } from '../../services/authService'
import { t } from '../../i18n'
import { useAuthStore } from '../../store/useAuthStore'

export const RegisterScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState<'phone' | 'otp'>('phone')
  const [loading, setLoading] = useState(false)

  const handleSendOTP = async () => {
    if (phone.length < 10) {
      Alert.alert('Error', 'Please enter a valid 10-digit phone number.')
      return
    }
    setLoading(true)
    const success = await authService.sendOTP(phone)
    setLoading(false)
    if (success) {
      setStep('otp')
    } else {
      Alert.alert('Error', 'Failed to send OTP. Please try again.')
    }
  }

  const handleVerifyOTP = async () => {
    if (otp.length < 6) {
      Alert.alert('Error', 'Please enter a 6-digit OTP.')
      return
    }
    setLoading(true)
    const res = await authService.verifyOTP(phone, otp)
    setLoading(false)
    if (res.success) {
      if (res.isNewUser) {
        navigation.replace('FarmerSetup')
      } else {
        navigation.replace('Home')
      }
    } else {
      Alert.alert('Error', 'Invalid OTP. Enter 123456 to bypass offline.')
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.card}>
        <VaaniText size="xl" weight="bold" color={colors.green.bright} style={styles.title}>
          {t('auth.welcome_title')}
        </VaaniText>
        
        {step === 'phone' ? (
          <>
            <VaaniText size="base" color={colors.text.secondary} style={styles.subTitle}>
              {t('auth.enter_phone')}
            </VaaniText>
            
            <VaaniInput
              keyboardType="phone-pad"
              maxLength={10}
              placeholder="e.g. 9876543210"
              value={phone}
              onChangeText={setPhone}
              label="Phone Number"
            />
            
            <VaaniButton
              title="Send OTP"
              onPress={handleSendOTP}
              loading={loading}
              style={styles.button}
            />

            <VaaniButton
              title="Login with Demo Account"
              variant="secondary"
              onPress={async () => {
                setLoading(true)
                const demoPhone = '9999999999'
                const res = await authService.verifyOTP(demoPhone, '123456')
                setLoading(false)
                if (res.success) {
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
          </>
        ) : (
          <>
            <VaaniText size="base" color={colors.text.secondary} style={styles.subTitle}>
              {t('auth.enter_otp', { phone })}
            </VaaniText>
            
            <VaaniInput
              keyboardType="number-pad"
              maxLength={6}
              placeholder="Enter 6-digit OTP"
              value={otp}
              onChangeText={setOtp}
              label="One-Time PIN"
            />
            
            <VaaniButton
              title="Verify OTP"
              onPress={handleVerifyOTP}
              loading={loading}
              style={styles.button}
            />

            <TouchableOpacity onPress={() => setStep('phone')} style={styles.backLink}>
              <VaaniText size="sm" color={colors.green.bright} align="center">
                ← Edit phone number
              </VaaniText>
            </TouchableOpacity>
          </>
        )}
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
  backLink: {
    marginTop: spacing.lg,
  },
})
export default RegisterScreen;
