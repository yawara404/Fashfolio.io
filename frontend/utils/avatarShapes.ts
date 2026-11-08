/**
 * 素体・顔・髪のSVGパス生成。
 *
 * すべて buildRig() の関節座標（px）から組み立てるので、頭身・体型・ポーズを
 * 変えても破綻しない。四肢は「中心線 + 半幅」から tubePath() で輪郭を作る
 * （メッシュ変形に依存しないので、比例が変わっても線が折れない）。
 *
 * 画風はつくみず作品の記号を参考にしている（既存キャラクターの模写はしない）:
 * - 丸くて頬のふくらんだ頭、低めに寄った小さな目鼻立ち
 * - 半まぶたのじと目、小さな口、斜線の頬
 * - 大きな毛束と不揃いな毛先、アホゲ
 * - 平坦な塗り + 1段のやわらかい影、太すぎない一定の線
 */
import type {
  BlushStyle,
  BrowShape,
  EyeShape,
  HairStyle,
  MouthShape,
} from "~/types/avatar";
import type { AvatarRig, LimbKey, RigPoint, Side } from "~/utils/avatarRig";

export interface ChainNode extends RigPoint {
  /** 半幅（px） */
  w: number;
}

export interface TubeOptions {
  startCap?: "round" | "flat";
  endCap?: "round" | "flat";
}

const round2 = (value: number) => Math.round(value * 100) / 100;
export const f = (value: number) => String(round2(value));
export const pt = (x: number, y: number): RigPoint => ({ x, y });

/** 点列を Catmull-Rom → 3次ベジェでつなぐ（現在地が points[0]! の前提）。 */
export function curveThrough(points: RigPoint[]): string {
  const n = points.length;
  if (n < 2) return "";
  let d = "";
  for (let index = 0; index < n - 1; index++) {
    const p0 = points[Math.max(0, index - 1)]!;
    const p1 = points[index]!;
    const p2 = points[index + 1]!;
    const p3 = points[Math.min(n - 1, index + 2)]!;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += `C${f(c1x)} ${f(c1y)} ${f(c2x)} ${f(c2y)} ${f(p2.x)} ${f(p2.y)}`;
  }
  return d;
}

/** 閉じた滑らかな輪郭。 */
export function smoothClosedPath(points: RigPoint[]): string {
  const n = points.length;
  if (n < 3) return "";
  let d = `M${f(points[0]!.x)} ${f(points[0]!.y)}`;
  for (let index = 0; index < n; index++) {
    const p0 = points[(index - 1 + n) % n]!;
    const p1 = points[index]!;
    const p2 = points[(index + 1) % n]!;
    const p3 = points[(index + 2) % n]!;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += `C${f(c1x)} ${f(c1y)} ${f(c2x)} ${f(c2y)} ${f(p2.x)} ${f(p2.y)}`;
  }
  return `${d}Z`;
}

/** 折れ線（毛先のギザギザなど、角を残したいところ）。 */
export function polylinePath(points: RigPoint[], close = false): string {
  if (!points.length) return "";
  const first = points[0]!;
  const rest = points.slice(1);
  return `M${f(first.x)} ${f(first.y)}${rest
    .map((point) => `L${f(point.x)} ${f(point.y)}`)
    .join("")}${close ? "Z" : ""}`;
}

/** 現在地から点列へ直線でつなぐ（M を出さない）。 */
export function lineThrough(points: RigPoint[]): string {
  return points.map((point) => `L${f(point.x)} ${f(point.y)}`).join("");
}

function normalize(vector: RigPoint): RigPoint {
  const length = Math.hypot(vector.x, vector.y) || 1;
  return { x: vector.x / length, y: vector.y / length };
}

function capPoints(
  center: RigPoint,
  tangent: RigPoint,
  width: number,
  forward: boolean,
): RigPoint[] {
  const dir = forward ? tangent : { x: -tangent.x, y: -tangent.y };
  /* 進行方向に対して左端 → 外側 → 右端 の半円を3点でサンプリングする */
  const start = Math.atan2(dir.y, dir.x) + Math.PI / 2;
  return [0.25, 0.5, 0.75].map((ratio) => {
    const angle = start - Math.PI * ratio;
    return {
      x: center.x + Math.cos(angle) * width,
      y: center.y + Math.sin(angle) * width,
    };
  });
}

/**
 * 中心線と半幅から滑らかな Tube（四肢・胴・毛束）の輪郭を作る。
 * startCap / endCap を flat にすると、胴体にめり込ませる端面になる。
 */
export function tubePath(nodes: ChainNode[], options: TubeOptions = {}): string {
  const { startCap = "round", endCap = "round" } = options;
  const count = nodes.length;
  if (count < 2) return "";
  const tangents = nodes.map((_, index) =>
    normalize({
      x: nodes[Math.min(count - 1, index + 1)]!.x - nodes[Math.max(0, index - 1)]!.x,
      y: nodes[Math.min(count - 1, index + 1)]!.y - nodes[Math.max(0, index - 1)]!.y,
    }),
  );
  const left = nodes.map((node, index) => ({
    x: node.x - tangents[index]!.y * node.w,
    y: node.y + tangents[index]!.x * node.w,
  }));
  const right = nodes.map((node, index) => ({
    x: node.x + tangents[index]!.y * node.w,
    y: node.y - tangents[index]!.x * node.w,
  }));
  const loop: RigPoint[] = [...left];
  if (endCap === "round")
    loop.push(...capPoints(nodes[count - 1]!, tangents[count - 1]!, nodes[count - 1]!.w, true));
  loop.push(...[...right].reverse());
  if (startCap === "round")
    loop.push(...capPoints(nodes[0]!, tangents[0]!, nodes[0]!.w, false));
  return smoothClosedPath(loop);
}

/* ------------------------------------------------------------ 素体の輪郭 */

/**
 * 胴体（首〜股）。股は浅いV字にして、脚は後ろに描く。
 * 肩・胸・腰・腰骨の幅はすべてリグから取るので頭身に追従する。
 */
export function torsoPath(rig: AvatarRig): string {
  const { cx, unit, torso } = rig;
  const left: RigPoint[] = [
    pt(cx - torso.neckHalfW, torso.neckTopY),
    pt(cx - torso.shoulderHalfW * 0.6, torso.shoulderY - unit * 0.015),
    pt(cx - torso.shoulderHalfW, torso.shoulderY + torso.shoulderDrop),
    pt(cx - torso.chestHalfW, torso.chestY),
    pt(cx - torso.waistHalfW, torso.waistY),
    pt(cx - torso.hipHalfW, torso.hipY),
    pt(cx - torso.hipHalfW * 0.5, torso.crotchY + unit * 0.02),
  ];
  const mirror = (point: RigPoint) => pt(cx * 2 - point.x, point.y);
  const right = [...left].reverse().map(mirror);
  const crotchY = torso.crotchY - unit * 0.03;
  const groin = torso.crotchY + unit * 0.015;
  return [
    `M${f(left[0]!.x)} ${f(left[0]!.y)}`,
    curveThrough(left),
    `Q${f(cx - torso.hipHalfW * 0.22)} ${f(groin)} ${f(cx)} ${f(crotchY)}`,
    `Q${f(cx + torso.hipHalfW * 0.22)} ${f(groin)} ${f(right[0]!.x)} ${f(right[0]!.y)}`,
    curveThrough(right),
    "Z",
  ].join("");
}

/** 脚。付け根は平坦にして腰の裏にめり込ませる。 */
export function legPath(rig: AvatarRig, key: LimbKey): string {
  const leg = rig.legs[key];
  return tubePath(
    [
      { x: leg.root.x, y: leg.root.y - rig.unit * 0.12, w: leg.rootW * 1.06 },
      { x: leg.mid.x, y: leg.mid.y, w: leg.midW },
      { x: leg.end.x, y: leg.end.y, w: leg.endW },
    ],
    { startCap: "flat", endCap: "round" },
  );
}

/** 腕。肩は胴体の裏に隠すので平坦。 */
export function armPath(rig: AvatarRig, key: LimbKey): string {
  const arm = rig.arms[key];
  return tubePath(
    [
      { x: arm.root.x, y: arm.root.y, w: arm.rootW * 1.12 },
      { x: arm.mid.x, y: arm.mid.y, w: arm.midW },
      { x: arm.end.x, y: arm.end.y, w: arm.endW },
    ],
    { startCap: "flat", endCap: "round" },
  );
}

function forearmVector(rig: AvatarRig, key: LimbKey) {
  const hand = rig.hands[key];
  const rad = (hand.angle * Math.PI) / 180;
  return { x: hand.side * Math.sin(rad), y: Math.cos(rad) };
}

/** ふわふわ鱈メーカー／COEIROINK風の繊細な手先（親指と指先の自然なまとまり）。 */
export function handPath(rig: AvatarRig, key: LimbKey): string {
  const hand = rig.hands[key];
  const dir = forearmVector(rig, key);
  const normal = { x: -dir.y * hand.side, y: dir.x * hand.side };
  const w = hand.halfW * 0.92;
  const len = hand.length;
  const wristIn = pt(hand.wrist.x - normal.x * w * 0.78, hand.wrist.y - normal.y * w * 0.78);
  const wristOut = pt(hand.wrist.x + normal.x * w * 0.82, hand.wrist.y + normal.y * w * 0.82);
  const thumbBase = pt(
    hand.wrist.x + dir.x * len * 0.28 - normal.x * w * 1.05,
    hand.wrist.y + dir.y * len * 0.28 - normal.y * w * 1.05,
  );
  const thumbTip = pt(
    hand.wrist.x + dir.x * len * 0.58 - normal.x * w * 1.18,
    hand.wrist.y + dir.y * len * 0.58 - normal.y * w * 1.18,
  );
  const thumbCrook = pt(
    hand.wrist.x + dir.x * len * 0.5 - normal.x * w * 0.62,
    hand.wrist.y + dir.y * len * 0.5 - normal.y * w * 0.62,
  );
  const indexTip = pt(
    hand.wrist.x + dir.x * len * 0.98 - normal.x * w * 0.28,
    hand.wrist.y + dir.y * len * 0.98 - normal.y * w * 0.28,
  );
  const midTip = pt(
    hand.wrist.x + dir.x * len * 1.04 + normal.x * w * 0.08,
    hand.wrist.y + dir.y * len * 1.04 + normal.y * w * 0.08,
  );
  const pinkySide = pt(
    hand.wrist.x + dir.x * len * 0.72 + normal.x * w * 0.76,
    hand.wrist.y + dir.y * len * 0.72 + normal.y * w * 0.76,
  );
  return smoothClosedPath([
    wristIn,
    thumbBase,
    thumbTip,
    thumbCrook,
    indexTip,
    midTip,
    pinkySide,
    wristOut,
  ]);
}

/** 親指の付け根の短い線。 */
export function handThumbPath(rig: AvatarRig, key: LimbKey): string {
  const hand = rig.hands[key];
  const dir = forearmVector(rig, key);
  const normal = { x: -dir.y, y: dir.x };
  const base = pt(
    hand.wrist.x + dir.x * hand.length * 0.28 - normal.x * hand.halfW * 0.5,
    hand.wrist.y + dir.y * hand.length * 0.28 - normal.y * hand.halfW * 0.5,
  );
  const tip = pt(
    hand.wrist.x + dir.x * hand.length * 0.62 - normal.x * hand.halfW * 0.72,
    hand.wrist.y + dir.y * hand.length * 0.62 - normal.y * hand.halfW * 0.72,
  );
  return `M${f(base.x)} ${f(base.y)}Q${f(
    (base.x + tip.x) / 2 - normal.x * hand.halfW * 0.4,
  )} ${f((base.y + tip.y) / 2 - normal.y * hand.halfW * 0.4)} ${f(tip.x)} ${f(
    tip.y,
  )}`;
}

/** 素足。くるぶしから接地面までの丸い塊。 */
export function footPath(rig: AvatarRig, key: LimbKey): string {
  const foot = rig.feet[key];
  const middle = pt(
    (foot.ankle.x + foot.toe.x) / 2 + foot.side * foot.halfW * 0.18,
    (foot.ankle.y + foot.groundY) / 2,
  );
  return tubePath(
    [
      {
        x: foot.ankle.x,
        y: foot.ankle.y - rig.unit * 0.06,
        w: foot.halfW * 0.7,
      },
      { ...middle, w: foot.halfW },
      { x: foot.toe.x, y: foot.toe.y, w: foot.halfW * 0.78 },
    ],
    { startCap: "flat", endCap: "round" },
  );
}

/** 腕の陰線。腕の中心線に沿う1本の線。 */
export function armShadePath(rig: AvatarRig, key: LimbKey): string {
  const arm = rig.arms[key];
  return `M${f(arm.root.x)} ${f(arm.root.y)}Q${f(
    arm.mid.x,
  )} ${f(arm.mid.y - rig.unit * 0.04)} ${f(arm.end.x)} ${f(arm.end.y)}`;
}

/** 脚の陰線。脚の中心線に沿う1本の線。 */
export function legShadePath(rig: AvatarRig, key: LimbKey): string {
  const leg = rig.legs[key];
  return `M${f(leg.root.x)} ${f(leg.root.y)}Q${f(
    leg.mid.x,
  )} ${f(leg.mid.y - rig.unit * 0.04)} ${f(leg.end.x)} ${f(leg.end.y)}`;
}

/** 鎖骨。首の付け根に2本。 */
export function collarbonePath(rig: AvatarRig): string {
  const { cx, unit, torso } = rig;
  const y = torso.shoulderY + unit * 0.06;
  const inner = torso.neckHalfW * 1.5;
  const outer = torso.shoulderHalfW * 0.72;
  return [
    `M${f(cx - inner)} ${f(y)}Q${f(cx - (inner + outer) / 2)} ${f(
      y + unit * 0.035,
    )} ${f(cx - outer)} ${f(y - unit * 0.01)}`,
    `M${f(cx + inner)} ${f(y)}Q${f(cx + (inner + outer) / 2)} ${f(
      y + unit * 0.035,
    )} ${f(cx + outer)} ${f(y - unit * 0.01)}`,
  ].join("");
}

/** 肘・膝・足首の短いしわ線。 */
export function jointCreasePaths(rig: AvatarRig): string[] {
  const paths: string[] = [];
  for (const key of ["left", "right"] as const) {
    const arm = rig.arms[key];
    const leg = rig.legs[key];
    const crease = (center: RigPoint, width: number, tilt: number) =>
      `M${f(center.x - width)} ${f(center.y + tilt)}Q${f(center.x)} ${f(
        center.y - tilt * 0.6,
      )} ${f(center.x + width)} ${f(center.y + tilt)}`;
    paths.push(crease(arm.mid, arm.midW * 0.8, arm.midW * 0.22));
    paths.push(crease(leg.mid, leg.midW * 0.85, leg.midW * 0.2));
  }
  return paths;
}

/* ---------------------------------------------------------------- 頭と顔 */

/** ふわふわ鱈メーカー／COEIROINK風のすっきりとした柔らかい卵型〜Vライン輪郭。 */
export function headPath(rig: AvatarRig): string {
  const { head, unit } = rig;
  const { cx, crownY, chinY, halfW, jawW } = head;
  const left: RigPoint[] = [
    pt(cx, crownY),
    pt(cx - halfW * 0.8, crownY + unit * 0.14),
    pt(cx - halfW, crownY + unit * 0.44),
    pt(cx - halfW * 0.95, crownY + unit * 0.65),
    pt(cx - jawW * 0.92, crownY + unit * 0.83),
    pt(cx - jawW * 0.34, chinY - unit * 0.025),
    pt(cx, chinY),
  ];
  const right = [...left]
    .reverse()
    .map((point) => pt(cx * 2 - point.x, point.y));
  return `M${f(left[0]!.x)} ${f(left[0]!.y)}${curveThrough(left)}${curveThrough(
    right,
  )}Z`;
}

/** ちょこんとした繊細な鼻筋・鼻の点（ふわふわ鱈メーカー／COEIROINK風）。 */
export function nosePath(rig: AvatarRig): string {
  const { cx, eyeY, mouthY } = rig.head;
  const unit = rig.unit;
  const ny = eyeY + (mouthY - eyeY) * 0.54;
  return `M${f(cx - unit * 0.008)} ${f(ny - unit * 0.028)}L${f(
    cx - unit * 0.018,
  )} ${f(ny)}L${f(cx + unit * 0.006)} ${f(ny + unit * 0.008)}`;
}

export function circlePath(cx: number, cy: number, rx: number, ry = rx) {
  return `M${f(cx - rx)} ${f(cy)}A${f(rx)} ${f(ry)} 0 1 0 ${f(cx + rx)} ${f(
    cy,
  )}A${f(rx)} ${f(ry)} 0 1 0 ${f(cx - rx)} ${f(cy)}Z`;
}

export interface FaceParts {
  /** 虹彩など、色を塗るパス */
  fill: string[];
  /** 線だけのパス */
  stroke: string[];
  /** 白目・ハイライト（瞳より先に描く） */
  highlight: string[];
}

const emptyParts = (): FaceParts => ({ fill: [], stroke: [], highlight: [] });

/** 目の形。ふわふわ鱈メーカー／COEIROINK風の繊細なまつげ・二重ライン・透明感ある虹彩。 */
export function eyeParts(
  rig: AvatarRig,
  shape: EyeShape,
  side: Side,
): FaceParts {
  const { eyeHalfW: ew, eyeHalfH: eh, eyeDX, eyeY, cx } = rig.head;
  const ex = cx + side * eyeDX;
  const at = (x: number, y: number) => pt(ex + x, eyeY + y);
  const parts = emptyParts();
  const isBoy = rig.gender === "boy";

  if (shape === "nico") {
    /* にっこり：柔らかいアーチ目＋目尻のまつげハネ */
    parts.stroke.push(
      `M${f(ex - ew * 1.05)} ${f(eyeY + eh * 0.16)}Q${f(ex)} ${f(
        eyeY - eh * 0.95,
      )} ${f(ex + ew * 1.05)} ${f(eyeY + eh * 0.16)}`,
      `M${f(ex + side * ew * 0.92)} ${f(eyeY + eh * 0.02)}L${f(
        ex + side * ew * 1.22,
      )} ${f(eyeY - eh * 0.18)}`,
    );
    return parts;
  }
  if (shape === "utsuro") {
    /* うつろ：伏し目がちのアンニュイ目 */
    parts.highlight.push(
      smoothClosedPath([
        at(-ew * 0.98, -eh * 0.25),
        at(0, -eh * 0.35),
        at(ew * 0.98, -eh * 0.25),
        at(ew * 0.85, eh * 0.58),
        at(0, eh * 0.82),
        at(-ew * 0.85, eh * 0.58),
      ]),
    );
    parts.fill.push(
      circlePath(ex, eyeY + eh * 0.1, ew * 0.62, eh * 0.64),
    );
    parts.stroke.push(
      `M${f(ex - ew * 1.12)} ${f(eyeY - eh * 0.22)}Q${f(ex)} ${f(
        eyeY - eh * 0.42,
      )} ${f(ex + ew * 1.12)} ${f(eyeY - eh * 0.22)}`,
      `M${f(ex - ew * 0.72)} ${f(eyeY - eh * 0.62)}Q${f(ex)} ${f(
        eyeY - eh * 0.76,
      )} ${f(ex + ew * 0.72)} ${f(eyeY - eh * 0.62)}`,
    );
    return parts;
  }
  if (shape === "maru") {
    /* ぱっちり丸目（少女・中性向け） */
    parts.highlight.push(
      smoothClosedPath([
        at(-ew * 1.02, -eh * 0.42),
        at(0, -eh * 0.92),
        at(ew * 1.02, -eh * 0.42),
        at(ew * 0.96, eh * 0.42),
        at(0, eh * 0.96),
        at(-ew * 0.96, eh * 0.42),
      ]),
    );
    parts.fill.push(circlePath(ex, eyeY + eh * 0.06, ew * 0.74, eh * 0.84));
    parts.stroke.push(
      `M${f(ex - ew * 1.12)} ${f(eyeY - eh * 0.24)}Q${f(ex)} ${f(
        eyeY - eh * 1.12,
      )} ${f(ex + ew * 1.12)} ${f(eyeY - eh * 0.24)}`,
      `M${f(ex + side * ew * 0.96)} ${f(eyeY - eh * 0.42)}L${f(
        ex + side * ew * 1.28,
      )} ${f(eyeY - eh * 0.68)}`,
      `M${f(ex - ew * 0.74)} ${f(eyeY - eh * 1.06)}Q${f(ex)} ${f(
        eyeY - eh * 1.32,
      )} ${f(ex + ew * 0.74)} ${f(eyeY - eh * 1.06)}`,
      `M${f(ex - ew * 0.48)} ${f(eyeY + eh * 0.94)}Q${f(ex)} ${f(
        eyeY + eh * 1.04,
      )} ${f(ex + ew * 0.48)} ${f(eyeY + eh * 0.94)}`,
    );
    return parts;
  }
  if (shape === "tsuri") {
    /* クールなつり目（少年・クール少女向け） */
    parts.highlight.push(
      smoothClosedPath([
        at(-ew * 1.02, eh * 0.12),
        at(-ew * 0.15, -eh * 0.66),
        at(ew * 1.04, -eh * 0.78),
        at(ew * 0.88, eh * 0.45),
        at(0, eh * 0.88),
        at(-ew * 0.86, eh * 0.56),
      ]),
    );
    parts.fill.push(circlePath(ex, eyeY + eh * 0.04, ew * 0.66, eh * 0.76));
    parts.stroke.push(
      `M${f(ex - side * ew * 1.06)} ${f(eyeY + eh * 0.02)}Q${f(ex)} ${f(
        eyeY - eh * 0.98,
      )} ${f(ex + side * ew * 1.16)} ${f(eyeY - eh * 0.68)}`,
      `M${f(ex + side * ew * 0.98)} ${f(eyeY - eh * 0.62)}L${f(
        ex + side * ew * 1.3,
      )} ${f(eyeY - eh * 0.88)}`,
      `M${f(ex - side * ew * 0.68)} ${f(eyeY - eh * 0.72)}Q${f(ex)} ${f(
        eyeY - eh * 1.18,
      )} ${f(ex + side * ew * 0.82)} ${f(eyeY - eh * 0.98)}`,
      `M${f(ex - ew * 0.45)} ${f(eyeY + eh * 0.86)}Q${f(ex)} ${f(
        eyeY + eh * 0.95,
      )} ${f(ex + ew * 0.45)} ${f(eyeY + eh * 0.86)}`,
    );
    return parts;
  }
  /* jito（既定）：ふわふわ鱈メーカー＆COEIROINK風のアンニュイで透明感のある目元 */
  parts.highlight.push(
    smoothClosedPath([
      at(-ew * 1.04, -eh * 0.34),
      at(0, -eh * 0.68),
      at(ew * 1.04, -eh * 0.36),
      at(ew * 0.92, eh * 0.54),
      at(0, eh * 0.92),
      at(-ew * 0.92, eh * 0.54),
    ]),
  );
  parts.fill.push(
    circlePath(ex, eyeY + eh * 0.06, ew * (isBoy ? 0.68 : 0.72), eh * (isBoy ? 0.78 : 0.82)),
  );
  const lashWing = isBoy
    ? `L${f(ex + side * ew * 1.24)} ${f(eyeY - eh * 0.48)}`
    : `L${f(ex + side * ew * 1.3)} ${f(eyeY - eh * 0.62)}`;
  parts.stroke.push(
    /* 上まつげ主線 */
    `M${f(ex - ew * 1.12)} ${f(eyeY - eh * 0.28)}Q${f(ex)} ${f(
      eyeY - eh * 0.84,
    )} ${f(ex + ew * 1.12)} ${f(eyeY - eh * 0.32)}${lashWing}`,
    /* 繊細な二重ライン */
    `M${f(ex - ew * 0.78)} ${f(eyeY - eh * 0.86)}Q${f(ex)} ${f(
      eyeY - eh * 1.12,
    )} ${f(ex + ew * 0.82)} ${f(eyeY - eh * 0.88)}`,
    /* 下まつげの控えめなライン */
    `M${f(ex - ew * 0.46)} ${f(eyeY + eh * 0.88)}Q${f(ex)} ${f(
      eyeY + eh * 0.98,
    )} ${f(ex + ew * 0.46)} ${f(eyeY + eh * 0.88)}`,
  );
  return parts;
}

/** 眉。目より高い位置に、細い線で。 */
export function browParts(
  rig: AvatarRig,
  shape: BrowShape,
  side: Side,
): FaceParts {
  const { eyeHalfW: ew, browY, cx, eyeDX } = rig.head;
  const x = cx + side * eyeDX;
  const inner = x - side * ew * 1.05;
  const outer = x + side * ew * 1.15;
  const lift = ew * 0.5;
  const parts = emptyParts();
  if (shape === "flat")
    parts.stroke.push(
      `M${f(inner)} ${f(browY)}Q${f(x)} ${f(browY - lift * 0.25)} ${f(outer)} ${f(
        browY,
      )}`,
    );
  else if (shape === "slant")
    parts.stroke.push(
      `M${f(inner)} ${f(browY - lift * 0.9)}Q${f(x)} ${f(browY - lift * 0.4)} ${f(
        outer,
      )} ${f(browY + lift * 0.35)}`,
    );
  else if (shape === "sharp")
    parts.stroke.push(
      `M${f(inner)} ${f(browY + lift * 0.3)}Q${f(x)} ${f(browY - lift * 0.7)} ${f(
        outer,
      )} ${f(browY - lift * 0.15)}`,
    );
  else
    parts.stroke.push(
      `M${f(inner)} ${f(browY - lift * 0.2)}Q${f(x)} ${f(browY - lift * 0.85)} ${f(
        outer,
      )} ${f(browY - lift * 0.1)}`,
    );
  return parts;
}

/** 口。どれも小さく。open と dot だけ塗りを持つ。 */
export function mouthParts(rig: AvatarRig, shape: MouthShape): FaceParts {
  const { cx, mouthY, mouthHalfW: mw } = rig.head;
  const unit = rig.unit;
  const parts = emptyParts();
  if (shape === "smile") {
    parts.stroke.push(
      `M${f(cx - mw)} ${f(mouthY - mw * 0.25)}Q${f(cx)} ${f(
        mouthY + mw * 0.95,
      )} ${f(cx + mw)} ${f(mouthY - mw * 0.25)}`,
    );
    return parts;
  }
  if (shape === "open") {
    parts.fill.push(
      smoothClosedPath([
        pt(cx - mw * 0.85, mouthY - mw * 0.2),
        pt(cx, mouthY - mw * 0.45),
        pt(cx + mw * 0.85, mouthY - mw * 0.2),
        pt(cx + mw * 0.6, mouthY + mw * 0.85),
        pt(cx - mw * 0.6, mouthY + mw * 0.85),
      ]),
    );
    return parts;
  }
  if (shape === "dot") {
    parts.fill.push(circlePath(cx, mouthY, mw * 0.24, mw * 0.28));
    return parts;
  }
  if (shape === "cat") {
    parts.stroke.push(
      `M${f(cx - mw)} ${f(mouthY - mw * 0.1)}Q${f(cx - mw * 0.5)} ${f(
        mouthY + mw * 0.7,
      )} ${f(cx)} ${f(mouthY)}Q${f(cx + mw * 0.5)} ${f(mouthY + mw * 0.7)} ${f(
        cx + mw,
      )} ${f(mouthY - mw * 0.1)}`,
    );
    return parts;
  }
  /* line（既定）：ほぼ水平の短い線 */
  parts.stroke.push(
    `M${f(cx - mw * 0.9)} ${f(mouthY)}Q${f(cx)} ${f(mouthY + unit * 0.012)} ${f(
      cx + mw * 0.9,
    )} ${f(mouthY)}`,
  );
  return parts;
}

/** 頬。斜線（hatch）がつくみず作品の記号。 */
export function blushParts(
  rig: AvatarRig,
  style: BlushStyle,
  side: Side,
): FaceParts {
  const { cx, blushY, blushDX, eyeHalfW: ew } = rig.head;
  const x = cx + side * blushDX;
  const parts = emptyParts();
  if (style === "none") return parts;
  if (style === "oval") {
    parts.fill.push(circlePath(x, blushY, ew * 0.95, ew * 0.5));
    return parts;
  }
  if (style === "line") {
    for (const offset of [-0.35, 0.1, 0.55])
      parts.stroke.push(
        `M${f(x - ew * 0.85)} ${f(blushY + ew * offset)}H${f(x + ew * 0.85)}`,
      );
    return parts;
  }
  /* hatch：斜線3本 */
  for (const offset of [-0.55, 0, 0.55])
    parts.stroke.push(
      `M${f(x + ew * offset - ew * 0.3)} ${f(blushY + ew * 0.42)}L${f(
        x + ew * offset + ew * 0.3,
      )} ${f(blushY - ew * 0.42)}`,
    );
  return parts;
}

/* ------------------------------------------------------------------- 髪 */

/** 髪型ごとの毛先の長さ（頭頂からの頭身単位）と横幅（halfW 比）。 */
export const HAIR_METRICS: Record<
  HairStyle,
  { back: number; front: number; lock: number; width: number }
> = {
  short: { back: 0.98, front: 0.56, lock: 0.82, width: 1.08 },
  mush: { back: 1.04, front: 0.58, lock: 0.88, width: 1.1 },
  bob: { back: 1.28, front: 0.6, lock: 1.28, width: 1.14 },
  twin: { back: 1.24, front: 0.6, lock: 1.34, width: 1.12 },
  pony: { back: 1.2, front: 0.58, lock: 1.4, width: 1.1 },
  long: { back: 2.95, front: 0.6, lock: 1.92, width: 1.15 },
};

/** 曲線でつながる柔らかい毛先（ふわふわ鱈メーカー／COEIROINK風の束感）。 */
function curvedHairBottom(
  x0: number,
  x1: number,
  y: number,
  depth: number,
  count: number,
): string {
  let d = "";
  const span = x1 - x0;
  for (let index = 0; index < count; index++) {
    const t0 = index / count;
    const tMid = (index + 0.5) / count;
    const t1 = (index + 1) / count;
    const xm = x0 + span * tMid;
    const xEnd = x0 + span * t1;
    const dip = depth * (index % 2 === 0 ? 1.0 : 0.62);
    const wave = Math.sin((index + 1) * 1.3) * depth * 0.18;
    d += `Q${f(xm)} ${f(y + dip + wave)} ${f(xEnd)} ${f(
      y + (t0 > 0.15 && t1 < 0.85 ? depth * 0.18 : 0),
    )}`;
  }
  return d;
}

/** 後ろ髪。ふんわり空気感のあるシルエット＋外ハネ／内巻きの柔らかい毛先。 */
export function backHairPath(rig: AvatarRig, style: HairStyle): string {
  const { head, unit } = rig;
  const { cx, crownY, halfW } = head;
  const metrics = HAIR_METRICS[style];
  const width = halfW * metrics.width;
  const bottom = crownY + unit * metrics.back;
  const isBoyShort = style === "mush" || style === "short";
  const left: RigPoint[] = isBoyShort
    ? [
        pt(cx, crownY - unit * 0.12),
        pt(cx - width * 0.76, crownY - unit * 0.03),
        pt(cx - width * 1.03, crownY + unit * 0.34),
        pt(cx - width * 0.98, crownY + unit * 0.64),
        pt(cx - width * 1.08, bottom - unit * 0.12),
        pt(cx - width * 0.84, bottom - unit * 0.02),
      ]
    : [
        pt(cx, crownY - unit * 0.12),
        pt(cx - width * 0.76, crownY - unit * 0.03),
        pt(cx - width * 1.04, crownY + unit * 0.38),
        pt(cx - width * 1.06, crownY + unit * 0.76),
        pt(cx - width * 0.96, (crownY + bottom) / 2 + unit * 0.12),
        pt(cx - width * 0.84, bottom - unit * 0.06),
      ];
  const mirror = (point: RigPoint) => pt(cx * 2 - point.x, point.y);
  const leftEnd = left[left.length - 1]!;
  const rightStart = mirror(leftEnd);
  const bottomCurves = curvedHairBottom(
    leftEnd.x,
    rightStart.x,
    bottom,
    unit * (style === "long" ? 0.18 : isBoyShort ? 0.1 : 0.13),
    style === "long" ? 6 : 5,
  );
  const rightUp = [...left].reverse().map(mirror);
  return [
    `M${f(left[0]!.x)} ${f(left[0]!.y)}`,
    curveThrough(left),
    bottomCurves,
    curveThrough(rightUp),
    "Z",
  ].join("");
}

/** COEIROINK風の首元インナーカラー／後ろ髪の内側シェード。 */
export function innerHairPath(rig: AvatarRig, style: HairStyle): string {
  const { head, unit } = rig;
  const { cx, crownY, halfW } = head;
  const metrics = HAIR_METRICS[style];
  const width = halfW * metrics.width * 0.82;
  const topY = crownY + unit * 0.56;
  const bottomY = crownY + unit * Math.min(metrics.back * 0.96, 1.48);
  return smoothClosedPath([
    pt(cx - width * 0.92, topY),
    pt(cx, topY - unit * 0.08),
    pt(cx + width * 0.92, topY),
    pt(cx + width * 0.78, bottomY),
    pt(cx, bottomY + unit * 0.08),
    pt(cx - width * 0.78, bottomY),
  ]);
}

/**
 * 前髪（ふわふわ鱈メーカー × COEIROINK風）。
 * 直線のギザギザではなく、3次・2次ベジェ曲線でふんわり束感とシースルーの抜け感を描く。
 */
export function frontHairPath(rig: AvatarRig, style: HairStyle): string {
  const { head, unit } = rig;
  const { cx, crownY, halfW, eyeY } = head;
  const metrics = HAIR_METRICS[style];
  const width = halfW * metrics.width * 1.02;
  const isBoyShort = style === "mush" || style === "short";
  const fringeY = eyeY - unit * (isBoyShort ? 0.03 : 0.04);
  const dome: RigPoint[] = [
    pt(cx - width, crownY + unit * 0.45),
    pt(cx - width * 0.99, crownY + unit * 0.11),
    pt(cx - width * 0.62, crownY - unit * 0.1),
    pt(cx, crownY - unit * 0.135),
    pt(cx + width * 0.62, crownY - unit * 0.1),
    pt(cx + width * 0.99, crownY + unit * 0.11),
    pt(cx + width, crownY + unit * 0.45),
  ];

  if (isBoyShort) {
    /* 少年（COEIROINK カナタ × ふわふわ鱈メーカー風）：
       目元にかかるアンニュイな曲線マッシュウルフ前髪＋自然なシースルーの隙間 */
    const bangs = [
      `Q${f(cx + width * 0.94)} ${f(fringeY + unit * 0.12)} ${f(cx + width * 0.76)} ${f(fringeY + unit * 0.06)}`,
      `Q${f(cx + width * 0.66)} ${f(fringeY - unit * 0.12)} ${f(cx + width * 0.56)} ${f(fringeY - unit * 0.15)}`,
      `Q${f(cx + width * 0.48)} ${f(fringeY + unit * 0.04)} ${f(cx + width * 0.34)} ${f(fringeY + unit * 0.09)}`,
      `Q${f(cx + width * 0.24)} ${f(fringeY - unit * 0.14)} ${f(cx + width * 0.16)} ${f(fringeY - unit * 0.18)}`,
      /* 眉間に落ちる繊細なセンター束 */
      `Q${f(cx + width * 0.08)} ${f(fringeY + unit * 0.04)} ${f(cx - width * 0.02)} ${f(fringeY + unit * 0.13)}`,
      `Q${f(cx - width * 0.1)} ${f(fringeY - unit * 0.08)} ${f(cx - width * 0.18)} ${f(fringeY - unit * 0.16)}`,
      `Q${f(cx - width * 0.28)} ${f(fringeY + unit * 0.02)} ${f(cx - width * 0.42)} ${f(fringeY + unit * 0.08)}`,
      `Q${f(cx - width * 0.54)} ${f(fringeY - unit * 0.12)} ${f(cx - width * 0.64)} ${f(fringeY - unit * 0.14)}`,
      `Q${f(cx - width * 0.74)} ${f(fringeY + unit * 0.04)} ${f(cx - width * 0.84)} ${f(fringeY + unit * 0.08)}`,
      `Q${f(cx - width * 0.94)} ${f(fringeY + unit * 0.04)} ${f(cx - width)} ${f(crownY + unit * 0.45)}`,
    ];
    return [`M${f(dome[0]!.x)} ${f(dome[0]!.y)}`, curveThrough(dome), ...bangs, "Z"].join("");
  }

  /* 少女（COEIROINK ナコ・レコ × ふわふわ鱈メーカー風）：
     ふんわり丸みのあるシースルーバング＋目元の間で柔らかく束になる曲線前髪 */
  const bangs = [
    `Q${f(cx + width * 0.95)} ${f(fringeY + unit * 0.1)} ${f(cx + width * 0.78)} ${f(fringeY + unit * 0.03)}`,
    `Q${f(cx + width * 0.7)} ${f(fringeY - unit * 0.12)} ${f(cx + width * 0.62)} ${f(fringeY - unit * 0.15)}`,
    `Q${f(cx + width * 0.52)} ${f(fringeY + unit * 0.01)} ${f(cx + width * 0.36)} ${f(fringeY + unit * 0.05)}`,
    `Q${f(cx + width * 0.28)} ${f(fringeY - unit * 0.1)} ${f(cx + width * 0.2)} ${f(fringeY - unit * 0.14)}`,
    /* 中央のシースルー毛束 */
    `Q${f(cx + width * 0.1)} ${f(fringeY + unit * 0.04)} ${f(cx)} ${f(fringeY + unit * 0.08)}`,
    `Q${f(cx - width * 0.1)} ${f(fringeY + unit * 0.02)} ${f(cx - width * 0.18)} ${f(fringeY - unit * 0.14)}`,
    `Q${f(cx - width * 0.28)} ${f(fringeY - unit * 0.02)} ${f(cx - width * 0.4)} ${f(fringeY + unit * 0.05)}`,
    `Q${f(cx - width * 0.52)} ${f(fringeY - unit * 0.1)} ${f(cx - width * 0.62)} ${f(fringeY - unit * 0.14)}`,
    `Q${f(cx - width * 0.72)} ${f(fringeY + unit * 0.02)} ${f(cx - width * 0.82)} ${f(fringeY + unit * 0.04)}`,
    `Q${f(cx - width * 0.94)} ${f(fringeY + unit * 0.08)} ${f(cx - width)} ${f(crownY + unit * 0.45)}`,
  ];
  return [`M${f(dome[0]!.x)} ${f(dome[0]!.y)}`, curveThrough(dome), ...bangs, "Z"].join("");
}

/** 顔周りの毛束（少女は頬〜顎下を包むふんわりサイドロック、少年は耳が見えるシャープなウルフ束）。 */
export function sideLockPath(
  rig: AvatarRig,
  style: HairStyle,
  side: Side,
): string {
  const { head, unit } = rig;
  const { cx, crownY, halfW } = head;
  const metrics = HAIR_METRICS[style];
  const end = crownY + unit * metrics.lock;
  const outer = halfW * metrics.width * 0.98;
  const isBoyShort = style === "mush" || style === "short";
  if (isBoyShort) {
    const mainLock = tubePath(
      [
        { x: cx + side * outer * 0.8, y: crownY + unit * 0.3, w: unit * 0.082 },
        { x: cx + side * outer * 0.92, y: crownY + unit * 0.52, w: unit * 0.068 },
        { x: cx + side * outer * 0.84, y: end, w: unit * 0.022 },
      ],
      { startCap: "flat", endCap: "round" },
    );
    /* 首元の軽やかな外ハネ後れ毛 */
    const flick = tubePath(
      [
        { x: cx + side * outer * 0.78, y: crownY + unit * 0.68, w: unit * 0.055 },
        { x: cx + side * outer * 0.96, y: crownY + unit * 0.88, w: unit * 0.045 },
        { x: cx + side * outer * 1.12, y: crownY + unit * 1.0, w: unit * 0.018 },
      ],
      { startCap: "flat", endCap: "round" },
    );
    return `${mainLock} ${flick}`;
  }
  const mainLock = tubePath(
    [
      { x: cx + side * outer * 0.82, y: crownY + unit * 0.34, w: unit * 0.1 },
      { x: cx + side * outer * 0.98, y: crownY + unit * 0.64, w: unit * 0.112 },
      {
        x: cx + side * outer * 0.88,
        y: crownY + unit * (metrics.lock * 0.78),
        w: unit * 0.082,
      },
      { x: cx + side * outer * 0.72, y: end, w: unit * 0.026 },
    ],
    { startCap: "flat", endCap: "round" },
  );
  /* ふわふわ鱈メーカー風の繊細な外ハネ後れ毛束 */
  const wispy = tubePath(
    [
      { x: cx + side * outer * 0.9, y: crownY + unit * 0.54, w: unit * 0.05 },
      { x: cx + side * outer * 1.08, y: crownY + unit * 0.82, w: unit * 0.042 },
      { x: cx + side * outer * 1.02, y: crownY + unit * 1.06, w: unit * 0.016 },
    ],
    { startCap: "flat", endCap: "round" },
  );
  return `${mainLock} ${wispy}`;
}

/**
 * ふわふわ鱈メーカー × COEIROINK風の無彩色ヘアピン／イヤーカフ装飾。
 * 少女にはこめかみの2本ヘアピン、少年には片耳のミニマルなイヤーカフを添える。
 */
export function hairAccessoryPaths(rig: AvatarRig): string[] {
  const { head, unit, gender } = rig;
  const { cx, crownY, halfW, earDX, earY } = head;
  if (gender === "boy") {
    const ex = cx + earDX * 0.98;
    const ey = earY - unit * 0.02;
    return [
      `M${f(ex - unit * 0.025)} ${f(ey - unit * 0.015)}L${f(ex + unit * 0.045)} ${f(ey - unit * 0.03)}`,
      `M${f(ex - unit * 0.02)} ${f(ey + unit * 0.025)}L${f(ex + unit * 0.042)} ${f(ey + unit * 0.015)}`,
    ];
  }
  const px = cx - halfW * 0.68;
  const py = crownY + unit * 0.34;
  return [
    `M${f(px - unit * 0.09)} ${f(py - unit * 0.015)}L${f(px + unit * 0.06)} ${f(py + unit * 0.025)}`,
    `M${f(px - unit * 0.085)} ${f(py + unit * 0.03)}L${f(px + unit * 0.065)} ${f(py - unit * 0.01)}`,
  ];
}

/** ツインテール／ポニーテールの毛束。中心線＋幅の Tube なので頭身に追従する。 */
export function tailPath(
  rig: AvatarRig,
  style: HairStyle,
  side: Side,
): string {
  const { head, unit } = rig;
  const { cx, crownY, halfW } = head;
  if (style !== "twin" && style !== "pony") return "";
  const nodes: ChainNode[] =
    style === "twin"
      ? [
          { x: cx + side * halfW * 0.82, y: crownY + unit * 0.34, w: unit * 0.13 },
          { x: cx + side * halfW * 1.32, y: crownY + unit * 0.76, w: unit * 0.2 },
          { x: cx + side * halfW * 1.46, y: crownY + unit * 1.42, w: unit * 0.185 },
          { x: cx + side * halfW * 1.26, y: crownY + unit * 2.02, w: unit * 0.12 },
          { x: cx + side * halfW * 1.02, y: crownY + unit * 2.44, w: unit * 0.04 },
        ]
      : [
          { x: cx + side * halfW * 0.5, y: crownY + unit * 0.14, w: unit * 0.12 },
          { x: cx + side * halfW * 1.06, y: crownY + unit * 0.5, w: unit * 0.19 },
          { x: cx + side * halfW * 1.2, y: crownY + unit * 1.12, w: unit * 0.175 },
          { x: cx + side * halfW * 0.96, y: crownY + unit * 1.76, w: unit * 0.11 },
          { x: cx + side * halfW * 0.72, y: crownY + unit * 2.24, w: unit * 0.04 },
        ];
  return tubePath(nodes, { startCap: "round", endCap: "round" });
}

/** 髪留め（ゴムの結び目）。 */
export function hairTiePath(
  rig: AvatarRig,
  style: HairStyle,
  side: Side,
): string {
  const { head, unit } = rig;
  const { cx, crownY, halfW } = head;
  if (style === "twin")
    return tubePath(
      [
        {
          x: cx + side * halfW * 0.94,
          y: crownY + unit * 0.44,
          w: unit * 0.055,
        },
        {
          x: cx + side * halfW * 1.14,
          y: crownY + unit * 0.56,
          w: unit * 0.055,
        },
      ],
      { startCap: "round", endCap: "round" },
    );
  if (style === "pony")
    return tubePath(
      [
        { x: cx + side * halfW * 0.66, y: crownY + unit * 0.24, w: unit * 0.05 },
        { x: cx + side * halfW * 0.86, y: crownY + unit * 0.36, w: unit * 0.05 },
      ],
      { startCap: "round", endCap: "round" },
    );
  return "";
}

/** アホゲ。頭頂から1本。 */
export function ahogePath(rig: AvatarRig): string {
  const { head, unit } = rig;
  const { cx, crownY } = head;
  const baseX = cx - unit * 0.04;
  const baseY = crownY - unit * 0.08;
  return `M${f(baseX)} ${f(baseY)}C${f(baseX - unit * 0.06)} ${f(
    baseY - unit * 0.16,
  )} ${f(baseX + unit * 0.1)} ${f(baseY - unit * 0.24)} ${f(
    baseX + unit * 0.16,
  )} ${f(baseY - unit * 0.12)}`;
}

/** 髪のツヤ（天使の輪）と毛束の分け目線。 */
export function hairDetailPaths(rig: AvatarRig, style: HairStyle): string[] {
  const { head, unit } = rig;
  const { cx, crownY, halfW } = head;
  const metrics = HAIR_METRICS[style];
  const width = halfW * metrics.width;
  const paths = [
    /* 頭の丸みに沿ったツヤ */
    `M${f(cx - width * 0.62)} ${f(crownY + unit * 0.2)}Q${f(cx)} ${f(
      crownY - unit * 0.02,
    )} ${f(cx + width * 0.62)} ${f(crownY + unit * 0.2)}`,
    /* 分け目 */
    `M${f(cx - unit * 0.02)} ${f(crownY - unit * 0.1)}Q${f(cx - unit * 0.08)} ${f(
      crownY + unit * 0.16,
    )} ${f(cx - width * 0.3)} ${f(crownY + unit * 0.34)}`,
  ];
  if (metrics.back > 1.6)
    paths.push(
      `M${f(cx - width * 0.66)} ${f(crownY + unit * 1.1)}Q${f(
        cx - width * 0.5,
      )} ${f(crownY + unit * 2)} ${f(cx - width * 0.6)} ${f(
        crownY + unit * metrics.back - unit * 0.2,
      )}`,
      `M${f(cx + width * 0.66)} ${f(crownY + unit * 1.1)}Q${f(
        cx + width * 0.5,
      )} ${f(crownY + unit * 2)} ${f(cx + width * 0.6)} ${f(
        crownY + unit * metrics.back - unit * 0.2,
      )}`,
    );
  return paths;
}
