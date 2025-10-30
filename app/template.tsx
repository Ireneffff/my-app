import type { ReactNode } from "react";

export default function Template({ children }: { children: ReactNode }) {
  return <div className="flex flex-1 flex-col motion-safe:animate-page-fade">{children}</div>;
}
