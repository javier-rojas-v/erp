"use client";

import dynamic from "next/dynamic";

const Toaster = dynamic(
  () => import("@/components/ui/toast").then((module) => module.Toaster),
  { ssr: false }
);

export function ClientToaster() {
  return <Toaster />;
}
