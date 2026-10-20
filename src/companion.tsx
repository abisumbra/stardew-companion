import { translate, formatTimestamp } from './lib/locale';
import {
  Award,
  BookOpen,
  CalendarDays,
  ChevronRight,
  CookingPot,
  Fish,
  FolderOpen,
  Heart,
  LayoutDashboard,
  ListTodo,
  Settings2,
  Sparkles,
  Trophy,
  Wheat,
  Wrench,
  PartyPopper,
  Fence,
  PackageSearch,
  House,
  type LucideIcon,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { z } from 'zod';
import { ProgressBar } from './components/common';
import { Sprite } from './components/Artwork';
import { useArtwork } from './components/Artwork';
import { achievementProgress } from './domain/achievements';
import { guideFor, knowledge, versionFamily } from './domain/knowledge';
import {
  AccountSchema,
  PlannerStateSchema,
  emptyPlanner,
  type AccountState,
  type PlannerState,
  type SaveProfile,
  type ScanResult,
} from './domain/models';
import { buildPlan } from './domain/planner';
import { calculateProgress, entryProgress, type Criterion } from './domain/progress';
import * as backend from './lib/backend';
import { selectedFarmer } from './domain/supplies';
import { retainLatestSnapshots } from './domain/scan';
import { reconcileGoalReceipts } from './domain/planner-completion';
import { useLiveProgress } from './lib/live-progress';

export type Page =
  | 'Dashboard'
  | 'Perfection'
  | 'Steam Achievements'
  | 'Smart Planner'
  | 'Encyclopedia'
  | 'Seasonal Planner'
  | 'Festivals'
  | 'Farm Designer'
  | 'Home Designer'
  | 'Storage Finder'
  | 'Completionist'
  | 'Save Manager'
  | 'Settings';
export const navigation: { name: Page; icon: LucideIcon }[] = [
  { name: 'Dashboard', icon: LayoutDashboard },
  { name: 'Perfection', icon: Sparkles },
  { name: 'Steam Achievements', icon: Trophy },
  { name: 'Smart Planner', icon: ListTodo },
  { name: 'Encyclopedia', icon: BookOpen },
  { name: 'Seasonal Planner', icon: CalendarDays },
  { name: 'Festivals', icon: PartyPopper },
  { name: 'Farm Designer', icon: Fence },
  { name: 'Home Designer', icon: House },
  { name: 'Storage Finder', icon: PackageSearch },
  { name: 'Completionist', icon: Award },
  { name: 'Save Manager', icon: FolderOpen },
  { name: 'Settings', icon: Settings2 },
];
export const categoryIcons: Record<string, LucideIcon> = {
  cooking: CookingPot,
  crafting: Wrench,
  fishing: Fish,
  shipping: Wheat,
  friendship: Heart,
};
export const formatTime = formatTimestamp;
export const titleCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const PreferencesSchema = z.object({ selected: z.string().nullable(), reduceMotion: z.boolean() });

export function useCompanion() {
  const { data: art } = useArtwork();
  const [page, setPage] = useState<Page>('Dashboard'),
    [scan, setScan] = useState<ScanResult>({
      saves: [],
      issues: [],
      directories: [],
      customDirectories: [],
    });
  const [selected, setSelected] = useState<string | null>(null),
    [busy, setBusy] = useState(false),
    [initial, setInitial] = useState(true),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  const [search, setSearch] = useState(''),
    [detail, setDetailState] = useState<string | null>(null),
    [planner, setPlanner] = useState<PlannerState>(emptyPlanner),
    [plannerReady, setPlannerReady] = useState(false);
  const [plannerError, setPlannerError] = useState('');
  const [reloadState, setReloadState] = useState(0);
  const retryState = () => setReloadState((n) => n + 1);
  const [detailFishingRoute, setDetailFishingRoute] = useState(0);
  const [detailFarmerId, setDetailFarmerId] = useState<string | null>(null);
  const setDetail = useCallback(
    (id: string | null, routeIndex?: number, farmerId?: string) => {
      setDetailState(id);
      setDetailFarmerId(farmerId ?? null);
      setDetailFishingRoute(routeIndex ?? (id ? planner.fishing[id]?.routeIndex : 0) ?? 0);
    },
    [planner.fishing],
  );
  const [account, setAccount] = useState<AccountState>({ version: 1, manuallyMarked: [] }),
    [accountReady, setAccountReady] = useState(false),
    [reduceMotion, setReduceMotion] = useState(false);
  const [category, setCategory] = useState('cooking'),
    [missingOnly, setMissingOnly] = useState(true),
    [encyclopediaType, setEncyclopediaType] = useState('all'),
    [achievementFilter, setAchievementFilter] = useState('All states'),
    [season, setSeason] = useState<SaveProfile['season']>('spring');
  const [history, setHistory] = useState<Awaited<ReturnType<typeof backend.getHistory>>>([]);
  const scanning = useRef(false),
    scanAgain = useRef(false),
    searchRef = useRef<HTMLInputElement>(null);
  const report = useCallback(
    (e: unknown) => setError(e instanceof Error ? e.message : String(e)),
    [],
  );
  const refresh = useCallback(async () => {
    if (scanning.current) {
      scanAgain.current = true;
      return;
    }
    scanning.current = true;
    setBusy(true);
    try {
      const result = await backend.scan();
      setScan((prev) => retainLatestSnapshots(prev, result));
      const recorded = await Promise.allSettled(result.saves.map(backend.recordProgress));
      for (const record of recorded) if (record.status === 'rejected') report(record.reason);
    } catch (e) {
      report(e);
    } finally {
      setBusy(false);
      setInitial(false);
      scanning.current = false;
      if (scanAgain.current) {
        scanAgain.current = false;
        void refresh();
      }
    }
  }, [report]);
  useEffect(() => {
    void refresh();
    let disposed = false;
    let unlisten: (() => void) | undefined;
    backend
      .watchSaves(() => void refresh())
      .then((fn) => {
        if (disposed) fn();
        else unlisten = fn;
      })
      .catch(report);
    return () => {
      disposed = true;
      unlisten?.();
    };
  }, [refresh, report]);
  useEffect(() => {
    let active = true;
    setAccountReady(false);
    backend
      .getPersisted('preferences')
      .then((v) => {
        if (!active || !v) return;
        const p = PreferencesSchema.parse(v);
        setSelected(p.selected);
        setReduceMotion(p.reduceMotion);
      })
      .catch(report);
    backend
      .getPersisted('steam-account')
      .then((v) => {
        if (!active) return;
        setAccount(v == null ? { version: 1, manuallyMarked: [] } : AccountSchema.parse(v));
        setAccountReady(true);
      })
      .catch((e) => {
        if (active) report(e);
      });
    return () => {
      active = false;
    };
  }, [report, reloadState]);
  const save = scan.saves.find((s) => s.id === selected) ?? scan.saves[0] ?? null;
  const loadedPlannerScope = useRef<string | null>(null);
  useEffect(() => {
    loadedPlannerScope.current = null;
    setDetail(null);
    setPlannerReady(false);
    setPlannerError('');
    setPlanner(emptyPlanner());
    let active = true;
    if (!save) {
      setPlannerReady(true);
      return;
    }
    backend
      .getPersisted(`farm:${save.id}`)
      .then((v) => {
        if (!active) return;
        loadedPlannerScope.current = save.id;
        setPlanner(v == null ? emptyPlanner() : PlannerStateSchema.parse(v));
        setPlannerReady(true);
      })
      .catch((e) => {
        if (active) {
          setPlannerError('Your saved plan could not be loaded. Editing is paused to protect it.');
          report(e);
        }
      });
    return () => {
      active = false;
    };
  }, [save?.id, report, reloadState]);
  useEffect(() => {
    let active = true;
    setHistory([]);
    if (save)
      backend
        .recordProgress(save)
        .then(() => backend.getHistory(save.id))
        .then((h) => {
          if (active) setHistory(h);
        })
        .catch(report);
    return () => {
      active = false;
    };
  }, [save?.id, save?.fingerprint, report]);
  useEffect(() => {
    if (save) setSeason(save.season);
  }, [save?.season, save?.id]);
  useEffect(() => {
    document.documentElement.dataset.reduceMotion = String(reduceMotion);
  }, [reduceMotion]);
  useEffect(() => {
    const listener = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, []);
  const updatePlanner = (next: PlannerState) => {
    if (!save || !plannerReady) return;
    const parsed = PlannerStateSchema.safeParse(next);
    if (!parsed.success) {
      report('Enter a whole, non-negative quantity.');
      return;
    }
    const valid = parsed.data;
    setPlanner(valid);
    void backend.setPersisted(`farm:${save.id}`, valid).catch(report);
  };
  const socialFarmerId = planner.farmerId ?? '';
  const setSocialFarmerId = (id: string) => updatePlanner({ ...planner, farmerId: id });
  const addGoal = (
    id: string,
    fishing?: { routeIndex: number; magicBait: boolean },
    farmerId?: string | null,
  ) => {
    if (!save || !plannerReady || id.startsWith('quest:')) return;
    updatePlanner({
      ...planner,
      farmerId: farmerId ?? planner.farmerId,
      goals: [...new Set([...planner.goals, id])],
      fishing: fishing ? { ...planner.fishing, [id]: fishing } : planner.fishing,
    });
    setNotice('Goal added to this farm’s planner.');
  };
  const closeDetail = useCallback(() => setDetail(null), []);
  const navigate = (next: Page) => {
    setPage(next);
    setSearch('');
  };
  const chooseSave = (id: string) => {
    setSelected(id);
    void backend.setPersisted('preferences', { selected: id, reduceMotion }).catch(report);
  };
  const addDirectory = async () => {
    try {
      if (await backend.addDirectory()) await refresh();
    } catch (e) {
      report(e);
    }
  };
  const importSave = async () => {
    try {
      const s = await backend.importSave();
      if (s) {
        setScan((prev) => ({ ...prev, saves: [s, ...prev.saves.filter((p) => p.id !== s.id)] }));
        chooseSave(s.id);
        await refresh();
      }
    } catch (e) {
      report(e);
    }
  };
  const progress = useMemo(() => (save ? calculateProgress(save) : null), [save]);
  const diskPlan = useMemo(
    () => (save ? buildPlan(save, planner, art) : null),
    [save, planner, art],
  );
  const live = useLiveProgress(save, planner, art, plannerReady);
  const plan = useMemo(
    () =>
      diskPlan && live.active && save
        ? {
            ...buildPlan(
              save,
              { ...planner, goals: planner.goals.filter((id) => !live.completed.includes(id)) },
              art,
            ),
            completedGoals: [...new Set([...diskPlan.completedGoals, ...live.completed])],
          }
        : diskPlan,
    [diskPlan, live.active, JSON.stringify(live.completed), save, planner, art],
  );
  useEffect(() => {
    if (!save || !plan || !plannerReady || loadedPlannerScope.current !== save.id) return;
    const next = reconcileGoalReceipts(save, planner, diskPlan?.completedGoals ?? []);
    if (next === planner) return;
    setPlanner(next);
    void backend.setPersisted(`farm:${save.id}`, next).catch(report);
  }, [save, plan, planner, plannerReady, report]);
  const achievementStates = useMemo(
    () =>
      knowledge.steam.achievements.map((a) => ({
        achievement: a,
        ...achievementProgress(a, save, account, planner.farmerId),
      })),
    [save, account, planner.farmerId],
  );
  const matches = (s: string) =>
    `${s} ${translate(s)}`.toLocaleLowerCase().includes(search.toLocaleLowerCase());
  const activeCriterion =
    progress?.criteria.find((c) => c.id === category) ?? progress?.criteria[0];
  const focusEntries = save
    ? knowledge.entries
        .filter(
          (e) =>
            e.versions.includes(versionFamily(save.gameVersion) ?? '1.6') &&
            guideFor(e, save.gameVersion) &&
            entryProgress(
              e,
              selectedFarmer(save, planner.farmerId),
              versionFamily(save.gameVersion) !== null,
            ).done === false,
        )
        .slice(0, 4)
    : [];
  const displayPct =
    progress?.total !== null && progress?.total !== undefined
      ? `${progress.total.toFixed(1)}%`
      : progress?.supported
        ? `${progress.lowerBound.toFixed(1)}%+`
        : '—';
  const showCriterion = (c: Criterion) => {
    setCategory(c.id);
    navigate('Perfection');
  };
  const categoryCard = (c: Criterion) => (
    <button className="category-card" key={c.id} onClick={() => showCriterion(c)}>
      <div className={`category-icon ${c.id}`}>
        <Sprite id={`category:${c.id}`} name={c.name} size={32} decorative />
      </div>
      <div>
        <span>{c.name}</span>
        <strong>{c.ratio === null ? 'Unknown' : `${c.current} / ${c.total}`}</strong>
        <ProgressBar value={c.ratio} label={c.name} />
      </div>
      <ChevronRight size={16} />
    </button>
  );

  return {
    page,
    setPage,
    scan,
    selected,
    busy,
    initial,
    error,
    setError,
    notice,
    setNotice,
    search,
    setSearch,
    detail,
    detailFishingRoute,
    detailFarmerId,
    setDetailFarmerId,
    setDetail,
    planner,
    plannerReady,
    plannerError,
    retryState,
    account,
    setAccount,
    accountReady,
    reduceMotion,
    setReduceMotion,
    category,
    setCategory,
    missingOnly,
    setMissingOnly,
    encyclopediaType,
    setEncyclopediaType,
    socialFarmerId,
    setSocialFarmerId,
    achievementFilter,
    setAchievementFilter,
    season,
    setSeason,
    history,
    searchRef,
    report,
    refresh,
    save,
    updatePlanner,
    addGoal,
    closeDetail,
    navigate,
    chooseSave,
    addDirectory,
    importSave,
    progress,
    plan,
    diskPlan,
    achievementStates,
    matches,
    activeCriterion,
    focusEntries,
    displayPct,
    showCriterion,
    categoryCard,
  };
}
export type CompanionContext = ReturnType<typeof useCompanion>;
