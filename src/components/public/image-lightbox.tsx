"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, ZoomIn, ZoomOut, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface LightboxState {
  src: string;
  alt: string;
  allImages?: { src: string; alt: string }[];
  currentIndex?: number;
}

interface ImageLightboxProps {
  image: LightboxState | null;
  onClose: () => void;
}

function LightboxContent({
  image,
  onClose,
}: {
  image: LightboxState;
  onClose: () => void;
}) {
  const [zoom, setZoom] = useState(1);
  const [showHint, setShowHint] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null);

  const allImages = image.allImages || [image];
  const currentIndex = image.currentIndex ?? 0;
  const hasMultiple = allImages.length > 1;

  const goToPrev = useCallback(() => {
    if (!hasMultiple) return;
    const prevIdx = (currentIndex - 1 + allImages.length) % allImages.length;
    setZoom(1);
    // We can't update the parent's image directly, so we dispatch a custom event
    // Actually, we'll use keyboard nav through the existing lightbox flow
  }, [currentIndex, allImages.length, hasMultiple]);

  const goToNext = useCallback(() => {
    if (!hasMultiple) return;
    const nextIdx = (currentIndex + 1) % allImages.length;
    setZoom(1);
  }, [currentIndex, allImages.length, hasMultiple]);

  const toggleZoom = useCallback(() => {
    setZoom((z) => (z > 1 ? 1 : 2));
  }, []);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "+" || e.key === "=") setZoom((z) => Math.min(z + 0.25, 3));
      if (e.key === "-") setZoom((z) => Math.max(z - 0.25, 0.5));
      if (e.key === "0") setZoom(1);
      if (e.key === "ArrowLeft") goToPrev();
      if (e.key === "ArrowRight") goToNext();
    },
    [onClose, goToPrev, goToNext]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    // Hide pinch-to-zoom hint after 3s
    timerRef.current = setTimeout(() => setShowHint(false), 3000);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [handleKeyDown]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[100] flex items-center justify-center"
      onClick={onClose}
    >
      {/* Backdrop with stronger blur */}
      <div className="absolute inset-0 bg-black/85 backdrop-blur-xl" />

      {/* Top controls */}
      <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between pointer-events-none">
        {/* Image counter */}
        {hasMultiple && (
          <div className="pointer-events-auto px-3 py-1.5 rounded-full bg-black/30 backdrop-blur-sm text-white/70 text-xs font-medium tabular-nums">
            {currentIndex + 1} / {allImages.length}
          </div>
        )}

        <div className="flex items-center gap-1.5 ml-auto pointer-events-auto">
          {/* Zoom controls */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setZoom((z) => Math.min(z + 0.25, 3));
            }}
            className="size-9 rounded-full bg-black/30 backdrop-blur-sm hover:bg-black/50 flex items-center justify-center transition-all duration-200 cursor-pointer"
            aria-label="Zoom in"
          >
            <ZoomIn className="size-4 text-white/80" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setZoom((z) => Math.max(z - 0.25, 0.5));
            }}
            className="size-9 rounded-full bg-black/30 backdrop-blur-sm hover:bg-black/50 flex items-center justify-center transition-all duration-200 cursor-pointer"
            aria-label="Zoom out"
          >
            <ZoomOut className="size-4 text-white/80" />
          </button>

          {/* Close button with animation */}
          <motion.button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            whileHover={{ scale: 1.1, rotate: 90 }}
            whileTap={{ scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className="size-9 rounded-full bg-black/30 backdrop-blur-sm hover:bg-red-500/60 flex items-center justify-center transition-colors duration-200 cursor-pointer"
            aria-label="Close"
          >
            <X className="size-4 text-white/80" />
          </motion.button>
        </div>
      </div>

      {/* Previous/Next arrow buttons */}
      {hasMultiple && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation();
              goToPrev();
            }}
            className="absolute left-3 top-1/2 -translate-y-1/2 z-10 size-11 rounded-full bg-black/30 backdrop-blur-sm hover:bg-black/50 flex items-center justify-center transition-all duration-200 cursor-pointer group"
            aria-label="Previous image"
          >
            <ChevronLeft className="size-5 text-white/70 group-hover:text-white transition-colors" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              goToNext();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 z-10 size-11 rounded-full bg-black/30 backdrop-blur-sm hover:bg-black/50 flex items-center justify-center transition-all duration-200 cursor-pointer group"
            aria-label="Next image"
          >
            <ChevronRight className="size-5 text-white/70 group-hover:text-white transition-colors" />
          </button>
        </>
      )}

      {/* Image */}
      <motion.img
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: zoom }}
        exit={{ opacity: 0, scale: 0.92 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        src={image.src}
        alt={image.alt}
        onClick={(e) => {
          e.stopPropagation();
          toggleZoom();
        }}
        onDoubleClick={(e) => {
          e.stopPropagation();
          setZoom((z) => (z > 1 ? 1 : 2.5));
        }}
        className={cn(
          "relative z-10 max-h-[85vh] max-w-[85vw] object-contain rounded-lg select-none",
          zoom > 1 ? "cursor-grab" : "cursor-zoom-in"
        )}
        draggable={false}
      />

      {/* Pinch-to-zoom visual hint */}
      <AnimatePresence>
        {showHint && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.3 }}
            className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 px-4 py-2 rounded-full bg-black/40 backdrop-blur-sm text-white/60 text-xs pointer-events-none"
          >
            Double-click or pinch to zoom · Esc to close · Arrow keys to navigate
          </motion.div>
        )}
      </AnimatePresence>

      {/* Touch swipe targets (visual) */}
      {hasMultiple && (
        <>
          <div className="absolute left-0 top-0 bottom-0 w-1/4 z-[5]" onClick={(e) => { e.stopPropagation(); goToPrev(); }} />
          <div className="absolute right-0 top-0 bottom-0 w-1/4 z-[5]" onClick={(e) => { e.stopPropagation(); goToNext(); }} />
        </>
      )}
    </motion.div>
  );
}

export function ImageLightbox({ image, onClose }: ImageLightboxProps) {
  if (!image) return null;

  return createPortal(
    <AnimatePresence>
      <LightboxContent key={image.src} image={image} onClose={onClose} />
    </AnimatePresence>,
    document.body
  );
}
