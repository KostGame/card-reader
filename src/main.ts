import "./styles.css";
import { getManifestTechnicalInfo, parseManifestJson } from "./manifest";
import type { CardMarkManifest, ManifestParseResult, ManifestTechnicalInfo } from "./types";

type AppState = {
  fileName: string | null;
  parseResult: ManifestParseResult | null;
};

const state: AppState = {
  fileName: null,
  parseResult: null
};

const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error("App root not found");
}

const root = app;

render();

function render(): void {
  const manifest = state.parseResult?.ok ? state.parseResult.manifest : null;
  const technicalInfo = manifest ? getManifestTechnicalInfo(manifest) : null;

  root.innerHTML = `
    <main class="app-shell">
      <header class="topbar">
        <div>
          <p class="eyebrow">CardMark browser reader</p>
          <h1>Card Reader</h1>
          <p class="lead">Распознавание CardMark-меток с камеры или изображения.</p>
        </div>
        <span class="status-pill">PR-000</span>
      </header>

      <section class="notice" aria-labelledby="recognition-title">
        <h2 id="recognition-title">Распознавание пока не реализовано</h2>
        <p>Сейчас доступна только загрузка и проверка JSON manifest. Камера, изображение и декодирование появятся в следующих PR.</p>
      </section>

      <section class="workspace-grid">
        <div class="panel">
          <h2>JSON manifest</h2>
          <label class="file-input">
            <span>Загрузить manifest</span>
            <input id="manifest-input" type="file" accept="application/json,.json" />
          </label>
          ${renderManifestStatus()}
        </div>

        <div class="panel muted-panel">
          <h2>Камера</h2>
          <p>Режим камеры будет добавлен в следующих PR.</p>
        </div>

        <div class="panel muted-panel">
          <h2>Изображение</h2>
          <p>Загрузка и анализ изображения будут добавлены в следующих PR.</p>
        </div>
      </section>

      ${technicalInfo ? renderTechnicalInfo(technicalInfo) : renderEmptyTechnicalInfo()}
      ${manifest ? renderCards(manifest) : ""}
    </main>
  `;

  document.querySelector<HTMLInputElement>("#manifest-input")?.addEventListener("change", handleManifestInput);
}

function renderManifestStatus(): string {
  if (!state.parseResult) {
    return `
      <div class="manifest-status neutral">
        <strong>Manifest не загружен</strong>
        <span>Выберите JSON manifest, экспортированный генератором CardMark.</span>
      </div>
    `;
  }

  if (state.parseResult.ok) {
    return `
      <div class="manifest-status success">
        <strong>Manifest загружен успешно</strong>
        <span>${escapeHtml(state.fileName ?? "JSON файл")} прошёл базовую валидацию CardMark v0.</span>
      </div>
    `;
  }

  return `
    <div class="manifest-status danger">
      <strong>Ошибка валидации</strong>
      <span>${escapeHtml(state.fileName ?? "JSON файл")} не подходит для CardMark v0.</span>
      <ul class="error-list">
        ${state.parseResult.errors.map((error) => `<li><code>${escapeHtml(error.path)}</code> ${escapeHtml(error.message)}</li>`).join("")}
      </ul>
    </div>
  `;
}

function renderTechnicalInfo(info: ManifestTechnicalInfo): string {
  const duplicateText =
    info.duplicateMarkerIds.length > 0 ? info.duplicateMarkerIds.join(", ") : "нет";

  return `
    <section class="panel technical-panel" aria-labelledby="technical-title">
      <h2 id="technical-title">Техническая информация</h2>
      <dl class="technical-grid">
        ${renderTechnicalItem("deckType", info.deckType)}
        ${renderTechnicalItem("version", info.version)}
        ${renderTechnicalItem("markerSizeMm", `${info.markerSizeMm}`)}
        ${renderTechnicalItem("cards", `${info.cardsCount}`)}
        ${renderTechnicalItem("markerId", info.markerIdRange)}
        ${renderTechnicalItem("Дубликаты markerId", duplicateText)}
      </dl>
    </section>
  `;
}

function renderEmptyTechnicalInfo(): string {
  return `
    <section class="panel technical-panel" aria-labelledby="technical-title">
      <h2 id="technical-title">Техническая информация</h2>
      <p class="empty-state">Появится после успешной загрузки manifest.</p>
    </section>
  `;
}

function renderTechnicalItem(label: string, value: string): string {
  return `
    <div>
      <dt>${escapeHtml(label)}</dt>
      <dd>${escapeHtml(value)}</dd>
    </div>
  `;
}

function renderCards(manifest: CardMarkManifest): string {
  return `
    <section class="panel cards-panel" aria-labelledby="cards-title">
      <div class="section-heading">
        <h2 id="cards-title">Карты manifest</h2>
        <span>${manifest.cards.length}</span>
      </div>
      <div class="cards-table-wrap">
        <table class="cards-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Группа</th>
              <th>Название</th>
              <th>markerId</th>
            </tr>
          </thead>
          <tbody>
            ${manifest.cards
              .map(
                (card) => `
                  <tr>
                    <td>${card.id}</td>
                    <td>${escapeHtml(card.group)}</td>
                    <td>${escapeHtml(card.name)}</td>
                    <td>${card.markerId}</td>
                  </tr>
                `
              )
              .join("")}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

async function handleManifestInput(event: Event): Promise<void> {
  const input = event.currentTarget as HTMLInputElement;
  const file = input.files?.[0];

  if (!file) {
    return;
  }

  state.fileName = file.name;
  state.parseResult = parseManifestJson(await file.text());
  render();
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
