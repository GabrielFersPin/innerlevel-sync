import { App, Modal, Setting, TFile } from 'obsidian';
import type InnerLevelSyncPlugin from '../main';
import { getTranslations, detectLanguage } from '../i18n';

function isoToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export class ScheduleReviewModal extends Modal {
  private file: TFile;
  private plugin: InnerLevelSyncPlugin;

  private selectedDate: string = isoToday();
  private selectedDuration: string = '15m';
  private selectedArea: string = '';
  private selectedType: string = 'tecnica';
  private selectedLevel: string = 'pendiente';

  constructor(app: App, plugin: InnerLevelSyncPlugin, file: TFile) {
    super(app);
    this.plugin = plugin;
    this.file = file;
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass('innerlevel-schedule-modal');

    const lang = detectLanguage(this.plugin.settings.language);
    const t = getTranslations(lang);

    // Initial extraction from current frontmatter or folder fallback
    const fm = (this.app.metadataCache.getFileCache(this.file)?.frontmatter || {}) as Record<string, unknown>;
    
    const existingDate = String(fm['due_date'] || fm['proxima-revision'] || fm['proxima_revision'] || fm['due'] || '').trim();
    if (existingDate && !existingDate.includes('<%')) {
      this.selectedDate = existingDate;
    }

    const existingDuration = String(fm['tiempo-repaso'] || fm['review_time'] || fm['duration'] || '').trim();
    if (existingDuration) {
      this.selectedDuration = existingDuration;
    } else {
      const mins = Math.round((this.plugin.settings.defaultDuration || 0.5) * 60);
      this.selectedDuration = `${mins}m`;
    }

    const existingArea = String(fm['area'] || fm['cards-deck'] || fm['deck'] || fm['topic'] || '').trim();
    if (existingArea) {
      this.selectedArea = existingArea;
    } else if (this.file.parent && this.file.parent.name && this.file.parent.name !== '/') {
      this.selectedArea = this.file.parent.name;
    } else {
      this.selectedArea = 'General';
    }

    const existingType = String(fm['tipo_nota'] || fm['note_type'] || fm['type'] || fm['tipo'] || '').trim();
    if (existingType) {
      this.selectedType = existingType;
    } else {
      this.selectedType = this.plugin.settings.defaultNoteType || (lang === 'es' ? 'tecnica' : 'technical');
    }

    const existingLevel = String(fm['nivel-comprension'] || fm['understanding_level'] || fm['comprehension'] || '').trim();
    if (existingLevel) {
      this.selectedLevel = existingLevel;
    }

    // Modal Title & Subtitle
    this.titleEl.setText(t.modalTitle);
    const descEl = contentEl.createEl('p', {
      text: t.modalDesc(this.file.basename),
      cls: 'setting-item-description'
    });
    descEl.style.marginBottom = '18px';

    // 1. Target Date Setting with Quick Pills
    let dateInputEl: HTMLInputElement;
    new Setting(contentEl)
      .setName(t.modalTargetDate)
      .setDesc(t.modalTargetDateDesc)
      .addText((text) => {
        dateInputEl = text.inputEl;
        dateInputEl.type = 'date';
        dateInputEl.value = this.selectedDate;
        dateInputEl.style.minWidth = '160px';
        text.onChange((val) => {
          this.selectedDate = val;
        });
      });

    // Quick Date Pills Container
    const quickDateContainer = contentEl.createEl('div', { cls: 'innerlevel-quick-pills' });
    quickDateContainer.style.display = 'flex';
    quickDateContainer.style.gap = '6px';
    quickDateContainer.style.flexWrap = 'wrap';
    quickDateContainer.style.marginBottom = '16px';
    quickDateContainer.style.paddingLeft = '4px';

    const quickDateOptions = [
      { label: t.modalQuickToday, days: 0 },
      { label: t.modalQuickTomorrow, days: 1 },
      { label: t.modalQuick3d, days: 3 },
      { label: t.modalQuick1w, days: 7 },
      { label: t.modalQuick2w, days: 14 },
    ];

    quickDateOptions.forEach((opt) => {
      const btn = quickDateContainer.createEl('button', { text: opt.label });
      btn.style.fontSize = '12px';
      btn.style.padding = '4px 10px';
      btn.style.borderRadius = '8px';
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        this.selectedDate = addDays(opt.days);
        dateInputEl.value = this.selectedDate;
        // Visual indicator
        quickDateContainer.querySelectorAll('button').forEach((b) => b.removeClass('mod-cta'));
        btn.addClass('mod-cta');
      });
      if (opt.days === 0 && this.selectedDate === isoToday()) {
        btn.addClass('mod-cta');
      }
    });

    // 2. Area / Topic
    new Setting(contentEl)
      .setName(t.modalArea)
      .setDesc(t.modalAreaDesc)
      .addText((text) => {
        text.setValue(this.selectedArea);
        text.onChange((val) => {
          this.selectedArea = val.trim();
        });
      });

    // 3. Duration with Quick Pills
    let durationInputEl: HTMLInputElement;
    new Setting(contentEl)
      .setName(t.modalDuration)
      .setDesc(t.modalDurationDesc)
      .addText((text) => {
        durationInputEl = text.inputEl;
        text.setValue(this.selectedDuration);
        text.onChange((val) => {
          this.selectedDuration = val.trim();
        });
      });

    const quickDurationContainer = contentEl.createEl('div', { cls: 'innerlevel-quick-pills' });
    quickDurationContainer.style.display = 'flex';
    quickDurationContainer.style.gap = '6px';
    quickDurationContainer.style.flexWrap = 'wrap';
    quickDurationContainer.style.marginBottom = '16px';
    quickDurationContainer.style.paddingLeft = '4px';

    const quickDurations = ['5m', '15m', '30m', '45m', '1h'];
    quickDurations.forEach((d) => {
      const btn = quickDurationContainer.createEl('button', { text: d });
      btn.style.fontSize = '12px';
      btn.style.padding = '4px 10px';
      btn.style.borderRadius = '8px';
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        this.selectedDuration = d;
        durationInputEl.value = d;
        quickDurationContainer.querySelectorAll('button').forEach((b) => b.removeClass('mod-cta'));
        btn.addClass('mod-cta');
      });
      if (this.selectedDuration === d) {
        btn.addClass('mod-cta');
      }
    });

    // 4. Note Type
    new Setting(contentEl)
      .setName(t.modalNoteType)
      .setDesc(t.modalNoteTypeDesc)
      .addDropdown((dropdown) => {
        dropdown
          .addOption(lang === 'es' ? 'tecnica' : 'technical', t.typeTechnical)
          .addOption(lang === 'es' ? 'nota_estudio' : 'study_note', t.typeStudyNote)
          .addOption(lang === 'es' ? 'captura_rapida' : 'quick_capture', t.typeQuickCapture)
          .addOption(lang === 'es' ? 'clase' : 'class', t.typeClass)
          .addOption(lang === 'es' ? 'problema' : 'problem', t.typeProblem)
          .addOption(lang === 'es' ? 'permanente' : 'permanent', t.typePermanent)
          .setValue(this.selectedType)
          .onChange((val) => {
            this.selectedType = val;
          });
      });

    // 5. Comprehension Level
    new Setting(contentEl)
      .setName(t.modalLevel)
      .setDesc(t.modalLevelDesc)
      .addDropdown((dropdown) => {
        dropdown
          .addOption(lang === 'es' ? 'pendiente' : 'pending', t.levelPending)
          .addOption(lang === 'es' ? 'dificil' : 'difficult', t.levelDifficult)
          .addOption(lang === 'es' ? 'bien' : 'good', t.levelGood)
          .addOption(lang === 'es' ? 'completado' : 'mastered', t.levelMastered)
          .setValue(this.selectedLevel)
          .onChange((val) => {
            this.selectedLevel = val;
          });
      });

    // 6. Action Buttons Bar
    const actionsContainer = contentEl.createEl('div', { cls: 'innerlevel-modal-actions' });
    actionsContainer.style.display = 'flex';
    actionsContainer.style.justifyContent = 'flex-end';
    actionsContainer.style.gap = '10px';
    actionsContainer.style.marginTop = '24px';
    actionsContainer.style.paddingTop = '14px';
    actionsContainer.style.borderTop = '1px solid var(--background-modifier-border)';

    const cancelBtn = actionsContainer.createEl('button', { text: t.modalCancel });
    cancelBtn.addEventListener('click', () => this.close());

    const saveOnlyBtn = actionsContainer.createEl('button', { text: t.modalSaveOnly });
    saveOnlyBtn.addEventListener('click', async () => {
      await this.saveMetadata(lang);
      this.close();
    });

    const saveAndSyncBtn = actionsContainer.createEl('button', {
      text: t.modalSaveAndSync,
      cls: 'mod-cta'
    });
    saveAndSyncBtn.addEventListener('click', async () => {
      await this.saveMetadata(lang);
      this.close();
      await this.plugin.syncDueNotes(true);
    });
  }

  private async saveMetadata(lang: 'en' | 'es'): Promise<void> {
    await this.plugin.applyReviewMetadata(
      this.file,
      {
        date: this.selectedDate,
        duration: this.selectedDuration,
        area: this.selectedArea || 'General',
        noteType: this.selectedType,
        level: this.selectedLevel,
      },
      lang
    );
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
