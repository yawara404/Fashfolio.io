import type {
  AvatarConfig,
  AvatarPreset,
  BodyType,
  BlushStyle,
  BrowShape,
  EyeShape,
  FacePreset,
  HairStyle,
  IllustrationBackdrop,
  MannequinGender,
  MouthShape,
  PartOption,
  PoseId,
  WinkSide,
} from "~/types/avatar";

export const mannequinTypes: {
  id: MannequinGender;
  name: string;
  en: string;
  caption: string;
  config: AvatarConfig;
}[] = [
  {
    id: "girl",
    name: "少女",
    en: "GIRL",
    caption: "丸い頬とふんわりしたサイドの毛束",
    config: {
      preset: "girl",
      gender: "girl",
      hair: "bob",
      hairColor: "#E2E4EE",
      skin: "#FFFFFF",
      eye: "#353140",
      eyeShape: "jito",
      browShape: "soft",
      mouthShape: "smile",
      blush: "hatch",
      body: "soft",
      pose: "relax",
      winkSide: "none",
    },
  },
  {
    id: "boy",
    name: "少年",
    en: "BOY",
    caption: "やわらかな無造作ショートと控えめな眉",
    config: {
      preset: "boy",
      gender: "boy",
      hair: "short",
      hairColor: "#E2E4EE",
      skin: "#FFFFFF",
      eye: "#353140",
      eyeShape: "jito",
      browShape: "soft",
      mouthShape: "smile",
      blush: "hatch",
      body: "soft",
      pose: "relax",
      winkSide: "none",
    },
  },
];

export const hairStyles: { id: HairStyle; name: string; en: string }[] = [
  { id: "bob", name: "ボブ", en: "BOB" },
  { id: "long", name: "ロング", en: "LONG" },
  { id: "twin", name: "ツインテール", en: "TWIN" },
  { id: "pony", name: "ポニーテール", en: "PONY" },
  { id: "short", name: "ショート", en: "SHORT" },
  { id: "mush", name: "マッシュ", en: "MUSH" },
];

export const eyeStyles: PartOption<EyeShape>[] = [
  { id: "jito", name: "じと目", en: "JITO" },
  { id: "maru", name: "まる目", en: "MARU" },
  { id: "tsuri", name: "つり目", en: "TSURI" },
  { id: "nico", name: "にっこり", en: "NICO" },
  { id: "utsuro", name: "うつろ", en: "UTSURO" },
];

export const browStyles: PartOption<BrowShape>[] = [
  { id: "soft", name: "やわらか", en: "SOFT" },
  { id: "flat", name: "まっすぐ", en: "FLAT" },
  { id: "slant", name: "ハの字", en: "SLANT" },
  { id: "sharp", name: "つり上げ", en: "SHARP" },
];

export const mouthStyles: PartOption<MouthShape>[] = [
  { id: "line", name: "への字", en: "LINE" },
  { id: "smile", name: "にっこり", en: "SMILE" },
  { id: "open", name: "ぽかん", en: "OPEN" },
  { id: "dot", name: "ちいさい点", en: "DOT" },
  { id: "cat", name: "ω", en: "CAT" },
];

export const blushStyles: PartOption<BlushStyle>[] = [
  { id: "hatch", name: "斜線", en: "HATCH" },
  { id: "oval", name: "丸", en: "OVAL" },
  { id: "line", name: "横線", en: "LINE" },
  { id: "none", name: "なし", en: "NONE" },
];

export const bodyStyles: PartOption<BodyType>[] = [
  { id: "soft", name: "やわらか", en: "SOFT" },
  { id: "slim", name: "ほそ身", en: "SLIM" },
  { id: "round", name: "まんまる", en: "ROUND" },
];

export const poseStyles: PartOption<PoseId>[] = [
  { id: "relax", name: "だらん", en: "RELAX" },
  { id: "wave", name: "手を振る", en: "WAVE" },
  { id: "cheer", name: "ばんざい", en: "CHEER" },
  { id: "pocket", name: "ポケット", en: "POCKET" },
  { id: "behind", name: "後ろ手", en: "BEHIND" },
];

export const expressions: { id: string; name: string; en: string }[] = [
  { id: "calm", name: "おだやか", en: "CALM" },
  { id: "smile", name: "ほほえみ", en: "SMILE" },
  { id: "wink", name: "ウインク", en: "WINK" },
  { id: "focus", name: "きりっと", en: "FOCUS" },
  { id: "open", name: "ぽかん", en: "OPEN" },
];

export const facePresets: FacePreset[] = [
  { id: "calm", name: "おだやか", en: "CALM", eyeShape: "jito", browShape: "soft", mouthShape: "line", blush: "hatch" },
  { id: "smile", name: "ほほえみ", en: "SMILE", eyeShape: "maru", browShape: "soft", mouthShape: "smile", blush: "oval" },
  { id: "wink", name: "ウインク", en: "WINK", eyeShape: "jito", browShape: "soft", mouthShape: "smile", blush: "hatch" },
  { id: "focus", name: "きりっと", en: "FOCUS", eyeShape: "tsuri", browShape: "sharp", mouthShape: "line", blush: "none" },
  { id: "open", name: "ぽかん", en: "OPEN", eyeShape: "utsuro", browShape: "flat", mouthShape: "open", blush: "none" },
];

export const hairColors = [
  "#5A4438",
  "#2F2B3A",
  "#B98A9E",
  "#C8A46E",
  "#8FA8C8",
  "#A9C7B8",
  "#D8C7DE",
];

export const skinColors = [
  "#FBEDE4",
  "#F6DFD0",
  "#EFCBBA",
  "#DDB29C",
  "#C28F74",
  "#A8705A",
];

export const eyeColors = [
  "#8A654F",
  "#5D6F92",
  "#7A5C93",
  "#6C9079",
  "#A96070",
  "#4A4048",
];
export const avatarPresets: AvatarPreset[] = [
  {
    id: "girl",
    name: "女の子マネキン",
    name_en: "GIRL MANNEQUIN",
    caption: "無彩色のぱっつんボブ素体",
    config: { ...mannequinTypes[0]!.config },
  },
  {
    id: "boy",
    name: "男の子マネキン",
    name_en: "BOY MANNEQUIN",
    caption: "無彩色のショートマッシュ素体",
    config: { ...mannequinTypes[1]!.config },
  },
  {
    id: "milk-tea",
    name: "ミルクティー",
    name_en: "MILK TEA",
    caption: "やわらかなブラウンとボブ",
    config: {
      preset: "milk-tea",
      gender: "girl",
      hair: "bob",
      hairColor: "#5A4438",
      skin: "#F6DFD0",
      eye: "#8A654F",
      eyeShape: "jito",
      browShape: "soft",
      mouthShape: "smile",
      blush: "hatch",
      body: "soft",
      pose: "relax",
      winkSide: "none",
    },
  },
  {
    id: "sakura",
    name: "さくら",
    name_en: "SAKURA",
    caption: "淡いピンクのツインテール",
    config: {
      preset: "sakura",
      gender: "girl",
      hair: "twin",
      hairColor: "#B98A9E",
      skin: "#FBEDE4",
      eye: "#A96070",
      eyeShape: "maru",
      browShape: "soft",
      mouthShape: "smile",
      blush: "oval",
      body: "soft",
      pose: "wave",
      winkSide: "right",
    },
  },
  {
    id: "ink",
    name: "インク",
    name_en: "INK",
    caption: "黒髪ロングのクールな素体",
    config: {
      preset: "ink",
      hair: "long",
      hairColor: "#2F2B3A",
      skin: "#EFCBBA",
      eye: "#5D6F92",
      eyeShape: "tsuri",
      browShape: "sharp",
      mouthShape: "line",
      blush: "none",
      body: "slim",
      pose: "relax",
      winkSide: "none",
    },
  },
  {
    id: "mint",
    name: "ミント",
    name_en: "MINT",
    caption: "ミントヘアのポニーテール",
    config: {
      preset: "mint",
      gender: "girl",
      hair: "pony",
      hairColor: "#A9C7B8",
      skin: "#F6DFD0",
      eye: "#6C9079",
      eyeShape: "jito",
      browShape: "flat",
      mouthShape: "line",
      blush: "hatch",
      body: "soft",
      pose: "pocket",
      winkSide: "none",
    },
  },
];

export const defaultAvatar: AvatarConfig = {
  ...mannequinTypes[0]!.config,
};

export const illustrationBackdrops: IllustrationBackdrop[] = [
  {
    id: "atelier",
    name: "アトリエ",
    base: "#f7f7fb",
    accent: "#c4b5fd",
    ink: "#4a4356",
    motif: "sparkle",
  },
  {
    id: "sunset",
    name: "サンセット",
    base: "#fde6d8",
    accent: "#f9a8d4",
    ink: "#5b3a4a",
    motif: "halo",
  },
  {
    id: "garden",
    name: "ガーデン",
    base: "#e8f1e6",
    accent: "#a7f3d0",
    ink: "#3f5a4a",
    motif: "ribbon",
  },
  {
    id: "studio",
    name: "スタジオ",
    base: "#eef0f6",
    accent: "#93c5fd",
    ink: "#3a4356",
    motif: "grid",
  },
];

/** Only the neutral girl/boy mannequins are used by the fitting studio. */
export function resolveAvatar(config?: Partial<AvatarConfig>): AvatarConfig {
  const gender = config?.gender === "boy" || config?.preset === "boy" ? "boy" : "girl";
  return { ...mannequinTypes.find((item) => item.id === gender)!.config };
}
