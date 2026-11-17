import type {AvatarRig,LimbKey} from "~/utils/avatarRig";
import {artworkBodyX,artworkBodyY} from "~/data/characterArtwork";
import {artworkMesh,type ArtworkAnchor} from "~/utils/garmentMesh";

// Calf and ankle outlines measured from the current, shared lower-body artwork.
// Widths vary along the shaft; a single thumbnail rectangle cannot fit a boot.
const outlines:Record<LimbKey,number[][]>={
  left:[[1105,415,481],[1180,399,474],[1245,398,472],[1300,406,464],[1360,415,459],[1423,417,462],[1450,416,463],[1470,411,468]],
  right:[[1105,534,600],[1180,542,616],[1245,544,618],[1300,552,609],[1360,558,601],[1423,555,599],[1450,553,601],[1470,549,606]],
};

export function shoeLegSection(rig:AvatarRig,key:LimbKey,y:number,ease=1.4){
  const rows=outlines[key]!;
  const dy=rig.feet[key].ankle.y-artworkBodyY(1423);
  const dx=rig.feet[key].ankle.x-artworkBodyX(key==="left"?439.5:577);
  const sourceY=y-dy;
  const end=rows.findIndex(row=>artworkBodyY(row[0]!)>=sourceY);
  const a=rows[Math.max(0,end<0?rows.length-2:end-1)]!,b=rows[Math.max(1,end<0?rows.length-1:end)]!;
  const ratio=Math.max(0,Math.min(1,(sourceY-artworkBodyY(a[0]!))/(artworkBodyY(b[0]!)-artworkBodyY(a[0]!))));
  return {left:artworkBodyX(a[1]!+(b[1]!-a[1]!)*ratio)+dx-ease,right:artworkBodyX(a[2]!+(b[2]!-a[2]!)*ratio)+dx+ease};
}

/** Sew the opening to the ankle and rest the drawn outsole on the shared ground. */
export function fitShoeArtwork(rig:AvatarRig,kind:string){
  return (["left","right"] as const).flatMap((key,index)=>{
    const foot=rig.feet[key],boot=kind==="boots"||kind==="long-boots";
    const anchors:ArtworkAnchor[]=[];
    const put=(x:number,y:number,tx:number,ty:number)=>anchors.push({source:{x:x+index*100,y},target:{x:tx,y:ty}});
    const sourceTop=boot?(kind==="long-boots"?38:95):101;
    const top=kind==="long-boots"?rig.legs[key].mid.y+18:foot.ankle.y-(boot?29:1);
    const span=foot.halfW+1.8,center=foot.toe.x;
    put(20,sourceTop-6,center-span*2,top-6);put(116,sourceTop-6,center+span*2,top-6);
    put(20,228,center-span*2,foot.groundY+6);put(116,228,center+span*2,foot.groundY+6);
    if(boot){
      const dy=foot.ankle.y-artworkBodyY(1423);
      const fractions=[...new Set([0,.25,.5,.75,1,...outlines[key].map(row=>(artworkBodyY(row[0]!)+dy-top)/(foot.ankle.y-top)).filter(f=>f>0&&f<1)])].sort((a,b)=>a-b);
      for(const f of fractions){
        const y=top+(foot.ankle.y-top)*f,section=shoeLegSection(rig,key,y,1.8);
        put(47-5*f,sourceTop+(178-sourceTop)*f,section.left,y);
        put(94-5*f,sourceTop+(178-sourceTop)*f,section.right,y);
      }
      put(30,198,center-span,foot.groundY-8);put(108,198,center+span,foot.groundY-8);
      put(31,207,center-span,foot.groundY-4);put(108,207,center+span,foot.groundY-4);
      put(30,221,center-span,foot.groundY+2);put(108,221,center+span,foot.groundY+2);
    }else{
      const opening=shoeLegSection(rig,key,top,.9),instepY=foot.ankle.y+10,instep=shoeLegSection(rig,key,instepY,1.2);
      put(48,101,opening.left,top);put(83,103,opening.right,top+.5);
      put(43,148,instep.left,instepY);put(88,147,instep.right,instepY);
      put(26,190,center-span,foot.groundY-7);put(111,190,center+span,foot.groundY-7);
      put(27,196,center-span,foot.groundY-4);put(110,195,center+span,foot.groundY-4);
      put(29,214,center-span,foot.groundY+2);put(105,214,center+span,foot.groundY+2);
    }
    return artworkMesh(anchors);
  });
}
