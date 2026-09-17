import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Solo para entornos que no permiten crear procesos auxiliares (spawn EPERM).
  ...(process.env.MOVETE_BUILD_WORKER_THREADS === "1"
    ? { experimental: { workerThreads: true, useTypeScriptCli: false } }
    : {}),
};

export default nextConfig;
