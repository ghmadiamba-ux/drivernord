/** @type {import('next').NextConfig} */
// Note (2026-08-27): the previous unconditional "/" → "/chaufforer" redirect
// assumed the whole business was the driver landing page. DriverNord Bemanning
// now has a real company-wide homepage at app/page.tsx serving both companies
// and workers, so the redirect has been removed. /chaufforer remains a live,
// worker-focused page reachable from navigation — no route was deleted.
const nextConfig = {};

module.exports = nextConfig;
