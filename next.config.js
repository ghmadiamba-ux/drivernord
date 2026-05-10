/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source:      '/',
        destination: '/chaufforer',
        permanent:   false,
      },
    ];
  },
};

module.exports = nextConfig;
