import React, { useState } from 'react'
import { StyleSheet, View, ScrollView, SafeAreaView, TouchableOpacity, Alert } from 'react-native'
import { ArrowLeft, Save, LogOut } from 'lucide-react-native'
import { colors, spacing, radii } from '../../components/ui/tokens'
import { VaaniText } from '../../components/ui/VaaniText'
import { VaaniInput } from '../../components/ui/VaaniInput'
import { VaaniButton } from '../../components/ui/VaaniButton'
import { useAuthStore } from '../../store/useAuthStore'
import { useThemeStore } from '../../store/useThemeStore'
import { authService } from '../../services/authService'
import { setLanguage, getLanguage, getLanguagesList, t } from '../../i18n'

export const SettingsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const authStore = useAuthStore()
  const farmer = authStore.farmer

  const [name, setName] = useState(farmer?.name || '')
  const [district, setDistrict] = useState(farmer?.district || '')
  const [block, setBlock] = useState(farmer?.block || '')
  const [selectedLanguage, setSelectedLanguage] = useState(getLanguage())

  const handleLanguageChange = (langCode: string) => {
    setSelectedLanguage(langCode)
    setLanguage(langCode)
    if (farmer) {
      useAuthStore.getState().setFarmer({
        ...farmer,
        preferredLanguage: langCode
      })
    }
  }

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Name cannot be empty.')
      return
    }

    setLanguage(selectedLanguage)

    const updatedProfile = {
      ...farmer!,
      name,
      district,
      block,
      preferredLanguage: selectedLanguage
    }

    const success = await authService.saveSetup(updatedProfile)
    if (success) {
      Alert.alert('Success', t('settings.saved'))
      navigation.goBack()
    } else {
      Alert.alert('Error', 'Failed to update settings.')
    }
  }

  const handleLogout = () => {
    authStore.logout()
    navigation.replace('Welcome')
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg.base }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border.default }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <VaaniText size="md" weight="bold" color={colors.text.primary}>
          {t('tabs.settings')}
        </VaaniText>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={handleSave} style={[styles.backBtn, { marginRight: spacing.sm }]}>
            <Save size={20} color={colors.green.bright} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleLogout} style={styles.backBtn}>
            <LogOut size={20} color={colors.red} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Profile Details */}
        <View style={styles.section}>
          <VaaniText size="base" weight="semibold" style={styles.sectionTitle} color={colors.text.primary}>
            {t('sidebar.farm_profile')}
          </VaaniText>
          
          <VaaniInput
            value={name}
            onChangeText={setName}
            label={t('onboarding.your_name')}
          />
          <VaaniInput
            value={farmer?.phone || ''}
            editable={false}
            label={t('auth.enter_phone')}
            style={styles.disabledInput}
          />
        </View>

        {/* Location Details */}
        <View style={styles.section}>
          <VaaniText size="base" weight="semibold" style={styles.sectionTitle} color={colors.text.primary}>
            {t('onboarding.step_location')}
          </VaaniText>
          
          <VaaniInput
            value={district}
            onChangeText={setDistrict}
            label={t('onboarding.district')}
          />
          <VaaniInput
            value={block}
            onChangeText={setBlock}
            label={t('onboarding.block')}
          />
        </View>

        {/* Preferred Language */}
        <View style={styles.section}>
          <VaaniText size="base" weight="semibold" style={styles.sectionTitle} color={colors.text.primary}>
            {t('home.choose_language')}
          </VaaniText>
          <View style={styles.languageGrid}>
            {getLanguagesList().map((lang) => {
              const isSelected = selectedLanguage === lang.code
              return (
                <TouchableOpacity
                  key={lang.code}
                  onPress={() => handleLanguageChange(lang.code)}
                  style={[
                    styles.langCard, 
                    { backgroundColor: colors.bg.card, borderColor: colors.border.default },
                    isSelected && { borderColor: colors.green.bright, backgroundColor: colors.green.dim }
                  ]}
                >
                  <VaaniText size="base" style={styles.flag}>{lang.flag}</VaaniText>
                  <VaaniText size="sm" weight={isSelected ? 'bold' : 'regular'} color={isSelected ? colors.green.bright : colors.text.primary}>
                    {lang.name}
                  </VaaniText>
                </TouchableOpacity>
              )
            })}
          </View>
        </View>

        {/* Action Controls */}
        <View style={styles.btnSection}>
          <VaaniButton
            title={t('onboarding.finish')}
            onPress={handleSave}
            style={styles.saveBtn}
          />
          
          <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
            <LogOut size={20} color={colors.red} style={styles.logoutIcon} />
            <VaaniText size="sm" color={colors.red} weight="bold">
              {t('sidebar.log_out')}
            </VaaniText>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.bg.base,
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 56,
    paddingHorizontal: spacing.base,
    borderBottomColor: colors.border.default,
    borderBottomWidth: 1,
  },
  backBtn: {
    padding: spacing.sm,
  },
  scrollContent: {
    padding: spacing.base,
    paddingBottom: 120,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    marginBottom: spacing.md,
    color: colors.sand.bright,
  },
  disabledInput: {
    opacity: 0.6,
    backgroundColor: colors.bg.base,
  },
  languageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  langCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg.card,
    borderColor: colors.border.default,
    borderRadius: radii.md,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.md,
    width: '48%',
  },
  langCardSelected: {
    borderColor: colors.green.bright,
    backgroundColor: colors.green.dim,
  },
  flag: {
    marginRight: spacing.sm,
  },
  btnSection: {
    marginTop: spacing.xl,
    alignItems: 'center',
  },
  saveBtn: {
    width: '100%',
    marginBottom: spacing.lg,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  logoutIcon: {
    marginRight: spacing.sm,
  },
})
export default SettingsScreen;
