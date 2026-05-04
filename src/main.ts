import "./styles.css";
import { decodeCardMarkGrid } from "./cardmarkDecoder";
import { analyzeImageObjectUrl } from "./canvasImage";
import { formatFileSize, loadImageFile, revokeImageFileInfo } from "./imageInput";
import { getManifestTechnicalInfo, parseManifestJson } from "./manifest";
import type { DecodeResult } from "./cardmarkDecoder";
import type { ImageAnalysisResult, ImageDecodeCandidateResult, MarkerCandidate } from "./imageProcessing";
import type { ImageFileInfo, ImageLoadResult } from "./imageInput";
import type { CardMarkCard, CardMarkManifest, ManifestParseResult, ManifestTechnicalInfo } from "./types";

type AppState = {
  fileName: string | null;
  parseResult: ManifestParseResult | null;
  imageResult: ImageLoadResult | null;
  manualMarkerId: string;
  decoderInput: string;
  decoderResult: DecodeResult | null;
  imageAnalysis: ImageAnalysisResult | null;
  imageAnalysisPending: boolean;
};

const state: AppState = {
  fileName: null,
  parseResult: null,
  imageResult: null,
  manualMarkerId: "",
  decoderInput: "",
  decoderResult: null,
  imageAnalysis: null,
  imageAnalysisPending: false
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
          <p class="lead">Мобильный просмотр manifest, изображения и экспериментального поиска CardMark-кандидатов в загруженном файле.</p>
        </div>
        <span class="status-pill">PR-003</span>
      </header>

      <section class="notice" aria-labelledby="recognition-title">
        <h2 id="recognition-title">Экспериментальное распознавание из файла</h2>
        <p>PR-003 анализирует только загруженное изображение и лучше работает на synthetic или контрастных почти ровных метках. Камера не реализована.</p>
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
              <p class="panel-kicker">Файл для экспериментального pipeline</p>
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

      ${renderDecoderTestPanel(manifest)}

      <section class="placeholder-grid" aria-label="Будущие режимы">
        <div class="panel placeholder-panel">
          <h2>Камера</h2>
          <p>Режим камеры будет добавлен в следующих PR.</p>
        </div>

        <div class="panel placeholder-panel">
          <h2>Распознавание изображения</h2>
          <p>PR-003 анализирует только загруженный файл по кнопке. Камера, live preview и потоковое распознавание будут добавлены позже.</p>
        </div>
      </section>

      ${technicalInfo ? renderTechnicalInfo(technicalInfo) : renderEmptyTechnicalInfo()}
      ${manifest ? renderCards(manifest) : ""}
    </main>
  `;

  document.querySelector<HTMLInputElement>("#manifest-input")?.addEventListener("change", handleManifestInput);
  document.querySelector<HTMLInputElement>("#image-input")?.addEventListener("change", handleImageInput);
  document.querySelector<HTMLButtonElement>("#clear-image")?.addEventListener("click", clearImage);
  document.querySelector<HTMLButtonElement>("#analyze-image")?.addEventListener("click", analyzeLoadedImage);
  document.querySelector<HTMLInputElement>("#manual-marker-id")?.addEventListener("input", handleManualMarkerInput);
  document.querySelector<HTMLTextAreaElement>("#decoder-input")?.addEventListener("input", handleDecoderInput);
  document.querySelector<HTMLButtonElement>("#decode-grid")?.addEventListener("click", decodeGridFromPanel);
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
      <div class="preview-frame">
        <img src="${escapeHtml(image.objectUrl)}" alt="Preview загруженного изображения" />
        ${renderImageOverlay()}
      </div>
      <div class="image-actions">
        <button class="ghost-button analyze-button" id="analyze-image" type="button">${state.imageAnalysisPending ? "Анализируем..." : "Найти CardMark-метки"}</button>
        <button class="ghost-button" id="clear-image" type="button">Очистить изображение</button>
      </div>
      ${renderImageMeta(image)}
      <p class="helper-text">Это экспериментальный анализ загруженного файла, не камера. Реальные фото могут не распознаться.</p>
      ${renderImageAnalysis()}
    </div>
  `;
}

function renderImageOverlay(): string {
  if (!state.imageAnalysis?.ok || state.imageAnalysis.candidates.length === 0) {
    return "";
  }

  const analysis = state.imageAnalysis;
  const decodedByCandidate = new Map<string, ImageDecodeCandidateResult>();

  for (const decoded of analysis.decoded) {
    decodedByCandidate.set(decoded.candidate.id, decoded);
  }

  return `
    <div class="candidate-overlay" aria-hidden="true">
      ${analysis.candidates
        .map((candidate) => renderCandidateOverlayBox(candidate, decodedByCandidate.get(candidate.id), analysis))
        .join("")}
    </div>
  `;
}

function renderCandidateOverlayBox(
  candidate: MarkerCandidate,
  decoded: ImageDecodeCandidateResult | undefined,
  analysis: Extract<ImageAnalysisResult, { ok: true }>
): string {
  const left = (candidate.bounds.x / analysis.imageWidth) * 100;
  const top = (candidate.bounds.y / analysis.imageHeight) * 100;
  const width = (candidate.bounds.width / analysis.imageWidth) * 100;
  const height = (candidate.bounds.height / analysis.imageHeight) * 100;
  const label = decoded?.decode.ok ? `#${decoded.decode.markerId}` : "candidate";

  return `
    <div
      class="candidate-box ${decoded ? "decoded" : ""}"
      style="left:${left}%;top:${top}%;width:${width}%;height:${height}%"
    >
      <span>${escapeHtml(label)}</span>
    </div>
  `;
}

function renderImageAnalysis(): string {
  if (state.imageAnalysisPending) {
    return `<div class="status-card neutral"><strong>Анализируем изображение</strong><span>Ищем контрастные квадратные кандидаты и sampling 7×7.</span></div>`;
  }

  if (!state.imageAnalysis) {
    return `<div class="status-card neutral"><strong>Анализ не запускался</strong><span>Нажмите “Найти CardMark-метки”, чтобы проверить загруженное изображение.</span></div>`;
  }

  if (!state.imageAnalysis.ok) {
    return `
      <div class="status-card danger">
        <strong>Изображение не проанализировано</strong>
        <ul class="error-list">
          ${state.imageAnalysis.errors.map((error) => `<li>${escapeHtml(error)}</li>`).join("")}
        </ul>
      </div>
    `;
  }

  const manifest = state.parseResult?.ok ? state.parseResult.manifest : null;

  return `
    <section class="analysis-result" aria-label="Результат анализа изображения">
      <div class="analysis-summary">
        ${renderSummaryMetric("Кандидаты", `${state.imageAnalysis.candidates.length}`)}
        ${renderSummaryMetric("Декодировано", `${state.imageAnalysis.decoded.length}`)}
      </div>
      ${state.imageAnalysis.warnings.length > 0 ? renderAnalysisWarnings(state.imageAnalysis.warnings) : ""}
      ${state.imageAnalysis.decoded.length > 0 ? renderDecodedImageResults(state.imageAnalysis.decoded, manifest) : renderCandidateList(state.imageAnalysis.candidates)}
    </section>
  `;
}

function renderSummaryMetric(label: string, value: string): string {
  return `
    <div>
      <dt>${escapeHtml(label)}</dt>
      <dd>${escapeHtml(value)}</dd>
    </div>
  `;
}

function renderAnalysisWarnings(warnings: string[]): string {
  return `
    <div class="status-card neutral compact">
      <strong>Предупреждения</strong>
      <ul class="error-list">
        ${warnings.map((warning) => `<li>${escapeHtml(warning)}</li>`).join("")}
      </ul>
    </div>
  `;
}

function renderDecodedImageResults(results: ImageDecodeCandidateResult[], manifest: CardMarkManifest | null): string {
  return `
    <div class="decoded-list">
      ${results.map((result) => renderDecodedImageResult(result, manifest)).join("")}
    </div>
  `;
}

function renderDecodedImageResult(result: ImageDecodeCandidateResult, manifest: CardMarkManifest | null): string {
  const decode = result.decode;

  if (!decode.ok) {
    return "";
  }

  const card = manifest ? findCardByMarkerId(manifest, decode.markerId) : null;

  return `
    <article class="match-card decoded-card">
      <p class="panel-kicker">Image candidate decoded</p>
      <h3>markerId ${decode.markerId}</h3>
      <dl class="meta-list compact-meta">
        ${renderMetaItem("orientation", `${decode.orientation}`)}
        ${renderMetaItem("decoder confidence", `${decode.confidence}`)}
        ${renderMetaItem("candidate score", `${result.candidate.score}`)}
        ${renderMetaItem("bounds", formatBounds(result.candidate))}
      </dl>
      ${card ? renderLinkedCard(card) : `<p class="helper-text decoder-helper">Загрузите manifest, чтобы сопоставить markerId с картой.</p>`}
    </article>
  `;
}

function renderCandidateList(candidates: MarkerCandidate[]): string {
  if (candidates.length === 0) {
    return "";
  }

  return `
    <div class="candidate-list">
      ${candidates.map((candidate) => `
        <article class="candidate-row">
          <strong>${escapeHtml(candidate.id)}</strong>
          <span>score ${candidate.score}; ${escapeHtml(formatBounds(candidate))}</span>
        </article>
      `).join("")}
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

function renderDecoderTestPanel(manifest: CardMarkManifest | null): string {
  return `
    <section class="panel decoder-panel" aria-labelledby="decoder-title">
      <div class="panel-heading">
        <div>
          <p class="panel-kicker">Техническая проверка, не image recognition</p>
          <h2 id="decoder-title">Тест декодера</h2>
        </div>
      </div>
      <label class="field-label" for="decoder-input">JSON grid fixture</label>
      <textarea
        class="decoder-textarea"
        id="decoder-input"
        spellcheck="false"
        placeholder='{"format":"cardmark-grid-fixture","version":"0","grid":[[1,1,1,1,1,1,1]]}'
      >${escapeHtml(state.decoderInput)}</textarea>
      <button class="ghost-button decode-button" id="decode-grid" type="button">Декодировать сетку</button>
      <p class="helper-text">Вставьте fixture из <code>fixtures/grids</code> или саму матрицу 7×7. Изображение из preview здесь не используется.</p>
      ${renderDecoderResult(manifest)}
    </section>
  `;
}

function renderDecoderResult(manifest: CardMarkManifest | null): string {
  if (!state.decoderResult) {
    return `<div class="status-card neutral"><strong>Сетка ещё не декодировалась</strong><span>Результат появится после запуска технической проверки.</span></div>`;
  }

  if (!state.decoderResult.ok) {
    return `
      <div class="status-card danger">
        <strong>Сетка не декодирована</strong>
        <span>Confidence: ${state.decoderResult.confidence}</span>
        <ul class="error-list">
          ${state.decoderResult.errors.map((error) => `<li><code>${escapeHtml(error.path)}</code> ${escapeHtml(error.message)}</li>`).join("")}
        </ul>
      </div>
    `;
  }

  const matchedCard = manifest ? findCardByMarkerId(manifest, state.decoderResult.markerId) : null;

  return `
    <article class="match-card decoder-result">
      <p class="panel-kicker">Normalized grid decoded</p>
      <h3>markerId ${state.decoderResult.markerId}</h3>
      <dl class="meta-list compact-meta">
        ${renderMetaItem("orientation", `${state.decoderResult.orientation}`)}
        ${renderMetaItem("confidence", `${state.decoderResult.confidence}`)}
      </dl>
      ${renderDecoderManifestMapping(manifest, matchedCard, state.decoderResult.markerId)}
    </article>
  `;
}

function renderDecoderManifestMapping(
  manifest: CardMarkManifest | null,
  card: CardMarkCard | null,
  markerId: number
): string {
  if (!manifest) {
    return `<p class="helper-text decoder-helper">Загрузите manifest, чтобы сопоставить markerId с картой.</p>`;
  }

  if (!card) {
    return `<p class="helper-text decoder-helper">В загруженном manifest нет карты с markerId ${markerId}.</p>`;
  }

  return `
    <div class="linked-card">
      <p class="panel-kicker">Карта из manifest</p>
      ${renderLinkedCard(card)}
    </div>
  `;
}

function renderLinkedCard(card: CardMarkCard): string {
  return `
    <h3>${escapeHtml(card.name)}</h3>
    <dl class="meta-list compact-meta">
      ${renderMetaItem("Группа", card.group)}
      ${renderMetaItem("id", `${card.id}`)}
      ${renderMetaItem("markerId", `${card.markerId}`)}
    </dl>
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
  state.imageAnalysis = null;
  state.imageAnalysisPending = false;
  render();
}

function clearImage(): void {
  if (state.imageResult?.ok) {
    revokeImageFileInfo(state.imageResult.image);
  }

  state.imageResult = null;
  state.imageAnalysis = null;
  state.imageAnalysisPending = false;
  render();
}

async function analyzeLoadedImage(): Promise<void> {
  if (!state.imageResult?.ok) {
    state.imageAnalysis = {
      ok: false,
      errors: ["Сначала загрузите изображение."],
      warnings: []
    };
    render();
    return;
  }

  state.imageAnalysisPending = true;
  state.imageAnalysis = null;
  render();

  state.imageAnalysis = await analyzeImageObjectUrl(state.imageResult.image.objectUrl);
  state.imageAnalysisPending = false;
  render();
}

function handleManualMarkerInput(event: Event): void {
  const input = event.currentTarget as HTMLInputElement;
  state.manualMarkerId = input.value;
  render();
}

function handleDecoderInput(event: Event): void {
  const input = event.currentTarget as HTMLTextAreaElement;
  state.decoderInput = input.value;
}

function decodeGridFromPanel(): void {
  try {
    const parsed = JSON.parse(state.decoderInput);
    const gridInput = isRecord(parsed) && "grid" in parsed ? parsed.grid : parsed;
    state.decoderResult = decodeCardMarkGrid(gridInput);
  } catch {
    state.decoderResult = {
      ok: false,
      errors: [
        {
          path: "$",
          code: "invalid_json",
          message: "JSON fixture не удалось прочитать. Проверьте синтаксис."
        }
      ],
      confidence: 0
    };
  }

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

function formatBounds(candidate: MarkerCandidate): string {
  const bounds = candidate.bounds;
  return `${bounds.x}, ${bounds.y}, ${bounds.width}×${bounds.height}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
