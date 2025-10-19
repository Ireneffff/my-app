import { forwardRef } from "react";
import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

export const HandThumbUpIcon = forwardRef<SVGSVGElement, IconProps>(
  ({ className, ...props }, ref) => (
    <svg
      ref={ref}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
      {...props}
    >
      <path d="M2.4 12.75a3.75 3.75 0 0 1 3.75-3.75h1.5V4.5A1.5 1.5 0 0 1 9.15 3c.591 0 1.163.236 1.582.657l.021.021 3.335 3.335a2.25 2.25 0 0 1 .657 1.591v.048a2.25 2.25 0 0 1-.034.394l-.738 4.428a.75.75 0 0 0 .113.54l1.273 1.909a3 3 0 0 1 .517 1.689v.025A2.625 2.625 0 0 1 13.999 20.5H8.526a4.35 4.35 0 0 1-2.813-1.03l-.616-.513a1.5 1.5 0 0 0-.963-.357H4.5a2.1 2.1 0 0 1-2.1-2.1v-3.75Z" />
    </svg>
  ),
);

HandThumbUpIcon.displayName = "HandThumbUpIcon";

export default HandThumbUpIcon;
