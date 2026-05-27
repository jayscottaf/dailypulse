"use client";

import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CopyReportButton({ markdown }: { markdown: string }) {
  return (
    <Button
      type="button"
      variant="outline"
      onClick={() => navigator.clipboard.writeText(markdown)}
    >
      <Copy /> Copy report
    </Button>
  );
}
