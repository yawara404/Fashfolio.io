/** 配色ユーティリティ。セル塗りの影・ハイライト色を作る。 */

function parseHex(hex: string): [number, number, number] {
  const value = hex.replace("#", "").trim();
  const full =
    value.length === 3
      ? value
          .split("")
          .map((char) => char + char)
          .join("")
      : value.padEnd(6, "0").slice(0, 6);
  const channel = (start: number) => {
    const parsed = Number.parseInt(full.slice(start, start + 2), 16);
    return Number.isFinite(parsed) ? parsed : 0;
  };
  return [channel(0), channel(2), channel(4)];
}

function toHex(value: number) {
  return Math.round(Math.min(255, Math.max(0, value)))
    .toString(16)
    .padStart(2, "0");
}

/** amount > 0 で白へ、< 0 で影色へ寄せる。 */
export function shadeColor(hex: string, amount: number): string {
  const [r, g, b] = parseHex(hex);
  const target = amount >= 0 ? [255, 255, 255] : [58, 53, 70];
  const ratio = Math.min(1, Math.abs(amount));
  return `#${[r, g, b]
    .map((value, index) => toHex(value + (target[index]! - value) * ratio))
    .join("")}`;
}

export function isHexColor(value: unknown): value is string {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
}
