const path = require('path');
const webpack = require('webpack');
const CopyPlugin = require('copy-webpack-plugin');

// Load .env if present (fall back to empty strings)
try { require('dotenv').config({ quiet: true }); } catch (_) { /* dotenv optional */ }

module.exports = {
  mode: 'development',
  devtool: 'source-map',
  entry: {
    caster: './src/caster/caster.ts',
    background: './src/background/background.ts',
    overlay: './src/overlay/overlay.ts',
    scanner: './src/scanner/scanner.ts',
    speakers: './src/speakers/speakers.ts',
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  output: {
    filename: '[name]/[name].js',
    path: path.resolve(__dirname, 'dist'),
    clean: true,
  },
  // Installed desktop resources: the offline ONNX/WASM engine is intentionally
  // larger than a web download. Keep explicit budgets instead of disabling hints.
  performance: { maxAssetSize: 32 * 1024 * 1024, maxEntrypointSize: 768 * 1024 },
  plugins: [
    // Only network configuration and shared logging cross the upstream boundary.
    // Proximity, tracking, camera and WebRTC implementations remain byte-identical.
    new webpack.NormalModuleReplacementPlugin(/core[\\/](config|logging)$/, resource => {
      if (resource.context.startsWith(path.resolve(__dirname, 'src/upstream'))) {
        resource.request = path.resolve(__dirname, 'src/core', resource.request.endsWith('logging') ? 'logging.ts' : 'config.ts');
      }
    }),
    new webpack.DefinePlugin({
      __VOXDRIA_VERSION__: JSON.stringify(require('./package.json').version),
      __PROXCHAT_SERVER__: JSON.stringify(process.env.PROXCHAT_SERVER || 'https://riftvoice-server.onrender.com'),
    }),
    new CopyPlugin({
      patterns: [
        { from: 'src/caster/caster.html', to: 'caster/' },
        { from: 'src/caster/caster.css', to: 'caster/' },
        { from: 'icons', to: 'icons' },
        { from: 'src/background/background.html', to: 'background/' },
        { from: 'src/overlay/overlay.html', to: 'overlay/' },
        { from: 'src/overlay/overlay.css', to: 'overlay/' },
        { from: 'src/scanner/scanner.html', to: 'scanner/' },
        { from: 'src/scanner/scanner.css', to: 'scanner/' },
        { from: 'src/speakers/speakers.html', to: 'speakers/' },
        { from: 'src/speakers/speakers.css', to: 'speakers/' },
        // Champion classifier model + labels
        { from: 'models/champion_classifier.onnx', to: 'models/' },
        { from: 'models/champion_labels.json', to: 'models/' },
        // ONNX Runtime WASM + MJS loader files (both required for WASM backend)
        { from: 'node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded*.wasm', to: 'background/[name][ext]' },
        { from: 'node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded*.mjs', to: 'background/[name][ext]' },
      ],
    }),
  ],
};

