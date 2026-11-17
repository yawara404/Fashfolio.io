import type { AvatarRig } from "~/utils/avatarRig";
import type { Garment } from "~/types/wardrobe";
import { addHangingHem } from "~/utils/clothDrape";
import { generatePoseSleeve } from "~/utils/generatePoseClothing";
import { fitGarmentNeckline } from "~/utils/necklineFitting";
import { fitClothingDetails } from "~/utils/clothingDetails";
import { fitShoeArtwork } from "~/utils/shoeFitting";
import { artworkBox, artworkMesh, type ArtworkAnchor, type ArtworkPiece } from "~/utils/garmentMesh";

/** Fit the catalogue's actual drawing. No second interpretation of collars or trims. */
export function fitCatalogArtwork(r: AvatarRig, item: Garment, options: { waistFit?: boolean } = {}): ArtworkPiece[] {
  const t=r.torso, u=r.unit, k=item.kind;
  const finish=(pieces:ArtworkPiece[])=>fitClothingDetails(r,item,pieces);
  const box=(sx:number,sy:number,sw:number,sh:number,x:number,y:number,width:number,height:number)=>artworkBox({x:sx,y:sy,width:sw,height:sh},{x,y,width,height});
  if (k==="tights") return box(55,25,130,210,-t.hipHalfW,t.waistY,t.hipHalfW*2,r.groundY-t.waistY+2);
  if (item.category === "inner") {
    const lift = Math.min(1, Math.abs(r.arms.left.mid.x - r.arms.left.root.x) / r.arms.left.upper);
    const anchors: ArtworkAnchor[] = [];
    const a = (sx: number, sy: number, x: number, y: number) => anchors.push({ source: { x: sx, y: sy }, target: { x, y } });
    a(0,0,-100,t.neckTopY-40); a(240,0,100,t.neckTopY-40);
    a(0,260,-100,t.waistY+85); a(240,260,100,t.waistY+85);
    for (const side of [-1,1]) {
      const source = (x: number) => side === -1 ? x : 240-x;
      a(source(99),43,side*27,t.shoulderY-4-3*lift);
      a(source(107),43,side*22,t.shoulderY-4-3*lift);
      a(source(106),79,side*18,t.shoulderY+10-2*lift);
      a(source(90),78,side*(t.chestHalfW+1),t.chestY-3-8*lift);
      a(source(90),175,side*(t.waistHalfW+.5),t.waistY+4);
    }
    a(120,85,0,t.shoulderY+12.5-2*lift);
    a(120,111,0,t.chestY+16); a(120,175,0,t.waistY+4);
    addHangingHem(anchors, {x:120,y:215,halfWidth:36,curve:4.5},
      {y:t.waistY+33,halfWidth:t.waistHalfW+7}, {flare:2,sag:3.5,curl:.7});
    return finish(artworkMesh(anchors));
  }
  if (item.category==="tops" || (item.category==="outer" && k!=="cape")) {
    const trench=k==="trench", tee=k==="tee", knit=["knit","cardigan","hoodie"].includes(k);
    const cropped=k==="blouson" || item.id==="crop-knit";
    const outer=item.category==="outer";
    const waistFit=options.waistFit && item.category==="tops";
    const neck=trench?35:item.id==="crop-knit"||item.id==="piped-cardigan"?45:46, shoulder=trench?45:knit||tee?57:59, chest=trench?102:111, hem=trench?224:knit?219:210;
    // Let tops overlap the waist a little, keeping the short silhouette and existing hem curve.
    const hemY=trench?r.legs.left.mid.y+12:t.waistY+(waistFit?21:cropped?18:outer?32:43);
    const hemW=trench?t.hipHalfW*1.36:waistFit?t.waistHalfW+8:cropped?t.waistHalfW+8:t.hipHalfW*.9+5;
    const sag=trench?6:cropped?4:knit?5:6;
    const midY=trench?t.hipY+25:waistFit?t.waistY-7:cropped?t.waistY-6:t.waistY;
    const anchors:ArtworkAnchor[]=[];
    const a=(sx:number,sy:number,x:number,y:number)=>anchors.push({source:{x:sx,y:sy},target:{x,y}});
    a(0,0,-130,t.neckTopY-50); a(240,0,130,t.neckTopY-50);
    a(0,260,-160,hemY+70); a(240,260,160,hemY+70);
    anchors.push(...fitGarmentNeckline(r,item,neck).anchors);
    if (!["trench","blazer","blouson"].includes(k)) a(120,chest,0,t.chestY);
    a(120,175,0,midY);
    a(90,175,-(trench?t.hipHalfW*.84:t.waistHalfW+6),midY); a(150,175,trench?t.hipHalfW*.84:t.waistHalfW+6,midY);
    if (trench) {
      // The drawn belt is at y=136; pockets at y=175 sit below the real waist.
      a(120,136,0,t.waistY);
      a(84,136,-t.waistHalfW-10,t.waistY);
      a(156,136,t.waistHalfW+10,t.waistY);
      a(77,175,-t.hipHalfW*1.22,midY);
      a(163,175,t.hipHalfW*1.22,midY);
    }
    const hemEdge=trench?68:tee?83:knit?85:86;
    addHangingHem(anchors,
      { x:120, y:hem, halfWidth:120-hemEdge, curve:trench?5.5:knit||tee?0:4.5 },
      { y:hemY, halfWidth:hemW },
      { flare:cropped?2:trench?3:knit?2.5:4, sag, curl:cropped?.6:1.4 },
    );
    const sleeves:ArtworkPiece[]=[];
    const underX=tee?87:trench?91:knit?92:93, underY=tee?102:chest;
    for (const side of [-1,1] as const) {
      const sleeve=generatePoseSleeve(r,item,side,{shoulder,chest,underX,underY,neck});
      const sx=(left:number)=>side===-1?left:240-left;
      a(sx(75),shoulder,sleeve.shoulder.x,sleeve.shoulder.y);
      a(sx(underX),underY,sleeve.underarm.x,sleeve.underarm.y);
      anchors.push(...sleeve.shoulderAnchors);
      sleeves.push(...sleeve.pieces.map(piece=>({...piece,surface:side===-1?"sleeve-left" as const:"sleeve-right" as const})));
    }
    // Torso and sleeves meet at the armhole. Separating their cages allows a
    // cropped hem above the cuffs without folding the original design over itself.
    const hemLeft=trench?68:tee?83:knit?85:86;
    const region=`75 0 165 0 165 ${shoulder} ${240-underX} ${underY} ${240-hemLeft} ${hem} ${240-hemLeft} 260 ${hemLeft} 260 ${hemLeft} ${hem} ${underX} ${underY} 75 ${shoulder}`;
    const body = [...artworkMesh(anchors).map(piece=>({...piece,region,surface:"bodice" as const})),...sleeves];
    return finish(body);
  }
  if (k==="cape") {
    const left=-t.shoulderHalfW*1.9, top=t.neckTopY-5;
    const width=t.shoulderHalfW*3.8, height=t.crotchY+80-t.neckTopY;
    const map=(x:number,y:number)=>({x:left+(x-30)/180*width,y:top+(y-20)/215*height});
    const anchors:ArtworkAnchor[]=[{x:0,y:0},{x:240,y:0},{x:240,y:260},{x:0,y:260},
      {x:0,y:189},{x:240,y:189},{x:0,y:205},{x:240,y:205},
    ].map(source=>({source,target:map(source.x,source.y)}));
    anchors.push(
      {source:{x:101,y:42},target:{x:-t.neckHalfW-3,y:t.neckTopY+11}},
      {source:{x:139,y:42},target:{x:t.neckHalfW+3,y:t.neckTopY+11}},
      {source:{x:94,y:64},target:{x:-t.shoulderHalfW-6,y:t.shoulderY+16}},
      {source:{x:146,y:64},target:{x:t.shoulderHalfW+6,y:t.shoulderY+16}},
      {source:{x:120,y:58},target:{x:0,y:t.shoulderY+15}},
    );
    addHangingHem(anchors,
      { x:120, y:205, halfWidth:74, curve:12.5, bandHalfWidth:67 },
      { y:map(120,205).y, halfWidth:74/180*width, bandHalfWidth:67/180*width, bandHeight:16/215*height },
      { flare:4, sag:7, curl:1.5 },
    );
    return finish(artworkMesh(anchors));
  }
  if (item.category==="bottoms" || item.category==="underwear") {
    if (["pants","cargo","shorts","dolphin","inner-shorts","inner-spats","tights"].includes(k)) {
      const underwear=item.category==="underwear" && k!=="tights",dolphin=k==="dolphin", short=k==="shorts"||dolphin||underwear, sourceHem=k==="inner-shorts"?126:dolphin?142:short?150:224;
      const anchors:ArtworkAnchor[]=[];
      const a=(sx:number,sy:number,x:number,y:number)=>anchors.push({source:{x:sx,y:sy},target:{x,y}});
      const endY=short?r.legs.left.root.y+r.legs.left.upper*(k==="inner-spats"?.8:underwear?.22:dolphin?.45:.5):r.legs.left.end.y+6;
      a(0,0,-130,t.waistY-40); a(240,0,130,t.waistY-40); a(0,260,-140,endY+60); a(240,260,140,endY+60);
      a(83,38,-t.waistHalfW-1,t.waistY); a(157,38,t.waistHalfW+1,t.waistY); a(120,38,0,t.waistY);
      a(83,52,-t.waistHalfW-2,t.waistY+10); a(157,52,t.waistHalfW+2,t.waistY+10); a(120,52,0,t.waistY+10);
      a(80,85,-t.hipHalfW-3,t.hipY); a(160,85,t.hipHalfW+3,t.hipY); a(120,101,0,t.crotchY+3);
      for (const side of [-1,1] as const) {
        const leg=r.legs[side===-1?"left":"right"];
        const sx=(left:number)=>side===-1?left:240-left;
        if (!short) {
          a(sx(76),160,leg.mid.x+side*(leg.midW+10),leg.mid.y);
          a(sx(113),160,leg.mid.x-side*(leg.midW+10),leg.mid.y);
        }
        const center=short?(leg.root.x+leg.mid.x)/2:leg.end.x, width=short?Math.min(leg.rootW+(underwear?1:5),Math.abs(center)-2):leg.endW+(item.id==="straight-slacks"?8:12);
        a(sx(71),sourceHem,center+side*width,endY); a(sx(108),sourceHem,center-side*width,endY);
        const sourceCentre=side===-1?89.5:150.5;
        const previousCentre=side===-1?94.5:145.5;
        const band=short?12:18;
        const ratio=short?0:band/(sourceHem-160);
        addHangingHem(anchors,
          { x:sourceCentre, y:sourceHem, halfWidth:18.5, curve:dolphin?10:0, bandHeight:band, bandX:sourceCentre+(previousCentre-sourceCentre)*ratio },
          { x:center, y:endY, halfWidth:width, bandHeight:short?9:14, bandX:short?center:leg.end.x+(leg.mid.x-leg.end.x)*band/(sourceHem-160), bandHalfWidth:width-1 },
          { flare:short?1.4:k==="cargo"?2:2.8, sag:dolphin?3.5:short?2:2.5, curl:.8 },
        );
      }
      return finish(artworkMesh(anchors));
    }
    const long=k==="long-skirt", tiered=k==="tiered";
    const bottom=long?224:200, hem=long?r.legs.left.end.y-15:t.crotchY+(tiered?65:40);
    const half=t.hipHalfW*(long?1.22:tiered?1.30:1.15);
    const anchors:ArtworkAnchor[]=[];
    const a=(sx:number,sy:number,x:number,y:number)=>anchors.push({source:{x:sx,y:sy},target:{x,y}});
    a(0,0,-130,t.waistY-50); a(240,0,130,t.waistY-50);
    a(0,260,-150,hem+60); a(240,260,150,hem+60);
    a(85,54,-t.waistHalfW-.8,t.waistY); a(120,54,0,t.waistY); a(155,54,t.waistHalfW+.8,t.waistY);
    a(85,68,-t.waistHalfW-1.8,t.waistY+11); a(120,68,0,t.waistY+11); a(155,68,t.waistHalfW+1.8,t.waistY+11);
    // Enough ease to cover the original body, without inflating the hips.
    const sourceHipY=100, sourceHipHalf=35+29*(sourceHipY-54)/(bottom-54);
    a(120-sourceHipHalf,sourceHipY,-t.hipHalfW-3,t.hipY+3);
    a(120,sourceHipY,0,t.hipY+3);
    a(120+sourceHipHalf,sourceHipY,t.hipHalfW+3,t.hipY+3);
    addHangingHem(anchors,
      { x:120, y:bottom, halfWidth:64, curve:10, bandHeight:18, bandHalfWidth:64-29*18/(bottom-54) },
      { y:hem, halfWidth:half, bandHeight:long?15:12, bandHalfWidth:half-2 },
      { flare:long?2.5:tiered?3.5:3, sag:long?7:8, curl:long?1.1:1.6 },
    );
    return finish(artworkMesh(anchors));
  }
  if (item.category==="socks") {
    const sourceTop=k==="knee-socks"?42:k==="crew-socks"?98:153;
    return (["left","right"] as const).flatMap((key,i)=>{
      const leg=r.legs[key],foot=r.feet[key];
      const top=k==="knee-socks"?leg.mid.y+7:k==="crew-socks"?leg.mid.y+(leg.end.y-leg.mid.y)*.47:leg.end.y-10;
      const ratio=Math.max(0,Math.min(1,(top-leg.mid.y)/(leg.end.y-leg.mid.y)));
      const topX=leg.mid.x+(leg.end.x-leg.mid.x)*ratio,topW=leg.midW+(leg.endW-leg.midW)*ratio+1.3;
      const anchors:ArtworkAnchor[]=[];
      const a=(x:number,y:number,tx:number,ty:number)=>anchors.push({source:{x:x+i*100,y},target:{x:tx,y:ty}});
      a(22,sourceTop-4,topX-topW*2,top-4);a(112,sourceTop-4,topX+topW*2,top-4);
      a(22,228,foot.toe.x-foot.halfW*1.6,foot.groundY+7);a(112,228,foot.toe.x+foot.halfW*1.6,foot.groundY+7);
      a(43,sourceTop,topX-topW,top);a(81,sourceTop,topX+topW,top);
      const calfW=k==="ankle-socks"?topW:(topW+leg.endW)/2+4;
      a(39.5,(sourceTop+180)/2,(topX+leg.end.x)/2-calfW,(top+leg.end.y)/2);
      a(79.5,(sourceTop+180)/2,(topX+leg.end.x)/2+calfW,(top+leg.end.y)/2);
      a(36,180,leg.end.x-leg.endW-1,leg.end.y);a(78,180,leg.end.x+leg.endW+1,leg.end.y);
      a(28,200,foot.toe.x-foot.halfW-1,foot.groundY-9);a(101,201,foot.toe.x+foot.halfW+1,foot.groundY-9);
      a(40,220,foot.toe.x-foot.halfW+1,foot.groundY+1);a(85,220,foot.toe.x+foot.halfW-1,foot.groundY+1);
      return artworkMesh(anchors);
    });
  }
  if (item.category==="shoes") {
    return finish(fitShoeArtwork(r,k));
  }
  if (item.category==="head") {
    const h=r.head;
    if (k==="glasses") return box(24,96,192,76,h.cx-u*.52,h.eyeY-u*.09,u*1.04,u*.35);
    if (k==="ribbon") return box(35,62,170,141,h.cx-u*.76,h.crownY+u*.12,u*.6,u*.5);
    if (k==="flower") return box(65,60,110,148,h.cx-u*.7,h.crownY+u*.18,u*.37,u*.49);
    if (k==="headphones") return box(45,35,150,155,h.cx-u*.75,h.crownY-u*.1,u*1.5,u*1.05);
    return box(25,k==="beret"?48:60,190,k==="beret"?118:144,h.cx-u*.77,h.crownY-u*.26,u*1.54,u*(k==="beret"?.68:.85));
  }
  if (item.category==="bag") {
    if (k==="backpack") return box(50,40,140,180,-t.shoulderHalfW*1.25,t.shoulderY+10,t.shoulderHalfW*2.5,140);
    const hand=r.hands.right;
    return box(40,30,160,195,hand.tip.x-25,hand.tip.y-14,56,70);
  }
  if (k==="earrings"||k==="hoops") return ([-1,1] as const).flatMap((side,i)=>box(38+i*90,73,72,108,r.head.cx+side*r.head.earDX-7,r.head.earY,14,23));
  if (k==="bracelet") return box(45,75,150,135,r.hands.right.wrist.x-10,r.hands.right.wrist.y-5,20,18);
  if (k==="choker") return box(48,85,144,92,-t.neckHalfW*1.2,t.neckTopY+5,t.neckHalfW*2.4,17);
  return box(45,60,150,158,-t.neckHalfW*1.7,t.neckTopY+5,t.neckHalfW*3.4,45);
}
