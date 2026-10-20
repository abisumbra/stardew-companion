import { useEffect, useRef, type RefObject } from 'react';
export function anchorScroll(scroll: number, pointer: number, ratio: number) {
  return Math.max(0, (scroll + pointer) * ratio - pointer);
}
/** A non-passive wheel listener prevents page scrolling while zooming the map under the cursor. */
export function useMapWheel(
  ref: RefObject<HTMLElement | null>,
  scale: number,
  setScale: (value: number) => void,
  min: number,
  max: number,
) {
  const pending = useRef<{ node: HTMLElement; left: number; top: number } | null>(null);
  const current = useRef({ scale, setScale, min, max });
  current.current = { scale, setScale, min, max };
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const wheel = (event: WheelEvent) => {
      if (!event.deltaY) return;
      event.preventDefault();
      event.stopPropagation();
      const state = current.current,
        delta =
          event.deltaY *
          (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? node.clientHeight : 1);
      const next = Math.max(
        state.min,
        Math.min(state.max, state.scale * Math.exp(-Math.max(-150, Math.min(150, delta)) * 0.003)),
      );
      if (next === state.scale) return;
      const rect = node.getBoundingClientRect(),
        x = event.clientX - rect.left,
        y = event.clientY - rect.top;
      const previous = pending.current?.node === node ? pending.current : null;
      const left = anchorScroll(previous?.left ?? node.scrollLeft, x, next / state.scale),
        top = anchorScroll(previous?.top ?? node.scrollTop, y, next / state.scale);
      current.current.scale = next;
      state.setScale(next);
      pending.current = { node, left, top };
      requestAnimationFrame(() => {
        const p = pending.current;
        if (p?.node === node) {
          node.scrollLeft = p.left;
          node.scrollTop = p.top;
          pending.current = null;
        }
      });
    };
    node.addEventListener('wheel', wheel, { passive: false });
    return () => node.removeEventListener('wheel', wheel);
  });
}
