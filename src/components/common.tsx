import { localize } from '../lib/locale';
import { ArrowRight, ExternalLink, Sprout, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { sources } from '../domain/knowledge';
import type { Criterion } from '../domain/progress';
import { sourceLink } from '../lib/backend';
export function Tag({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: 'green' | 'amber' | 'neutral' | 'blue';
}) {
  return localize(<span className={`tag ${tone}`}>{children}</span>);
}
export function Empty({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return localize(
    <div className="empty">
      <div className="empty-icon">
        <Sprout size={30} />
      </div>
      <h3>{title}</h3>
      <p>{children}</p>
      {action}
    </div>,
  );
}
export function ProgressBar({ value, label }: { value: number | null; label: string }) {
  return localize(
    <div
      className="progress"
      role="progressbar"
      aria-label={label}
      aria-valuenow={value === null ? undefined : Math.round(value * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <span style={{ width: `${Math.min(100, Math.max(0, (value ?? 0) * 100))}%` }} />
    </div>,
  );
}
export function Sources({ ids, onError }: { ids: string[]; onError: (e: unknown) => void }) {
  return localize(
    <div className="sources">
      {[...new Set(ids)].map((id) =>
        sources[id] ? (
          <button
            key={id}
            className="source"
            onClick={() => sourceLink(sources[id].url).catch(onError)}
          >
            <ExternalLink size={13} />
            <span>
              {sources[id].title}
              <small>
                Checked {sources[id].verifiedAt} · {sources[id].license}
              </small>
            </span>
          </button>
        ) : (
          <span key={id}>Source unavailable: {id}</span>
        ),
      )}
    </div>,
  );
}
export function FarmLandscape() {
  return localize(
    <svg
      className="landscape"
      viewBox="0 0 256 144"
      preserveAspectRatio="xMaxYMid slice"
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="sky" x2="0" y2="1">
          <stop stopColor="#f1e5c2" />
          <stop offset="1" stopColor="#e3e7cd" />
        </linearGradient>
      </defs>
      <path fill="#91ccda" d="M0 0h256v144H0z" />
      <path fill="#fff0a0" d="M190 14h18v4h4v18h-4v4h-18v-4h-4V18h4z" />
      <path fill="#e6f2de" d="M34 20h28v5h10v8H20v-8h14zm87 22h24v4h12v7h-44v-7h8z" />
      <path
        fill="#77a7b0"
        d="M0 82h18V67h15V54h16V43h15v12h14v12h18v17h25V65h20V53h16V43h15V30h12v14h14v15h15v17h43v68H0z"
      />
      <path
        fill="#a1bfc0"
        d="M49 54V43h15v12h14v9H64V54zm108-1V43h15V30h12v14h14v11h-24V43h-4v10z"
      />
      <path fill="#60916e" d="M0 92h19V81h35v6h27V74h24v9h33v-9h25v14h34V77h34v12h25v55H0z" />
      <path fill="#8baa42" d="M0 112h28v-10h45v5h31V96h39v8h35V94h35v10h43v40H0z" />
      <path fill="#bbba58" d="M0 132h46v-13h43v9h55v-10h38v8h74v18H0z" />
      <path fill="#d8bb78" d="M119 144v-17h20v-12h21v-11h18v11h-12v14h-21v15z" />
      <path fill="#69462e" d="M177 96h47v36h-47z" />
      <path fill="#bd7042" d="M180 94h41v35h-41z" />
      <path fill="#dfa362" d="M180 101h41v3h-41zm0 9h41v3h-41zm0 9h41v3h-41z" />
      <path fill="#793e32" d="M167 96v-5h6v-6h7v-6h7v-6h28v6h7v6h7v6h6v5z" />
      <path fill="#b76440" d="M176 88v-4h8v-6h29v6h7v4zm11-13h27v3h-27z" />
      <path fill="#e8ce86" d="M184 102h9v11h-9zm23 0h9v11h-9z" />
      <path fill="#695636" d="M198 114h9v18h-9z" />
      <path fill="#a7753f" d="M201 72V58h6v16z" />
      <path
        fill="#fbdea1"
        d="M170 136h67v3h-67zm3-7h3v15h-3zm15 0h3v15h-3zm31 0h3v15h-3zm15 0h3v15h-3z"
      />
      {[18, 53, 238].map((x, i) => (
        <g key={x} transform={`translate(${x} ${i === 1 ? 92 : 75})`}>
          <path fill="#705034" d="M-2 24h5v24h-5z" />
          <path fill="#355b38" d="M-6 0H6v8h6v8h6v12h-36V16h6V8h6z" />
          <path fill="#4c7b3d" d="M-6 0H6v8h6v8H0v5h-12V9h6z" />
          <path fill="#6d9141" d="M-6 5h7v5h-7zm-5 12h9v4h-9z" />
        </g>
      ))}
      <path fill="#768e33" d="M60 136h8v3h-8zm11 4h6v3h-6zm18-11h5v3h-5zm137 3h6v3h-6z" />
      <path fill="#f3d37a" d="M35 134h3v3h-3zm64 6h3v3h-3zm58-15h3v3h-3z" />
    </svg>,
  );
}

export function Stat({
  icon: Icon,
  label,
  value,
  note,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  note: string;
  onClick: () => void;
}) {
  return localize(
    <button className="stat-card" onClick={onClick}>
      <div className="stat-label">
        <span>{label}</span>
        <Icon size={18} />
      </div>
      <strong>{value}</strong>
      <small>{note}</small>
    </button>,
  );
}
export function PanelHeading({
  eyebrow,
  title,
  action,
  onAction,
}: {
  eyebrow?: string;
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  return localize(
    <div className="panel-heading">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h2>{title}</h2>
      </div>
      {action && (
        <button className="text-button" onClick={onAction}>
          {action}
          <ArrowRight size={14} />
        </button>
      )}
    </div>,
  );
}
export function countLabel(c: Criterion | undefined) {
  return !c || c.ratio === null ? 'Unknown' : `${c.current} / ${c.total}`;
}
