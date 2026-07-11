"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { X, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";

type ImageModalProps = {
  src: string;
  alt: string;
  caption?: string;
  width?: number;
  height?: number;
  className?: string;
};

export function ImageModal({
  src,
  alt,
  caption,
  width = 1200,
  height = 720,
  className = "",
}: ImageModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [zoom, setZoom] = useState(1);

  // Prevent scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
      setZoom(1); // Reset zoom on close
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const toggleModal = () => setIsOpen(!isOpen);

  return (
    <>
      {/* Image Thumbnail */}
      <div 
        onClick={toggleModal}
        className={`group relative overflow-hidden rounded-2xl border border-[color:var(--line)] bg-white cursor-zoom-in hover:shadow-lg transition-all duration-300 ${className}`}
      >
        <div className="relative aspect-[16/10] overflow-hidden bg-stone-50">
          <Image
            src={src}
            alt={alt}
            width={width}
            height={height}
            className="h-full w-full object-contain p-2 transition-transform duration-500 group-hover:scale-[1.03]"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 flex items-center justify-center transition-colors duration-300">
            <span className="opacity-0 group-hover:opacity-100 bg-white/90 backdrop-blur-md text-[color:var(--ink)] font-bold text-xs px-3 py-2 rounded-xl shadow-md border border-[color:var(--line)] flex items-center gap-1.5 transition-all duration-300 scale-95 group-hover:scale-100">
              <Maximize2 size={13} className="text-[color:var(--green)]" />
              View Larger
            </span>
          </div>
        </div>
        {caption && (
          <div className="border-t border-[color:var(--line)] bg-white px-4 py-2.5 text-xs font-bold text-[color:var(--muted)] uppercase tracking-wider">
            {caption}
          </div>
        )}
      </div>

      {/* Full-Screen Modal Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 bg-[color:var(--ink)]/95 backdrop-blur-xl animate-in fade-in duration-300"
          onClick={toggleModal}
        >
          {/* Modal Header Controls */}
          <div className="absolute top-4 right-4 flex items-center gap-2 z-50" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setZoom(z => Math.min(z + 0.25, 3))}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white active:scale-95 transition-all cursor-pointer shadow-md"
              title="Zoom In"
            >
              <ZoomIn size={18} />
            </button>
            <button
              onClick={() => setZoom(z => Math.max(z - 0.25, 0.75))}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white active:scale-95 transition-all cursor-pointer shadow-md"
              title="Zoom Out"
            >
              <ZoomOut size={18} />
            </button>
            <button
              onClick={toggleModal}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white active:scale-95 transition-all cursor-pointer shadow-md"
              title="Close"
            >
              <X size={18} />
            </button>
          </div>

          {/* Large Image Container */}
          <div 
            className="relative flex flex-col items-center max-w-6xl w-full h-[75vh] select-none"
            onClick={(e) => e.stopPropagation()}
          >
            <div 
              className="relative w-full h-full transition-transform duration-200 ease-out"
              style={{ transform: `scale(${zoom})` }}
            >
              <Image
                src={src}
                alt={alt}
                fill
                className="object-contain p-4"
                sizes="(max-width: 1200px) 100vw, 1200px"
                priority
              />
            </div>
          </div>

          {/* Modal Caption */}
          {alt && (
            <div 
              className="mt-6 text-center max-w-2xl px-6 py-3 rounded-2xl bg-white/5 border border-white/10 text-white/90 text-sm font-semibold backdrop-blur-md"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="font-extrabold uppercase text-[10px] tracking-widest text-emerald-400 mb-0.5">Research Diagram</p>
              {alt}
            </div>
          )}
        </div>
      )}
    </>
  );
}
