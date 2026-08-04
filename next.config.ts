import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* This repository sits below another package-lock.json. Pinning the app root
     keeps Turbopack from watching the whole Desktop tree or resolving against
     the wrong lockfile. */
  turbopack: { root: process.cwd() },
  /* The glossary became /how-email-works: "glossary" is the lowest-intent word
     in a navigation bar, and the page now answers a question people actually
     type. Permanent, because the old URLs were live and are linked from every
     rule page's inline definitions. */
  async redirects() {
    return [
      { source: "/glossary", destination: "/how-email-works", permanent: true },
      { source: "/glossary/:term", destination: "/how-email-works/:term", permanent: true },
    ];
  },
};

export default nextConfig;
