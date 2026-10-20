import { localize, translate } from './lib/locale';
import { useLocale, setLocale } from './lib/locale';
import { languageNames } from './locales/catalog';
import {
  Check,
  ChevronRight,
  RefreshCw,
  Search,
  Settings2,
  ShieldCheck,
  Sprout,
  X,
} from 'lucide-react';
import { lazy, Suspense } from 'react';
import './lib/display';
import * as backend from './lib/backend';

import './App.css';
import './theme.css';
import './experience.css';
import './catalog-update.css';
import './workflow.css';
import './expansion.css';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useConnectionStatus, refreshConnection } from './lib/connection-status';
import { Sprite } from './components/Artwork';
import { formatTime, navigation, titleCase, useCompanion } from './companion';
import { DashboardView } from './views/DashboardView';
const DetailPanel = lazy(() =>
  import('./components/DetailPanel').then((m) => ({ default: m.DetailPanel })),
);
const PlannerView = lazy(() =>
  import('./components/PlannerView').then((m) => ({ default: m.PlannerView })),
);
const AchievementsView = lazy(() =>
  import('./views/AchievementsView').then((m) => ({ default: m.AchievementsView })),
);
const CompletionistView = lazy(() =>
  import('./views/CompletionistView').then((m) => ({ default: m.CompletionistView })),
);
const EncyclopediaView = lazy(() =>
  import('./views/EncyclopediaView').then((m) => ({ default: m.EncyclopediaView })),
);
const PerfectionView = lazy(() =>
  import('./views/PerfectionView').then((m) => ({ default: m.PerfectionView })),
);
const SaveManagerView = lazy(() =>
  import('./views/SaveManagerView').then((m) => ({ default: m.SaveManagerView })),
);
const SeasonalView = lazy(() =>
  import('./views/SeasonalView').then((m) => ({ default: m.SeasonalView })),
);
const SettingsView = lazy(() =>
  import('./views/SettingsView').then((m) => ({ default: m.SettingsView })),
);
const FestivalsView = lazy(() =>
  import('./views/FestivalsView').then((m) => ({ default: m.FestivalsView })),
);
const StorageView = lazy(() =>
  import('./views/StorageView').then((m) => ({ default: m.StorageView })),
);
const FarmDesignerView = lazy(() =>
  import('./views/FarmDesignerView').then((m) => ({ default: m.FarmDesignerView })),
);
function App() {
  const language = useLocale();
  const context = useCompanion();
  const connection = useConnectionStatus();
  const {
    page,
    setPage,
    scan,
    busy,
    initial,
    error,
    setError,
    notice,
    setNotice,
    search,
    setSearch,
    detail,
    setDetail,
    planner,
    plannerReady,
    account,
    searchRef,
    report,
    refresh,
    save,
    updatePlanner,
    addGoal,
    closeDetail,
    navigate,
    chooseSave,
  } = context;
  return localize(
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <Sprite id="character:Krobus" name="Krobus" size={36} decorative />
          </div>
          <div>
            Stardew<span>COMPANION</span>
          </div>
        </div>
        <span className="nav-label">YOUR FIELD GUIDE</span>
        <nav aria-label="Main navigation">
          {navigation.map(({ name, icon: Icon }, i) => (
            <div key={name}>
              {i === 7 && <div className="nav-divider" />}
              <button
                className={`nav-item ${page === name ? 'selected' : ''}`}
                aria-current={page === name ? 'page' : undefined}
                onClick={() => navigate(name)}
              >
                <Icon size={18} />
                <span>{name}</span>
                {name === 'Smart Planner' && planner.goals.length > 0 && (
                  <b>{planner.goals.length}</b>
                )}
              </button>
            </div>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="privacy-note">
            <ShieldCheck size={20} />
            <div>
              Your farm stays yours.<small>Offline. Local. Yours.</small>
            </div>
          </div>
          <span className="version">v1.0.0 · Development preview</span>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="save-control">
            <div className="farm-avatar">
              <Sprite id="crafting:Chest" name="Chest" size={32} decorative />
            </div>
            <div>
              <label htmlFor="save-selector">YOUR FARM</label>
              <select
                id="save-selector"
                value={save?.id ?? ''}
                onChange={(e) => chooseSave(e.target.value)}
                disabled={!scan.saves.length || busy}
              >
                {scan.saves.length === 0 ? (
                  <option value="">{initial ? 'Looking for saves…' : 'No farm selected'}</option>
                ) : (
                  scan.saves.map((s) => (
                    <option value={s.id} key={s.id} data-l10n="off">
                      {s.farmName} · {s.players[0].name} · {translate(titleCase(s.season))} {s.day},{' '}
                      {translate('Year')} {s.year} · {s.gameVersion ?? translate('version unknown')}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>
          <div className="topbar-right">
            {save && save.players.length > 1 && (
              <select
                aria-label="Active farmer"
                value={planner.farmerId ?? save.players[0].id}
                onChange={(e) => context.setSocialFarmerId(e.target.value)}
              >
                {save.players.map((f) => (
                  <option key={f.id} value={f.id} data-l10n="off">
                    {f.name}
                  </option>
                ))}
              </select>
            )}
            <select
              id="interface-language"
              aria-label="Interface language"
              value={language}
              onChange={(e) => setLocale(e.target.value as 'tr' | 'en')}
            >
              {Object.entries(languageNames).map(([code, name]) => (
                <option key={code} value={code} data-l10n="off">
                  {name}
                </option>
              ))}
            </select>
            <div className="search-box">
              <Search size={16} />
              <input
                ref={searchRef}
                aria-label="Search current view"
                placeholder="Search your field guide…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  if (page === 'Dashboard') setPage('Encyclopedia');
                }}
              />
              <kbd>Ctrl K</kbd>
            </div>
            <button
              className="text-button"
              title={
                connection.receivedAt
                  ? new Date(connection.receivedAt).toLocaleTimeString()
                  : translate('Connection status is unavailable. Retry.')
              }
              onClick={() => void refreshConnection()}
            >
              {connection.state === 'active'
                ? 'Live connection active'
                : connection.error
                  ? 'Live data unavailable'
                  : 'Live connection offline'}
            </button>
            <span
              className={`sync-status ${scan.issues.length ? 'has-issue' : ''}`}
              title={
                save
                  ? `Disk save: ${formatTime(save.savedAt)}\nLast parsed: ${formatTime(save.syncedAt)}`
                  : ''
              }
            >
              <i />
              {busy
                ? 'Syncing…'
                : scan.issues.length
                  ? 'Sync needs attention'
                  : save
                    ? 'Synced from save'
                    : backend.desktop
                      ? 'Waiting for a save'
                      : 'Browser preview'}
            </span>
            <button
              className="icon-button"
              aria-label="Rescan saves"
              title="Rescan saves"
              disabled={busy}
              onClick={() => void refresh()}
            >
              <RefreshCw size={17} className={busy ? 'spin' : ''} />
            </button>
            <button
              className="icon-button"
              aria-label="Open settings"
              onClick={() => navigate('Settings')}
            >
              <Settings2 size={18} />
            </button>
          </div>
        </header>
        <main id="main-content" className="main-content">
          <div className="breadcrumb">
            Your field guide <ChevronRight size={12} /> <span>{page}</span>
          </div>
          {error && (
            <div className="banner error" role="alert">
              <span>{error}</span>
              <button
                className="icon-button"
                aria-label="Dismiss error"
                onClick={() => setError('')}
              >
                <X size={16} />
              </button>
            </div>
          )}
          {notice && (
            <div className="banner success" role="status">
              <span>
                <Check size={16} />
                {notice}
              </span>
              <button
                className="icon-button"
                aria-label="Dismiss notification"
                onClick={() => setNotice('')}
              >
                <X size={16} />
              </button>
            </div>
          )}
          {save?.warnings.map((w, i) => (
            <div className="banner warning" key={i}>
              {w}
            </div>
          ))}
          <ErrorBoundary key={page} section={page}>
            <Suspense fallback={<p role="status">Loading…</p>}>
              {page === 'Dashboard' && <DashboardView {...context} />}
              {page === 'Perfection' && <PerfectionView {...context} />}
              {page === 'Steam Achievements' && <AchievementsView {...context} />}
              {page === 'Smart Planner' &&
                (plannerReady ? (
                  <PlannerView
                    savedCompleted={context.diskPlan?.completedGoals}
                    save={save}
                    state={planner}
                    onChange={updatePlanner}
                    onDetail={setDetail}
                    search={search}
                    plan={context.plan ?? undefined}
                    onFindMaterial={(id) => {
                      navigate('Storage Finder');
                      setSearch(id);
                    }}
                    onRefresh={context.refresh}
                  />
                ) : context.plannerError ? (
                  <div role="alert" className="panel">
                    <p>{context.plannerError}</p>
                    <button className="button" onClick={context.retryState}>
                      Retry saved data
                    </button>
                  </div>
                ) : (
                  <p role="status">Loading this farm’s planner…</p>
                ))}
              {page === 'Encyclopedia' && <EncyclopediaView {...context} />}
              {page === 'Seasonal Planner' && <SeasonalView {...context} />}
              {page === 'Festivals' && <FestivalsView key={save?.id ?? 'no-save'} {...context} />}
              {page === 'Storage Finder' && (
                <StorageView key={save?.id ?? 'no-save'} {...context} />
              )}
              {page === 'Farm Designer' && <FarmDesignerView {...context} />}
              {page === 'Home Designer' && <FarmDesignerView key="home" {...context} mode="home" />}
              {page === 'Completionist' && <CompletionistView {...context} />}
              {page === 'Save Manager' && <SaveManagerView {...context} />}
              {page === 'Settings' && <SettingsView {...context} />}
            </Suspense>
          </ErrorBoundary>
        </main>
        <footer className="workspace-footer">
          <Sprout size={13} />
          <span>A little guidance. A lot of growing.</span>
          <span>Unofficial · Development preview</span>
        </footer>
      </div>
      {detail && (
        <ErrorBoundary key={page} section={page}>
          <Suspense fallback={<p role="status">Loading…</p>}>
            <DetailPanel
              key={`${detail}:${context.detailFishingRoute}`}
              id={detail}
              save={save}
              account={account}
              goals={planner.goals}
              onClose={closeDetail}
              onAdd={(id, fishing) => addGoal(id, fishing, context.detailFarmerId)}
              onError={report}
              socialFarmerId={context.detailFarmerId ?? context.socialFarmerId}
              onSocialFarmer={(id) => {
                context.setDetailFarmerId(id);
                context.setSocialFarmerId(id);
              }}
              initialFishingRoute={context.detailFishingRoute}
              initialMagicBait={planner.fishing[detail]?.magicBait ?? false}
              farmerId={context.detailFarmerId ?? planner.farmerId}
              planner={planner}
              onPlannerChange={updatePlanner}
            />
          </Suspense>
        </ErrorBoundary>
      )}
    </div>,
  );
}
export default App;
