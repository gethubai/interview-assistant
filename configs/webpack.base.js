const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { ModuleFederationPlugin } = require('webpack').container;
const federationConfig = require('./federationConfig');
const { name } = require('../package.json');

module.exports = {
  entry: {
    main: path.join(__dirname, '../src/index.js'),
  },

  output: {
    publicPath: 'auto',
    scriptType: 'module',
    libraryTarget: undefined,
    filename: '[name].[contenthash:20].js',
    chunkFilename: '[name].[chunkhash:20].js',
    hashFunction: 'xxhash64',
    pathinfo: false,
    crossOriginLoading: false,
    uniqueName: `extension-${name}`,
  },
  experiments: { outputModule: true },

  module: {
    rules: [
      {
        test: /\.(js|ts)x?$/, // add |ts
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              '@babel/preset-typescript',
              [
                '@babel/preset-env'
              ],
              '@babel/preset-react',
            ],
          },
        },
      },
      {
        test: /\.(css|less)$/,
        use: ["style-loader", "css-loader"]
      }
    ],
  },
  plugins: [
    new ModuleFederationPlugin(federationConfig),
    new HtmlWebpackPlugin({
      template: 'public/index.html',
      title: 'Extension',
      filename: 'index.html',
      chunks: ['main'],
    }),
  ],
  resolve: {
    extensions: ['.tsx', '.ts', '.jsx', '.js', '.json'],
  },
  target: 'web',
};
