/**
 * 衣装のSVGパス生成。すべてリグ座標に追従する。
 */
import type { AvatarRig, LimbKey, RigBox, RigPoint, Side } from "~/utils/avatarRig";
import type { Garment } from "~/types/wardrobe";
import type { ChainNode } from "~/utils/avatarShapes";
import {
  tubePath,
  pt,
  f,
  curveThrough,
  lineThrough,
  circlePath,
  collarbonePath,
} from "~/utils/avatarShapes";
import { shadeColor } from "~/utils/color";

export interface GarmentLayer {
  /** 体の後ろに描くパーツ（リュック本体など） */
  back: string[];
  outline: string[];
  shade: string[];
  light: string[];
  detail: string[];
  accent: string[];
  clip: string;
}

export function emptyLayer(): GarmentLayer {
  return { back: [], outline: [], shade: [], light: [], detail: [], accent: [], clip: "" };
}

function normalizeVector(vector: RigPoint): RigPoint {
  const length = Math.hypot(vector.x, vector.y) || 1;
  return { x: vector.x / length, y: vector.y / length };
}

/** 肢の中心線を外側／内側にオフセットした点列を返す。 */
export function limbOffsets(
  limb: {
    root: RigPoint;
    mid: RigPoint;
    end: RigPoint;
    rootW: number;
    midW: number;
    endW: number;
  },
  tEnd: number,
  ease: number,
  side: Side,
  widthScale = 1,
  isBaggy = false,
): { outer: RigPoint[]; inner: RigPoint[] } {
  const upper = Math.hypot(limb.mid.x - limb.root.x, limb.mid.y - limb.root.y);
  const lower = Math.hypot(limb.end.x - limb.mid.x, limb.end.y - limb.mid.y);
  const totalLen = Math.max(1, upper + lower);
  const target = tEnd * totalLen;
  const samples = 6;
  const outer: RigPoint[] = [];
  const inner: RigPoint[] = [];
  for (let index = 0; index <= samples; index++) {
    const t = (index / samples) * target;
    const normT = index / samples;
    // ゆるやかな布のたわみ（肘や袖口手前のふくらみ）
    const bulge = isBaggy ? Math.sin(normT * Math.PI) * ease * 0.45 : 0;
    let point: RigPoint;
    let halfWidth: number;
    if (t <= upper) {
      const ratio = upper > 0 ? t / upper : 0;
      point = {
        x: limb.root.x + (limb.mid.x - limb.root.x) * ratio,
        y: limb.root.y + (limb.mid.y - limb.root.y) * ratio,
      };
      halfWidth = (limb.rootW + (limb.midW - limb.rootW) * ratio) * widthScale + ease + bulge;
    } else {
      const ratio = lower > 0 ? (t - upper) / lower : 0;
      point = {
        x: limb.mid.x + (limb.end.x - limb.mid.x) * ratio,
        y: limb.mid.y + (limb.end.y - limb.mid.y) * ratio,
      };
      halfWidth = (limb.midW + (limb.endW - limb.midW) * ratio) * widthScale + ease + bulge;
    }
    const nextIndex = Math.min(samples, index + 1);
    const nextT = (nextIndex / samples) * target;
    let nextPoint: RigPoint;
    if (nextT <= upper) {
      const ratio = upper > 0 ? nextT / upper : 0;
      nextPoint = {
        x: limb.root.x + (limb.mid.x - limb.root.x) * ratio,
        y: limb.root.y + (limb.mid.y - limb.root.y) * ratio,
      };
    } else {
      const ratio = lower > 0 ? (nextT - upper) / lower : 0;
      nextPoint = {
        x: limb.mid.x + (limb.end.x - limb.mid.x) * ratio,
        y: limb.mid.y + (limb.end.y - limb.mid.y) * ratio,
      };
    }
    const prevT = Math.max(0, (index - 1) / samples) * target;
    let prevPoint: RigPoint;
    if (prevT <= upper) {
      const ratio = upper > 0 ? prevT / upper : 0;
      prevPoint = {
        x: limb.root.x + (limb.mid.x - limb.root.x) * ratio,
        y: limb.root.y + (limb.mid.y - limb.root.y) * ratio,
      };
    } else {
      const ratio = lower > 0 ? (prevT - upper) / lower : 0;
      prevPoint = {
        x: limb.mid.x + (limb.end.x - limb.mid.x) * ratio,
        y: limb.mid.y + (limb.end.y - limb.mid.y) * ratio,
      };
    }
    const tangent = normalizeVector({
      x: nextPoint.x - prevPoint.x,
      y: nextPoint.y - prevPoint.y,
    });
    const normal = { x: -tangent.y, y: tangent.x };
    outer.push({
      x: point.x - normal.x * side * halfWidth,
      y: point.y - normal.y * side * halfWidth,
    });
    inner.push({
      x: point.x + normal.x * side * halfWidth,
      y: point.y + normal.y * side * halfWidth,
    });
  }
  return { outer, inner };
}

/** 胴体に沿った服の輪郭。hemY まで延長し、裾を広げる。 */
export function torsoGarmentPath(
  rig: AvatarRig,
  options: {
    ease: number;
    hemY: number;
    hemSpread?: number;
    neckDepth?: number;
    hemDrop?: number;
  },
): string {
  const { cx, unit, torso } = rig;
  const ease = options.ease;
  const hemSpread = options.hemSpread ?? 1;
  const neckDepth = options.neckDepth ?? 0.16;
  const hemDrop = options.hemDrop ?? unit * 0.04;
  const hemHalfW = torso.hipHalfW * hemSpread + ease * 1.6;
  const left: RigPoint[] = [
    pt(cx - torso.neckHalfW * 0.55 - ease * 0.3, torso.neckTopY + unit * neckDepth),
    pt(cx - torso.shoulderHalfW * 0.62 - ease, torso.shoulderY - unit * 0.01),
    pt(cx - torso.shoulderHalfW - ease, torso.shoulderY + torso.shoulderDrop),
    pt(cx - torso.chestHalfW - ease, torso.chestY),
    pt(cx - torso.waistHalfW - ease, torso.waistY),
    pt(cx - torso.hipHalfW - ease, torso.hipY),
    pt(cx - torso.hipHalfW * 0.55 - ease * 0.6, torso.crotchY + unit * 0.06),
  ].filter((point) => point.y < options.hemY);
  left.push(pt(cx - hemHalfW, options.hemY));
  const mirror = (point: RigPoint) => pt(cx * 2 - point.x, point.y);
  const right = [...left].reverse().map(mirror);
  const crotchY = options.hemY + hemDrop;
  return [
    `M${f(left[0]!.x)} ${f(left[0]!.y)}`,
    curveThrough(left),
    `Q${f(cx - hemHalfW * 0.55)} ${f(options.hemY + hemDrop)} ${f(cx)} ${f(crotchY)}`,
    `Q${f(cx + hemHalfW * 0.55)} ${f(options.hemY + hemDrop)} ${f(right[0]!.x)} ${f(
      right[0]!.y,
    )}`,
    curveThrough(right),
    `Q${f(cx + torso.neckHalfW * 0.55 + ease * 0.3)} ${f(
      torso.neckTopY + unit * neckDepth * 0.8,
    )} ${f(cx)} ${f(torso.neckTopY + unit * neckDepth * 1.05)}`,
    `Q${f(cx - torso.neckHalfW * 0.55 - ease * 0.3)} ${f(
      torso.neckTopY + unit * neckDepth * 0.8,
    )} ${f(left[0]!.x)} ${f(left[0]!.y)}`,
    "Z",
  ].join("");
}

/** 前開きのアウタージャケット輪郭。インナーのトップスとリボンを魅せつつ、肩・脇・裾を包む。 */
export function openJacketPath(
  rig: AvatarRig,
  options: {
    ease: number;
    hemY: number;
    hemSpread?: number;
    neckDepth?: number;
    openWidth?: number;
    hemDrop?: number;
  },
): string {
  const { cx, unit, torso } = rig;
  const ease = options.ease;
  const hemSpread = options.hemSpread ?? 1.15;
  const neckDepth = options.neckDepth ?? 0.16;
  const hemDrop = options.hemDrop ?? unit * 0.04;
  const hemHalfW = torso.hipHalfW * hemSpread + ease * 1.5;
  const openW = options.openWidth ?? torso.chestHalfW * 0.68;

  const leftOuter: RigPoint[] = [
    pt(cx - torso.neckHalfW * 0.65 - ease * 0.3, torso.neckTopY + unit * neckDepth),
    pt(cx - torso.shoulderHalfW * 0.68 - ease, torso.shoulderY - unit * 0.01),
    pt(cx - torso.shoulderHalfW - ease * 1.1, torso.shoulderY + torso.shoulderDrop),
    pt(cx - torso.chestHalfW - ease * 1.1, torso.chestY),
    pt(cx - torso.waistHalfW - ease * 1.1, torso.waistY),
    pt(cx - torso.hipHalfW - ease * 1.1, torso.hipY),
  ].filter((point) => point.y < options.hemY);
  leftOuter.push(pt(cx - hemHalfW, options.hemY));

  const mirror = (point: RigPoint) => pt(cx * 2 - point.x, point.y);
  const rightOuter = leftOuter.map(mirror);

  const leftInnerHem = pt(cx - openW * 0.45, options.hemY + hemDrop * 0.6);
  const leftInnerWaist = pt(cx - openW * 0.35, torso.waistY);
  const leftInnerChest = pt(cx - openW * 0.42, torso.chestY);
  const leftInnerNeck = pt(cx - torso.neckHalfW * 0.65 - ease * 0.3, torso.neckTopY + unit * neckDepth);

  const rightInnerHem = pt(cx + openW * 0.45, options.hemY + hemDrop * 0.6);
  const rightInnerWaist = pt(cx + openW * 0.35, torso.waistY);
  const rightInnerChest = pt(cx + openW * 0.42, torso.chestY);
  const rightInnerNeck = pt(cx + torso.neckHalfW * 0.65 + ease * 0.3, torso.neckTopY + unit * neckDepth);

  return [
    `M${f(leftOuter[0]!.x)} ${f(leftOuter[0]!.y)}`,
    curveThrough(leftOuter),
    `Q${f(cx - (hemHalfW + openW * 0.45) * 0.5)} ${f(options.hemY + hemDrop)} ${f(leftInnerHem.x)} ${f(leftInnerHem.y)}`,
    `Q${f(leftInnerWaist.x)} ${f(leftInnerWaist.y)} ${f(leftInnerChest.x)} ${f(leftInnerChest.y)}`,
    `Q${f(leftInnerNeck.x)} ${f(torso.neckTopY + unit * neckDepth * 1.05)} ${f(leftInnerNeck.x)} ${f(leftInnerNeck.y)}`,
    `Q${f(cx)} ${f(torso.neckTopY + unit * neckDepth * 0.82)} ${f(rightInnerNeck.x)} ${f(rightInnerNeck.y)}`,
    `Q${f(rightInnerChest.x)} ${f(torso.neckTopY + unit * neckDepth * 1.05)} ${f(rightInnerChest.x)} ${f(rightInnerChest.y)}`,
    `Q${f(rightInnerWaist.x)} ${f(rightInnerWaist.y)} ${f(rightInnerHem.x)} ${f(rightInnerHem.y)}`,
    `Q${f(cx + (hemHalfW + openW * 0.45) * 0.5)} ${f(options.hemY + hemDrop)} ${f(rightOuter[rightOuter.length - 1]!.x)} ${f(rightOuter[rightOuter.length - 1]!.y)}`,
    curveThrough([...rightOuter].reverse()),
    "Z",
  ].join("");
}

/** トレンチコート。長めの丈で腰回りを包み込む。 */
export function trenchPath(
  rig: AvatarRig,
  options: { ease: number; hemY: number; hemSpread?: number },
): string {
  const { cx, unit, torso } = rig;
  const ease = options.ease;
  const hemSpread = options.hemSpread ?? 1.45;
  const hemDrop = unit * 0.06;
  const hemHalfW = torso.hipHalfW * hemSpread + ease * 1.8;
  const left: RigPoint[] = [
    pt(cx - torso.neckHalfW * 0.55 - ease * 0.3, torso.neckTopY + unit * 0.12),
    pt(cx - torso.shoulderHalfW * 0.65 - ease, torso.shoulderY - unit * 0.01),
    pt(cx - torso.shoulderHalfW - ease * 1.15, torso.shoulderY + torso.shoulderDrop),
    pt(cx - torso.chestHalfW - ease * 1.15, torso.chestY),
    pt(cx - torso.waistHalfW - ease * 1.05, torso.waistY),
    pt(cx - torso.hipHalfW - ease * 1.15, torso.hipY),
    pt(cx - hemHalfW, options.hemY),
  ];
  const mirror = (point: RigPoint) => pt(cx * 2 - point.x, point.y);
  const right = [...left].reverse().map(mirror);
  return [
    `M${f(left[0]!.x)} ${f(left[0]!.y)}`,
    curveThrough(left),
    `Q${f(cx - hemHalfW * 0.5)} ${f(options.hemY + hemDrop)} ${f(cx)} ${f(options.hemY + hemDrop * 1.1)}`,
    `Q${f(cx + hemHalfW * 0.5)} ${f(options.hemY + hemDrop)} ${f(right[0]!.x)} ${f(right[0]!.y)}`,
    curveThrough(right),
    `Q${f(cx)} ${f(torso.neckTopY + unit * 0.1)} ${f(left[0]!.x)} ${f(left[0]!.y)}`,
    "Z",
  ].join("");
}

/** スタンドカラーマント。肩から広がる優雅なベルシェイプ。 */
export function capePath(
  rig: AvatarRig,
  options: { ease: number; hemY: number },
): string {
  const { cx, unit, torso } = rig;
  const ease = options.ease;
  const hemY = options.hemY;
  const hemW = torso.hipHalfW * 2.3 + ease * 2;
  const neckW = torso.neckHalfW * 1.1;
  const neckY = torso.neckTopY + unit * 0.05;
  return [
    `M${f(cx - neckW)} ${f(neckY)}`,
    `Q${f(cx - torso.shoulderHalfW * 1.2)} ${f(torso.shoulderY + unit * 0.1)} ${f(cx - hemW)} ${f(hemY)}`,
    `Q${f(cx - hemW * 0.5)} ${f(hemY + unit * 0.08)} ${f(cx)} ${f(hemY + unit * 0.1)}`,
    `Q${f(cx + hemW * 0.5)} ${f(hemY + unit * 0.08)} ${f(cx + hemW)} ${f(hemY)}`,
    `Q${f(cx + torso.shoulderHalfW * 1.2)} ${f(torso.shoulderY + unit * 0.1)} ${f(cx + neckW)} ${f(neckY)}`,
    `Q${f(cx)} ${f(neckY - unit * 0.02)} ${f(cx - neckW)} ${f(neckY)}`,
    "Z",
  ].join("");
}

/** スカート。つくみず風のやわらかなプリーツ裾（波打つスカラップ）とふんわり広がるシルエット。 */
export function skirtPath(
  rig: AvatarRig,
  options: { hemY: number; hemHalfW: number; waistHalfW?: number; hemDrop?: number },
): string {
  const { cx, unit, torso } = rig;
  const waist = options.waistHalfW ?? torso.waistHalfW;
  const ease = unit * 0.055;
  const drop = options.hemDrop ?? unit * 0.04;
  const midY = (torso.waistY + options.hemY) / 2;
  const left: RigPoint[] = [
    pt(cx - waist - ease, torso.waistY),
    pt(cx - (waist * 0.4 + options.hemHalfW * 0.6) - ease * 1.2, midY),
    pt(cx - options.hemHalfW, options.hemY),
  ];
  const mirror = (point: RigPoint) => pt(cx * 2 - point.x, point.y);
  const right = [...left].reverse().map(mirror);

  const wavePoints: string[] = [];
  const segments = 6;
  const startX = cx - options.hemHalfW;
  const endX = cx + options.hemHalfW;
  const span = endX - startX;
  for (let i = 0; i < segments; i++) {
    const x1 = startX + (i / segments) * span;
    const x2 = startX + ((i + 1) / segments) * span;
    const waveMidX = (x1 + x2) / 2;
    const baseDrop = Math.sin(((i + 0.5) / segments) * Math.PI) * drop * 1.1;
    const waveY = options.hemY + baseDrop + unit * 0.016;
    const cornerY = options.hemY + Math.sin(((i + 1) / segments) * Math.PI) * drop;
    wavePoints.push(`Q${f(waveMidX)} ${f(waveY)} ${f(x2)} ${f(cornerY)}`);
  }

  return [
    `M${f(left[0]!.x)} ${f(left[0]!.y)}`,
    curveThrough(left),
    wavePoints.join(""),
    curveThrough(right),
    `Q${f(cx + waist * 0.5)} ${f(torso.waistY - unit * 0.015)} ${f(cx)} ${f(
      torso.waistY - unit * 0.02,
    )}`,
    `Q${f(cx - waist * 0.5)} ${f(torso.waistY - unit * 0.015)} ${f(left[0]!.x)} ${f(
      left[0]!.y,
    )}`,
    "Z",
  ].join("");
}

/** タック・プリーツ線。 */
export function pleatLines(
  rig: AvatarRig,
  hemY: number,
  hemHalfW: number,
  waistHalfW?: number,
): { x1: number; y1: number; x2: number; y2: number }[] {
  const { cx, torso, unit } = rig;
  const waist = waistHalfW ?? torso.waistHalfW;
  const ratios = [-0.66, -0.4, -0.14, 0.14, 0.4, 0.66];
  return ratios.map((ratio) => ({
    x1: cx + ratio * waist * 0.42,
    y1: torso.waistY + 0.02 * unit,
    x2: cx + ratio * hemHalfW * 0.94,
    y2: hemY + (1 - Math.abs(ratio) * 0.25) * 0.045 * unit,
  }));
}

/** パンツ。腰のブロック＋2本の脚。 */
export function pantsPath(
  rig: AvatarRig,
  options: { hemT: number; ease: number; widthScale?: number },
): string {
  const { cx, unit, torso } = rig;
  const ease = options.ease;
  const widthScale = options.widthScale ?? 1;
  const waistW = torso.waistHalfW + ease;
  const hipW = torso.hipHalfW + ease;
  const leftLeg = rig.legs.left;
  const rightLeg = rig.legs.right;
  const leftOff = limbOffsets(leftLeg, options.hemT, ease * 0.6, leftLeg.side, widthScale);
  const rightOff = limbOffsets(rightLeg, options.hemT, ease * 0.6, rightLeg.side, widthScale);
  const leftOuter = leftOff.outer;
  const leftInner = leftOff.inner;
  const rightInner = rightOff.inner;
  const rightOuter = rightOff.outer;
  return [
    `M${f(cx - waistW)} ${f(torso.waistY)}`,
    `H${f(cx + waistW)}`,
    curveThrough([{ x: cx + hipW, y: torso.hipY }, ...rightOuter.slice(1)]),
    `L${f(rightInner[rightInner.length - 1]!.x)} ${f(
      rightInner[rightInner.length - 1]!.y + unit * 0.03,
    )}`,
    curveThrough([...rightInner].reverse()),
    `L${f(cx + unit * 0.04)} ${f(torso.crotchY + unit * 0.05)}`,
    `L${f(cx - unit * 0.04)} ${f(torso.crotchY + unit * 0.05)}`,
    curveThrough(leftInner),
    `L${f(leftOuter[leftOuter.length - 1]!.x)} ${f(
      leftOuter[leftOuter.length - 1]!.y + unit * 0.03,
    )}`,
    curveThrough([...leftOuter].reverse()),
    `L${f(cx - waistW)} ${f(torso.waistY)}`,
    "Z",
  ].join("");
}

const PALETTE_INDEX: Record<string, number> = {
  tops: 0,
  outer: 1,
  bottoms: 2,
  shoes: 4,
  head: 3,
  bag: 0,
  jewelry: 3,
};

function garmentBaseColor(item: Garment, palette: string[], paletteColors: boolean) {
  if (paletteColors) {
    const index = PALETTE_INDEX[item.category] ?? 0;
    return palette[index] || item.colors[0] || "#d6ccd9";
  }
  return item.colors[0] || "#d6ccd9";
}

export function buildGarment(
  rig: AvatarRig,
  item: Garment,
  palette: string[],
  paletteColors: boolean,
): GarmentLayer {
  const layer = emptyLayer();
  const unit = rig.unit;
  const cx = rig.cx;
  const { torso } = rig;
  const ease = unit * 0.055;
  const kind = item.kind;
  const category = item.category;
  const hemYFor = (value: number) => torso.shoulderY + value * unit;

  const pushOutline = (path: string) => {
    if (path) layer.outline.push(path);
  };

  if (category === "tops") {
    const topHem = (
      { tee: 0.98, cardigan: 1.08, knit: 1.1, blouse: 1.08, lace: 1.08, sailor: 1.08 } as Record<
        string,
        number
      >
    )[kind] ?? 1.08;
    const hemY = hemYFor(topHem);
    const neckDepth = (
      { tee: 0.22, cardigan: 0.16, knit: 0.14, blouse: 0.14, lace: 0.14, sailor: 0.12 } as Record<
        string,
        number
      >
    )[kind] ?? 0.16;
    const longSleeve = kind !== "tee";
    /* スカートの上に重ねるトップスは、裾をスカート幅より細くして
       ウエストの角がはみ出さないようにする。カーディガンだけは羽織りとして広げる。 */
    const hemSpread =
      kind === "cardigan"
        ? 1.06
        : kind === "blouse" || kind === "tee"
          ? 0.78
          : 0.84;
    pushOutline(torsoGarmentPath(rig, { ease, hemY, hemSpread, neckDepth }));
    const tEnd = longSleeve ? 1.0 : 0.32;
    for (const key of ["left", "right"] as const) {
      pushOutline(sleevePath(rig, key, tEnd, ease * (longSleeve ? 1.05 : 1.12), 1.0, longSleeve));
    }
    pushOutline(collarPath(rig, kind));
    layer.detail.push(collarbonePath(rig));

    // リボンタイブラウスの愛らしいリボン結び
    if (kind === "blouse" || item.id === "ribbon-blouse") {
      const knotY = torso.neckTopY + unit * 0.13;
      const knotR = unit * 0.024;
      const loopW = unit * 0.088;
      const loopH = unit * 0.055;
      // 結び目
      layer.accent.push(circlePath(cx, knotY, knotR));
      // 左の羽
      layer.accent.push(
        `M${f(cx - knotR * 0.8)} ${f(knotY)}Q${f(cx - loopW * 0.6)} ${f(knotY - loopH * 1.1)} ${f(cx - loopW)} ${f(knotY - loopH * 0.2)}Q${f(cx - loopW * 0.8)} ${f(knotY + loopH * 0.8)} ${f(cx - knotR * 0.8)} ${f(knotY + knotR * 0.5)}Z`,
      );
      // 右の羽
      layer.accent.push(
        `M${f(cx + knotR * 0.8)} ${f(knotY)}Q${f(cx + loopW * 0.6)} ${f(knotY - loopH * 1.1)} ${f(cx + loopW)} ${f(knotY - loopH * 0.2)}Q${f(cx + loopW * 0.8)} ${f(knotY + loopH * 0.8)} ${f(cx + knotR * 0.8)} ${f(knotY + knotR * 0.5)}Z`,
      );
      // 垂れ下がる2本のリボン足
      layer.accent.push(
        `M${f(cx - knotR * 0.4)} ${f(knotY + knotR)}Q${f(cx - unit * 0.05)} ${f(knotY + unit * 0.12)} ${f(cx - unit * 0.07)} ${f(knotY + unit * 0.22)}L${f(cx - unit * 0.04)} ${f(knotY + unit * 0.23)}Q${f(cx - unit * 0.02)} ${f(knotY + unit * 0.13)} ${f(cx)} ${f(knotY + knotR)}Z`,
        `M${f(cx + knotR * 0.4)} ${f(knotY + knotR)}Q${f(cx + unit * 0.05)} ${f(knotY + unit * 0.12)} ${f(cx + unit * 0.07)} ${f(knotY + unit * 0.22)}L${f(cx + unit * 0.04)} ${f(knotY + unit * 0.23)}Q${f(cx + unit * 0.02)} ${f(knotY + unit * 0.13)} ${f(cx)} ${f(knotY + knotR)}Z`,
      );
      layer.detail.push(`M${f(cx)} ${f(knotY + unit * 0.24)}L${f(cx)} ${f(hemY - unit * 0.08)}`);
    }

    if (kind === "sailor") {
      // セーラーのスカーフタイ
      const knotY = torso.shoulderY + unit * 0.2;
      layer.accent.push(circlePath(cx, knotY, unit * 0.028));
      layer.accent.push(
        `M${f(cx - unit * 0.02)} ${f(knotY + unit * 0.025)}Q${f(cx - unit * 0.06)} ${f(knotY + unit * 0.12)} ${f(cx - unit * 0.05)} ${f(knotY + unit * 0.22)}L${f(cx - unit * 0.015)} ${f(knotY + unit * 0.21)}L${f(cx)} ${f(knotY + unit * 0.03)}Z`,
        `M${f(cx + unit * 0.02)} ${f(knotY + unit * 0.025)}Q${f(cx + unit * 0.06)} ${f(knotY + unit * 0.12)} ${f(cx + unit * 0.05)} ${f(knotY + unit * 0.22)}L${f(cx + unit * 0.015)} ${f(knotY + unit * 0.21)}L${f(cx)} ${f(knotY + unit * 0.03)}Z`,
      );
      const outerW = torso.shoulderHalfW * 0.95;
      const hem = torso.shoulderY + unit * 0.32;
      layer.detail.push(
        `M${f(cx - outerW * 0.9)} ${f(hem - unit * 0.02)}Q${f(cx)} ${f(hem + unit * 0.01)} ${f(cx + outerW * 0.9)} ${f(hem - unit * 0.02)}`,
      );
    }

    if (kind === "knit") {
      layer.detail.push(
        `M${f(cx - torso.neckHalfW * 0.95)} ${f(torso.neckTopY + unit * 0.08)}Q${f(cx)} ${f(torso.neckTopY + unit * 0.1)} ${f(cx + torso.neckHalfW * 0.95)} ${f(torso.neckTopY + unit * 0.08)}`,
      );
    }

    if (kind === "cardigan") {
      layer.detail.push(`M${f(cx)} ${f(torso.chestY)}L${f(cx)} ${f(hemY - unit * 0.08)}`);
      for (let index = 0; index < 3; index++) {
        const y = torso.chestY + index * unit * 0.22;
        layer.accent.push(circlePath(cx, y, unit * 0.022));
      }
    }
  } else if (category === "outer") {
    if (kind === "blouson") {
      // ショートブルゾン：短め丈、ゆったりバルーン袖、前開きでインナーが魅える
      const hemY = hemYFor(1.28);
      pushOutline(
        openJacketPath(rig, {
          ease: ease * 1.3,
          hemY,
          hemSpread: 1.12,
          neckDepth: 0.16,
          openWidth: torso.chestHalfW * 0.68,
        }),
      );
      for (const key of ["left", "right"] as const) {
        pushOutline(sleevePath(rig, key, 1.0, ease * 1.45, 1.15, true));
        const arm = rig.arms[key];
        layer.detail.push(
          `M${f(arm.end.x - arm.endW * 1.4)} ${f(arm.end.y - unit * 0.04)}Q${f(arm.end.x)} ${f(arm.end.y - unit * 0.02)} ${f(arm.end.x + arm.endW * 1.4)} ${f(arm.end.y - unit * 0.04)}`,
        );
      }
      layer.detail.push(
        `M${f(cx - torso.hipHalfW * 1.12)} ${f(hemY - unit * 0.06)}Q${f(cx)} ${f(hemY - unit * 0.04)} ${f(cx + torso.hipHalfW * 1.12)} ${f(hemY - unit * 0.06)}`,
      );
      layer.detail.push(
        `M${f(cx - torso.chestHalfW * 0.32)} ${f(torso.neckTopY + unit * 0.18)}L${f(cx - torso.chestHalfW * 0.32)} ${f(hemY)}`,
        `M${f(cx + torso.chestHalfW * 0.32)} ${f(torso.neckTopY + unit * 0.18)}L${f(cx + torso.chestHalfW * 0.32)} ${f(hemY)}`,
      );
    } else if (kind === "cardigan") {
      // パイピングニットジャケット：配色パイピング＆丸ボタン＆開いた胸元
      const hemY = hemYFor(1.58);
      pushOutline(
        openJacketPath(rig, {
          ease: ease * 1.18,
          hemY,
          hemSpread: 1.14,
          neckDepth: 0.18,
          openWidth: torso.chestHalfW * 0.58,
        }),
      );
      for (const key of ["left", "right"] as const) {
        pushOutline(sleevePath(rig, key, 1.0, ease * 1.25, 1.08, true));
      }
      for (let i = 0; i < 3; i++) {
        const btnY = torso.chestY + i * unit * 0.22;
        layer.accent.push(circlePath(cx + torso.chestHalfW * 0.24, btnY, unit * 0.022));
      }
      layer.detail.push(
        `M${f(cx - torso.chestHalfW * 0.26)} ${f(torso.neckTopY + unit * 0.18)}L${f(cx - torso.chestHalfW * 0.26)} ${f(hemY)}`,
        `M${f(cx + torso.chestHalfW * 0.26)} ${f(torso.neckTopY + unit * 0.18)}L${f(cx + torso.chestHalfW * 0.26)} ${f(hemY)}`,
      );
      layer.detail.push(
        `M${f(cx - torso.waistHalfW * 0.85)} ${f(torso.waistY + unit * 0.08)}H${f(cx - torso.waistHalfW * 0.35)}V${f(torso.waistY + unit * 0.18)}H${f(cx - torso.waistHalfW * 0.85)}Z`,
        `M${f(cx + torso.waistHalfW * 0.35)} ${f(torso.waistY + unit * 0.08)}H${f(cx + torso.waistHalfW * 0.85)}V${f(torso.waistY + unit * 0.18)}H${f(cx + torso.waistHalfW * 0.35)}Z`,
      );
    } else if (kind === "blazer") {
      // チェックジャケット（テーラード）：ノッチドラペル、前開き、フラップポケット
      const hemY = hemYFor(1.62);
      pushOutline(
        openJacketPath(rig, {
          ease: ease * 1.2,
          hemY,
          hemSpread: 1.18,
          neckDepth: 0.22,
          openWidth: torso.chestHalfW * 0.62,
        }),
      );
      for (const key of ["left", "right"] as const) {
        pushOutline(sleevePath(rig, key, 1.0, ease * 1.25, 1.08));
      }
      layer.detail.push(
        `M${f(cx - torso.neckHalfW * 0.8)} ${f(torso.neckTopY + unit * 0.08)}L${f(cx - torso.shoulderHalfW * 0.72)} ${f(torso.shoulderY + unit * 0.16)}L${f(cx - torso.chestHalfW * 0.32)} ${f(torso.chestY)}`,
        `M${f(cx + torso.neckHalfW * 0.8)} ${f(torso.neckTopY + unit * 0.08)}L${f(cx + torso.shoulderHalfW * 0.72)} ${f(torso.shoulderY + unit * 0.16)}L${f(cx + torso.chestHalfW * 0.32)} ${f(torso.chestY)}`,
      );
      layer.detail.push(
        `M${f(cx - torso.chestHalfW * 0.7)} ${f(torso.chestY - unit * 0.04)}H${f(cx - torso.chestHalfW * 0.38)}`,
      );
      layer.detail.push(
        `M${f(cx - torso.waistHalfW * 0.9)} ${f(torso.waistY + unit * 0.1)}H${f(cx - torso.waistHalfW * 0.4)}`,
        `M${f(cx + torso.waistHalfW * 0.4)} ${f(torso.waistY + unit * 0.1)}H${f(cx + torso.waistHalfW * 0.9)}`,
      );
      layer.accent.push(
        circlePath(cx + torso.chestHalfW * 0.26, torso.waistY - unit * 0.06, unit * 0.024),
        circlePath(cx + torso.chestHalfW * 0.26, torso.waistY + unit * 0.12, unit * 0.024),
      );
    } else if (kind === "hoodie") {
      // 配色ジップパーカー：首後ろのやわらかなフード、カンガルーポケット、ジッパー
      const hemY = hemYFor(1.56);
      layer.back.push(
        circlePath(cx, torso.neckTopY + unit * 0.02, torso.shoulderHalfW * 0.96, unit * 0.34),
      );
      pushOutline(
        torsoGarmentPath(rig, {
          ease: ease * 1.35,
          hemY,
          hemSpread: 1.22,
          neckDepth: 0.12,
        }),
      );
      for (const key of ["left", "right"] as const) {
        pushOutline(sleevePath(rig, key, 1.0, ease * 1.4, 1.14, true));
      }
      layer.detail.push(
        `M${f(cx - torso.neckHalfW * 1.2)} ${f(torso.neckTopY + unit * 0.06)}Q${f(cx)} ${f(torso.neckTopY + unit * 0.18)} ${f(cx + torso.neckHalfW * 1.2)} ${f(torso.neckTopY + unit * 0.06)}`,
      );
      layer.detail.push(`M${f(cx)} ${f(torso.neckTopY + unit * 0.14)}L${f(cx)} ${f(hemY - unit * 0.07)}`);
      layer.accent.push(
        `M${f(cx - unit * 0.015)} ${f(torso.neckTopY + unit * 0.16)}H${f(cx + unit * 0.015)}V${f(torso.neckTopY + unit * 0.22)}H${f(cx - unit * 0.015)}Z`,
      );
      const pTop = torso.waistY + unit * 0.04;
      const pBtm = hemY - unit * 0.07;
      layer.detail.push(
        `M${f(cx - unit * 0.35)} ${f(pBtm)}L${f(cx - unit * 0.28)} ${f(pTop)}H${f(cx + unit * 0.28)}L${f(cx + unit * 0.35)} ${f(pBtm)}`,
      );
    } else if (kind === "trench") {
      // ベルト付きトレンチコート：長めの膝丈、ダブルボタン、ウエストベルト、ストームカラー
      const hemY = hemYFor(2.85);
      pushOutline(trenchPath(rig, { ease: ease * 1.25, hemY, hemSpread: 1.42 }));
      for (const key of ["left", "right"] as const) {
        pushOutline(sleevePath(rig, key, 1.0, ease * 1.25, 1.08));
      }
      layer.detail.push(
        `M${f(cx - torso.neckHalfW * 0.8)} ${f(torso.neckTopY + unit * 0.06)}L${f(cx - torso.shoulderHalfW * 0.8)} ${f(torso.shoulderY + unit * 0.22)}L${f(cx)} ${f(torso.chestY + unit * 0.12)}`,
        `M${f(cx + torso.neckHalfW * 0.8)} ${f(torso.neckTopY + unit * 0.06)}L${f(cx + torso.shoulderHalfW * 0.8)} ${f(torso.shoulderY + unit * 0.22)}L${f(cx - torso.chestHalfW * 0.35)} ${f(torso.chestY + unit * 0.2)}`,
      );
      for (let i = 0; i < 3; i++) {
        const btnY = torso.chestY + i * unit * 0.18;
        layer.accent.push(
          circlePath(cx - unit * 0.08, btnY, unit * 0.02),
          circlePath(cx + unit * 0.08, btnY, unit * 0.02),
        );
      }
      const beltY = torso.waistY;
      const beltHalfW = torso.hipHalfW * 1.18;
      layer.detail.push(
        `M${f(cx - beltHalfW)} ${f(beltY - unit * 0.04)}H${f(cx + beltHalfW)}`,
        `M${f(cx - beltHalfW)} ${f(beltY + unit * 0.04)}H${f(cx + beltHalfW)}`,
      );
      layer.accent.push(
        `M${f(cx - unit * 0.06)} ${f(beltY - unit * 0.055)}H${f(cx + unit * 0.06)}V${f(beltY + unit * 0.055)}H${f(cx - unit * 0.06)}Z`,
      );
      layer.detail.push(`M${f(cx)} ${f(hemY - unit * 0.45)}L${f(cx)} ${f(hemY)}`);
    } else if (kind === "cape") {
      // スタンドカラーマント：肩から広がる優雅なベルシェイプ
      const hemY = hemYFor(3.1);
      pushOutline(capePath(rig, { ease: ease * 1.35, hemY }));
      layer.accent.push(
        circlePath(cx, torso.neckTopY + unit * 0.12, unit * 0.034),
      );
      layer.detail.push(`M${f(cx)} ${f(torso.neckTopY + unit * 0.16)}L${f(cx)} ${f(hemY)}`);
    } else {
      const hemY = hemYFor(1.56);
      pushOutline(torsoGarmentPath(rig, { ease: ease * 1.15, hemY, hemSpread: 1.16, neckDepth: 0.17 }));
      for (const key of ["left", "right"] as const) {
        pushOutline(sleevePath(rig, key, 1.0, ease * 1.15));
      }
      layer.detail.push(`M${f(cx)} ${f(torso.neckTopY + unit * 0.12)}L${f(cx)} ${f(hemY - unit * 0.05)}`);
    }
  } else if (category === "bottoms") {
    if (kind === "pants" || kind === "cargo" || kind === "shorts") {
      const hemT = kind === "shorts" ? 0.42 : kind === "cargo" ? 0.92 : 0.96;
      const widthScale = kind === "cargo" ? 1.12 : 1.0;
      pushOutline(pantsPath(rig, { hemT, ease, widthScale }));
      if (kind === "cargo") {
        for (const key of ["left", "right"] as const) {
          const leg = rig.legs[key];
          const pocketY = leg.root.y + unit * 0.25;
          layer.detail.push(
            `M${f(leg.root.x - leg.rootW * 1.3)} ${f(pocketY)}H${f(
              leg.root.x + leg.rootW * 1.3,
            )}V${f(pocketY + unit * 0.18)}H${f(leg.root.x - leg.rootW * 1.3)}Z`,
          );
        }
      }
      layer.detail.push(
        `M${f(cx - torso.waistHalfW - ease)} ${f(torso.waistY - unit * 0.05)}H${f(
          cx + torso.waistHalfW + ease,
        )}V${f(torso.waistY + unit * 0.06)}H${f(cx - torso.waistHalfW - ease)}Z`,
      );
    } else {
      const hemY =
        kind === "long-skirt"
          ? rig.groundY - unit * 0.05
          : kind === "tiered"
            ? torso.crotchY + unit * 1.35
            : torso.crotchY + unit * 0.95;
      const hemHalfW =
        kind === "long-skirt"
          ? torso.hipHalfW * 1.9
          : kind === "tiered"
            ? torso.hipHalfW * 1.5
            : torso.hipHalfW * 1.35;
      pushOutline(skirtPath(rig, { hemY, hemHalfW, hemDrop: unit * 0.05 }));
      layer.detail.push(
        ...pleatLines(rig, hemY, hemHalfW).map(
          (line) => `M${f(line.x1)} ${f(line.y1)}L${f(line.x2)} ${f(line.y2)}`,
        ),
      );
      if (kind === "tiered") {
        const tierY = torso.crotchY + unit * 0.62;
        const tierW = torso.hipHalfW * 1.25;
        pushOutline(skirtPath(rig, { hemY: tierY, hemHalfW: tierW, hemDrop: unit * 0.03 }));
      }
      layer.detail.push(
        `M${f(cx - torso.waistHalfW - ease)} ${f(torso.waistY - unit * 0.04)}H${f(
          cx + torso.waistHalfW + ease,
        )}V${f(torso.waistY + unit * 0.05)}H${f(cx - torso.waistHalfW - ease)}Z`,
      );
    }
  } else if (category === "shoes") {
    for (const key of ["left", "right"] as const) {
      pushOutline(shoePath(rig, key));
      layer.detail.push(shoeSolePath(rig, key));
      if (kind === "long-boots" || kind === "boots") {
        layer.outline.push(bootShaftPath(rig, key, kind));
      }
      if (kind === "maryjanes" || kind === "loafers") {
        const foot = rig.feet[key];
        layer.accent.push(
          `M${f(foot.ankle.x - foot.halfW * 0.3)} ${f(foot.ankle.y + unit * 0.06)}Q${f(
            foot.ankle.x,
          )} ${f(foot.ankle.y - unit * 0.02)} ${f(foot.ankle.x + foot.halfW * 0.3)} ${f(
            foot.ankle.y + unit * 0.06,
          )}`,
        );
      }
      if (kind === "sandals") {
        const foot = rig.feet[key];
        layer.detail.push(
          `M${f(foot.ankle.x - foot.halfW * 0.6)} ${f(foot.ankle.y + unit * 0.02)}H${f(
            foot.ankle.x + foot.halfW * 0.6,
          )}`,
        );
      }
    }
  } else if (category === "jewelry") {
    if (kind === "necklace" || kind === "pendant") {
      layer.outline.push(necklacePath(rig));
      if (kind === "pendant") pushOutline(pendantPath(rig));
    } else if (kind === "choker") {
      pushOutline(chokerPath(rig));
    } else if (kind === "bracelet") {
      for (const key of ["left", "right"] as const) pushOutline(braceletPath(rig, key));
    } else if (kind === "earrings" || kind === "hoops") {
      for (const side of [-1, 1] as const) {
        if (kind === "hoops") {
          /* フープは塗りつぶさず、細い輪として描く。 */
          layer.detail.push(hoopPath(rig, side as Side));
        } else {
          pushOutline(earringPath(rig, side as Side));
        }
      }
    }
  } else if (category === "head") {
    if (kind === "ribbon") {
      pushOutline(ribbonClipPath(rig));
      layer.accent.push(circlePath(rig.head.cx - rig.head.halfW * 0.74, rig.head.crownY + rig.unit * 0.24, rig.unit * 0.035));
    } else if (kind === "bucket") {
      pushOutline(bucketHatPath(rig));
      layer.detail.push(
        `M${f(rig.head.cx - rig.head.halfW * 1.2)} ${f(rig.head.crownY + rig.unit * 0.22)}Q${f(rig.head.cx)} ${f(rig.head.crownY + rig.unit * 0.31)} ${f(rig.head.cx + rig.head.halfW * 1.2)} ${f(rig.head.crownY + rig.unit * 0.22)}`,
      );
    } else if (kind === "beret") {
      pushOutline(beretPath(rig));
      layer.detail.push(
        `M${f(rig.head.cx - rig.head.halfW * 0.5)} ${f(rig.head.crownY + rig.unit * 0.12)}Q${f(rig.head.cx)} ${f(rig.head.crownY + rig.unit * 0.05)} ${f(rig.head.cx + rig.head.halfW * 0.55)} ${f(rig.head.crownY + rig.unit * 0.16)}`,
      );
    } else if (kind === "glasses") {
      layer.detail.push(...roundGlassesDetailPaths(rig));
    } else if (kind === "flower") {
      pushOutline(flowerClipPath(rig));
      layer.accent.push(circlePath(rig.head.cx - rig.head.halfW * 0.8, rig.head.crownY + rig.unit * 0.42, rig.unit * 0.045));
    } else if (kind === "headphones") {
      pushOutline(headphonesPath(rig));
      layer.detail.push(headphoneBandPath(rig));
    }
  } else if (category === "bag") {
    if (kind === "handbag" || kind === "tote" || kind === "basket" || kind === "pouch") {
      pushOutline(handBagPath(rig, kind));
      layer.detail.push(handBagHandlePath(rig, kind));
      if (kind === "pouch")
        layer.detail.push(
          `M${f(rig.hands.right.wrist.x - rig.unit * 0.15)} ${f(rig.hands.right.wrist.y + rig.unit * 0.24)}H${f(rig.hands.right.wrist.x + rig.unit * 0.23)}`,
        );
    } else if (kind === "crossbody") {
      pushOutline(handBagPath(rig, kind));
      layer.detail.push(handBagHandlePath(rig, kind));
      layer.detail.push(
        `M${f(rig.hands.right.wrist.x - rig.unit * 0.05)} ${f(rig.hands.right.wrist.y)}L${f(rig.cx + rig.torso.shoulderHalfW * 0.72)} ${f(rig.torso.shoulderY + rig.unit * 0.06)}`,
      );
    } else if (kind === "backpack") {
      layer.back.push(backpackBodyPath(rig));
      layer.detail.push(...backpackStrapPaths(rig));
    }
  }
  // clip = union of all outlines
  layer.clip = layer.outline.join(" ");
  // cel shading: a left-side shadow band clipped to the garment
  if (layer.outline.length > 0) {
    const top = rig.torso.shoulderY - unit * 0.2;
    const bottom = rig.groundY + unit * 0.1;
    layer.shade.push(
      `M${f(cx - unit * 4)} ${f(top)}L${f(cx)} ${f(top)}L${f(cx)} ${f(bottom)}L${f(
        cx - unit * 4,
      )} ${f(bottom)}Z`,
    );
    layer.light.push(
      `M${f(cx)} ${f(top)}L${f(cx + unit * 4)} ${f(top)}L${f(cx + unit * 4)} ${f(
        bottom,
      )}L${f(cx)} ${f(bottom)}Z`,
    );
  }
  return layer;
}

/** 靴。足の形を包む丸い塊。 */
export function shoePath(rig: AvatarRig, key: LimbKey): string {
  const foot = rig.feet[key];
  const unit = rig.unit;
  const mid = pt(
    (foot.ankle.x + foot.toe.x) / 2 + foot.side * foot.halfW * 0.2,
    (foot.ankle.y + foot.groundY) / 2,
  );
  return tubePath(
    [
      { x: foot.ankle.x, y: foot.ankle.y - unit * 0.04, w: foot.halfW * 1.45 },
      { ...mid, w: foot.halfW * 1.5 },
      { x: foot.toe.x, y: foot.toe.y, w: foot.halfW * 1.35 },
    ],
    { startCap: "flat", endCap: "round" },
  );
}

/** 靴底。接地面に沿った薄い板。 */
export function shoeSolePath(rig: AvatarRig, key: LimbKey): string {
  const foot = rig.feet[key];
  const unit = rig.unit;
  const left = foot.ankle.x - foot.halfW * 0.85;
  const right = foot.toe.x + foot.halfW * 0.55;
  const mid = (left + right) / 2;
  return [
    `M${f(left)} ${f(foot.groundY)}`,
    `Q${f(mid)} ${f(foot.groundY + unit * 0.04)} ${f(right)} ${f(foot.groundY)}`,
    `L${f(right)} ${f(foot.groundY + unit * 0.055)}`,
    `Q${f(mid)} ${f(foot.groundY + unit * 0.09)} ${f(left)} ${f(foot.groundY + unit * 0.055)}`,
    "Z",
  ].join("");
}

/** ブーツのシャフト。足首からひざ下まで。 */
export function bootShaftPath(
  rig: AvatarRig,
  key: LimbKey,
  kind: string,
): string {
  const foot = rig.feet[key];
  const unit = rig.unit;
  const top =
    kind === "long-boots" ? foot.ankle.y - unit * 0.95 : foot.ankle.y - unit * 0.48;
  const shaftW =
    kind === "long-boots" ? foot.halfW * 1.5 : foot.halfW * 1.35;
  const x = foot.ankle.x;
  return `M${f(x - shaftW)} ${f(top)}H${f(x + shaftW)}L${f(
    x + shaftW * 0.92,
  )} ${f(foot.ankle.y + unit * 0.02)}H${f(x - shaftW * 0.92)}Z`;
}

/** ネックレス。首から胸に下がる弧。 */
export function necklacePath(rig: AvatarRig): string {
  const { cx, unit, torso } = rig;
  const y = torso.neckTopY + unit * 0.02;
  const w = torso.neckHalfW * 1.35;
  return `M${f(cx - w * 0.85)} ${f(y)}Q${f(cx - w * 0.4)} ${f(
    y + unit * 0.18,
  )} ${f(cx)} ${f(y + unit * 0.34)}Q${f(cx + w * 0.4)} ${f(
    y + unit * 0.18,
  )} ${f(cx + w * 0.85)} ${f(y)}`;
}

/** ペンダント。胸の位置に垂らす小さな宝石。 */
export function pendantPath(rig: AvatarRig): string {
  const { cx, unit, torso } = rig;
  const top = torso.neckTopY + unit * 0.34;
  const y = top + unit * 0.18;
  return tubePath(
    [
      { x: cx, y: top, w: unit * 0.025 },
      { x: cx, y: y - unit * 0.02, w: unit * 0.04 },
      { x: cx, y: y + unit * 0.08, w: unit * 0.075 },
    ],
    { startCap: "round", endCap: "round" },
  );
}

/** チョーカー。首に巻く細いバンド。 */
export function chokerPath(rig: AvatarRig): string {
  const { cx, unit, torso } = rig;
  const y = torso.neckTopY + unit * 0.06;
  const w = torso.neckHalfW * 1.18;
  return `M${f(cx - w)} ${f(y)}Q${f(cx)} ${f(y + unit * 0.04)} ${f(
    cx + w,
  )} ${f(y)}L${f(cx + w)} ${f(y + unit * 0.06)}Q${f(cx)} ${f(
    y + unit * 0.1,
  )} ${f(cx - w)} ${f(y + unit * 0.06)}Z`;
}

/** イヤリング。耳の位置に垂らす。 */
export function earringPath(rig: AvatarRig, side: Side): string {
  const { head, unit } = rig;
  const x = head.cx + side * head.earDX;
  const y = head.earY;
  return `M${f(x)} ${f(y)}Q${f(x + side * unit * 0.04)} ${f(
    y + unit * 0.12,
  )} ${f(x)} ${f(y + unit * 0.22)}Q${f(x - side * unit * 0.04)} ${f(
    y + unit * 0.12,
  )} ${f(x)} ${f(y)}`;
}

/** フープピアス。 */
export function hoopPath(rig: AvatarRig, side: Side): string {
  const { head, unit } = rig;
  const x = head.cx + side * head.earDX;
  const y = head.earY + unit * 0.06;
  const r = unit * 0.09;
  return `M${f(x - r)} ${f(y)}A${f(r)} ${f(r)} 0 1 1 ${f(x + r)} ${f(
    y,
  )}A${f(r)} ${f(r)} 0 1 1 ${f(x - r)} ${f(y)}`;
}

/** ブレスレット。手首に巻く。 */
export function braceletPath(rig: AvatarRig, key: LimbKey): string {
  const hand = rig.hands[key];
  const unit = rig.unit;
  const cx = hand.wrist.x;
  const cy = hand.wrist.y - unit * 0.04;
  const w = hand.halfW * 1.35;
  return `M${f(cx - w)} ${f(cy)}Q${f(cx)} ${f(cy + unit * 0.05)} ${f(
    cx + w,
  )} ${f(cy)}L${f(cx + w)} ${f(cy + unit * 0.09)}Q${f(cx)} ${f(
    cy + unit * 0.14,
  )} ${f(cx - w)} ${f(cy + unit * 0.09)}Z`;
}

/** 襟。トップスの種類で形を変える（丸みのあるアニメ作画）。 */
export function collarPath(rig: AvatarRig, kind: string): string {
  const { cx, unit, torso } = rig;
  const y = torso.neckTopY + unit * 0.04;
  const w = torso.neckHalfW;
  if (kind === "sailor") {
    // セーラーカラー：肩に自然にかかる、角の丸いセーラー襟
    const hem = torso.shoulderY + unit * 0.32;
    const outerW = torso.shoulderHalfW * 0.95;
    return [
      `M${f(cx)} ${f(y + unit * 0.08)}`,
      `Q${f(cx - w * 1.35)} ${f(y + unit * 0.1)} ${f(cx - outerW)} ${f(hem)}`,
      `Q${f(cx - outerW * 0.5)} ${f(hem + unit * 0.025)} ${f(cx)} ${f(hem + unit * 0.035)}`,
      `Q${f(cx + outerW * 0.5)} ${f(hem + unit * 0.025)} ${f(cx + outerW)} ${f(hem)}`,
      `Q${f(cx + w * 1.35)} ${f(y + unit * 0.1)} ${f(cx)} ${f(y + unit * 0.08)}`,
      "Z",
    ].join("");
  }
  if (kind === "blouse" || kind === "lace") {
    // ラウンドカラー / ピーターパンカラー：やわらかく丸い襟弁
    return [
      `M${f(cx - w * 1.55)} ${f(y + unit * 0.01)}`,
      `Q${f(cx - w * 0.8)} ${f(y + unit * 0.15)} ${f(cx)} ${f(y + unit * 0.09)}`,
      `Q${f(cx + w * 0.8)} ${f(y + unit * 0.15)} ${f(cx + w * 1.55)} ${f(y + unit * 0.01)}`,
      `Q${f(cx + w * 0.9)} ${f(y + unit * 0.04)} ${f(cx)} ${f(y + unit * 0.06)}`,
      `Q${f(cx - w * 0.9)} ${f(y + unit * 0.04)} ${f(cx - w * 1.55)} ${f(y + unit * 0.01)}`,
      "Z",
    ].join("");
  }
  if (kind === "cardigan") {
    return `M${f(cx - w * 1.35)} ${f(y)}Q${f(cx)} ${f(y + unit * 0.09)} ${f(
      cx + w * 1.35,
    )} ${f(y)}L${f(cx + w * 0.95)} ${f(y + unit * 0.04)}Q${f(cx)} ${f(
      y + unit * 0.06,
    )} ${f(cx - w * 0.95)} ${f(y + unit * 0.04)}Z`;
  }
  return `M${f(cx - w * 1.15)} ${f(y)}Q${f(cx)} ${f(y + unit * 0.07)} ${f(
    cx + w * 1.15,
  )} ${f(y)}L${f(cx + w * 0.85)} ${f(y + unit * 0.03)}Q${f(cx)} ${f(
    y + unit * 0.045,
  )} ${f(cx - w * 0.85)} ${f(y + unit * 0.03)}Z`;
}

/** 袖。腕の中心線に沿って布を巻く。手首カフスは柔らかな曲線。 */
export function sleevePath(
  rig: AvatarRig,
  key: LimbKey,
  tEnd: number,
  ease: number,
  widthScale = 1,
  isBaggy = false,
): string {
  const arm = rig.arms[key];
  const unit = rig.unit;
  const off = limbOffsets(arm, tEnd, ease, arm.side, widthScale, isBaggy);
  const outer = off.outer;
  const inner = off.inner;
  const wristMidX = (outer[outer.length - 1]!.x + inner[inner.length - 1]!.x) / 2;
  const wristMidY = (outer[outer.length - 1]!.y + inner[inner.length - 1]!.y) / 2;
  const drop = tEnd >= 0.8 ? unit * 0.025 : unit * 0.015;
  return [
    `M${f(outer[0]!.x)} ${f(outer[0]!.y)}`,
    curveThrough(outer),
    `Q${f(wristMidX)} ${f(wristMidY + drop)} ${f(inner[inner.length - 1]!.x)} ${f(inner[inner.length - 1]!.y)}`,
    curveThrough([...inner].reverse()),
    `Q${f((inner[0]!.x + outer[0]!.x) / 2)} ${f((inner[0]!.y + outer[0]!.y) / 2 - unit * 0.015)} ${f(outer[0]!.x)} ${f(outer[0]!.y)}`,
    "Z",
  ].join("");
}

/* --------------------------------------------------------- 頭の装飾 */

/** リボンクリップ。頭の画面左に結ぶ。 */
export function ribbonClipPath(rig: AvatarRig): string {
  const { head, unit } = rig;
  const x = head.cx - head.halfW * 0.8;
  const y = head.crownY + unit * 0.26;
  const w = unit * 0.3;
  const h = unit * 0.22;
  const loop = (side: Side, scale: number) => {
    const sx = x + side * w * 0.24;
    return [
      `M${f(sx)} ${f(y)}`,
      `C${f(sx - side * w * 0.2)} ${f(y - h * 1.25 * scale)} ${f(sx - side * w * 1.2)} ${f(y - h * 0.9 * scale)} ${f(sx - side * w * 1.02)} ${f(y)}`,
      `C${f(sx - side * w * 1.22)} ${f(y + h * 0.85 * scale)} ${f(sx - side * w * 0.25)} ${f(y + h * 0.55 * scale)} ${f(sx)} ${f(y)}`,
      "Z",
    ].join("");
  };
  return `${loop(-1, 1)} ${loop(1, 0.86)}`;
}

/** バケットハット。つばまで含めたシルエット。 */
export function bucketHatPath(rig: AvatarRig): string {
  const { head, unit } = rig;
  const { cx, crownY, halfW } = head;
  return [
    `M${f(cx - halfW * 1.2)} ${f(crownY + unit * 0.2)}`,
    `C${f(cx - halfW * 1.16)} ${f(crownY - unit * 0.06)} ${f(cx - halfW * 0.72)} ${f(crownY - unit * 0.27)} ${f(cx)} ${f(crownY - unit * 0.29)}`,
    `C${f(cx + halfW * 0.72)} ${f(crownY - unit * 0.27)} ${f(cx + halfW * 1.16)} ${f(crownY - unit * 0.06)} ${f(cx + halfW * 1.2)} ${f(crownY + unit * 0.2)}`,
    `Q${f(cx + halfW * 0.52)} ${f(crownY + unit * 0.29)} ${f(cx)} ${f(crownY + unit * 0.29)}`,
    `Q${f(cx - halfW * 0.52)} ${f(crownY + unit * 0.29)} ${f(cx - halfW * 1.2)} ${f(crownY + unit * 0.2)}`,
    "Z",
  ].join("");
}

/** ベレット。少し傾けて頭頂に乗せる。 */
export function beretPath(rig: AvatarRig): string {
  const { head, unit } = rig;
  const { cx, crownY, halfW } = head;
  return [
    `M${f(cx - halfW * 1.05)} ${f(crownY + unit * 0.15)}`,
    `C${f(cx - halfW * 1.0)} ${f(crownY - unit * 0.2)} ${f(cx - halfW * 0.2)} ${f(crownY - unit * 0.34)} ${f(cx + halfW * 0.45)} ${f(crownY - unit * 0.19)}`,
    `C${f(cx + halfW * 0.92)} ${f(crownY - unit * 0.08)} ${f(cx + halfW * 0.9)} ${f(crownY + unit * 0.08)} ${f(cx + halfW * 0.62)} ${f(crownY + unit * 0.13)}`,
    `Q${f(cx)} ${f(crownY + unit * 0.24)} ${f(cx - halfW * 1.05)} ${f(crownY + unit * 0.15)}`,
    "Z",
  ].join("");
}

/** 丸眼鏡。レンズは塗らず、細い線だけで描く。 */
export function roundGlassesDetailPaths(rig: AvatarRig): string[] {
  const { head, unit } = rig;
  const rw = head.eyeHalfW * 1.75;
  const rh = head.eyeHalfH * 1.25;
  const left = head.cx - head.eyeDX;
  const right = head.cx + head.eyeDX;
  const bridgeY = head.eyeY;
  return [
    circlePath(left, bridgeY, rw, rh),
    circlePath(right, bridgeY, rw, rh),
    `M${f(left + rw)} ${f(bridgeY)}Q${f(head.cx)} ${f(bridgeY - unit * 0.02)} ${f(right - rw)} ${f(bridgeY)}`,
    `M${f(left - rw)} ${f(bridgeY)}L${f(head.cx - head.earDX * 0.9)} ${f(bridgeY - unit * 0.03)}`,
    `M${f(right + rw)} ${f(bridgeY)}L${f(head.cx + head.earDX * 0.9)} ${f(bridgeY - unit * 0.03)}`,
  ];
}

/** 花の髪留め。5枚の花びら。 */
export function flowerClipPath(rig: AvatarRig): string {
  const { head, unit } = rig;
  const cx = head.cx - head.halfW * 0.82;
  const cy = head.crownY + unit * 0.42;
  const petals: string[] = [];
  for (let index = 0; index < 5; index++) {
    const angle = (index / 5) * Math.PI * 2 - Math.PI / 2;
    petals.push(
      circlePath(
        cx + Math.cos(angle) * unit * 0.085,
        cy + Math.sin(angle) * unit * 0.085,
        unit * 0.07,
        unit * 0.085,
      ),
    );
  }
  return petals.join(" ");
}

/** ヘッドホン。耳あては塗り、バンドは線。 */
export function headphonesPath(rig: AvatarRig): string {
  const { head, unit } = rig;
  const y = head.earY + unit * 0.03;
  return [
    circlePath(head.cx - head.earDX * 0.96, y, unit * 0.11, unit * 0.13),
    circlePath(head.cx + head.earDX * 0.96, y, unit * 0.11, unit * 0.13),
  ].join(" ");
}

export function headphoneBandPath(rig: AvatarRig): string {
  const { head, unit } = rig;
  const y = head.earY + unit * 0.02;
  return `M${f(head.cx - head.earDX * 0.96)} ${f(y)}C${f(head.cx - head.halfW * 0.9)} ${f(head.crownY - unit * 0.2)} ${f(head.cx + head.halfW * 0.9)} ${f(head.crownY - unit * 0.2)} ${f(head.cx + head.earDX * 0.96)} ${f(y)}`;
}

/* --------------------------------------------------------------- バッグ */

/** 手提げ・トート・バスケット・巾着・斜めがけ。右手首の下に吊るす。 */
export function handBagPath(rig: AvatarRig, kind: string): string {
  const unit = rig.unit;
  const hand = rig.hands.right;
  const cx = hand.wrist.x + unit * 0.04;
  const top = hand.wrist.y + unit * (kind === "crossbody" ? 0.26 : 0.2);
  const w = unit * (kind === "basket" ? 0.34 : kind === "tote" ? 0.3 : 0.3);
  const h = unit * (kind === "tote" ? 0.5 : kind === "basket" ? 0.36 : kind === "pouch" ? 0.38 : 0.34);
  if (kind === "pouch") {
    return [
      `M${f(cx - w)} ${f(top)}`,
      `C${f(cx - w * 1.15)} ${f(top + h * 0.7)} ${f(cx - w * 0.55)} ${f(top + h)} ${f(cx)} ${f(top + h)}`,
      `C${f(cx + w * 0.55)} ${f(top + h)} ${f(cx + w * 1.15)} ${f(top + h * 0.7)} ${f(cx + w)} ${f(top)}`,
      `Q${f(cx)} ${f(top + h * 0.16)} ${f(cx - w)} ${f(top)}`,
      "Z",
    ].join("");
  }
  if (kind === "basket") {
    return [
      `M${f(cx - w * 0.92)} ${f(top + h * 0.18)}H${f(cx + w * 0.92)}`,
      `L${f(cx + w * 0.72)} ${f(top + h)}H${f(cx - w * 0.72)}Z`,
    ].join("");
  }
  return [
    `M${f(cx - w)} ${f(top)}`,
    `Q${f(cx - w * 1.08)} ${f(top + h * 0.6)} ${f(cx - w * 0.88)} ${f(top + h)}`,
    `H${f(cx + w * 0.88)}`,
    `Q${f(cx + w * 1.08)} ${f(top + h * 0.6)} ${f(cx + w)} ${f(top)}`,
    `Q${f(cx)} ${f(top - h * 0.08)} ${f(cx - w)} ${f(top)}`,
    "Z",
  ].join("");
}

/** バッグの持ち手。 */
export function handBagHandlePath(rig: AvatarRig, kind: string): string {
  const unit = rig.unit;
  const hand = rig.hands.right;
  const cx = hand.wrist.x + unit * 0.04;
  const top = hand.wrist.y + unit * (kind === "crossbody" ? 0.26 : 0.2);
  const hw = unit * (kind === "basket" ? 0.24 : kind === "tote" ? 0.2 : 0.18);
  return `M${f(cx - hw)} ${f(top)}Q${f(cx)} ${f(top - unit * 0.26)} ${f(cx + hw)} ${f(top)}`;
}

/** リュック本体。体の後ろに置くので胴の左右から少しはみ出す。 */
export function backpackBodyPath(rig: AvatarRig): string {
  const { cx, unit, torso } = rig;
  const top = torso.shoulderY + unit * 0.18;
  const bottom = torso.waistY + unit * 0.24;
  const w = torso.shoulderHalfW * 1.12;
  return [
    `M${f(cx - w)} ${f(top)}`,
    `Q${f(cx - w * 1.08)} ${f((top + bottom) / 2)} ${f(cx - w * 0.9)} ${f(bottom)}`,
    `Q${f(cx)} ${f(bottom + unit * 0.1)} ${f(cx + w * 0.9)} ${f(bottom)}`,
    `Q${f(cx + w * 1.08)} ${f((top + bottom) / 2)} ${f(cx + w)} ${f(top)}`,
    `Q${f(cx)} ${f(top - unit * 0.16)} ${f(cx - w)} ${f(top)}`,
    "Z",
  ].join(" ");
}

/** リュックの肩ひも。 */
export function backpackStrapPaths(rig: AvatarRig): string[] {
  const { cx, unit, torso } = rig;
  const y = torso.shoulderY + unit * 0.06;
  const end = torso.waistY + unit * 0.02;
  return [
    `M${f(cx - torso.shoulderHalfW * 0.62)} ${f(y)}Q${f(cx - torso.chestHalfW * 0.78)} ${f((y + end) / 2)} ${f(cx - torso.waistHalfW * 0.86)} ${f(end)}`,
    `M${f(cx + torso.shoulderHalfW * 0.62)} ${f(y)}Q${f(cx + torso.chestHalfW * 0.78)} ${f((y + end) / 2)} ${f(cx + torso.waistHalfW * 0.86)} ${f(end)}`,
  ];
}

/* -------------------------------------------------- ラスター衣装の配置枠 */

export interface GarmentImagePlacement {
  key: string;
  box: RigBox;
}

/**
 * 端末内で生成したPNGを、リグの部位に合わせて置くための枠。
 * 頭身・体型・ポーズが変わっても同じ基準から再計算される。
 */
export function garmentImagePlacements(
  rig: AvatarRig,
  category: string,
): GarmentImagePlacement[] {
  const { cx, unit, torso, head, groundY } = rig;
  const box = (x: number, y: number, width: number, height: number): RigBox => ({
    x,
    y,
    width: Math.max(unit * 0.2, width),
    height: Math.max(unit * 0.2, height),
  });
  if (category === "tops") {
    return [
      {
        key: "tops",
        box: box(
          cx - torso.shoulderHalfW * 1.2,
          torso.shoulderY - unit * 0.12,
          torso.shoulderHalfW * 2.4,
          torso.crotchY - torso.shoulderY + unit * 0.72,
        ),
      },
    ];
  }
  if (category === "outer") {
    return [
      {
        key: "outer",
        box: box(
          cx - torso.shoulderHalfW * 1.38,
          torso.shoulderY - unit * 0.16,
          torso.shoulderHalfW * 2.76,
          (torso.crotchY - torso.shoulderY) * 1.35 + unit * 0.9,
        ),
      },
    ];
  }
  if (category === "bottoms") {
    return [
      {
        key: "bottoms",
        box: box(
          cx - torso.hipHalfW * 1.65,
          torso.waistY - unit * 0.06,
          torso.hipHalfW * 3.3,
          (groundY - torso.waistY) * 0.72,
        ),
      },
    ];
  }
  if (category === "shoes") {
    return (["left", "right"] as const).map((key) => {
      const foot = rig.feet[key];
      return {
        key: `shoes-${key}`,
        box: box(
          Math.min(foot.ankle.x, foot.toe.x) - foot.halfW * 1.3,
          foot.ankle.y - unit * 0.16,
          Math.abs(foot.toe.x - foot.ankle.x) + foot.halfW * 2.8,
          foot.groundY - foot.ankle.y + unit * 0.24,
        ),
      };
    });
  }
  if (category === "head") {
    return [
      {
        key: "head",
        box: box(
          head.cx - head.halfW * 1.28,
          head.crownY - unit * 0.38,
          head.halfW * 2.56,
          unit * 1.02,
        ),
      },
    ];
  }
  if (category === "bag") {
    return [
      {
        key: "bag",
        box: box(
          rig.hands.right.wrist.x - unit * 0.34,
          rig.hands.right.wrist.y - unit * 0.1,
          unit * 0.9,
          unit * 1.02,
        ),
      },
    ];
  }
  if (category === "jewelry") {
    return [
      {
        key: "jewelry",
        box: box(
          cx - torso.shoulderHalfW * 0.95,
          torso.neckTopY - unit * 0.06,
          torso.shoulderHalfW * 1.9,
          unit * 0.7,
        ),
      },
    ];
  }
  return [];
}
