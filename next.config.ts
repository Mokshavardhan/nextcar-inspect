import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdfkit", "sharp", "bcryptjs", "nodemailer"],
  outputFileTracingIncludes: {
    "/**": ["./node_modules/.prisma/client/**/*"],
    "/api/bookings/[id]/report": ["./node_modules/pdfkit/js/data/**/*"],
    "/api/bookings/[id]/review": ["./node_modules/pdfkit/js/data/**/*"],
  },
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
