"use client";

import { useEffect, useRef } from "react";

type SecurePDFViewerProps = {
  streamUrl: string;
  className?: string;
};

export default function SecurePDFViewer({ streamUrl, className }: SecurePDFViewerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const blockShortcuts = (event: KeyboardEvent) => {
      if (!event.ctrlKey) return;
      const key = event.key.toLowerCase();
      if (key === "s" || key === "p") {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    node.addEventListener("keydown", blockShortcuts);
    return () => node.removeEventListener("keydown", blockShortcuts);
  }, []);

  return (
    <div
      ref={containerRef}
      onContextMenu={(e) => e.preventDefault()}
      className={`select-none outline-none ${className ?? ""}`}
      tabIndex={0}
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
