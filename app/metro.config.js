const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

config.resolver.extraNodeModules = {
  'better-sqlite3': path.resolve(__dirname, './src/db/better-sqlite-stub.js'),
  'sqlite3': path.resolve(__dirname, './src/db/better-sqlite-stub.js')
};

module.exports = config;
