"use client";

import { useEffect, useState } from "react";
import { initAuth } from "@/lib/auth";

export default function AuthBootstrap({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    initAuth();
    setReady(true);
  }, []);

  if (!ready) return null;
  return <>{children}</>;
}
