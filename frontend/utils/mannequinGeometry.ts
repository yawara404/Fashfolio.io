import { resolvePose } from "~/utils/avatarRig";
import { f } from "~/utils/avatarShapes";
import { artworkBodyX, artworkBodyY } from "~/data/characterArtwork";
import type { AvatarRig, LimbKey, RigPoint, Side } from "~/utils/avatarRig";
import type { MannequinGender } from "~/types/avatar";

/** Landmark-driven anime proportions. All clothing uses this very same rig. */
function buildCharacterGeometry(value: number, gender: MannequinGender) {
  const heads = Number.isFinite(value) ? Math.max(4, Math.min(10, value)) : 5;
  const t = Math.max(0, Math.min(1, (heads - 5) / 4));
  const unit = 600 / heads, cx = 240, crownY = 52, groundY = 652;
  const neck = .13 + .1 * t;
  const torsoLength = 1.27 + .94 * t;
  const footLength = .17 + .08 * t;
  const legLength = heads - 1 - neck - torsoLength - footLength;
  const thighLength = legLength * .51, shinLength = legLength * .49;
  const shoulderY = crownY + (1 + neck) * unit;
  const crotchY = shoulderY + torsoLength * unit;
  const kneeY = crotchY + thighLength * unit;
  const ankleY = kneeY + shinLength * unit;
  const shoulder = (.60 + .12 * t + (gender === 'boy' ? .015 : 0)) * unit;
  const chest = (.445 + .025 * t) * unit;
  const waist = (gender === 'boy' ? .36 : .35) * unit;
  const hip = (gender === 'boy' ? .45 : .47) * unit;
  const waistY = shoulderY + torsoLength * unit * .61;
  const torso = {
    neckTopY: crownY + .93 * unit, neckHalfW: .095 * unit,
    shoulderY, shoulderDrop: .045 * unit, shoulderHalfW: shoulder,
    chestY: shoulderY + torsoLength * unit * .32, chestHalfW: chest,
    waistY, waistHalfW: waist, hipY: shoulderY + torsoLength * unit * .86,
    hipHalfW: hip, crotchY,
  };
  const arms = {} as AvatarRig['arms'], legs = {} as AvatarRig['legs'];
  const hands = {} as AvatarRig['hands'], feet = {} as AvatarRig['feet'];
  for (const key of ['left', 'right'] as LimbKey[]) {
    const side: Side = key === 'left' ? -1 : 1;
    const root = { x: cx + side * shoulder * .88, y: shoulderY + (key === 'left' ? .07 : .025) * unit };
    const elbow = { x: root.x + side * (key === 'left' ? .13 : .07) * unit, y: waistY + .04 * unit };
    const wrist = { x: elbow.x + side * (key === 'left' ? .12 : -.025) * unit, y: crotchY + .19 * unit };
    const tip = { x: wrist.x + side * .018 * unit, y: wrist.y + .22 * unit };
    arms[key] = { key, side, root, mid: elbow, end: wrist, rootW: .112 * unit, midW: .083 * unit, endW: .058 * unit,
      upper: Math.hypot(elbow.x - root.x, elbow.y - root.y), lower: Math.hypot(wrist.x - elbow.x, wrist.y - elbow.y) };
    hands[key] = { key, side, wrist, tip, halfW: .065 * unit, length: .22 * unit, angle: 4 };
    const legRoot = { x: cx + side * .25 * unit, y: crotchY - .03 * unit };
    const knee = { x: cx + side * (key === 'left' ? .21 : .265) * unit, y: kneeY + (key === 'left' ? -.025 : 0) * unit };
    const ankle = { x: cx + side * (key === 'left' ? .32 : .28) * unit, y: ankleY };
    legs[key] = { key, side, root: legRoot, mid: knee, end: ankle, rootW: .22 * unit, midW: .13 * unit, endW: .078 * unit,
      upper: thighLength * unit, lower: shinLength * unit };
    feet[key] = { key, side, ankle, toe: { x: ankle.x + side * .035 * unit, y: groundY }, halfW: .105 * unit, length: .23 * unit, groundY };
  }
  const head = {
    cx, crownY, chinY: crownY + unit, cy: crownY + .5 * unit, halfW: .66 * unit, halfH: .5 * unit, jawW: .46 * unit,
    eyeY: crownY + .683 * unit, browY: crownY + .55 * unit, mouthY: crownY + .85 * unit, blushY: crownY + .806 * unit,
    eyeDX: .28 * unit, eyeHalfW: .09 * unit, eyeHalfH: .103 * unit, mouthHalfW: .037 * unit,
    blushDX: .4 * unit, earY: crownY + .72 * unit, earDX: .54 * unit, hairTopY: crownY - .074 * unit,
  };
  const rig: AvatarRig = {
    heads, gender, unit, cx, crownY, groundY, height: 600, body: 'soft', pose: resolvePose('relax'),
    lineWidth: Math.max(1.1, unit * .016), lineWidthThin: Math.max(.8, unit * .011), lineWidthBold: unit * .022,
    head, torso, arms, legs, hands, feet,
    segments: { head: unit, neck: neck * unit, torso: torsoLength * unit, thigh: thighLength * unit, shin: shinLength * unit, foot: footLength * unit },
  };
  return { rig, heads, unit, stroke: rig.lineWidth, body: 'translate(0 0)', head: `translate(${cx} ${crownY}) scale(${unit})` };
}

/** Sculpted cubic sections preserve deltoid, elbow, thigh, knee and calf volumes. */
export function characterOutline(r: AvatarRig) {
  const { cx, unit: u, torso: t } = r;
  type Curve = { from: RigPoint; a: RigPoint; b: RigPoint; to: RigPoint };
  function side(key: LimbKey) {
    const arm = r.arms[key], leg = r.legs[key], hand = r.hands[key], foot = r.feet[key], sign = arm.side;
    const d = (p: RigPoint) => (p.x - cx) * sign;
    const p = (x: number, y: number) => ({ x: cx + sign * x, y });
    let from = p(t.neckHalfW, t.neckTopY);
    const curves: Curve[] = [];
    const c = (ax: number, ay: number, bx: number, by: number, x: number, y: number) => {
      const to = p(x, y); curves.push({ from, a: p(ax, ay), b: p(bx, by), to }); from = to;
    };
    const sy = t.shoulderY, ey = arm.mid.y, wy = arm.end.y, ky = leg.mid.y, ay = leg.end.y;
    const ar = d(arm.root), eo = d(arm.mid) + arm.midW, ei = d(arm.mid) - arm.midW;
    const wo = d(arm.end) + arm.endW, wi = d(arm.end) - arm.endW;
    const hd = d(hand.tip), hw = hand.halfW, hy = hand.tip.y;
    const thigh = d(leg.root) + leg.rootW, innerThigh = d(leg.root) - leg.rootW * .8;
    const ko = d(leg.mid) + leg.midW, ki = d(leg.mid) - leg.midW;
    const ao = d(leg.end) + leg.endW, ai = d(leg.end) - leg.endW;
    const toeOuter = d(foot.toe) + foot.halfW * .9, toeInner = d(foot.toe) - foot.halfW * .85;
    // Neck / trapezius / rounded deltoid.
    c(t.neckHalfW, t.neckTopY+.1*u, .16*u, sy-.075*u, .3*u, sy-.035*u);
    c(.42*u, sy-.02*u, t.shoulderHalfW*.93, sy+.015*u, ar+arm.rootW*.75, arm.root.y+.09*u);
    // Upper arm, then the smaller bony elbow and tapering forearm.
    c(ar+arm.rootW*1.1, arm.root.y+.2*u, eo, ey-.2*u, eo, ey-.025*u);
    c(eo+.014*u, ey+.025*u, wo+.025*u, wy-.16*u, wo, wy);
    // Five small fingers and a palm, rather than a mitten or a joint marker.
    const hp = (ax: number, aY: number, bx: number, bY: number, x: number, y: number) =>
      c(d(hand.wrist)+ax*u, wy+aY*u, d(hand.wrist)+bx*u, wy+bY*u, d(hand.wrist)+x*u, wy+y*u);
    hp(.07,.05,.08,.1,.06,.14);
    hp(.065,.17,.055,.21,.04,.21); hp(.024,.21,.027,.17,.025,.15);
    hp(.023,.2,.016,.25,.003,.25); hp(-.011,.25,-.011,.21,-.009,.16);
    hp(-.01,.21,-.016,.27,-.03,.27); hp(-.044,.27,-.041,.21,-.038,.16);
    hp(-.043,.2,-.055,.24,-.067,.23); hp(-.08,.22,-.065,.15,-.06,.12);
    hp(-.11,.15,-.12,.12,-.1,.09); hp(-.08,.07,-.07,.03,-.058,0);
    c(ei*.99, wy-.2*u, ei-.01*u, ey+.11*u, ei, ey);
    // Inner upper arm leads into the axilla, rib cage and abdomen.
    c(ei-.012*u, ey-.15*u, t.chestHalfW*.86, t.chestY-.16*u, t.chestHalfW*.86, t.chestY-.12*u);
    c(t.chestHalfW*.91, t.chestY-.015*u, t.chestHalfW*.97, t.chestY+.05*u, t.chestHalfW*.92, t.chestY+.15*u);
    c(t.chestHalfW*.88, t.chestY+.24*u, t.waistHalfW, t.waistY-.12*u, t.waistHalfW, t.waistY);
    c(t.waistHalfW, t.waistY+.13*u, t.hipHalfW, t.hipY-.14*u, t.hipHalfW, t.hipY+.05*u);
    // Pelvis and outer thigh, patella, calf belly, narrow ankle.
    c(t.hipHalfW*1.02, t.hipY+.19*u, thigh, leg.root.y+.48*u, thigh-.025*u, leg.root.y+leg.upper*.5);
    c(thigh-.04*u, leg.root.y+leg.upper*.65, ko, ky-.14*u, ko, ky);
    c(ko, ky+.1*u, d(leg.mid)+.16*u, ky+leg.lower*.23, d(leg.mid)+.15*u, ky+leg.lower*.38);
    c(d(leg.mid)+.14*u, ky+leg.lower*.6, ao, ay-.12*u, ao, ay);
    c(ao, ay+.04*u, toeOuter, foot.groundY-.08*u, toeOuter, foot.groundY-.035*u);
    c(toeOuter, foot.groundY+.025*u, toeInner, foot.groundY+.02*u, toeInner, foot.groundY-.015*u);
    c(ai-.015*u, foot.groundY-.07*u, ai, ay+.045*u, ai, ay);
    c(ai, ay-.14*u, ki-.025*u, ky+leg.lower*.4, ki-.018*u, ky+.1*u);
    c(ki-.015*u, ky+.05*u, ki, ky-.055*u, ki, ky-.12*u);
    c(ki+.01*u, ky-.27*u, innerThigh, leg.root.y+.3*u, innerThigh, leg.root.y+.12*u);
    c(innerThigh, leg.root.y+.075*u, .035*u, t.crotchY+.035*u, .02*u, t.crotchY+.015*u);
    return curves;
  }
  const left = side('left'), right = side('right');
  const pt = (p: RigPoint) => `${f(p.x)} ${f(p.y)}`;
  const draw = (c: Curve, reverse = false) => `C${pt(reverse ? c.b : c.a)} ${pt(reverse ? c.a : c.b)} ${pt(reverse ? c.from : c.to)}`;
  return `M${pt(left[0]!.from)}${left.map(c=>draw(c)).join('')}Q${f(cx)} ${f(t.crotchY)} ${pt(right.at(-1)!.to)}${right.reverse().map(c=>draw(c,true)).join('')}Z`;
}

/** Uniform head space keeps hats, earrings and hair out of body scaling. */
export function characterHeadRig(rig: AvatarRig): AvatarRig {
  const head = { ...rig.head, cx: 0 };
  const ys = ['crownY', 'chinY', 'cy', 'eyeY', 'browY', 'mouthY', 'blushY', 'earY', 'hairTopY'] as const;
  for (const key of ys) head[key] = (rig.head[key] - rig.crownY) / (rig.head.chinY - rig.crownY) * 100;
  for (const key of ['halfW', 'halfH', 'jawW', 'eyeDX', 'eyeHalfW', 'eyeHalfH', 'mouthHalfW', 'blushDX', 'earDX'] as const) head[key] = rig.head[key] / rig.unit * 100;
  return { ...rig, head, cx: 0, crownY: 0, unit: 100 };
}

/** The requested fixed 3.80 body space, shared by the skin and clothing. */
export function characterGeometry(value: number, gender: MannequinGender) {
  const heads = Number.isFinite(value) ? Math.min(10, Math.max(4, value)) : 5;
  const u = 612 / heads, oy = 42, sy = (heads - 1.15) / 3.8, sx = 1 + (sy - 1) * .42;
  const source = buildCharacterGeometry(5, gender).rig;
  const origin = source.crownY + 1.15 * source.unit;
  const nx = 100 / source.unit, ny = 380 / (source.groundY - origin);
  const point = (p: RigPoint) => ({ x: (p.x - source.cx) * nx, y: (p.y - origin) * ny });
  const r = structuredClone(source);
  r.unit = 100; r.cx = 0; r.crownY = (source.crownY-origin)*ny; r.groundY = 380; r.height = 495;
  for (const key of Object.keys(r.torso) as (keyof typeof r.torso)[]) {
    if (key.endsWith('Y')) r.torso[key] = (source.torso[key] - origin) * ny;
    else r.torso[key] = source.torso[key] * (key === 'shoulderDrop' ? ny : nx);
  }
  for (const key of Object.keys(r.head) as (keyof typeof r.head)[]) {
    r.head[key] = key === 'cx' ? 0 : key.endsWith('Y') || key === 'cy' ? (source.head[key]-origin)*ny : source.head[key]*nx;
  }
  for (const key of ['left','right'] as LimbKey[]) {
    for (const limb of ['arms','legs'] as const) {
      const old = source[limb][key], next = r[limb][key];
      next.root = point(old.root); next.mid = point(old.mid); next.end = point(old.end);
      next.rootW = old.rootW*nx; next.midW = old.midW*nx; next.endW = old.endW*nx;
      next.upper = Math.hypot(next.mid.x-next.root.x,next.mid.y-next.root.y);
      next.lower = Math.hypot(next.end.x-next.mid.x,next.end.y-next.mid.y);
    }
    r.hands[key].wrist = point(source.hands[key].wrist); r.hands[key].tip = point(source.hands[key].tip);
    r.hands[key].halfW *= nx; r.hands[key].length *= ny;
    r.feet[key].ankle = point(source.feet[key].ankle); r.feet[key].toe = point(source.feet[key].toe);
    r.feet[key].halfW *= nx; r.feet[key].length *= nx; r.feet[key].groundY = 380;
  }
  for (const key of Object.keys(r.segments) as (keyof typeof r.segments)[]) r.segments[key] *= ny;
  fitArtworkLandmarks(r);
  return { rig: r, heads, unit: u, stroke: .015 / Math.sqrt(sx*sy), sx, sy,
    origin: oy + 1.15*u, ground: 654,
    body: `translate(240 ${oy+1.15*u}) scale(${u*sx} ${u*sy})`,
    head: `translate(240 ${oy}) scale(${u})` };
}

/** Measured landmarks of jito-base-v1.png, in the same space as the raster body. */
function fitArtworkLandmarks(r: AvatarRig) {
  const p = (x: number, y: number) => ({ x: artworkBodyX(x), y: artworkBodyY(y) });
  r.torso = {
    neckTopY: artworkBodyY(290), neckHalfW: 10.5,
    shoulderY: artworkBodyY(350), shoulderDrop: 5, shoulderHalfW: 43,
    chestY: artworkBodyY(448), chestHalfW: 35,
    waistY: artworkBodyY(580), waistHalfW: 32,
    hipY: artworkBodyY(727), hipHalfW: 49,
    crotchY: artworkBodyY(778),
  };
  for (const key of ["left", "right"] as LimbKey[]) {
    const left = key === "left";
    const root = p(left ? 408 : 616, 365), mid = p(left ? 374 : 650, 560), end = p(left ? 316 : 708, 790);
    r.arms[key] = { ...r.arms[key], root, mid, end, rootW: 11.5, midW: 9, endW: 6.5,
      upper: Math.hypot(mid.x-root.x, mid.y-root.y), lower: Math.hypot(end.x-mid.x, end.y-mid.y) };
    r.hands[key] = { ...r.hands[key], wrist: end, tip: p(left ? 300 : 724, 873), halfW: 11, length: artworkBodyY(873)-end.y };
    const legRoot = p(left ? 442 : 582, 780), knee = p(left ? 448 : 577, 1108), ankle = p(left ? 440 : 576, 1423);
    r.legs[key] = { ...r.legs[key], root: legRoot, mid: knee, end: ankle, rootW: 24.5, midW: 14, endW: 8,
      upper: Math.hypot(knee.x-legRoot.x, knee.y-legRoot.y), lower: Math.hypot(ankle.x-knee.x, ankle.y-knee.y) };
    r.feet[key] = { ...r.feet[key], ankle, toe: p(left ? 440 : 576, 1522), halfW: 14.5, length: 30, groundY: 380 };
  }
}
