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

export class BatchScheduleModal extends Modal {
  private files: TFile[];
  private plugin: InnerLevelSyncPlugin;

  private selectedDate: string = isoToday();
  private selectedDuration: string = '15m';
  private overrideArea: string = '';
  private selectedType: string = 'tecnica';
  private selectedLevel: string = 'pendiente';

  constructor(app: App, plugin: InnerLevelSyncPlugin, files: TFile[]) {
    super(app);
    this.plugin = plugin;
    this.files = files;
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass('innerlevel-batch-modal');

    const lang = detectLanguage(this.plugin.settings.language);
    const t = getTranslations(lang);

    this.selectedType = this.plugin.settings.defaultNoteType || (lang === 'es' ? 'tecnica' : 'technical');
    const mins = Math.round((this.plugin.settings.defaultDuration || 0.5) * 60);
    this.selectedDuration = `${mins}m`;

    this.titleEl.setText(t.batchModalTitle(this.files.length));
    const descEl = contentEl.createEl('p', {
      text: t.batchModalDesc(this.files.length),
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
        quickDateContainer.querySelectorAll('button').forEach((b) => b.removeClass('mod-cta'));
        btn.addClass('mod-cta');
      });
      if (opt.days === 0 && this.selectedDate === isoToday()) {
        btn.addClass('mod-cta');
      }
    });

    // 2. Area Override
    new Setting(contentEl)
      .setName(t.modalArea)
      .setDesc(t.batchModalAreaDesc)
      .addText((text) => {
        text.setPlaceholder('(Folder name / Nombre de carpeta)');
        text.onChange((val) => {
          this.overrideArea = val.trim();
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

    // 5. Action Buttons Bar
    const actionsContainer = contentEl.createEl('div', { cls: 'innerlevel-modal-actions' });
    actionsContainer.style.display = 'flex';
    actionsContainer.style.justifyContent = 'flex-end';
    actionsContainer.style.gap = '10px';
    actionsContainer.style.marginTop = '24px';
    actionsContainer.style.paddingTop = '14px';
    actionsContainer.style.borderTop = '1px solid var(--background-modifier-border)';

    const cancelBtn = actionsContainer.createEl('button', { text: t.modalCancel });
    cancelBtn.addEventListener('click', () => this.close());

    const saveOnlyBtn = actionsContainer.createEl('button', { text: t.batchApplyToAll(this.files.length) });
    saveOnlyBtn.addEventListener('click', async () => {
      await this.applyBatch(lang);
      this.close();
    });

    const saveAndSyncBtn = actionsContainer.createEl('button', {
      text: t.batchApplyAndSync(this.files.length),
      cls: 'mod-cta'
    });
    saveAndSyncBtn.addEventListener('click', async () => {
      await this.applyBatch(lang);
      this.close();
      await this.plugin.syncDueNotes(true);
    });
  }

  private async applyBatch(lang: 'en' | 'es'): Promise<void> {
    for (const file of this.files) {
      const area = this.overrideArea || (file.parent && file.parent.name && file.parent.name !== '/' ? file.parent.name : 'General');
      await this.plugin.applyReviewMetadata(
        file,
        {
          date: this.selectedDate,
          duration: this.selectedDuration,
          area,
          noteType: this.selectedType,
          level: this.selectedLevel,
        },
        lang
      );
    }
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
