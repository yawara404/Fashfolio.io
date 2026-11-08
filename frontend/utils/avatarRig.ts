/**
 * 2Dアバターの骨格リグ。
 *
 * 旧実装は「肩・腰・股・膝が固定の頭身単位、足首だけ heads 依存」だったため、
 * 頭身を上げるとスネだけが伸びる壊れ方をしていた。ここでは全身を
 *   頭 / 首 / 胴 / 太もも / ふくらはぎ / 足
 * の6セグメントに分解し、頭身テーブルを補間したあと
 *   合計 === heads
 * になるよう必ず正規化する。これで足裏は常に同じ接地線に乗り、
 * 膝・腰・肩・腕も同じ比率で連動する。
 *
 * 腕と脚は角度ベースのFK（DragonBones / Spine 系のボーン階層と同じ考え方）で
 * 計算するので、ポーズを増やしても形状が破綻しない。
 * パーツの合成順は DiceBear の group / component / layer、
 * UIのパーツ選択は Picrew のレイヤー・パーツ・色変更モデルに倣っている。
 */
import type { BodyType, MannequinGender, PoseId } from "~/types/avatar";

/* ------------------------------------------------------------ primitive */

export type Side = -1 | 1;
export type LimbKey = "left" | "right";
/** left = 画面左（キャラクターの右手） */
export const LIMB_KEYS: readonly LimbKey[] = ["left", "right"];
export const LIMB_SIDE: Record<LimbKey, Side> = { left: -1, right: 1 };

export interface RigPoint {
  x: number;
  y: number;
}
export interface RigBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const HEAD_MIN = 4;
export const HEAD_MAX = 10;
export const STAGE_WIDTH = 480;
export const STAGE_HEIGHT = 760;
export const FIGURE_TOP = 46;
export const FIGURE_BOTTOM = 714;
export const FIGURE_CX = 240;
const SIDE_MARGIN = 14;
/** 髪など、頭頂より上にはみ出す余白（頭身単位） */
const HAIR_ALLOWANCE = 0.16;

export function clampHeads(value: number) {
  if (!Number.isFinite(value)) return 5;
  return Math.min(HEAD_MAX, Math.max(HEAD_MIN, Math.round(value * 10) / 10));
}

/* ------------------------------------------------------- proportion table */

interface SegmentRow {
  heads: number;
  /** あご→肩 */
  neck: number;
  /** 肩→股 */
  torso: number;
  /** 股→膝 */
  thigh: number;
  /** 膝→足首 */
  shin: number;
  /** 足首→接地 */
  foot: number;
}

/**
 * 各行の合計は heads - 1（頭を除いた胴・脚の頭身数）。
 * 4〜10頭身を直線補間し、buildRig 内で合計を heads - 1 に正規化する。
 */
const SEGMENTS: SegmentRow[] = [
  { heads: 4, neck: 0.22, torso: 1.06, thigh: 0.86, shin: 0.72, foot: 0.14 },
  { heads: 5, neck: 0.28, torso: 1.36, thigh: 1.16, shin: 1.0, foot: 0.2 },
  { heads: 6, neck: 0.32, torso: 1.6, thigh: 1.5, shin: 1.36, foot: 0.22 },
  { heads: 7, neck: 0.38, torso: 1.84, thigh: 1.82, shin: 1.72, foot: 0.24 },
  { heads: 8, neck: 0.42, torso: 2.06, thigh: 2.14, shin: 2.1, foot: 0.28 },
  { heads: 9, neck: 0.46, torso: 2.28, thigh: 2.5, shin: 2.42, foot: 0.34 },
  { heads: 10, neck: 0.5, torso: 2.48, thigh: 2.88, shin: 2.72, foot: 0.42 },
];

type Row = { heads: number } & Record<string, number>;

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

/** 頭身テーブルを直線補間する（4.5頭身のような小数にも対応）。 */
function sampleRow<T extends { heads: number }>(table: T[], heads: number): T {
  const first = table[0];
  const last = table[table.length - 1];
  if (!first || !last) throw new Error("The proportion table must not be empty.");
  const clamped = Math.min(last.heads, Math.max(first.heads, heads));
  let lower = first;
  let upper = last;
  for (let index = 0; index < table.length - 1; index++) {
    const a = table[index]!;
    const b = table[index + 1]!;
    if (clamped >= a.heads && clamped <= b.heads) {
      lower = a;
      upper = b;
      break;
    }
  }
  const span = upper.heads - lower.heads || 1;
  const t = (clamped - lower.heads) / span;
  const lowerRecord = lower as Record<string, number>;
  const upperRecord = upper as Record<string, number>;
  const out: Record<string, number> = { heads: clamped };
  for (const key of Object.keys(lowerRecord)) {
    if (key === "heads") continue;
    out[key] = lerp(lowerRecord[key]!, upperRecord[key]!, t);
  }
  return out as T;
}


/* ---------------------------------------------------------- width table */

/**
 * 幅はすべて「1頭身 = unit px」に対する倍率。頭身が上がるほど相対的に細くなる。
 * 列順: headHalfW, shoulderHalfW, chestHalfW, waistHalfW, hipHalfW, neckHalfW,
 *       thighHalfW, kneeHalfW, ankleHalfW, upperArmHalfW, elbowHalfW, wristHalfW,
 *       handLen, footHalfW, footLen, legSpread, shoulderDrop
 */
const WIDTH_KEYS = [
  "headHalfW",
  "shoulderHalfW",
  "chestHalfW",
  "waistHalfW",
  "hipHalfW",
  "neckHalfW",
  "thighHalfW",
  "kneeHalfW",
  "ankleHalfW",
  "upperArmHalfW",
  "elbowHalfW",
  "wristHalfW",
  "handLen",
  "footHalfW",
  "footLen",
  "legSpread",
  "shoulderDrop",
] as const;
type WidthKey = (typeof WIDTH_KEYS)[number];
type WidthRow = { heads: number } & Record<WidthKey, number>;

const WIDTH_DATA: number[][] = [
  [4, 0.45, 0.48, 0.41, 0.34, 0.42, 0.125, 0.195, 0.14, 0.086, 0.108, 0.09, 0.072, 0.27, 0.12, 0.28, 0.52, 0.055],
  [5, 0.43, 0.5, 0.42, 0.345, 0.425, 0.12, 0.182, 0.132, 0.08, 0.102, 0.085, 0.068, 0.28, 0.116, 0.3, 0.52, 0.055],
  [6, 0.41, 0.52, 0.43, 0.345, 0.425, 0.116, 0.172, 0.125, 0.075, 0.096, 0.08, 0.064, 0.295, 0.112, 0.315, 0.51, 0.058],
  [7, 0.39, 0.535, 0.435, 0.34, 0.42, 0.112, 0.164, 0.118, 0.07, 0.09, 0.076, 0.06, 0.31, 0.108, 0.33, 0.5, 0.06],
  [8, 0.38, 0.545, 0.43, 0.33, 0.41, 0.108, 0.156, 0.112, 0.066, 0.085, 0.072, 0.057, 0.32, 0.104, 0.345, 0.5, 0.06],
  [9, 0.365, 0.555, 0.425, 0.32, 0.4, 0.104, 0.148, 0.106, 0.062, 0.08, 0.068, 0.054, 0.33, 0.1, 0.36, 0.49, 0.062],
  [10, 0.355, 0.56, 0.42, 0.31, 0.39, 0.1, 0.142, 0.102, 0.058, 0.076, 0.064, 0.051, 0.34, 0.096, 0.37, 0.49, 0.062],
];

const WIDTHS: WidthRow[] = WIDTH_DATA.map((row) => {
  if (row.length !== WIDTH_KEYS.length + 1) throw new Error("Invalid proportion width row.");
  const out: Record<string, number> = { heads: row[0]! };
  WIDTH_KEYS.forEach((key, index) => {
    out[key] = row[index + 1]!;
  });
  return out as WidthRow;
});

/** 体型は幅の倍率だけを変える。関節位置は変えないので服の座標は壊れない。 */
export const BODY_MULTIPLIERS: Record<
  BodyType,
  { torso: number; limb: number }
> = {
  soft: { torso: 1, limb: 1 },
  slim: { torso: 0.9, limb: 0.88 },
  round: { torso: 1.14, limb: 1.1 },
};

/* ----------------------------------------------------------------- poses */

export interface LimbAngles {
  /** 0 = 真下。正の値 = 体の外側へ開く（度） */
  root: number;
  mid: number;
}
export interface PoseDefinition {
  id: PoseId;
  name: string;
  en: string;
  caption: string;
  /** true のとき腕を胴体の後ろに描く（後ろ手） */
  behindBack: boolean;
  arms: Record<LimbKey, LimbAngles>;
  legs: Record<LimbKey, LimbAngles>;
}

export const POSES: PoseDefinition[] = [
  {
    id: "relax",
    name: "だらん",
    en: "RELAXED",
    caption: "力の抜けた立ち姿。つくみず作品の既定ポーズ",
    behindBack: false,
    arms: { left: { root: 7, mid: 6 }, right: { root: 9, mid: 7 } },
    legs: { left: { root: 1.5, mid: 0.5 }, right: { root: 4, mid: 2 } },
  },
  {
    id: "wave",
    name: "手を振る",
    en: "WAVING",
    caption: "片手を上げて振る",
    behindBack: false,
    arms: { left: { root: 8, mid: 6 }, right: { root: 132, mid: 156 } },
    legs: { left: { root: 1.5, mid: 0.5 }, right: { root: 4, mid: 2 } },
  },
  {
    id: "cheer",
    name: "ばんざい",
    en: "CHEER",
    caption: "両手を上げる。袖と裾の落ち方が確認しやすい",
    behindBack: false,
    arms: { left: { root: 146, mid: 162 }, right: { root: 146, mid: 162 } },
    legs: { left: { root: 3, mid: 1 }, right: { root: 5, mid: 2 } },
  },
  {
    id: "pocket",
    name: "ポケット",
    en: "POCKETS",
    caption: "両手を腰の位置に。アウターの silhouette 確認用",
    behindBack: false,
    arms: { left: { root: 16, mid: -26 }, right: { root: 16, mid: -26 } },
    legs: { left: { root: 2, mid: 1 }, right: { root: 5, mid: 2.5 } },
  },
  {
    id: "behind",
    name: "後ろ手",
    en: "HANDS BEHIND",
    caption: "腕を体の後ろで組む。トップスの形が見やすい",
    behindBack: true,
    arms: { left: { root: -18, mid: -34 }, right: { root: -18, mid: -34 } },
    legs: { left: { root: 2, mid: 1 }, right: { root: 4, mid: 2 } },
  },
];

export function resolvePose(pose?: PoseId): PoseDefinition {
  return POSES.find((item) => item.id === pose) ?? POSES[0]!;
}

/* ------------------------------------------------------------------- rig */

export interface LimbRig {
  key: LimbKey;
  side: Side;
  /** 肩 / 股 */
  root: RigPoint;
  /** 肘 / 膝 */
  mid: RigPoint;
  /** 手首 / 足首 */
  end: RigPoint;
  rootW: number;
  midW: number;
  endW: number;
  /** ボーン長（px） */
  upper: number;
  lower: number;
}

export interface HandRig {
  key: LimbKey;
  side: Side;
  wrist: RigPoint;
  tip: RigPoint;
  halfW: number;
  length: number;
  /** 前腕の向き（度。0 = 真下） */
  angle: number;
}

export interface FootRig {
  key: LimbKey;
  side: Side;
  ankle: RigPoint;
  toe: RigPoint;
  halfW: number;
  length: number;
  groundY: number;
}

export interface HeadRig {
  cx: number;
  crownY: number;
  chinY: number;
  cy: number;
  halfW: number;
  halfH: number;
  /** あご幅（halfW 比） */
  jawW: number;
  eyeY: number;
  browY: number;
  mouthY: number;
  blushY: number;
  eyeDX: number;
  eyeHalfW: number;
  eyeHalfH: number;
  mouthHalfW: number;
  blushDX: number;
  earY: number;
  earDX: number;
  /** 髪を描き始める位置（頭頂より少し上） */
  hairTopY: number;
}

export interface TorsoRig {
  shoulderY: number;
  chestY: number;
  waistY: number;
  hipY: number;
  crotchY: number;
  shoulderHalfW: number;
  chestHalfW: number;
  waistHalfW: number;
  hipHalfW: number;
  neckHalfW: number;
  neckTopY: number;
  shoulderDrop: number;
}

export interface AvatarRig {
  heads: number;
  gender: MannequinGender;
  /** 1頭身のpx */
  unit: number;
  cx: number;
  crownY: number;
  groundY: number;
  height: number;
  body: BodyType;
  pose: PoseDefinition;
  lineWidth: number;
  lineWidthThin: number;
  lineWidthBold: number;
  head: HeadRig;
  torso: TorsoRig;
  arms: Record<LimbKey, LimbRig>;
  legs: Record<LimbKey, LimbRig>;
  hands: Record<LimbKey, HandRig>;
  feet: Record<LimbKey, FootRig>;
  /** セグメント長（px）。テストとガイド表示に使う。 */
  segments: {
    head: number;
    neck: number;
    torso: number;
    thigh: number;
    shin: number;
    foot: number;
  };
}

export interface RigOptions {
  heads?: number;
  gender?: MannequinGender;
  body?: BodyType;
  pose?: PoseId;
  cx?: number;
  top?: number;
  bottom?: number;
}

const DEG = Math.PI / 180;

/** 角度（0 = 真下、+ = 外側）から単位ベクトルを作る。 */
function direction(side: Side, angle: number): RigPoint {
  const rad = angle * DEG;
  return { x: side * Math.sin(rad), y: Math.cos(rad) };
}

/**
 * 頭身・体型・ポーズから全身の関節座標を作る。
 * すべての長さは「頭身単位 → px」の2段階で決まるので、
 * 頭身を変えてもセグメント同士の比率が崩れない。
 */
export function buildRig(options: RigOptions = {}): AvatarRig {
  const heads = clampHeads(options.heads ?? 5);
  const gender: MannequinGender = options.gender === "boy" ? "boy" : "girl";
  const body = options.body ?? "soft";
  const pose = resolvePose(options.pose);
  const cx = options.cx ?? FIGURE_CX;
  const top = options.top ?? FIGURE_TOP;
  const bottom = options.bottom ?? FIGURE_BOTTOM;
  const span = Math.max(1, bottom - top);

  const segRow = sampleRow(SEGMENTS, heads);
  const rawSum =
    segRow.neck + segRow.torso + segRow.thigh + segRow.shin + segRow.foot;
  /* 合計を heads - 1 に正規化。これで足裏が必ず接地線（crownY + heads*unit）に乗る。 */
  const norm = rawSum > 0 ? (heads - 1) / rawSum : 1;
  const seg = {
    head: 1,
    neck: segRow.neck * norm,
    torso: segRow.torso * norm,
    thigh: segRow.thigh * norm,
    shin: segRow.shin * norm,
    foot: segRow.foot * norm,
  };

  const widthRow = sampleRow(WIDTHS, heads);
  const mul = BODY_MULTIPLIERS[body];
  /* 少女（ナコ・レコ風）は華奢な肩・くびれ・柔らかな腰、少年（カナタ風）は少し広めの肩・直線的な胴・すっきりした腰 */
  const genderMul =
    gender === "boy"
      ? {
          head: 0.99,
          shoulder: 1.1,
          chest: 1.04,
          waist: 1.09,
          hip: 0.91,
          neck: 1.1,
          limb: 1.05,
          shoulderDrop: 0.8,
        }
      : {
          head: 1.0,
          shoulder: 0.96,
          chest: 0.98,
          waist: 0.93,
          hip: 1.03,
          neck: 0.94,
          limb: 0.98,
          shoulderDrop: 1.08,
        };
  const w = {
    headHalfW: widthRow.headHalfW * genderMul.head,
    shoulderHalfW: widthRow.shoulderHalfW * mul.torso * genderMul.shoulder,
    chestHalfW: widthRow.chestHalfW * mul.torso * genderMul.chest,
    waistHalfW: widthRow.waistHalfW * mul.torso * genderMul.waist,
    hipHalfW: widthRow.hipHalfW * mul.torso * genderMul.hip,
    neckHalfW: widthRow.neckHalfW * mul.torso * genderMul.neck,
    thighHalfW: widthRow.thighHalfW * mul.limb * genderMul.limb,
    kneeHalfW: widthRow.kneeHalfW * mul.limb * genderMul.limb,
    ankleHalfW: widthRow.ankleHalfW * mul.limb * genderMul.limb,
    upperArmHalfW: widthRow.upperArmHalfW * mul.limb * genderMul.limb,
    elbowHalfW: widthRow.elbowHalfW * mul.limb * genderMul.limb,
    wristHalfW: widthRow.wristHalfW * mul.limb * genderMul.limb,
    handLen: widthRow.handLen * mul.limb,
    footHalfW: widthRow.footHalfW * mul.limb * genderMul.limb,
    footLen: widthRow.footLen,
    legSpread: widthRow.legSpread,
    shoulderDrop: widthRow.shoulderDrop * genderMul.shoulderDrop,
  };

  /* ---- 頭身単位（k空間）で関節を組む。頭頂 = 0、接地 = heads ---- */
  const k = {
    crown: 0,
    chin: 1,
    shoulder: 1 + seg.neck,
    chest: 1 + seg.neck + seg.torso * 0.34,
    waist: 1 + seg.neck + seg.torso * 0.64,
    crotch: 1 + seg.neck + seg.torso,
    knee: 1 + seg.neck + seg.torso + seg.thigh,
    ankle: 1 + seg.neck + seg.torso + seg.thigh + seg.shin,
    ground: 1 + seg.neck + seg.torso + seg.thigh + seg.shin + seg.foot,
  };
  const shoulderJointY = k.shoulder + w.shoulderDrop;
  /* 手首は太ももの中間あたり。腕の長さをここから逆算するので頭身に追従する。 */
  const armLength = Math.max(
    0.6,
    k.crotch + seg.thigh * 0.45 - shoulderJointY,
  );
  const upperArm = armLength * 0.55;
  const foreArm = armLength * 0.45;
  const legSpreadX = w.hipHalfW * w.legSpread;

  const kArms = {} as Record<LimbKey, { mid: RigPoint; end: RigPoint }>;
  const kLegs = {} as Record<LimbKey, { mid: RigPoint; end: RigPoint }>;
  const bounds: RigPoint[] = [];
  for (const key of LIMB_KEYS) {
    const side = LIMB_SIDE[key];
    const armAngles = pose.arms[key];
    const shoulder = { x: side * w.shoulderHalfW * 0.88, y: shoulderJointY };
    const armUp = direction(side, armAngles.root);
    const armMid = {
      x: shoulder.x + armUp.x * upperArm,
      y: shoulder.y + armUp.y * upperArm,
    };
    const armFore = direction(side, armAngles.mid);
    const armEnd = {
      x: armMid.x + armFore.x * foreArm,
      y: armMid.y + armFore.y * foreArm,
    };
    kArms[key] = { mid: armMid, end: armEnd };
    bounds.push(shoulder, armMid, armEnd, {
      x: armEnd.x + armFore.x * w.handLen,
      y: armEnd.y + armFore.y * w.handLen,
    });

    const legAngles = pose.legs[key];
    const hip = { x: side * legSpreadX, y: k.crotch - 0.02 };
    const thighDir = direction(side, legAngles.root);
    const legMid = {
      x: hip.x + thighDir.x * seg.thigh,
      y: hip.y + thighDir.y * seg.thigh,
    };
    const shinDir = direction(side, legAngles.mid);
    const legEnd = {
      x: legMid.x + shinDir.x * seg.shin,
      y: legMid.y + shinDir.y * seg.shin,
    };
    kLegs[key] = { mid: legMid, end: legEnd };
    bounds.push(hip, legMid, legEnd, {
      x: legEnd.x + side * w.footLen * 0.3,
      y: legEnd.y,
    });
  }
  /* ---- 自動フレーミング。上げた腕や髪が画面外に出ないように unit を決める ---- */
  let kTop = -HAIR_ALLOWANCE;
  let kSide = w.headHalfW * 1.95;
  let kBottom = k.ground;
  for (const point of bounds) {
    kTop = Math.min(kTop, point.y);
    kSide = Math.max(kSide, Math.abs(point.x) + w.wristHalfW * 2);
    kBottom = Math.max(kBottom, point.y);
  }
  const unit = Math.min(
    span / (kBottom - kTop),
    (STAGE_WIDTH - SIDE_MARGIN * 2) / (kSide * 2),
  );
  const crownY = top - kTop * unit;
  const px = (point: RigPoint): RigPoint => ({
    x: cx + point.x * unit,
    y: crownY + point.y * unit,
  });

  const chinY = crownY + k.chin * unit;
  const headHalfW = w.headHalfW * unit;
  const head: HeadRig = {
    cx,
    crownY,
    chinY,
    cy: crownY + unit * 0.5,
    halfW: headHalfW,
    halfH: unit * 0.5,
    jawW: headHalfW * (gender === "boy" ? 0.65 : 0.63),
    eyeY: crownY + unit * (gender === "boy" ? 0.575 : 0.585),
    browY: crownY + unit * (gender === "boy" ? 0.445 : 0.455),
    mouthY: crownY + unit * 0.815,
    blushY: crownY + unit * 0.695,
    eyeDX: headHalfW * 0.43,
    eyeHalfW: headHalfW * (gender === "boy" ? 0.195 : 0.21),
    eyeHalfH: headHalfW * (gender === "boy" ? 0.165 : 0.195),
    mouthHalfW: headHalfW * 0.12,
    blushDX: headHalfW * 0.58,
    earY: crownY + unit * 0.59,
    earDX: headHalfW * 0.96,
    hairTopY: crownY - unit * 0.11,
  };

  const torso: TorsoRig = {
    shoulderY: crownY + k.shoulder * unit,
    chestY: crownY + k.chest * unit,
    waistY: crownY + k.waist * unit,
    hipY: crownY + (k.crotch - 0.05) * unit,
    crotchY: crownY + k.crotch * unit,
    shoulderHalfW: w.shoulderHalfW * unit,
    chestHalfW: w.chestHalfW * unit,
    waistHalfW: w.waistHalfW * unit,
    hipHalfW: w.hipHalfW * unit,
    neckHalfW: w.neckHalfW * unit,
    neckTopY: chinY - unit * 0.08,
    shoulderDrop: w.shoulderDrop * unit,
  };
  const arms = {} as Record<LimbKey, LimbRig>;
  const hands = {} as Record<LimbKey, HandRig>;
  const legs = {} as Record<LimbKey, LimbRig>;
  const feet = {} as Record<LimbKey, FootRig>;
  const groundY = crownY + k.ground * unit;
  for (const key of LIMB_KEYS) {
    const side = LIMB_SIDE[key];
    const arm = kArms[key];
    arms[key] = {
      key,
      side,
      root: px({ x: side * w.shoulderHalfW * 0.88, y: shoulderJointY }),
      mid: px(arm.mid),
      end: px(arm.end),
      rootW: w.upperArmHalfW * unit,
      midW: w.elbowHalfW * unit,
      endW: w.wristHalfW * unit,
      upper: upperArm * unit,
      lower: foreArm * unit,
    };
    const foreAngle = pose.arms[key].mid;
    const foreDir = direction(side, foreAngle);
    hands[key] = {
      key,
      side,
      wrist: px(arm.end),
      tip: px({
        x: arm.end.x + foreDir.x * w.handLen,
        y: arm.end.y + foreDir.y * w.handLen,
      }),
      halfW: w.wristHalfW * unit * 1.18,
      length: w.handLen * unit,
      angle: foreAngle,
    };
    const leg = kLegs[key];
    legs[key] = {
      key,
      side,
      root: px({ x: side * legSpreadX, y: k.crotch - 0.02 }),
      mid: px(leg.mid),
      end: px(leg.end),
      rootW: w.thighHalfW * unit,
      midW: w.kneeHalfW * unit,
      endW: w.ankleHalfW * unit,
      upper: seg.thigh * unit,
      lower: seg.shin * unit,
    };
    const ankle = px(leg.end);
    feet[key] = {
      key,
      side,
      ankle,
      toe: { x: ankle.x + side * w.footLen * unit * 0.28, y: groundY },
      halfW: w.footHalfW * unit,
      length: w.footLen * unit,
      groundY,
    };
  }

  const lineWidth = Math.min(3, Math.max(1.4, unit * 0.019));
  return {
    heads,
    gender,
    unit,
    cx,
    crownY,
    groundY,
    height: (kBottom - kTop) * unit,
    body,
    pose,
    lineWidth,
    lineWidthThin: lineWidth * 0.68,
    lineWidthBold: lineWidth * 1.55,
    head,
    torso,
    arms,
    legs,
    hands,
    feet,
    segments: {
      head: unit,
      neck: seg.neck * unit,
      torso: seg.torso * unit,
      thigh: seg.thigh * unit,
      shin: seg.shin * unit,
      foot: seg.foot * unit,
    },
  };
}

function limbBox(limb: LimbRig): RigBox {
  const xs = [limb.root.x, limb.mid.x, limb.end.x];
  const ys = [limb.root.y, limb.mid.y, limb.end.y];
  const minX = Math.min(...xs) - limb.rootW;
  const maxX = Math.max(...xs) + limb.rootW;
  const minY = Math.min(...ys) - limb.rootW;
  const maxY = Math.max(...ys) + limb.endW;
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

function jointBox(point: RigPoint, halfW: number, length: number): RigBox {
  return {
    x: point.x - halfW,
    y: point.y - halfW,
    width: halfW * 2,
    height: length + halfW * 2,
  };
}

/** ラスター衣装（生成PNG・SVGパーツ）を置くための基準ボックス。 */
export function rigBoxes(rig: AvatarRig) {
  const { head, torso, unit } = rig;
  const footBox = (key: LimbKey): RigBox => {
    const foot = rig.feet[key];
    const minX = Math.min(foot.ankle.x, foot.toe.x) - foot.halfW;
    const maxX = Math.max(foot.ankle.x, foot.toe.x) + foot.halfW;
    return {
      x: minX,
      y: foot.ankle.y - foot.halfW * 0.3,
      width: maxX - minX,
      height: foot.groundY - foot.ankle.y + foot.halfW * 0.3,
    };
  };
  return {
    head: {
      x: head.cx - head.halfW,
      y: head.crownY,
      width: head.halfW * 2,
      height: head.halfH * 2,
    } as RigBox,
    hat: {
      x: head.cx - head.halfW * 1.14,
      y: head.crownY - unit * 0.24,
      width: head.halfW * 2.28,
      height: unit * 0.74,
    } as RigBox,
    glasses: {
      x: head.cx - head.halfW * 0.98,
      y: head.eyeY - unit * 0.11,
      width: head.halfW * 1.96,
      height: unit * 0.27,
    } as RigBox,
    torso: {
      x: rig.cx - torso.shoulderHalfW,
      y: torso.shoulderY,
      width: torso.shoulderHalfW * 2,
      height: torso.crotchY - torso.shoulderY,
    } as RigBox,
    hips: {
      x: rig.cx - torso.hipHalfW,
      y: torso.waistY,
      width: torso.hipHalfW * 2,
      height: torso.crotchY - torso.waistY,
    } as RigBox,
    arms: { left: limbBox(rig.arms.left), right: limbBox(rig.arms.right) },
    legs: { left: limbBox(rig.legs.left), right: limbBox(rig.legs.right) },
    hands: {
      left: jointBox(
        rig.hands.left.wrist,
        rig.hands.left.halfW,
        rig.hands.left.length,
      ),
      right: jointBox(
        rig.hands.right.wrist,
        rig.hands.right.halfW,
        rig.hands.right.length,
      ),
    },
    feet: { left: footBox("left"), right: footBox("right") },
    /** 手提げは右手首から下げる */
    bag: {
      x: rig.hands.right.wrist.x - unit * 0.12,
      y: rig.hands.right.wrist.y - unit * 0.08,
      width: unit * 0.92,
      height: unit * 1.02,
    } as RigBox,
  };
}
