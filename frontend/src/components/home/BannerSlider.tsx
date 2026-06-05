import { useEffect, useState, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Slide {
  image_url: string;
  title?: string;
  subtitle?: string;
  link_url?: string;
}

// Auto-advancing, sw-... touch-friendly banner carousel. Pauses on hover,
// loops, with arrows + dots. Driven by admin CMS banners (with a fallback).
export function BannerSlider({ slides, interval = 5000 }: { slides: Slide[]; interval?: number }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = slides.length;

  const go = useCallback((i: number) => setIndex((i + count) % count), [count]);

  useEffect(() => {
    if (count <= 1 || paused) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % count), interval);
    return () => clearInterval(t);
  }, [count, paused, interval]);

  if (count === 0) return null;

  return (
    <div
      className="group relative overflow-hidden rounded-3xl border bg-muted shadow-sm"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Track */}
      <div className="flex transition-transform duration-700 ease-out" style={{ transform: `translateX(-${index * 100}%)` }}>
        {slides.map((s, i) => {
          const Wrapper: any = s.link_url ? "a" : "div";
          const wrapperProps = s.link_url ? { href: s.link_url } : {};
          return (
            <Wrapper key={i} {...wrapperProps} className="relative h-48 w-full shrink-0 sm:h-64 md:h-80">
              <img src={s.image_url} alt={s.title ?? ""} loading={i === 0 ? "eager" : "lazy"} className="h-full w-full object-cover" />
              {(s.title || s.subtitle) && (
                <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/30 to-transparent" />
              )}
              {(s.title || s.subtitle) && (
                <div className="absolute inset-y-0 left-0 flex max-w-xl flex-col justify-center gap-2 p-6 text-white sm:p-10">
                  {s.title && <h3 className="text-xl font-bold drop-shadow-sm sm:text-3xl">{s.title}</h3>}
                  {s.subtitle && <p className="text-sm text-white/85 sm:text-base">{s.subtitle}</p>}
                </div>
              )}
            </Wrapper>
          );
        })}
      </div>

      {count > 1 && (
        <>
          {/* Arrows — appear on hover (always on touch) */}
          <button aria-label="Previous" onClick={() => go(index - 1)}
            className="absolute left-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white/85 text-foreground shadow-md backdrop-blur transition-opacity hover:bg-white md:opacity-0 md:group-hover:opacity-100">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button aria-label="Next" onClick={() => go(index + 1)}
            className="absolute right-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white/85 text-foreground shadow-md backdrop-blur transition-opacity hover:bg-white md:opacity-0 md:group-hover:opacity-100">
            <ChevronRight className="h-5 w-5" />
          </button>

          {/* Dots */}
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
            {slides.map((_, i) => (
              <button key={i} aria-label={`Go to slide ${i + 1}`} onClick={() => go(i)}
                className={cn("h-1.5 rounded-full transition-all", i === index ? "w-6 bg-white" : "w-1.5 bg-white/50 hover:bg-white/80")} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
