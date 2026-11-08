import { ref } from "vue";
import { illustrationFilename } from "~/utils/illustration";
import { illustrationSize, localExportAsset } from "~/utils/exportAssets";

/**
 * Rasterise the vector dress-up illustration on the viewer's device.
 * The SVG never leaves the page; external garment SVGs are resolved to
 * same-origin URLs so the browser can compose the PNG locally.
 */
export function useIllustrationExport() {
  const exporting = ref(false);
  const error = ref("");
  const copied = ref(false);

  async function inlineImage(href: string) {
    const safe = localExportAsset(href, window.location.origin);
    if (safe.startsWith("data:")) return safe;
    const response = await fetch(safe, { credentials: "same-origin", redirect: "error" });
    if (!response.ok)
      throw new Error(
        "衣装の素材を読み込めませんでした。ページを再読み込みしてお試しください。",
      );
    const blob = await response.blob();
    if (!/^image\/(png|jpeg|webp|svg\+xml)(;|$)/i.test(blob.type) || blob.size > 16 * 1024 * 1024)
      throw new Error("対応していない画像形式か、素材のサイズが大きすぎます。");
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () =>
        reject(new Error("衣装の素材をPNGに埋め込めませんでした。"));
      reader.readAsDataURL(blob);
    });
  }

  async function renderPng(
    svg: SVGSVGElement | null,
    width = 1600,
  ) {
    if (!svg) throw new Error("イラストを準備できませんでした。もう一度お試しください。");
    const size = illustrationSize(svg.getAttribute("viewBox"), width);
    const height = size.height;
    let objectUrl = "";
    try {
      const clone = svg.cloneNode(true) as SVGSVGElement;
      clone
        .querySelectorAll("[data-export-hide]")
        .forEach((node) => node.remove());
      // SVG used as an <img> cannot load external files, so every garment
      // image is embedded as a data URL before the SVG is rasterised.
      await Promise.all(
        Array.from(clone.querySelectorAll("image")).map(async (node) => {
          const href = node.getAttribute("href");
          if (href) node.setAttribute("href", await inlineImage(href));
        }),
      );
      clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
      clone.setAttribute("width", String(width));
      clone.setAttribute("height", String(height));

      const markup = new XMLSerializer().serializeToString(clone);
      objectUrl = URL.createObjectURL(
        new Blob([markup], { type: "image/svg+xml;charset=utf-8" }),
      );
      const image = new Image();
      image.decoding = "async";
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () =>
          reject(
            new Error(
              "イラストを画像に変換できませんでした。ページを再読み込みしてお試しください。",
            ),
          );
        image.src = objectUrl;
      });

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("この端末ではPNGを書き出せませんでした。");
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, width, height);
      context.drawImage(image, 0, 0, width, height);

      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (value) =>
            value
              ? resolve(value)
              : reject(
                  new Error(
                    "PNGの書き出しに失敗しました。ブラウザの空き容量を確認してください。",
                  ),
                ),
          "image/png",
        ),
      );
      return blob;
    } finally {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    }
  }

  async function exportPng(svg: SVGSVGElement | null, title = "coordinate", width = 1600) {
    exporting.value = true;
    error.value = "";
    try {
      const blob = await renderPng(svg, width);
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = illustrationFilename(title);
      link.click();
      setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
    } catch (reason) {
      error.value =
        reason instanceof Error
          ? reason.message
          : "イラストを書き出せませんでした。もう一度お試しください。";
    } finally {
      exporting.value = false;
    }
  }

  async function copyPng(svg: SVGSVGElement | null) {
    copied.value = false;
    error.value = "";
    if (!globalThis.ClipboardItem || !navigator.clipboard?.write) {
      error.value = "このブラウザでは画像をコピーできません。PNGで保存してReflensへドラッグしてください。";
      return;
    }
    exporting.value = true;
    try {
      // Pass a promise so the clipboard permission is requested during the click.
      const image = renderPng(svg);
      void image.catch(() => {});
      await navigator.clipboard.write([new ClipboardItem({ "image/png": image })]);
      copied.value = true;
    } catch (reason) {
      error.value = reason instanceof Error ? reason.message : "画像をコピーできませんでした。PNGで保存してください。";
    } finally {
      exporting.value = false;
    }
  }

  return { exporting, error, copied, exportPng, copyPng };
}
