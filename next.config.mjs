let userConfig = undefined;
try {
  userConfig = await import('./v0-user-next.config');
} catch (e) {
  // ignore error
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  experimental: {
    webpackBuildWorker: true,
    parallelServerBuildTraces: true,
    parallelServerCompiles: true,
  },
  webpack(config, { isServer }) {
    // Modify webpack config to include node-loader for .node files
    config.resolve.extensions.push('.node'); // Ensure .node extension is resolved
    config.target = 'node'; // Set target to node
    config.node = {
      __dirname: false, // Do not mock __dirname
    };

    config.module.rules.push({
      test: /\.node$/,
      loader: 'node-loader', // Use node-loader for .node files
    });

    return config;
  }
}

mergeConfig(nextConfig, userConfig);
