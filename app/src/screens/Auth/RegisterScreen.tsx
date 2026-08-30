import React, { useState } from 'react'
import { StyleSheet, View, TouchableOpacity, ScrollView, Alert } from 'react-native'
import { colors, spacing, radii } from '../../components/ui/tokens'
import { KrishiMitraAIText } from '../../components/ui/KrishiMitraAIText'
import { KrishiMitraAIInput } from '../../components/ui/KrishiMitraAIInput'
import { KrishiMitraAIButton } from '../../components/ui/KrishiMitraAIButton'
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
        navigation.replace('Onboarding')
      } else {
        navigation.replace('MainTabs')
      }
    } else {
      Alert.alert('Error', 'Invalid OTP. Check the console output for the offline bypass OTP (EXPO_PUBLIC_DEMO_OTP).')
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.card}>
        <KrishiMitraAIText size="xl" weight="bold" color={colors.green.bright} style={styles.title}>
          {t('auth.welcome_title')}
        </KrishiMitraAIText>
        
        {step === 'phone' ? (
          <>
            <KrishiMitraAIText size="base" color={colors.text.secondary} style={styles.subTitle}>
              {t('auth.enter_phone')}
            </KrishiMitraAIText>
            
            <KrishiMitraAIInput
              keyboardType="phone-pad"
              maxLength={10}
              placeholder="e.g. 9876543210"
              value={phone}
              onChangeText={setPhone}
              label="Phone Number"
            />
            
            <KrishiMitraAIButton
              title="Send OTP"
              onPress={handleSendOTP}
              loading={loading}
              style={styles.button}
            />

            <KrishiMitraAIButton
              title="Login with Demo Account"
              variant="secondary"
              onPress={async () => {
                setLoading(true)
                const demoPhone = '9999999999'
                const res = await authService.verifyOTP(demoPhone, '123456')
                setLoading(false)
                if (res.success) {
                  if (res.isNewUser || !useAuthStore.getState().isOnboarded) {
                    navigation.replace('Onboarding')
                  } else {
                    navigation.replace('MainTabs')
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
            <KrishiMitraAIText size="base" color={colors.text.secondary} style={styles.subTitle}>
              {t('auth.enter_otp', { phone })}
            </KrishiMitraAIText>
            
            <KrishiMitraAIInput
              keyboardType="number-pad"
              maxLength={6}
              placeholder="Enter 6-digit OTP"
              value={otp}
              onChangeText={setOtp}
              label="One-Time PIN"
            />
            
            <KrishiMitraAIButton
              title="Verify OTP"
              onPress={handleVerifyOTP}
              loading={loading}
              style={styles.button}
            />

            <TouchableOpacity onPress={() => setStep('phone')} style={styles.backLink}>
              <KrishiMitraAIText size="sm" color={colors.green.bright} align="center">
                ← Edit phone number
              </KrishiMitraAIText>
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
