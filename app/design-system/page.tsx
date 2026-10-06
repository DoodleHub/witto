import type { Metadata } from "next";
import { DesignSystemView } from "@/components/design-system/design-system-view";

export const metadata: Metadata = {
  title: "Design system — witto",
};

export default function DesignSystemPage() {
  return <DesignSystemView />;
}
