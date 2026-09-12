"use client";

import { useEffect, useRef } from "react";
import { designerShell } from "./designer-shell";

export default function Home() {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let cancelled = false;
    let dispose: (() => void) | undefined;
    const initialize = async () => {
      const { mountCftc } = await import("./designer-runtime.js");
      if (!cancelled && root.current) dispose = mountCftc(root.current);
    };
    const script = document.createElement("script");
    script.src = "/designer/echarts.min.js";
    script.onload = initialize;
    script.onerror = initialize;
    document.head.appendChild(script);
    return () => { cancelled = true; dispose?.(); script.remove(); };
  }, []);
  return <div ref={root} dangerouslySetInnerHTML={{ __html: designerShell }} />;
}
