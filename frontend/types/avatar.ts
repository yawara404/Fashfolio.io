export type MannequinGender = "girl" | "boy";
export type HairStyle = "bob" | "long" | "twin" | "pony" | "short" | "mush";
/** 目の形。つくみず作品のじと目を中心に、丸目・つり目・にっこり・うつろを用意する。 */
export type EyeShape = "jito" | "maru" | "tsuri" | "nico" | "utsuro";
export type BrowShape = "soft" | "flat" | "slant" | "sharp";
export type MouthShape = "line" | "smile" | "open" | "dot" | "cat";
/** 頬の表現。斜線（hatch）がつくみず作品でよく使われる記号。 */
export type BlushStyle = "none" | "hatch" | "oval" | "line";
/** 体型。幅の倍率だけを変え、骨格の関節位置は変えない。 */
export type BodyType = "soft" | "slim" | "round";
/** ポーズ。腕・脚のボーン角度プリセット。 */
export type PoseId = "relax" | "wave" | "cheer" | "pocket" | "behind";

export type WinkSide = "none" | "left" | "right";

export interface AvatarConfig {
  preset: string;
  gender?: MannequinGender;
  hair: HairStyle;
  hairColor: string;
  skin: string;
  /** 瞳の色 */
  eye: string;
  eyeShape: EyeShape;
  browShape: BrowShape;
  mouthShape: MouthShape;
  blush: BlushStyle;
  body: BodyType;
  pose: PoseId;
  /** ウインクで閉じる目。none のときは両目同じ形。 */
  winkSide: WinkSide;
}

export interface AvatarPreset {
  id: string;
  name: string;
  name_en: string;
  caption: string;
  config: AvatarConfig;
}

/** 表情プリセット。目・眉・口のパーツを組み合わせたもの（Picrewの「表情」相当）。 */
export interface FacePreset {
  id: string;
  name: string;
  en: string;
  eyeShape: EyeShape;
  browShape: BrowShape;
  mouthShape: MouthShape;
  blush: BlushStyle;
}

/** パーツ選択肢の共通形。Picrewのレイヤー／パーツ選択UIにそのまま流し込む。 */
export interface PartOption<T extends string = string> {
  id: T;
  name: string;
  en: string;
  caption?: string;
}

export interface IllustrationBackdrop {
  id: string;
  name: string;
  base: string;
  accent: string;
  ink: string;
  motif: "sparkle" | "halo" | "ribbon" | "grid";
}
