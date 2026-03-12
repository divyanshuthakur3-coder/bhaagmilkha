const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// In production, we ensure debugger and development overlays are disabled
if (process.env.NODE_ENV === 'production') {
  config.transformer.getTransformOptions = async () => ({
    transform: {
      experimentalImportSupport: false,
      inlineRequires: true,
    },
  });
}

module.exports = config;
