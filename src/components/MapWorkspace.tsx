import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Maximize2, Minimize2 } from 'lucide-react';
import { translate } from '../lib/locale';

/** Native dialog top layer also works when a map is inside a detail drawer. */
export function MapWorkspace({
  title,
  children,
  className = '',
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null),
    previous = useRef<HTMLElement | null>(null),
    opener = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!expanded) return;
    const old = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.current?.showModal();
    return () => {
      document.body.style.overflow = old;
      requestAnimationFrame(() =>
        (previous.current?.isConnected ? previous.current : opener.current)?.focus(),
      );
    };
  }, [expanded]);
  const controls = (
    <div className="map-workspace-heading">
      <strong>{title}</strong>
      <button
        ref={expanded ? undefined : opener}
        className="button"
        aria-label={translate(expanded ? 'Close expanded map' : 'Expand map')}
        onClick={() => {
          if (!expanded) previous.current = document.activeElement as HTMLElement;
          setExpanded(!expanded);
        }}
      >
        {expanded ? <Minimize2 size={17} /> : <Maximize2 size={17} />}{' '}
        {expanded ? translate('Return to page') : translate('Expand map')}
      </button>
    </div>
  );
  if (expanded)
    return createPortal(
      <dialog
        ref={dialog}
        className={`map-workspace-dialog ${className}`}
        aria-label={title}
        onCancel={(e) => {
          e.preventDefault();
          setExpanded(false);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape' || e.key === 'Tab') e.stopPropagation();
        }}
      >
        {controls}
        <div className="map-workspace-body">{children}</div>
      </dialog>,
      document.body,
    );
  return (
    <div className={`map-workspace ${className}`}>
      {controls}
      {children}
    </div>
  );
}
