import type { AvatarRig } from "~/utils/avatarRig";
import type { Garment } from "~/types/wardrobe";
import { affinePiece, artworkBox, artworkMesh, type ArtworkAnchor, type ArtworkPiece, type MeshPoint } from "~/utils/garmentMesh";

/** Fit the catalogue's actual drawing. No second interpretation of collars or trims. */
export function fitCatalogArtwork(r: AvatarRig, item: Garment): ArtworkPiece[] {
  const t=r.torso, u=r.unit, k=item.kind;
  const box=(sx:number,sy:number,sw:number,sh:number,x:number,y:number,width:number,height:number)=>artworkBox({x:sx,y:sy,width:sw,height:sh},{x,y,width,height});
  if (item.category==="tops" || (item.category==="outer" && k!=="cape")) {
    const trench=k==="trench", tee=k==="tee", knit=["knit","cardigan","hoodie"].includes(k);
    const neck=trench?35:46, shoulder=trench?45:59, chest=trench?102:111, hem=trench?224:knit?219:210;
    const hemY=trench?r.legs.left.mid.y+25:t.waistY+(k==="cardigan"?24:35);
    const hemW=trench?t.hipHalfW*1.4:t.hipHalfW*.9+5;
    const anchors:ArtworkAnchor[]=[];
    const a=(sx:number,sy:number,x:number,y:number)=>anchors.push({source:{x:sx,y:sy},target:{x,y}});
    a(0,0,-130,t.neckTopY-50); a(240,0,130,t.neckTopY-50);
    a(0,260,-160,hemY+70); a(240,260,160,hemY+70);
    a(99,neck,-t.neckHalfW*1.5,t.neckTopY+3); a(141,neck,t.neckHalfW*1.5,t.neckTopY+3);
    a(120,neck+11,0,t.shoulderY+2); a(120,76,0,t.shoulderY+19);
    a(120,chest,0,t.chestY); a(120,175,0,t.waistY); a(120,hem,0,hemY);
    a(90,175,-t.waistHalfW-6,t.waistY); a(150,175,t.waistHalfW+6,t.waistY);
    a(trench?68:85,hem,-hemW,hemY); a(trench?172:155,hem,hemW,hemY);
    const sleeves:ArtworkPiece[]=[];
    const quad=(source:MeshPoint[],target:MeshPoint[])=>[[0,1,2],[0,2,3]].map(indices=>affinePiece(indices.map(i=>source[i]!) as [MeshPoint,MeshPoint,MeshPoint],indices.map(i=>target[i]!) as [MeshPoint,MeshPoint,MeshPoint]));
    const underX=tee?87:trench?91:knit?92:93, underY=tee?102:chest;
    for (const side of [-1,1] as const) {
      const arm=r.arms[side===-1?"left":"right"];
      const sx=(left:number)=>side===-1?left:240-left;
      a(sx(75),shoulder,arm.root.x+side*3,arm.root.y);
      a(sx(underX),underY,side*(t.chestHalfW+5),t.chestY);
      const point=(x:number,y:number)=>({x:sx(x),y});
      const root={x:arm.root.x+side*3,y:arm.root.y};
      const under={x:side*(t.chestHalfW+5),y:t.chestY};
      if (tee) {
        const end={x:arm.root.x+(arm.mid.x-arm.root.x)*.45,y:arm.root.y+(arm.mid.y-arm.root.y)*.45};
        sleeves.push(...quad([point(75,shoulder),point(38,102),point(67,124),point(underX,underY)],[root,{x:end.x+side*19,y:end.y-2},{x:end.x-side*6,y:end.y+5},under]));
      } else {
        const outer=point(trench?51:48,chest), inner=point(trench?86:87,chest);
        const midOuter={x:arm.mid.x+side*17,y:arm.mid.y}, midInner={x:arm.mid.x-side*16,y:arm.mid.y};
        sleeves.push(...quad([point(75,shoulder),outer,inner,point(underX,underY)],[root,midOuter,midInner,under]));
        const cuff=trench?186:knit?221:197;
        sleeves.push(...quad([outer,point(trench?47:knit?44:47,cuff),point(trench?77:knit?82:83,cuff),inner],[midOuter,{x:arm.end.x+side*16,y:arm.end.y+10},{x:arm.end.x-side*15,y:arm.end.y+10},midInner]));
      }
    }
    // Torso and sleeves meet at the armhole. Separating their cages allows a
    // cropped hem above the cuffs without folding the original design over itself.
    const hemLeft=trench?68:tee?83:knit?85:86;
    const region=`75 0 165 0 165 ${shoulder} ${240-underX} ${underY} ${240-hemLeft} ${hem} ${240-hemLeft} 260 ${hemLeft} 260 ${hemLeft} ${hem} ${underX} ${underY} 75 ${shoulder}`;
    return [...artworkMesh(anchors).map(piece=>({...piece,region})),...sleeves];
  }
  if (k==="cape") return box(30,20,180,215,-t.shoulderHalfW*1.9,t.neckTopY-5,t.shoulderHalfW*3.8,t.crotchY+80-t.neckTopY);
  if (item.category==="bottoms") {
    if (["pants","cargo","shorts"].includes(k)) {
      const short=k==="shorts", sourceHem=short?150:224;
      const anchors:ArtworkAnchor[]=[];
      const a=(sx:number,sy:number,x:number,y:number)=>anchors.push({source:{x:sx,y:sy},target:{x,y}});
      const endY=short?r.legs.left.root.y+r.legs.left.upper*.5:r.legs.left.end.y+6;
      a(0,0,-130,t.waistY-40); a(240,0,130,t.waistY-40); a(0,260,-140,endY+60); a(240,260,140,endY+60);
      a(83,38,-t.waistHalfW-5,t.waistY); a(157,38,t.waistHalfW+5,t.waistY); a(120,38,0,t.waistY);
      a(80,85,-t.hipHalfW-6,t.hipY); a(160,85,t.hipHalfW+6,t.hipY); a(120,101,0,t.crotchY+3);
      for (const side of [-1,1] as const) {
        const leg=r.legs[side===-1?"left":"right"];
        const sx=(left:number)=>side===-1?left:240-left;
        if (!short) {
          a(sx(76),160,leg.mid.x+side*(leg.midW+10),leg.mid.y);
          a(sx(113),160,leg.mid.x-side*(leg.midW+10),leg.mid.y);
        }
        const center=short?(leg.root.x+leg.mid.x)/2:leg.end.x, width=short?Math.min(leg.rootW+5,Math.abs(center)-2):leg.endW+12;
        a(sx(71),sourceHem,center+side*width,endY); a(sx(108),sourceHem,center-side*width,endY);
      }
      return artworkMesh(anchors);
    }
    const long=k==="long-skirt", tiered=k==="tiered";
    const bottom=long?224:200, hem=long?r.legs.left.end.y-15:t.crotchY+(tiered?65:40);
    const half=t.hipHalfW*(long?1.75:tiered?1.55:1.4);
    const anchors:ArtworkAnchor[]=[];
    const a=(sx:number,sy:number,x:number,y:number)=>anchors.push({source:{x:sx,y:sy},target:{x,y}});
    a(0,0,-130,t.waistY-50); a(240,0,130,t.waistY-50);
    a(0,260,-150,hem+60); a(240,260,150,hem+60);
    a(85,54,-t.waistHalfW-5,t.waistY-2); a(120,54,0,t.waistY-2); a(155,54,t.waistHalfW+5,t.waistY-2);
    const sourceHipY=100, sourceHipHalf=35+29*(sourceHipY-54)/(bottom-54);
    a(120-sourceHipHalf,sourceHipY,-t.hipHalfW-9,t.hipY+3);
    a(120,sourceHipY,0,t.hipY+3);
    a(120+sourceHipHalf,sourceHipY,t.hipHalfW+9,t.hipY+3);
    a(56,bottom,-half,hem); a(120,bottom,0,hem+6); a(184,bottom,half,hem);
    return artworkMesh(anchors);
  }
  if (item.category==="shoes") {
    return (["left","right"] as const).flatMap((key,i)=>{
      const foot=r.feet[key], leg=r.legs[key];
      const boots=k==="boots"||k==="long-boots", sourceTop=k==="long-boots"?34:boots?91:95;
      const top=k==="long-boots"?leg.mid.y+18:foot.ankle.y-(boots?25:8);
      return box(boots?25+i*87:22+i*85,sourceTop,90,224-sourceTop,foot.toe.x-foot.halfW*1.2,top,foot.halfW*2.4,foot.groundY+3-top);
    });
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
