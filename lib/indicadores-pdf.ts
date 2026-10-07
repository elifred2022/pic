export type IndicadoresPdfMeta = {
  periodo: string;
};

const PAGE_W = 297;
const PAGE_H = 210;
const MARGIN_X = 12;
const FOOTER_H = 10;
const PX_TO_MM = 25.4 / 96;
const CONTENT_W = PAGE_W - MARGIN_X * 2;
const PDF_CHART_WIDTH = 1000;

function cleanText(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function nextFrame(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

async function settleLayout() {
  await nextFrame();
  await new Promise((resolve) => setTimeout(resolve, 160));
}

function readCard(card: HTMLElement): { title: string; description: string; body: HTMLElement } {
  const header = card.firstElementChild;
  const body = card.lastElementChild;
  if (!(body instanceof HTMLElement)) {
    throw new Error("El gráfico no tiene contenido para exportar.");
  }

  return {
    title: cleanText(header?.querySelector("div")?.textContent) || "Indicador",
    description: cleanText(header?.querySelector("p")?.textContent),
    body,
  };
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("No se pudo leer el gráfico."));
    image.src = src;
  });
}

async function svgToDataUrl(svg: SVGSVGElement): Promise<string> {
  const bounds = svg.getBoundingClientRect();
  const width = Math.max(1, Math.round(bounds.width));
  const height = Math.max(1, Math.round(bounds.height));
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("width", String(width));
  clone.setAttribute("height", String(height));
  if (!clone.getAttribute("viewBox")) {
    const viewWidth = Number(svg.getAttribute("width")) || width;
    const viewHeight = Number(svg.getAttribute("height")) || height;
    clone.setAttribute("viewBox", `0 0 ${viewWidth} ${viewHeight}`);
  }

  const xml = new XMLSerializer().serializeToString(clone);
  const blobUrl = URL.createObjectURL(
    new Blob([xml], { type: "image/svg+xml;charset=utf-8" })
  );

  try {
    const image = await loadImage(blobUrl);
    const scale = 2;
    const canvas = document.createElement("canvas");
    canvas.width = width * scale;
    canvas.height = height * scale;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("No se pudo dibujar el gráfico.");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/png");
  } finally {
    URL.revokeObjectURL(blobUrl);
  }
}

async function replaceChartSvg(panel: HTMLElement, source: HTMLElement) {
  const sourceSvg = source.querySelector("svg");
  const targetSvg = panel.querySelector("svg");
  if (!(sourceSvg instanceof SVGSVGElement) || !(targetSvg instanceof SVGSVGElement)) return;

  const dataUrl = await svgToDataUrl(sourceSvg);
  const image = document.createElement("img");
  image.src = dataUrl;
  image.alt = "";
  image.style.display = "block";
  image.style.width = "100%";
  image.style.height = "auto";
  targetSvg.replaceWith(image);
}

async function paintChart(
  body: HTMLElement,
  toCanvas: typeof import("html-to-image").toCanvas,
  keepPanel: number | null
): Promise<HTMLCanvasElement> {
  const host = document.createElement("div");
  host.setAttribute("data-pdf-host", "true");
  host.style.position = "fixed";
  host.style.left = "0";
  host.style.top = "0";
  host.style.zIndex = "2147483645";
  host.style.background = "#ffffff";
  host.style.width = `${PDF_CHART_WIDTH}px`;
  host.style.padding = "8px";
  host.style.pointerEvents = "none";

  const clone = body.cloneNode(true) as HTMLElement;
  clone.style.width = "100%";
  clone.style.maxWidth = "none";
  clone.style.margin = "0";
  clone.style.background = "#ffffff";
  host.appendChild(clone);
  document.body.appendChild(host);

  try {
    const panels = [...clone.querySelectorAll<HTMLElement>(".overflow-x-auto")];
    const sources = [...body.querySelectorAll<HTMLElement>(".overflow-x-auto")];

    for (let index = 0; index < panels.length; index += 1) {
      const source = sources[index];
      if (source) await replaceChartSvg(panels[index], source);
    }

    if (keepPanel !== null) {
      panels.forEach((panel, index) => {
        if (index !== keepPanel) panel.remove();
      });
    }

    clone.querySelectorAll(".recharts-tooltip-wrapper").forEach((node) => node.remove());
    await nextFrame();

    const canvas = await toCanvas(host, {
      pixelRatio: 2,
      backgroundColor: "#ffffff",
      skipFonts: true,
      cacheBust: true,
      width: PDF_CHART_WIDTH,
    });

    if (canvas.width < 2 || canvas.height < 2) {
      throw new Error("La captura del gráfico salió vacía.");
    }
    return canvas;
  } finally {
    host.remove();
  }
}

function drawHeader(
  pdf: import("jspdf").jsPDF,
  options: {
    fecha: string;
    meta: string;
    titulo: string;
    descripcion: string;
    parte?: string;
  }
): number {
  const margin = MARGIN_X;
  let y = 11;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(13);
  pdf.setTextColor(31, 41, 55);
  pdf.text("Indicadores de compras", margin, y);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(107, 114, 128);
  pdf.text(options.fecha, PAGE_W - margin, y, { align: "right" });

  y += 5.5;
  const metaLines = pdf.splitTextToSize(options.meta, CONTENT_W);
  pdf.text(metaLines, margin, y);
  y += metaLines.length * 4;

  y += 2;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);
  pdf.setTextColor(17, 24, 39);
  const titleLines = pdf.splitTextToSize(options.titulo, CONTENT_W);
  pdf.text(titleLines, margin, y);
  y += titleLines.length * 5;

  if (options.descripcion) {
    y += 1;
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.setTextColor(75, 85, 99);
    const descLines = pdf.splitTextToSize(options.descripcion, CONTENT_W).slice(0, 2);
    pdf.text(descLines, margin, y);
    y += descLines.length * 4;
  }

  if (options.parte) {
    y += 4;
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.setTextColor(37, 99, 235);
    pdf.text(options.parte, margin, y);
  }

  y += 3;
  pdf.setDrawColor(229, 231, 235);
  pdf.setLineWidth(0.3);
  pdf.line(margin, y, PAGE_W - margin, y);
  return y + 4;
}

function drawImage(
  pdf: import("jspdf").jsPDF,
  canvas: HTMLCanvasElement,
  contentTop: number
) {
  const imgWmm = (canvas.width / 2) * PX_TO_MM;
  const imgHmm = (canvas.height / 2) * PX_TO_MM;
  const availH = PAGE_H - FOOTER_H - contentTop;
  const scale = Math.min(CONTENT_W / imgWmm, availH / imgHmm);
  const drawW = imgWmm * scale;
  const drawH = imgHmm * scale;
  const x = MARGIN_X + (CONTENT_W - drawW) / 2;

  pdf.addImage(canvas.toDataURL("image/png"), "PNG", x, contentTop, drawW, drawH);
}

function drawFooters(pdf: import("jspdf").jsPDF) {
  const total = pdf.getNumberOfPages();
  for (let page = 1; page <= total; page += 1) {
    pdf.setPage(page);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(156, 163, 175);
    pdf.text(`Página ${page} de ${total}`, PAGE_W / 2, PAGE_H - 6, { align: "center" });
  }
}

function showOverlay(): HTMLElement {
  const overlay = document.createElement("div");
  overlay.setAttribute("data-pdf-overlay", "true");
  overlay.style.position = "fixed";
  overlay.style.inset = "0";
  overlay.style.zIndex = "2147483646";
  overlay.style.background = "#ffffff";
  overlay.style.display = "flex";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";
  overlay.style.fontFamily = "system-ui, sans-serif";
  overlay.innerHTML =
    '<p style="margin:0;color:#374151;font-size:16px;font-weight:600">Generando PDF...</p>';
  document.body.appendChild(overlay);
  return overlay;
}

async function withPdfWidth<T>(body: HTMLElement, run: () => Promise<T>): Promise<T> {
  const previousWidth = body.style.width;
  const previousMaxWidth = body.style.maxWidth;
  body.style.width = `${PDF_CHART_WIDTH}px`;
  body.style.maxWidth = `${PDF_CHART_WIDTH}px`;
  await settleLayout();
  try {
    return await run();
  } finally {
    body.style.width = previousWidth;
    body.style.maxWidth = previousMaxWidth;
  }
}

export async function descargarIndicadoresPdf(
  root: HTMLElement,
  meta: IndicadoresPdfMeta,
  options?: { download?: boolean }
): Promise<Blob> {
  const cards = [...root.children].filter(
    (child): child is HTMLElement => child instanceof HTMLElement
  );
  if (cards.length === 0) {
    throw new Error("No hay gráficos para exportar.");
  }

  const overlay = showOverlay();

  try {
    if (document.fonts?.ready) await document.fonts.ready;

    const [{ jsPDF }, { toCanvas }] = await Promise.all([
      import("jspdf"),
      import("html-to-image"),
    ]);

    const pdf = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
      compress: true,
    });

    const fecha = new Date().toLocaleDateString("es-AR");
    let firstPage = true;

    for (const card of cards) {
      const chart = readCard(card);
      const captures = await withPdfWidth(chart.body, async () => {
        const panels = [...chart.body.querySelectorAll<HTMLElement>(".overflow-x-auto")];
        const indexes = panels.length === 0 ? [null] : panels.map((_, index) => index);
        const canvases: HTMLCanvasElement[] = [];
        for (const index of indexes) {
          canvases.push(await paintChart(chart.body, toCanvas, index));
        }
        return { canvases, panels };
      });

      captures.canvases.forEach((canvas, index) => {
        if (!firstPage) pdf.addPage();
        firstPage = false;
        const panel = captures.panels[index];
        const parte =
          captures.canvases.length > 1
            ? `Hoja ${index + 1} de ${captures.canvases.length}${
                panel
                  ? ` | ${cleanText(panel.querySelector("h3")?.textContent)}`
                  : ""
              }`
            : undefined;
        const contentTop = drawHeader(pdf, {
          fecha,
          meta: meta.periodo,
          titulo: chart.title,
          descripcion: chart.description,
          parte,
        });
        drawImage(pdf, canvas, contentTop);
      });
    }

    drawFooters(pdf);
    pdf.setProperties({
      title: "Indicadores de compras",
      subject: meta.periodo,
    });

    const blob = pdf.output("blob");
    if (options?.download !== false) {
      const stamp = new Date().toISOString().slice(0, 10);
      pdf.save(`indicadores-compras-${stamp}.pdf`);
    }
    return blob;
  } finally {
    overlay.remove();
  }
}
