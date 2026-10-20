import { Agenda } from '../components/Agenda';
import { localize } from '../lib/locale';
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  CloudSun,
  CookingPot,
  Fish,
  FolderOpen,
  Leaf,
  ListTodo,
  Plus,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Sprout,
  Target,
} from 'lucide-react';
import { FarmLandscape, Tag } from '../components/common';
import { Sprite } from '../components/Artwork';
import { villagerProfiles, birthdayDistance, birthdayLabel } from '../domain/social';
import { guideFor, knowledge } from '../domain/knowledge';
import * as backend from '../lib/backend';
import { selectedFarmer } from '../domain/supplies';
import { nextActions } from '../domain/next-steps';
import { NextSteps } from '../components/NextSteps';

import type { CompanionContext } from '../companion';
import { formatTime, titleCase } from '../companion';
import { PanelHeading, Stat, countLabel } from '../components/common';

export function DashboardView({
  busy,
  initial,
  setDetail,
  planner,
  refresh,
  save,
  navigate,
  addDirectory,
  importSave,
  progress,
  plan,
  focusEntries,
  displayPct,
  showCriterion,
  categoryCard,
}: Pick<
  CompanionContext,
  | 'busy'
  | 'initial'
  | 'setDetail'
  | 'planner'
  | 'season'
  | 'refresh'
  | 'save'
  | 'navigate'
  | 'addDirectory'
  | 'importSave'
  | 'progress'
  | 'plan'
  | 'focusEntries'
  | 'displayPct'
  | 'showCriterion'
  | 'categoryCard'
>) {
  return localize(
    <>
      <div className="view-intro">
        <div>
          <span className="eyebrow">GROW AT YOUR OWN PACE</span>
          <h1>Dashboard</h1>
          <h2 className="welcome-heading">
            {save
              ? `Welcome back, ${selectedFarmer(save, planner.farmerId).name}.`
              : 'A little help for your next harvest.'}
          </h2>
          <p>
            {save
              ? 'A clear view of your farm, and a thoughtful plan for what comes next.'
              : 'Your saves, your progress, your next adventure. All in one quiet place.'}
          </p>
        </div>
        <button className="button" onClick={() => navigate('Save Manager')}>
          <FolderOpen size={16} />
          Manage saves
        </button>
      </div>
      {save && <Agenda save={save} state={planner} onDetail={setDetail} />}
      <section className="farm-hero">
        <div className="hero-copy">
          <Tag tone="green">
            <Leaf size={12} />
            {save ? `${save.farmType} farm` : 'YOUR OFFLINE FARM COMPANION'}
          </Tag>
          <h2>
            {save ? (
              <>
                <span data-l10n="off">{save.farmName}</span> <span>Farm</span>
              </>
            ) : (
              'Every great farm starts somewhere.'
            )}
          </h2>
          <p>
            {save
              ? `${titleCase(save.season)} ${save.day}, Year ${save.year} · Stardew Valley ${save.gameVersion ?? 'version unknown'}`
              : 'Connect your Stardew Valley save to see what you’ve accomplished and discover what’s still waiting.'}
          </p>
          {save ? (
            <div className="hero-meta">
              <ShieldCheck size={15} />
              Last disk save {formatTime(save.savedAt)}
              <span>•</span>
              {save.players.length} farmer{save.players.length !== 1 ? 's' : ''}
            </div>
          ) : (
            <button
              className="button primary"
              disabled={!backend.desktop}
              onClick={() => void addDirectory()}
            >
              <Plus size={16} />
              Choose save folder
            </button>
          )}
        </div>
        <FarmLandscape />
      </section>
      {!save ? (
        <>
          <div className="panel onboarding">
            <div className="onboarding-heading">
              <Sprout size={24} />
              <div>
                <h3>
                  {initial
                    ? 'Looking for your farms…'
                    : backend.desktop
                      ? 'No readable saves found yet'
                      : 'Open the desktop app to connect your farm'}
                </h3>
                <p>
                  {backend.desktop
                    ? 'We check the standard Stardew Valley save directory automatically. Add a custom folder or import the full save file.'
                    : 'This browser view has no filesystem access. The encyclopedia is available offline; real saves are read by the Rust desktop backend.'}
                </p>
              </div>
            </div>
            <div className="button-row">
              <button
                className="button primary"
                disabled={!backend.desktop || busy}
                onClick={() => void refresh()}
              >
                <RefreshCw size={16} />
                Scan for saves
              </button>
              <button
                className="button"
                disabled={!backend.desktop}
                onClick={() => void importSave()}
              >
                <FolderOpen size={16} />
                Import a save
              </button>
              <button className="text-button" onClick={() => navigate('Encyclopedia')}>
                Explore the encyclopedia <ArrowRight size={16} />
              </button>
            </div>
          </div>
          <div className="intro-grid">
            {[
              {
                icon: ShieldCheck,
                title: 'Your saves are safe',
                text: 'Read-only scans. Journal transfers require a backup. No mods or uploads.',
              },
              {
                icon: Target,
                title: 'Progress with evidence',
                text: 'Action records distinguish catching, cooking and crafting from owning items.',
              },
              {
                icon: BookOpen,
                title: 'Knowledge, kept close',
                text: `${knowledge.entries.filter((e) => e.versions.includes('1.6')).length} versioned collection entries, with clearly marked guide coverage.`,
              },
            ].map(({ icon: Icon, title, text }) => (
              <div className="panel" key={title}>
                <Icon size={24} />
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="stats-grid">
            <Stat
              icon={Sparkles}
              label="OFFICIAL PERFECTION"
              value={displayPct}
              note={
                progress?.total === null
                  ? 'Confirmed lower bound; some data unknown'
                  : `${progress?.natural?.toFixed(1)}% natural + ${progress?.waivers} waiver points`
              }
              onClick={() => navigate('Perfection')}
            />
            <Stat
              icon={CookingPot}
              label="RECIPES COOKED"
              value={countLabel(progress?.criteria.find((c) => c.id === 'cooking'))}
              note="Actions recorded in your save"
              onClick={() => showCriterion(progress!.criteria.find((c) => c.id === 'cooking')!)}
            />
            <Stat
              icon={Fish}
              label="FISH CAUGHT"
              value={countLabel(progress?.criteria.find((c) => c.id === 'fishing'))}
              note="Each catch is a small discovery"
              onClick={() => showCriterion(progress!.criteria.find((c) => c.id === 'fishing')!)}
            />
            <Stat
              icon={ListTodo}
              label="YOUR NEXT STEPS"
              value={String(plan?.tasks.filter((t) => !t.manualDone).length ?? 0)}
              note={`${planner.goals.length} goals in your planner`}
              onClick={() => navigate('Smart Planner')}
            />
          </div>
          <div className="dashboard-columns">
            <section className="panel">
              <PanelHeading
                eyebrow="THE BIG PICTURE"
                title="A path to Perfection"
                action="View all"
                onAction={() => navigate('Perfection')}
              />
              <div className="category-grid">
                {progress?.criteria.slice(0, 8).map(categoryCard)}
              </div>
              <p className="fine-print">
                Multiplayer uses the best single farmer per category. Ownership never substitutes
                for the required action.
              </p>
            </section>
            <section className="panel focus-panel">
              <PanelHeading
                eyebrow="A GOOD PLACE TO START"
                title="What’s next?"
                action="Planner"
                onAction={() => navigate('Smart Planner')}
              />
              {plan && plan.tasks.some((t) => !t.manualDone) ? (
                <NextSteps tasks={nextActions(plan.tasks, planner)} onDetail={setDetail} />
              ) : focusEntries.length ? (
                focusEntries.map((e) => (
                  <button className="focus-row" key={e.id} onClick={() => setDetail(e.id)}>
                    <span className={`category-icon ${e.type}`}>
                      <Sprite id={e.id} name={e.name} size={32} decorative />
                    </span>
                    <span>
                      <strong>{e.name}</strong>
                      <small>
                        {guideFor(e, save.gameVersion)?.unlock ??
                          'Open your field notes for conditions'}
                      </small>
                    </span>
                    <ArrowUpRight size={16} />
                  </button>
                ))
              ) : (
                <p className="muted">
                  No incomplete entries with bundled detailed guides were found.
                </p>
              )}
              <div className="season-note">
                <CloudSun size={21} />
                <div>
                  <strong>{titleCase(save.season)} has its own rhythm.</strong>
                  <p>
                    Explore seasonal fishing windows. Weather and region access still need checking
                    in game.
                  </p>
                  <button className="text-button" onClick={() => navigate('Seasonal Planner')}>
                    Open seasonal planner <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            </section>
          </div>
          <section className="panel birthday-panel">
            <PanelHeading
              eyebrow="FROM YOUR SAVED CALENDAR"
              title="Upcoming birthdays"
              action="Seasonal calendar"
              onAction={() => navigate('Seasonal Planner')}
            />
            <div className="birthday-grid">
              {Object.values(villagerProfiles)
                .sort((a, b) => birthdayDistance(a, save) - birthdayDistance(b, save))
                .slice(0, 3)
                .map((p) => (
                  <button
                    className="birthday-card"
                    key={p.name}
                    onClick={() => setDetail(`character:${p.name}`)}
                  >
                    <Sprite id={`character:${p.name}`} name={p.name} size={48} decorative />
                    <span>
                      <strong>{p.name}</strong>
                      <small>
                        {birthdayLabel(p)} ·{' '}
                        {birthdayDistance(p, save) === 0
                          ? 'Birthday today'
                          : `in ${birthdayDistance(p, save)} days`}
                      </small>
                    </span>
                  </button>
                ))}
            </div>
          </section>
          <div className="bottom-note">
            <ShieldCheck size={16} />
            <span>
              Last synced {formatTime(save.syncedAt)}. Unsaved actions in the running game are not
              visible.
            </span>
          </div>
        </>
      )}
    </>,
  );
}
