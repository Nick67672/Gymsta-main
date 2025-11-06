const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Use compiled entry points for node modules (helps Reanimated on Expo 54)
config.resolver.unstable_enablePackageExports = false;
config.resolver.mainFields = ['main', 'module', 'react-native', 'browser'];

// Add resolver configuration to handle Node.js modules
config.resolver.alias = {
  ...config.resolver.alias,
  '@': path.resolve(__dirname),
  crypto: require.resolve('expo-crypto'),
  stream: require.resolve('readable-stream'),
  url: require.resolve('react-native-url-polyfill'),
  https: false,
  http: false,
  fs: false,
  net: false,
  tls: false,
  ws: false,
};

// Add platform-specific extensions
config.resolver.platforms = ['ios', 'android', 'web'];

// Disable inline requires to prevent memory issues
config.transformer = {
  ...config.transformer,
  getTransformOptions: async () => ({
    transform: {
      experimentalImportSupport: false,
      inlineRequires: false,
    },
  }),
};

// Increase memory limits
config.maxWorkers = 2;

module.exports = config; 