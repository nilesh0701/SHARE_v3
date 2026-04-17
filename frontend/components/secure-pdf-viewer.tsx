"use client";

import { useEffect } from "react";

type SecurePDFViewerProps = {
  streamUrl: string;
  className?: string;
};

export default function SecurePDFViewer({ streamUrl, className }: SecurePDFViewerProps) {
  useEffect(() => {
    const blockShortcuts = (event: KeyboardEvent) => {
      if (!event.ctrlKey) return;
      const key = event.key.toLowerCase();
      if (key === "s" || key === "p" || key === "u") {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    window.addEventListener("keydown", blockShortcuts);
    return () => window.removeEventListener("keydown", blockShortcuts);
  }, []);

  return (
    <div
      onContextMenu={(e) => e.preventDefault()}
      className={`select-none ${className ?? ""}`}
    >
      <style>{`
        @media print {
          body { display: none !important; }
        }
      `}</style>
      <iframe
        src={`${streamUrl}#toolbar=0&navpanes=0&scrollbar=0`}
        title="Secure medical report viewer"
        className="h-[75vh] w-full rounded-xl border border-indigo-100 bg-white"
      />
    </div>
  );
}
