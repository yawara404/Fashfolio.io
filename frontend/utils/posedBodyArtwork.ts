import type { AvatarRig, RigPoint } from "~/utils/avatarRig";
import { artworkBodyX, artworkBodyY } from "~/data/characterArtwork";
import { affinePiece, type ArtworkPiece } from "~/utils/garmentMesh";
import { limbNormal, offsetPoint } from "~/utils/limbGeometry";
import { generatePoseArmhole } from "~/utils/generatePoseClothing";

interface ArmArtwork { cutout: string; pieces: ArtworkPiece[] }
type Section = [RigPoint, RigPoint];

/** Repose the existing pixels, keeping the shoulder/torso join in place. */
export function posedBodyArtwork(rest: AvatarRig, posed: AvatarRig): ArmArtwork[] {
  if (posed.pose.id === "relax") return [];
  return (["left", "right"] as const).map(key => {
    const side = rest.arms[key].side;
    const p = (x: number, y: number) => ({ x: artworkBodyX(side === -1 ? x : 1024 - x), y: artworkBodyY(y) });
    const sections = (rig: AvatarRig): Section[] => {
      const arm = rig.arms[key], hand = rig.hands[key];
      const normal = limbNormal(arm.root, arm.end, side);
      const lower = limbNormal(arm.mid, arm.end, side);
      const ring = (center: RigPoint, width: number, n = lower): Section => [offsetPoint(center, n, width), offsetPoint(center, n, -width)];
      const length = Math.hypot(hand.tip.x - hand.wrist.x, hand.tip.y - hand.wrist.y) || 1;
      const cap = { x: hand.tip.x + (hand.tip.x - hand.wrist.x) / length * 7, y: hand.tip.y + (hand.tip.y - hand.wrist.y) / length * 7 };
      const forearm = { x: (arm.mid.x + arm.end.x) / 2, y: (arm.mid.y + arm.end.y) / 2 };
      const armhole = generatePoseArmhole(rig, side, 4);
      // Skin must overlap the retained torso. A cloth armhole stops outside
      // it, leaving transparent wedges when the sleeveless arm is raised.
      const shoulder: Section = rig.pose.id === "relax" ? [p(390, 340), p(440, 480)] : [armhole.shoulder, {x:side*(rig.torso.chestHalfW-15),y:armhole.underarm.y}];
      return [shoulder, ring(arm.mid, 21, normal), ring(forearm, 20), ring(arm.end, 14), ring(hand.tip, 17), ring(cap, 12)];
    };
    const src = sections(rest), dst = sections(posed);
    const pieces: ArtworkPiece[] = [];
    for (let i = 0; i < src.length - 1; i++) {
      const s = [src[i]![0], src[i + 1]![0], src[i + 1]![1], src[i]![1]];
      const t = [dst[i]![0], dst[i + 1]![0], dst[i + 1]![1], dst[i]![1]];
      for (const indices of [[0, 1, 2], [0, 2, 3]]) {
        pieces.push(affinePiece(indices.map(j => s[j]!) as [RigPoint, RigPoint, RigPoint], indices.map(j => t[j]!) as [RigPoint, RigPoint, RigPoint]));
      }
    }
    // Trace the transparent gap between the original arm and torso. A wider
    // deformation cage alone would pick up pencil lines from the shirt's hem.
    const outline = [p(390,340), p(0,340), p(0,910), p(350,910), p(350,830), p(355,790),
      p(360,740), p(374,700), p(382,675), p(395,640), p(411,600), p(422,560), p(429,480)];
    const cutout = outline.map(point => `${point.x} ${point.y}`).join(" ");
    return { cutout, pieces: pieces.map(piece => ({ ...piece, region: cutout })) };
  });
}
