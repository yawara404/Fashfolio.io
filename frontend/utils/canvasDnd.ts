/**
 * 衣装棚 → 自由キャンバスへの HTML5 ドラッグ＆ドロップで使う MIME。
 *
 * text/plain にも同じ ID を入れておく（一部のブラウザ・OS はカスタム MIME を
 * drop 時に渡さないため）。受信側は GARMENT_MIME を優先して読む。
 */
export const GARMENT_MIME = "application/x-fashfolio-garment";

/** ドラッグを開始する側に渡す dataTransfer 設定ヘルパ。 */
export function setGarmentDragData(transfer: DataTransfer, itemId: string) {
  try {
    transfer.setData(GARMENT_MIME, itemId);
  } catch {
    /* カスタム MIME を拒否する環境では text/plain だけで送る。 */
  }
  transfer.setData("text/plain", itemId);
  transfer.effectAllowed = "copy";
}
