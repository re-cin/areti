import { useEffect, useRef } from 'react';

/**
 * The first frame of an animated image (WebP/GIF), drawn once on a canvas so it doesn't play.
 * Used for added pet expressions, like the app's still thumbnails.
 */
export function StillImage({ src, className, size = 48 }: { src: string; className?: string; size?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    let live = true;
    img.onload = () => {
      const canvas = ref.current;
      if (!live || !canvas) return;
      const ratio = window.devicePixelRatio || 1;
      canvas.width = size * ratio;
      canvas.height = size * ratio;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      // Fit the whole frame (contain), centered.
      const scale = Math.min(canvas.width / img.naturalWidth, canvas.height / img.naturalHeight);
      const w = img.naturalWidth * scale;
      const h = img.naturalHeight * scale;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
    };
    img.src = src;
    return () => { live = false; };
  }, [src, size]);
  return <canvas ref={ref} className={className} style={{ width: size, height: size }} aria-hidden="true" />;
}
