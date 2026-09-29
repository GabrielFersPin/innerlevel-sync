# InnerLevel Sync

**InnerLevel Sync** is an Obsidian plugin that seamlessly integrates your Obsidian vault notes and Spaced Repetition System (SRS) with the **InnerLevel** gamified productivity app.

It automatically extracts your daily due study notes and quick captures from Obsidian and syncs them to InnerLevel as gamified action cards with estimated durations, energy costs, priority ratings, and deep links back to your vault.

---

## ✨ Features

- **Dual Sync Modes**:
  - **By Area (`area`)**: Groups all due notes for a given topic/area into a single summary action card. Displays the **total cumulative study time** required for that area, lists all individual notes with their level of understanding, and provides direct `obsidian://open` deep links.
  - **Individual (`individual`)**: Creates a distinct action card in InnerLevel for every single due note.
- **Automatic Daily Sync**: Option to automatically sync due SRS notes once per day when Obsidian opens.
- **Quick Selection/Note Capture**: Capture the currently selected text or note into InnerLevel instantly.
- **SRS Frontmatter Integration**: Reads and respects Obsidian frontmatter fields (`tipo_nota`, `area`, `status`, `proxima-revision`, `nivel-comprension`, `tiempo-repaso`, etc.).
- **Automatic Sync Tracking**: Updates frontmatter with `innerlevel_last_sync` and `innerlevel_card_id` to prevent duplicate daily syncs.

---

## ⚙️ Configuration & Setup

1. Install and enable **InnerLevel Sync** in Obsidian Settings.
2. Navigate to **Obsidian Settings > InnerLevel Sync**.
3. Configure your **InnerLevel** Supabase connection details:
   - **Supabase URL**: Your InnerLevel Supabase project URL.
   - **Supabase Anon Key**: Your InnerLevel project anon key.
   - **Email & Password**: Your existing InnerLevel account credentials.
4. Click **Sign in / test** to verify connection.
5. *(Optional)* Select your preferred **Sync Mode** (*Por Área* or *Individual*) and enable **Automatic daily sync**.

---

## 📝 Frontmatter Format

To mark notes for SRS synchronization, ensure your markdown notes include YAML frontmatter with the following supported keys:

```yaml
---
tipo_nota: tecnica         # Supported: tecnica, nota_estudio, captura_rapida, permanente, problema
area: Infraestructura-Nube # Required topic area
status: 🌿 Creciendo        # Excludes: "🎉 Completado / Archivado"
proxima-revision: 2026-09-29 # Date in YYYY-MM-DD
nivel-comprension: 🤔       # Level of understanding (❓, 🤔, 💡, ✅, 🎯)
tiempo-repaso: 15min       # Duration (e.g. 5min, 15min, 30min, 1h)
prioridad: alta            # Priority (alta, media, baja)
---
```

---

## 🕹️ Commands

Access these commands from the Obsidian Command Palette (`Ctrl+P` or `Cmd+P`):

- **Sync today's due notes**: Syncs notes using your default mode setting.
- **Sync today's due notes (by area)**: Syncs notes grouped into area summary cards.
- **Sync today's due notes (individual)**: Syncs notes as individual action cards.
- **Resync today's due notes**: Forces a resync even if notes were already synced today.
- **Capture selection / current note**: Captures the current note or selection as a quick seed card.
- **Open InnerLevel**: Opens the InnerLevel web application in your default browser.

---

## 🛠️ Development & Building

To build the plugin locally:

```bash
# Install dependencies
npm install

# Build production bundle
npm run build
```

This compiles TypeScript and bundles everything into `main.js`.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
