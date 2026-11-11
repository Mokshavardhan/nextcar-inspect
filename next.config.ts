import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdfkit", "sharp", "bcryptjs", "nodemailer"],
  images: {
    unoptimized: true,
  },
};

export default nextConfig;

