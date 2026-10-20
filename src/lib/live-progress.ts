import { useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useLocale } from './locale';
import { liveGoals } from '../domain/connection';
import type { PlannerState, SaveProfile } from '../domain/models';
import type { ArtworkData } from '../components/Artwork';
import { useConnectionStatus } from './connection-status';
export function useLiveProgress(
  save: SaveProfile | null,
  state: PlannerState,
  art: ArtworkData,
  ready: boolean,
) {
  const language = useLocale(),
    status = useConnectionStatus();
  const farmerId = save?.players.find((f) => f.id === state.farmerId)?.id ?? save?.players[0].id;
  const active = Boolean(
    save && status.state === 'active' && status.saveId === `${save.id}:${farmerId}`,
  );
  const goals = save ? liveGoals(save, state, art).goals : [];
  const signature = JSON.stringify(goals);
  useEffect(() => {
    if (!active || !save || !ready || goals.length > 80) return;
    void invoke('set_connection_plan', {
      path: save.path,
      fingerprint: save.fingerprint,
      farmerId,
      goals,
    }).catch(() => {});
  }, [active, save?.id, save?.fingerprint, farmerId, signature, ready, language]);
  return {
    active,
    completed: active ? (status.completed ?? []).filter((id) => state.goals.includes(id)) : [],
  };
}
