import React from "react";

export function BrandLogo({
  variant = "dark",
  subtitle,
}: {
  variant?: "dark" | "light";
  subtitle?: string;
}) {
  const isLight = variant === "light";
  return (
    <div className="inline-flex items-center gap-2.5">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#2563EB] text-white shadow-sm">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M12 2L4 5.5V11.5C4 16.74 7.41 21.64 12 23C16.59 21.64 20 16.74 20 11.5V5.5L12 2Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path
            d="M9 12.2L11 14.2L15.5 9.7"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <div className="leading-tight">
        <span
          className={`block text-base font-bold tracking-tight ${
            isLight ? "text-white" : "text-[#101B35]"
          }`}
        >
          NextCar <span className="text-[#2563EB]">Inspect</span>
        </span>
        {subtitle && (
          <span
            className={`block text-[11px] font-medium ${
              isLight ? "text-slate-300" : "text-slate-500"
            }`}
          >
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );
}

