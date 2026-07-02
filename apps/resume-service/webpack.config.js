const { NxAppWebpackPlugin } = require('@nx/webpack/app-plugin');
const { join, resolve } = require('path');

// Root of the monorepo (two levels up from apps/resume-service)
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
      '@app/shared/langchain':resolve(root, 'libs/shared/langchain/src/index.ts'),
    },
  },
  externals: {
    'pdf-parse': 'commonjs pdf-parse',
  },
  plugins: [
    new NxAppWebpackPlugin({
      target: 'node',
      compiler: 'swc',
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
