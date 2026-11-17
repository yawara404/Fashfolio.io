/**
 * tryon の自由キャンバスで扱う要素の型定義。
 *
 * 座標はすべてワールド座標（キャンバス内の絶対座標）。
 * 画面座標との変換は composables/useCanvasTransform.ts が担当する。
 */

/** キャンバスに置ける要素の種類。 */
export type CanvasItemKind = "mannequin" | "garment" | "note";

/** 無限キャンバス上の 1 要素。 */
export interface StudioCanvasItem {
  id: string;
  kind: CanvasItemKind;
  /** ワールド座標の左上 */
  x: number;
  y: number;
  /** ワールド座標のサイズ（アスペクトは contentRatio で保つ） */
  width: number;
  height: number;
  /** 度数。0 が正位置。 */
  rotation: number;
  /** 重なり順。大きいほど手前。 */
  z: number;
  /** ラベル（衣装名・メモの 1 行目など） */
  label: string;
  /** kind = garment のときの衣装 ID */
  itemId?: string;
  /** kind = note のときの本文 */
  text?: string;
  /** 左右反転 */
  flipped?: boolean;
}

/** キャンバス地の柄。RefLens と同じ 3 種類に揃える。 */
export type CanvasBackdrop = "dots" | "grid" | "plain";

/** localStorage に保存するキャンバスのスナップショット。 */
export interface StudioCanvasSnapshot {
  version: number;
  items: StudioCanvasItem[];
  viewport: { panX: number; panY: number; zoom: number };
  backdrop: CanvasBackdrop;
  viewportSize?: { width: number; height: number };
}
