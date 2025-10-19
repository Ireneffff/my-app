import { forwardRef } from "react";
import type { SVGProps } from "react";

export interface LucideProps extends SVGProps<SVGSVGElement> {
  color?: string;
  size?: number | string;
  strokeWidth?: number | string;
}

export const ThumbsUp = forwardRef<SVGSVGElement, LucideProps>(
  (
    {
      color = "currentColor",
      size = 24,
      strokeWidth = 2,
      ...rest
    },
    ref,
  ) => (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...rest}
    >
      <path d="M7 10v12" />
      <path d="M15 21h4a2 2 0 0 0 2-2l-1-7a2 2 0 0 0-2-2h-6.31l.95-4.57A2 2 0 0 0 11.7 3L7 8.67" />
      <path d="M7 21H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
    </svg>
  ),
);

ThumbsUp.displayName = "ThumbsUp";
