const { NxAppWebpackPlugin } = require('@nx/webpack/app-plugin');
const { join, resolve } = require('path');

// Root of the monorepo (two levels up from apps/api-gateway)
const root = resolve(__dirname, '..', '..');

module.exports = {
  output: {
    path: join(__dirname, 'dist'),
    clean: true,
    ...(process.env.NODE_ENV !== 'production' && {
      devtoolModuleFilenameTemplate: '[absolute-resource-path]',
    }),
  },
  resolve: {
    alias: {
      '@app/shared/database': resolve(root, 'libs/shared/database/src/index.ts'),
      '@app/shared/types':    resolve(root, 'libs/shared/types/src/index.ts'),
      '@app/shared/dto':      resolve(root, 'libs/shared/dto/src/index.ts'),
      '@app/shared/constants':resolve(root, 'libs/shared/constants/src/index.ts'),
    },
  },
  plugins: [
    new NxAppWebpackPlugin({
      target: 'node',
      compiler: 'swc',   // SWC transpiles without rootDir restrictions — aliases to .ts files work fine
      main: './src/main.ts',
      tsConfig: './tsconfig.app.json',
      assets: ['./src/assets'],
      optimization: false,
      outputHashing: 'none',
      generatePackageJson: false,
      sourceMap: true,
    }),
  ],
};
