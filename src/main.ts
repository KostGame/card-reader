import "./styles.css";
import { formatFileSize, loadImageFile, revokeImageFileInfo } from "./imageInput";
import { getManifestTechnicalInfo, parseManifestJson } from "./manifest";
import type { ImageFileInfo, ImageLoadResult } from "./imageInput";
import type { CardMarkCard, CardMarkManifest, ManifestParseResult, ManifestTechnicalInfo } from "./types";

type AppState = {
  fileName: string | null;
  parseResult: ManifestParseResult | null;
  imageResult: ImageLoadResult | null;
  manualMarkerId: string;
};

const state: AppState = {
  fileName: null,
  parseResult: null,
  imageResult: null,
  manualMarkerId: ""
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
          <p class="lead">Мобильный просмотр manifest, изображения и ручной проверки markerId. Распознавание CardMark-меток пока не реализовано.</p>
        </div>
        <span class="status-pill">PR-001</span>
      </header>

      <section class="notice" aria-labelledby="recognition-title">
        <h2 id="recognition-title">Распознавание пока не реализовано</h2>
        <p>Сейчас доступны загрузка manifest, preview изображения и ручная проверка markerId. Камера и декодирование появятся в следующих PR.</p>
      </section>

      <section class="mobile-stack" aria-label="Основные действия">
        <div class="panel primary-panel">
          <div class="panel-heading">
            <div>
              <p class="panel-kicker">Данные колоды</p>
              <h2>JSON manifest</h2>
            </div>
          </div>
          <label class="file-input">
            <span>Загрузить manifest</span>
            <input id="manifest-input" type="file" accept="application/json,.json" />
          </label>
          ${renderManifestStatus()}
        </div>

        <div class="panel primary-panel">
          <div class="panel-heading">
            <div>
              <p class="panel-kicker">Файл для будущего pipeline</p>
              <h2>Изображение</h2>
            </div>
          </div>
          <label class="file-input secondary-action">
            <span>Загрузить изображение</span>
            <input id="image-input" type="file" accept="image/*" />
          </label>
          ${renderImageState()}
        </div>

        ${renderManualCheck(manifest)}
      </section>

      <section class="placeholder-grid" aria-label="Будущие режимы">
        <div class="panel placeholder-panel">
          <h2>Камера</h2>
          <p>Режим камеры будет добавлен в следующих PR.</p>
        </div>

        <div class="panel placeholder-panel">
          <h2>Распознавание</h2>
          <p>Декодирование CardMark-меток пока не реализовано. Эта версия не анализирует изображение автоматически.</p>
        </div>
      </section>

      ${technicalInfo ? renderTechnicalInfo(technicalInfo) : renderEmptyTechnicalInfo()}
      ${manifest ? renderCards(manifest) : ""}
    </main>
  `;

  document.querySelector<HTMLInputElement>("#manifest-input")?.addEventListener("change", handleManifestInput);
  document.querySelector<HTMLInputElement>("#image-input")?.addEventListener("change", handleImageInput);
  document.querySelector<HTMLButtonElement>("#clear-image")?.addEventListener("click", clearImage);
  document.querySelector<HTMLInputElement>("#manual-marker-id")?.addEventListener("input", handleManualMarkerInput);
}

function renderManifestStatus(): string {
  if (!state.parseResult) {
    return `
      <div class="status-card neutral">
        <strong>Manifest не загружен</strong>
        <span>Выберите JSON manifest, экспортированный генератором CardMark.</span>
      </div>
    `;
  }

  if (state.parseResult.ok) {
    return `
      <div class="status-card success">
        <strong>Manifest загружен успешно</strong>
        <span>${escapeHtml(state.fileName ?? "JSON файл")} прошёл базовую валидацию CardMark v0.</span>
      </div>
    `;
  }

  return `
    <div class="status-card danger">
      <strong>Ошибка валидации</strong>
      <span>${escapeHtml(state.fileName ?? "JSON файл")} не подходит для CardMark v0.</span>
      <ul class="error-list">
        ${state.parseResult.errors.map((error) => `<li><code>${escapeHtml(error.path)}</code> ${escapeHtml(error.message)}</li>`).join("")}
      </ul>
    </div>
  `;
}

function renderImageState(): string {
  if (!state.imageResult) {
    return `
      <div class="status-card neutral">
        <strong>Изображение не загружено</strong>
        <span>Preview нужен для ручной подготовки fixtures. Автоматический анализ изображения пока не выполняется.</span>
      </div>
    `;
  }

  if (!state.imageResult.ok) {
    return `
      <div class="status-card danger">
        <strong>Ошибка загрузки изображения</strong>
        <span>${escapeHtml(state.imageResult.error)}</span>
      </div>
    `;
  }

  const image = state.imageResult.image;

  return `
    <div class="image-preview-card">
      <img src="${escapeHtml(image.objectUrl)}" alt="Preview загруженного изображения" />
      <div class="image-actions">
        <button class="ghost-button" id="clear-image" type="button">Очистить изображение</button>
      </div>
      ${renderImageMeta(image)}
      <p class="helper-text">Preview не является распознаванием. Изображение только загружено и показано в браузере.</p>
    </div>
  `;
}

function renderImageMeta(image: ImageFileInfo): string {
  return `
    <dl class="meta-list">
      ${renderMetaItem("Файл", image.name)}
      ${renderMetaItem("MIME type", image.type)}
      ${renderMetaItem("Размер", formatFileSize(image.sizeBytes))}
      ${renderMetaItem("Ширина", `${image.width}px`)}
      ${renderMetaItem("Высота", `${image.height}px`)}
    </dl>
  `;
}

function renderManualCheck(manifest: CardMarkManifest | null): string {
  const parsed = parseManualMarkerId(state.manualMarkerId);
  const foundCard = parsed.ok && manifest ? findCardByMarkerId(manifest, parsed.markerId) : null;

  return `
    <section class="panel primary-panel" aria-labelledby="manual-title">
      <div class="panel-heading">
        <div>
          <p class="panel-kicker">Не распознавание</p>
          <h2 id="manual-title">Ручная проверка</h2>
        </div>
      </div>
      <label class="field-label" for="manual-marker-id">markerId</label>
      <input
        class="number-input"
        id="manual-marker-id"
        inputmode="numeric"
        autocomplete="off"
        placeholder="0..127"
        value="${escapeHtml(state.manualMarkerId)}"
      />
      ${renderManualResult(manifest, parsed, foundCard)}
    </section>
  `;
}

function renderManualResult(
  manifest: CardMarkManifest | null,
  parsed: ReturnType<typeof parseManualMarkerId>,
  foundCard: CardMarkCard | null
): string {
  if (!manifest) {
    return `<p class="helper-text">Сначала загрузите manifest.</p>`;
  }

  if (state.manualMarkerId.trim() === "") {
    return `<p class="helper-text">Введите markerId вручную, чтобы проверить соответствие карте из manifest.</p>`;
  }

  if (!parsed.ok) {
    return `<div class="status-card danger compact"><strong>Некорректный markerId</strong><span>${escapeHtml(parsed.error)}</span></div>`;
  }

  if (!foundCard) {
    return `<div class="status-card neutral compact"><strong>markerId ${parsed.markerId} не найден</strong><span>В загруженном manifest нет карты с таким markerId.</span></div>`;
  }

  return `
    <article class="match-card">
      <p class="panel-kicker">Найдено в manifest</p>
      <h3>${escapeHtml(foundCard.name)}</h3>
      <dl class="meta-list compact-meta">
        ${renderMetaItem("Группа", foundCard.group)}
        ${renderMetaItem("id", `${foundCard.id}`)}
        ${renderMetaItem("markerId", `${foundCard.markerId}`)}
      </dl>
    </article>
  `;
}

function renderTechnicalInfo(info: ManifestTechnicalInfo): string {
  const duplicateText =
    info.duplicateMarkerIds.length > 0 ? info.duplicateMarkerIds.join(", ") : "нет";

  return `
    <section class="panel technical-panel" aria-labelledby="technical-title">
      <h2 id="technical-title">Техническая информация</h2>
      <dl class="meta-list technical-list">
        ${renderMetaItem("deckType", info.deckType)}
        ${renderMetaItem("version", info.version)}
        ${renderMetaItem("markerSizeMm", `${info.markerSizeMm}`)}
        ${renderMetaItem("cards", `${info.cardsCount}`)}
        ${renderMetaItem("Диапазон markerId", info.markerIdRange)}
        ${renderMetaItem("Дубликаты markerId", duplicateText)}
      </dl>
    </section>
  `;
}

function renderEmptyTechnicalInfo(): string {
  return `
    <section class="panel technical-panel" aria-labelledby="technical-title">
      <h2 id="technical-title">Техническая информация</h2>
      <p class="helper-text">Появится после успешной загрузки manifest.</p>
    </section>
  `;
}

function renderCards(manifest: CardMarkManifest): string {
  return `
    <section class="cards-section" aria-labelledby="cards-title">
      <div class="section-heading">
        <div>
          <p class="panel-kicker">Manifest cards</p>
          <h2 id="cards-title">Карты</h2>
        </div>
        <span>${manifest.cards.length}</span>
      </div>
      <div class="cards-grid">
        ${manifest.cards.map(renderCard).join("")}
      </div>
    </section>
  `;
}

function renderCard(card: CardMarkCard): string {
  return `
    <article class="card-item">
      <div>
        <h3>${escapeHtml(card.name)}</h3>
        <p>${escapeHtml(card.group)}</p>
      </div>
      <dl class="card-meta">
        ${renderMetaItem("id", `${card.id}`)}
        ${renderMetaItem("markerId", `${card.markerId}`)}
      </dl>
    </article>
  `;
}

function renderMetaItem(label: string, value: string): string {
  return `
    <div>
      <dt>${escapeHtml(label)}</dt>
      <dd>${escapeHtml(value)}</dd>
    </div>
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

async function handleImageInput(event: Event): Promise<void> {
  const input = event.currentTarget as HTMLInputElement;
  const file = input.files?.[0];

  if (!file) {
    return;
  }

  if (state.imageResult?.ok) {
    revokeImageFileInfo(state.imageResult.image);
  }

  state.imageResult = await loadImageFile(file);
  render();
}

function clearImage(): void {
  if (state.imageResult?.ok) {
    revokeImageFileInfo(state.imageResult.image);
  }

  state.imageResult = null;
  render();
}

function handleManualMarkerInput(event: Event): void {
  const input = event.currentTarget as HTMLInputElement;
  state.manualMarkerId = input.value;
  render();
}

function parseManualMarkerId(input: string):
  | {
      ok: true;
      markerId: number;
    }
  | {
      ok: false;
      error: string;
    } {
  const trimmed = input.trim();

  if (!/^\d+$/.test(trimmed)) {
    return {
      ok: false,
      error: "markerId должен быть целым числом в диапазоне 0..127."
    };
  }

  const markerId = Number(trimmed);

  if (!Number.isInteger(markerId) || markerId < 0 || markerId > 127) {
    return {
      ok: false,
      error: "markerId должен быть целым числом в диапазоне 0..127."
    };
  }

  return {
    ok: true,
    markerId
  };
}

function findCardByMarkerId(manifest: CardMarkManifest, markerId: number): CardMarkCard | null {
  return manifest.cards.find((card) => card.markerId === markerId) ?? null;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
