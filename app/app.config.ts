import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'KrishiMitraAI',
  slug: 'krishimitraai',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'dark',
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#0F0D08',
  },
  assetBundlePatterns: [
    '**/*'
  ],
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'in.krishimitraai.app',
    infoPlist: {
      NSCameraUsageDescription: 'KrishiMitraAI needs camera access to scan crop leaves for pest and disease detection.',
      NSMicrophoneUsageDescription: 'KrishiMitraAI needs microphone access for voice-based agricultural search.',
    }
  },
  android: {
    package: 'in.krishimitraai.app',
    versionCode: 1,
    permissions: [
      'CAMERA',
      'RECORD_AUDIO',
      'READ_EXTERNAL_STORAGE',
      'WRITE_EXTERNAL_STORAGE',
      'RECEIVE_BOOT_COMPLETED'
    ]
  },
  web: {
    favicon: './assets/favicon.png'
  }
});
