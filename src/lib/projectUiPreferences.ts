export type ProjectAccentId = 'amber' | 'blue' | 'emerald' | 'violet' | 'rose' | 'slate';

export interface ProjectUiPreference {
  isPinned?: boolean;
  accent?: ProjectAccentId;
}

export type ProjectUiPreferenceMap = Record<string, ProjectUiPreference>;

export interface ProjectAccent {
  id: ProjectAccentId;
  label: string;
  swatchClass: string;
  cardClass: string;
  cardHoverClass: string;
  iconClass: string;
  textClass: string;
  badgeClass: string;
  dividerClass: string;
  topBarClass: string;
}

const STORAGE_KEY = 'story-shot-studio:project-ui-preferences:v1';

export const PROJECT_ACCENTS: ProjectAccent[] = [
  {
    id: 'amber',
    label: 'Amber',
    swatchClass: 'bg-amber-400',
    cardClass: 'border-amber-500/30 bg-amber-500/[0.035]',
    cardHoverClass: 'hover:border-amber-400/60 hover:bg-amber-500/[0.07]',
    iconClass: 'border-amber-500/25 bg-amber-500/10 text-amber-300',
    textClass: 'text-amber-300',
    badgeClass: 'border-amber-500/30 bg-amber-500/10 text-amber-200',
    dividerClass: 'border-amber-500/20',
    topBarClass: 'bg-amber-400',
  },
  {
    id: 'blue',
    label: 'Mavi',
    swatchClass: 'bg-sky-400',
    cardClass: 'border-sky-500/30 bg-sky-500/[0.035]',
    cardHoverClass: 'hover:border-sky-400/60 hover:bg-sky-500/[0.07]',
    iconClass: 'border-sky-500/25 bg-sky-500/10 text-sky-300',
    textClass: 'text-sky-300',
    badgeClass: 'border-sky-500/30 bg-sky-500/10 text-sky-200',
    dividerClass: 'border-sky-500/20',
    topBarClass: 'bg-sky-400',
  },
  {
    id: 'emerald',
    label: 'Yesil',
    swatchClass: 'bg-emerald-400',
    cardClass: 'border-emerald-500/30 bg-emerald-500/[0.035]',
    cardHoverClass: 'hover:border-emerald-400/60 hover:bg-emerald-500/[0.07]',
    iconClass: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300',
    textClass: 'text-emerald-300',
    badgeClass: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
    dividerClass: 'border-emerald-500/20',
    topBarClass: 'bg-emerald-400',
  },
  {
    id: 'violet',
    label: 'Mor',
    swatchClass: 'bg-violet-400',
    cardClass: 'border-violet-500/30 bg-violet-500/[0.035]',
    cardHoverClass: 'hover:border-violet-400/60 hover:bg-violet-500/[0.07]',
    iconClass: 'border-violet-500/25 bg-violet-500/10 text-violet-300',
    textClass: 'text-violet-300',
    badgeClass: 'border-violet-500/30 bg-violet-500/10 text-violet-200',
    dividerClass: 'border-violet-500/20',
    topBarClass: 'bg-violet-400',
  },
  {
    id: 'rose',
    label: 'Rose',
    swatchClass: 'bg-rose-400',
    cardClass: 'border-rose-500/30 bg-rose-500/[0.035]',
    cardHoverClass: 'hover:border-rose-400/60 hover:bg-rose-500/[0.07]',
    iconClass: 'border-rose-500/25 bg-rose-500/10 text-rose-300',
    textClass: 'text-rose-300',
    badgeClass: 'border-rose-500/30 bg-rose-500/10 text-rose-200',
    dividerClass: 'border-rose-500/20',
    topBarClass: 'bg-rose-400',
  },
  {
    id: 'slate',
    label: 'Slate',
    swatchClass: 'bg-slate-300',
    cardClass: 'border-slate-500/30 bg-slate-400/[0.035]',
    cardHoverClass: 'hover:border-slate-300/60 hover:bg-slate-400/[0.07]',
    iconClass: 'border-slate-500/25 bg-slate-400/10 text-slate-200',
    textClass: 'text-slate-200',
    badgeClass: 'border-slate-500/30 bg-slate-400/10 text-slate-200',
    dividerClass: 'border-slate-500/20',
    topBarClass: 'bg-slate-300',
  },
];

export function readProjectUiPreferences(): ProjectUiPreferenceMap {
  if (typeof window === 'undefined') return {};

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export function writeProjectUiPreferences(preferences: ProjectUiPreferenceMap): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
}

export function getDefaultProjectAccent(projectId: string): ProjectAccentId {
  let hash = 0;
  for (let index = 0; index < projectId.length; index += 1) {
    hash = (hash * 31 + projectId.charCodeAt(index)) | 0;
  }
  return PROJECT_ACCENTS[Math.abs(hash) % PROJECT_ACCENTS.length].id;
}

export function getProjectUiPreference(
  projectId: string,
  preferences: ProjectUiPreferenceMap = readProjectUiPreferences(),
): Required<ProjectUiPreference> {
  return {
    isPinned: false,
    accent: getDefaultProjectAccent(projectId),
    ...(preferences[projectId] || {}),
  };
}

export function getProjectAccent(accentId?: ProjectAccentId): ProjectAccent {
  return PROJECT_ACCENTS.find((accent) => accent.id === accentId) || PROJECT_ACCENTS[0];
}

export function updateProjectUiPreference(
  projectId: string,
  patch: ProjectUiPreference,
): ProjectUiPreferenceMap {
  const current = readProjectUiPreferences();
  const next = {
    ...current,
    [projectId]: {
      ...getProjectUiPreference(projectId, current),
      ...patch,
    },
  };
  writeProjectUiPreferences(next);
  return next;
}
