"use client";

import React, { useEffect, useRef, useState } from "react";

type MermaidProps = {
  chart: string;
  className?: string;
};

export function Mermaid({ chart, className = "" }: MermaidProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;

    async function renderDiagram() {
      try {
        const mermaid = (await import("mermaid")).default;
        
        mermaid.initialize({
          startOnLoad: false,
          theme: "base",
          securityLevel: "loose",
          themeVariables: {
            primaryColor: "#eef5ed",
            primaryTextColor: "#182722",
            primaryBorderColor: "#e2ebe0",
            lineColor: "#1c7c54",
            secondaryColor: "#eef5ed",
            tertiaryColor: "#f7faf6",
          },
        });

        if (containerRef.current) {
          const id = `mermaid-render-${Math.floor(Math.random() * 100000)}`;
          
          // Set container's inner HTML to raw text before rendering
          containerRef.current.innerHTML = chart;
          
          const { svg: renderedSvg } = await mermaid.render(id, chart);
          
          if (isMounted) {
            setSvg(renderedSvg);
            setError(false);
          }
        }
      } catch (err) {
        console.error("Mermaid rendering failed:", err);
        if (isMounted) {
          setError(true);
        }
      }
    }

    renderDiagram();

    return () => {
      isMounted = false;
    };
  }, [chart]);

  if (error) {
    return (
      <pre className="p-4 rounded-xl bg-red-50 text-red-700 text-xs overflow-auto max-w-full">
        {chart}
      </pre>
    );
  }

  return (
    <div className={`w-full overflow-x-auto flex justify-center py-4 ${className}`}>
      {svg ? (
        <div 
          className="w-full max-w-full flex justify-center [&>svg]:w-full [&>svg]:max-w-full [&>svg]:h-auto"
          dangerouslySetInnerHTML={{ __html: svg }} 
        />
      ) : (
        <div className="flex items-center justify-center p-8 text-sm text-[color:var(--muted)] font-medium">
          <span className="animate-pulse">Generating diagram...</span>
        </div>
      )}
      {/* Hidden container used for initial mermaid parsing */}
      <div ref={containerRef} className="hidden" />
    </div>
  );
}
