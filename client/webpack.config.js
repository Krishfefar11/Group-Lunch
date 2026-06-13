const path    = require('path');
const fs      = require('fs');
const webpack = require('webpack');
const HtmlWebpackPlugin      = require('html-webpack-plugin');
const CopyWebpackPlugin      = require('copy-webpack-plugin');
const CompressionPlugin      = require('compression-webpack-plugin');

// ── Load .env for local dev (CI injects vars directly) ─────────────────────
// Inline parser — no dotenv dependency needed.
// Never overwrites vars already set in the environment (CI secrets win).
const envFile = path.join(__dirname, '.env');
if (fs.existsSync(envFile)) {
  fs.readFileSync(envFile, 'utf8')
    .split('\n')
    .filter((l) => l.trim() && !l.startsWith('#') && l.includes('='))
    .forEach((l) => {
      const [k, ...rest] = l.split('=');
      const key = k.trim();
      if (key && !process.env[key]) {
        process.env[key] = rest.join('=').trim().replace(/^["']|["']$/g, '');
      }
    });
}

module.exports = (env, argv) => {
  const isProd = argv.mode === 'production';

  return {
    entry: './src/index.js',

    output: {
      path:      path.resolve(__dirname, 'dist'),
      filename:  isProd ? '[name].[contenthash:8].js' : '[name].js',
      chunkFilename: isProd ? '[name].[contenthash:8].chunk.js' : '[name].chunk.js',
      publicPath: '/',
      clean: true,          // wipe dist/ before every build
    },

    module: {
      rules: [
        {
          test:    /\.(js|jsx)$/,
          exclude: /node_modules/,
          use:     { loader: 'babel-loader' },
        },
        {
          test: /\.css$/,
          use:  ['style-loader', 'css-loader'],
        },
      ],
    },

    resolve: {
      extensions: ['.js', '.jsx'],
    },

    // ── Code splitting ────────────────────────────────────────────────────────
    optimization: {
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          // React + React-DOM in their own vendor chunk (cached across deploys)
          react: {
            test:     /[\\/]node_modules[\\/](react|react-dom|react-router-dom)[\\/]/,
            name:     'vendor.react',
            chunks:   'all',
            priority: 30,
          },
          // Other large node_modules
          vendor: {
            test:     /[\\/]node_modules[\\/]/,
            name:     'vendor',
            chunks:   'all',
            priority: 20,
            minSize:  30_000,
          },
        },
      },
      runtimeChunk: 'single', // single runtime chunk shared across all
    },

    plugins: [
      // ── Inject build-time env vars — replaces process.env.X at bundle time ──
      // In CI: vars come from GitHub Actions secrets. Locally: from .env file.
      new webpack.DefinePlugin({
        'process.env.REACT_APP_EMAILJS_SERVICE_ID':  JSON.stringify(process.env.REACT_APP_EMAILJS_SERVICE_ID  || ''),
        'process.env.REACT_APP_EMAILJS_TEMPLATE_ID': JSON.stringify(process.env.REACT_APP_EMAILJS_TEMPLATE_ID || ''),
        'process.env.REACT_APP_EMAILJS_PUBLIC_KEY':  JSON.stringify(process.env.REACT_APP_EMAILJS_PUBLIC_KEY  || ''),
        'process.env.REACT_APP_SERVER_URL':          JSON.stringify(process.env.REACT_APP_SERVER_URL          || (isProd ? 'https://group-lunch.onrender.com' : 'http://localhost:8000')),
        'process.env.NODE_ENV':                      JSON.stringify(argv.mode || 'development'),
      }),

      new HtmlWebpackPlugin({
        template: './public/index.html',
        inject:   true,
      }),

      // Copy static PWA assets from public/ → dist/ (exclude index.html — HtmlWebpackPlugin handles that)
      new CopyWebpackPlugin({
        patterns: [
          {
            from:    'public',
            to:      '.',
            globOptions: { ignore: ['**/index.html'] },
          },
        ],
      }),

      // ── Gzip production bundles — serve .js.gz and .css.gz directly ─────────
      // Nginx/Express serve the pre-compressed file; browser decompresses.
      // Typical saving: 488 KB main.js → ~130 KB on the wire.
      ...(isProd ? [
        new CompressionPlugin({
          test:      /\.(js|css|html|svg)$/,
          algorithm: 'gzip',
          threshold: 10_240,   // skip files < 10 KB (compression overhead not worth it)
          minRatio:  0.8,      // skip if gzip doesn't save at least 20%
        }),
      ] : []),
    ],

    devServer: {
      port:                3000,
      historyApiFallback: true,
      proxy: [
        {
          context: ['/api', '/socket.io'],
          target:  'http://localhost:8000',
          ws:      true,
        },
      ],
      open:           false,   // don't auto-open browser — we manage this
      hot:            true,    // hot module replacement for faster dev
      compress:       true,
      client: {
        overlay: { errors: true, warnings: false },
      },
    },

    // Better source maps
    devtool: isProd ? 'source-map' : 'eval-cheap-module-source-map',
  };
};
