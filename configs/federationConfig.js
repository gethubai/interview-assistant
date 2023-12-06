const { dependencies } = require('../package.json');

const federationConfig = {
  name: 'InterviewAssistant',
  filename: 'remoteEntry.js',
  library: { type: 'module' },
  remotes: {},
  exposes: { './Module': './src/remote-entry.ts' },
  shared: {
    ...dependencies,
    react: {
      singleton: true,
      requiredVersion: dependencies['react'],
    },
    'react-dom': {
      singleton: true,
      requiredVersion: dependencies['react-dom'],
    },
    '@hubai/core': {
      singleton: true,
      requiredVersion: dependencies['@hubai/core'],
    },
  },
};

module.exports = federationConfig;
