import type { AvatarRig } from "~/utils/avatarRig";
import { generatePoseArmhole } from "~/utils/generatePoseClothing";
import { rigidArtwork } from "~/utils/rigidClothing";

/** Separate facings share a neck anchor. Arm movement translates the cloth,
 * while the left/right collar panels and bow retain their original proportions. */
export function fitSailorCollar(rig: AvatarRig) {
  const t=rig.torso,aspect=rig.detailScaleY||1;
  const shoulders=[-1,1].map(side=>generatePoseArmhole(rig,side as -1|1,5).shoulder);
  const rise=Math.max(0,t.shoulderY-Math.min(...shoulders.map(p=>p.y)))*.8;
  const anchor={x:0,y:t.shoulderY-7-rise};
  const front=rigidArtwork({x:60,y:38,width:120,height:70},{x:120,y:46},anchor,.98,aspect);
  const back=rigidArtwork({x:60,y:38,width:120,height:32},{x:120,y:46},anchor,.98,aspect);
  const knotY=anchor.y+50*.98*aspect-2*aspect;
  const ribbon=rigidArtwork({x:90,y:96,width:60,height:57},{x:120,y:112},{x:0,y:knotY},.95,aspect);
  return {
    back:back.map(piece=>({...piece,layer:"collar-back" as const})),
    front:front.map(piece=>({...piece,layer:"collar-front" as const})),
    ribbon:ribbon.map(piece=>({...piece,layer:"ribbon" as const})),
  };
}
