export type Language = 'auto' | 'en' | 'es';

export interface TranslationDict {
  // Ribbon & Menus
  ribbonTooltip: string;
  ribbonSyncDue: string;
  ribbonSyncDueArea: string;
  ribbonSyncDueIndividual: string;
  ribbonResyncDue: string;
  ribbonCaptureCurrent: string;
  ribbonOpenInnerLevel: string;

  // Commands
  cmdScheduleReview: string;
  cmdEnableReviewToday: string;
  cmdCaptureCurrent: string;
  cmdSyncDue: string;
  cmdSyncDueArea: string;
  cmdSyncDueIndividual: string;
  cmdResyncDue: string;
  cmdOpenInnerLevel: string;

  // Context Menu
  menuScheduleReview: string;
  menuAddReviewToday: string;
  menuBatchReview: (count: number) => string;

  // Single Note Modal
  modalTitle: string;
  modalDesc: (filename: string) => string;
  modalTargetDate: string;
  modalTargetDateDesc: string;
  modalQuickToday: string;
  modalQuickTomorrow: string;
  modalQuick3d: string;
  modalQuick1w: string;
  modalQuick2w: string;
  modalArea: string;
  modalAreaDesc: string;
  modalDuration: string;
  modalDurationDesc: string;
  modalNoteType: string;
  modalNoteTypeDesc: string;
  modalLevel: string;
  modalLevelDesc: string;
  modalSaveAndSync: string;
  modalSaveOnly: string;
  modalCancel: string;

  // Batch Modal
  batchModalTitle: (count: number) => string;
  batchModalDesc: (count: number) => string;
  batchModalAreaDesc: string;
  batchApplyToAll: (count: number) => string;
  batchApplyAndSync: (count: number) => string;

  // Types
  typeTechnical: string;
  typeStudyNote: string;
  typeQuickCapture: string;
  typeClass: string;
  typeProblem: string;
  typePermanent: string;

  // Comprehension Levels
  levelPending: string;
  levelDifficult: string;
  levelGood: string;
  levelMastered: string;

  // Notices
  noticeReviewScheduled: (filename: string, date: string) => string;
  noticeBatchScheduled: (count: number) => string;
  noticeNoMarkdownOpen: string;
  noticeNoDueNotes: string;
  noticeNotesAlreadySynced: (count: number) => string;
  noticeSyncSuccess: (count: number, areas: number) => string;
  noticeSyncSuccessIndividual: (count: number) => string;
  noticeCaptured: (filename: string) => string;
  noticeConnectionOk: string;

  // Settings
  settingHeadingConfig: string;
  settingHeadingDefaults: string;
  settingLanguage: string;
  settingLanguageDesc: string;
  settingLanguageAuto: string;
  settingSyncMode: string;
  settingSyncModeDesc: string;
  settingSyncModeArea: string;
  settingSyncModeIndividual: string;
  settingAutoSync: string;
  settingAutoSyncDesc: string;
  settingDefaultDuration: string;
  settingDefaultDurationDesc: string;
  settingDefaultEnergy: string;
  settingDefaultEnergyDesc: string;
  settingDefaultType: string;
  settingDefaultTypeDesc: string;
  settingConnectionBtn: string;
  settingConnectionDesc: string;
}

export const en: TranslationDict = {
  ribbonTooltip: "InnerLevel: Sync due notes",
  ribbonSyncDue: "Sync today's due notes",
  ribbonSyncDueArea: "Sync today's due notes (by area)",
  ribbonSyncDueIndividual: "Sync today's due notes (individual)",
  ribbonResyncDue: "Resync today's due notes (force)",
  ribbonCaptureCurrent: "Capture selection / current note",
  ribbonOpenInnerLevel: "Open InnerLevel",

  cmdScheduleReview: "Schedule review for current note",
  cmdEnableReviewToday: "Enable review for today (1-click)",
  cmdCaptureCurrent: "Capture selection / current note",
  cmdSyncDue: "Sync today's due notes",
  cmdSyncDueArea: "Sync today's due notes (by area)",
  cmdSyncDueIndividual: "Sync today's due notes (individual)",
  cmdResyncDue: "Resync today's due notes (force)",
  cmdOpenInnerLevel: "Open InnerLevel",

  menuScheduleReview: "InnerLevel: Schedule review...",
  menuAddReviewToday: "InnerLevel: Enable review for today",
  menuBatchReview: (count: number) => `InnerLevel: Schedule review for ${count} notes...`,

  modalTitle: "Schedule Review in InnerLevel",
  modalDesc: (filename: string) => `Configure spaced repetition review for "${filename}"`,
  modalTargetDate: "Review Date",
  modalTargetDateDesc: "When this note should be reviewed in InnerLevel",
  modalQuickToday: "Today",
  modalQuickTomorrow: "Tomorrow",
  modalQuick3d: "+3 Days",
  modalQuick1w: "+1 Week",
  modalQuick2w: "+2 Weeks",
  modalArea: "Area / Deck",
  modalAreaDesc: "Topic grouping (defaults to parent folder)",
  modalDuration: "Estimated Duration",
  modalDurationDesc: "Time needed to review this note (e.g. 15m, 30m, 1h)",
  modalNoteType: "Note Type",
  modalNoteTypeDesc: "Classification for InnerLevel rune forging",
  modalLevel: "Comprehension Level",
  modalLevelDesc: "Current understanding of this topic",
  modalSaveAndSync: "Save & Sync to InnerLevel",
  modalSaveOnly: "Save to Note",
  modalCancel: "Cancel",

  batchModalTitle: (count: number) => `Schedule ${count} notes in InnerLevel`,
  batchModalDesc: (count: number) => `Apply review schedule to ${count} selected Markdown notes`,
  batchModalAreaDesc: "Leave empty to preserve each note's folder name",
  batchApplyToAll: (count: number) => `Apply to all ${count} notes`,
  batchApplyAndSync: (count: number) => `Apply & Sync to InnerLevel`,

  typeTechnical: "Technical Note",
  typeStudyNote: "Study Note",
  typeQuickCapture: "Quick Capture",
  typeClass: "Class / Lecture",
  typeProblem: "Problem / Exercise",
  typePermanent: "Permanent Note",

  levelPending: "Pending / New",
  levelDifficult: "Needs Review (Difficult)",
  levelGood: "Good Understanding",
  levelMastered: "Mastered",

  noticeReviewScheduled: (filename: string, date: string) => `InnerLevel: Review scheduled for "${filename}" on ${date}`,
  noticeBatchScheduled: (count: number) => `InnerLevel: Configured review for ${count} notes`,
  noticeNoMarkdownOpen: "Open a Markdown note to schedule review",
  noticeNoDueNotes: "InnerLevel: No due notes found for review today",
  noticeNotesAlreadySynced: (count: number) => `InnerLevel: All ${count} due notes are already in InnerLevel. Use 'Resync (force)' to re-send.`,
  noticeSyncSuccess: (count: number, areas: number) => `InnerLevel: Synced ${count} note(s) across ${areas} area(s)`,
  noticeSyncSuccessIndividual: (count: number) => `InnerLevel: Synced ${count} individual note(s)`,
  noticeCaptured: (filename: string) => `InnerLevel: Captured "${filename}"`,
  noticeConnectionOk: "InnerLevel: Connection successful",

  settingHeadingConfig: "Configuration",
  settingHeadingDefaults: "Review Defaults",
  settingLanguage: "Plugin Language",
  settingLanguageDesc: "Choose UI language or follow Obsidian's language",
  settingLanguageAuto: "Auto (Follow Obsidian)",
  settingSyncMode: "Sync Mode",
  settingSyncModeDesc: "Group notes into area summary cards or create individual cards",
  settingSyncModeArea: "By Area (Grouped with total time)",
  settingSyncModeIndividual: "Individual (One card per note)",
  settingAutoSync: "Automatic daily sync",
  settingAutoSyncDesc: "Sync once on vault startup",
  settingDefaultDuration: "Default duration (hours)",
  settingDefaultDurationDesc: "Fallback duration when not specified in note",
  settingDefaultEnergy: "Default energy cost",
  settingDefaultEnergyDesc: "Fallback energy cost in InnerLevel",
  settingDefaultType: "Default note type",
  settingDefaultTypeDesc: "Used when quickly enabling review for a note",
  settingConnectionBtn: "Test Connection",
  settingConnectionDesc: "Use your existing InnerLevel account. Does not create new users.",
};

export const es: TranslationDict = {
  ribbonTooltip: "InnerLevel: Sincronizar notas pendientes",
  ribbonSyncDue: "Sincronizar notas para hoy",
  ribbonSyncDueArea: "Sincronizar notas para hoy (por área)",
  ribbonSyncDueIndividual: "Sincronizar notas para hoy (individual)",
  ribbonResyncDue: "Resincronizar notas para hoy (forzar)",
  ribbonCaptureCurrent: "Capturar selección / nota actual",
  ribbonOpenInnerLevel: "Abrir InnerLevel",

  cmdScheduleReview: "Programar repaso para la nota actual",
  cmdEnableReviewToday: "Habilitar repaso para hoy (1-clic)",
  cmdCaptureCurrent: "Capturar selección / nota actual",
  cmdSyncDue: "Sincronizar notas para hoy",
  cmdSyncDueArea: "Sincronizar notas para hoy (por área)",
  cmdSyncDueIndividual: "Sincronizar notas para hoy (individual)",
  cmdResyncDue: "Resincronizar notas para hoy (forzar)",
  cmdOpenInnerLevel: "Abrir InnerLevel",

  menuScheduleReview: "InnerLevel: Programar repaso...",
  menuAddReviewToday: "InnerLevel: Habilitar repaso para hoy",
  menuBatchReview: (count: number) => `InnerLevel: Programar repaso para ${count} notas...`,

  modalTitle: "Programar Repaso en InnerLevel",
  modalDesc: (filename: string) => `Configurar repaso espaciado para "${filename}"`,
  modalTargetDate: "Fecha de Repaso",
  modalTargetDateDesc: "Cuándo debe aparecer esta nota para repasar en InnerLevel",
  modalQuickToday: "Hoy",
  modalQuickTomorrow: "Mañana",
  modalQuick3d: "+3 Días",
  modalQuick1w: "+1 Semana",
  modalQuick2w: "+2 Semanas",
  modalArea: "Área / Baraja",
  modalAreaDesc: "Agrupación temática (por defecto toma la carpeta)",
  modalDuration: "Tiempo Estimado",
  modalDurationDesc: "Tiempo necesario para repasar esta nota (ej. 15m, 30m, 1h)",
  modalNoteType: "Tipo de Nota",
  modalNoteTypeDesc: "Clasificación para el forjado del fragmento en InnerLevel",
  modalLevel: "Nivel de Comprensión",
  modalLevelDesc: "Dominio actual sobre este tema",
  modalSaveAndSync: "Guardar y Sincronizar a InnerLevel",
  modalSaveOnly: "Guardar en la Nota",
  modalCancel: "Cancelar",

  batchModalTitle: (count: number) => `Programar ${count} notas en InnerLevel`,
  batchModalDesc: (count: number) => `Aplicar programación de repaso a las ${count} notas seleccionadas`,
  batchModalAreaDesc: "Deja en blanco para conservar el nombre de carpeta de cada nota",
  batchApplyToAll: (count: number) => `Aplicar a las ${count} notas`,
  batchApplyAndSync: (count: number) => `Aplicar y Sincronizar a InnerLevel`,

  typeTechnical: "Nota Técnica",
  typeStudyNote: "Nota de Estudio",
  typeQuickCapture: "Captura Rápida",
  typeClass: "Clase / Lección",
  typeProblem: "Problema / Ejercicio",
  typePermanent: "Nota Permanente",

  levelPending: "Pendiente / Nueva",
  levelDifficult: "Requiere Repaso (Difícil)",
  levelGood: "Buena Comprensión",
  levelMastered: "Dominada",

  noticeReviewScheduled: (filename: string, date: string) => `InnerLevel: Repaso programado para "${filename}" el ${date}`,
  noticeBatchScheduled: (count: number) => `InnerLevel: Se configuró el repaso para ${count} notas`,
  noticeNoMarkdownOpen: "Abre una nota Markdown para programar el repaso",
  noticeNoDueNotes: "InnerLevel: No hay notas con repaso pendiente para hoy",
  noticeNotesAlreadySynced: (count: number) => `InnerLevel: Las ${count} notas pendientes ya están en InnerLevel. Usa 'Resync (force)' para reenviarlas.`,
  noticeSyncSuccess: (count: number, areas: number) => `InnerLevel: Sincronizadas ${count} nota(s) en ${areas} área(s)`,
  noticeSyncSuccessIndividual: (count: number) => `InnerLevel: Sincronizadas ${count} nota(s) individuales`,
  noticeCaptured: (filename: string) => `InnerLevel: Capturada "${filename}"`,
  noticeConnectionOk: "InnerLevel: Conexión correcta",

  settingHeadingConfig: "Configuración",
  settingHeadingDefaults: "Valores por Defecto de Repaso",
  settingLanguage: "Idioma del Plugin",
  settingLanguageDesc: "Elige el idioma de la interfaz o sigue el idioma de Obsidian",
  settingLanguageAuto: "Automático (Idioma de Obsidian)",
  settingSyncMode: "Modo de Sincronización",
  settingSyncModeDesc: "Agrupar notas en cartas resumen por área o crear cartas individuales",
  settingSyncModeArea: "Por Área (Agrupadas con tiempo acumulado)",
  settingSyncModeIndividual: "Individual (Una carta por nota)",
  settingAutoSync: "Sincronización diaria automática",
  settingAutoSyncDesc: "Sincroniza una vez al abrir Obsidian",
  settingDefaultDuration: "Duración por defecto (horas)",
  settingDefaultDurationDesc: "Duración de respaldo si no se especifica en la nota",
  settingDefaultEnergy: "Coste de energía por defecto",
  settingDefaultEnergyDesc: "Coste de energía en InnerLevel",
  settingDefaultType: "Tipo de nota por defecto",
  settingDefaultTypeDesc: "Usado al habilitar rápidamente el repaso de una nota",
  settingConnectionBtn: "Probar Conexión",
  settingConnectionDesc: "Usa tu cuenta existente de InnerLevel. No crea usuarios nuevos.",
};

export function detectLanguage(setting: Language = 'auto'): 'en' | 'es' {
  if (setting === 'en') return 'en';
  if (setting === 'es') return 'es';

  try {
    const momentLocale = (window as unknown as { moment?: { locale?: () => string } }).moment?.locale?.() || '';
    if (momentLocale.toLowerCase().startsWith('es')) return 'es';

    const docLang = document.documentElement.lang || '';
    if (docLang.toLowerCase().startsWith('es')) return 'es';

    const nav = navigator.language || '';
    if (nav.toLowerCase().startsWith('es')) return 'es';
  } catch (_e) {
    // fallback
  }

  return 'en';
}

export function getTranslations(lang: 'en' | 'es'): TranslationDict {
  return lang === 'es' ? es : en;
}
