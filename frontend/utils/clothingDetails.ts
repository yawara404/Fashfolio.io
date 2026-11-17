import type { AvatarRig } from "~/utils/avatarRig";
import type { Garment } from "~/types/wardrobe";
import { catalogArtworkLayers, catalogArtworkAnchor } from "~/utils/catalogArtwork";
import { projectArtworkPoint, type ArtworkPiece } from "~/utils/garmentMesh";
import { fitSailorCollar } from "~/utils/sailorCollar";
import { rigidArtwork } from "~/utils/rigidClothing";
import type { GarmentArtworkLayer } from "~/utils/garmentLayers";

export function fitClothingDetails(rig: AvatarRig, item: Garment, body: ArtworkPiece[]) {
  const layers=catalogArtworkLayers(item);
  if (!layers.length) return body;
  const t=rig.torso,aspect=rig.detailScaleY||1,back:ArtworkPiece[]=[],front:ArtworkPiece[]=[];
  const put=(layer:GarmentArtworkLayer,pieces:ArtworkPiece[],behind=false)=>(behind?back:front).push(...pieces.map(piece=>({...piece,layer})));
  const rigid=(box:{x:number;y:number;width:number;height:number},sx:number,sy:number,x:number,y:number,scale:number,angle=0)=>rigidArtwork(box,{x:sx,y:sy},{x,y},scale,aspect,angle);
  const sailor=item.kind==="sailor"?fitSailorCollar(rig):null;
  const neck=t.shoulderY-5;
  for (const layer of layers) {
    if (layer==="lining-back") put(layer,body,true);
    else if (layer==="straps"||layer==="waistband") put(layer,body);
    else if (layer==="collar-back") {
      if (sailor) put(layer,sailor.back,true);
      else if (item.kind==="hoodie") put(layer,rigid({x:80,y:34,width:80,height:48},120,46,0,neck,.9),true);
      else {
        const y=item.kind==="knit"?30:item.kind==="trench"?35:46;
        put(layer,rigid({x:94,y:y-12,width:52,height:24},120,item.kind==="knit"?30:item.kind==="trench"?35:47,0,item.kind==="knit"?t.neckTopY+5:neck,item.kind==="knit"?.65:.9),true);
      }
    } else if (["collar-front","collar-left","collar-right"].includes(layer)) {
      if (sailor) put(layer,sailor.front);
      else if (item.kind==="knit") put(layer,rigid({x:98,y:32,width:44,height:28},120,44,0,t.neckTopY+11,.72));
      else if (item.kind==="cape") put(layer,rigid({x:96,y:22,width:48,height:42},120,42,0,t.neckTopY+11,.65));
      else {
        const trench=item.kind==="trench",lapel=["trench","blazer","blouson"].includes(item.kind);
        put(layer,rigid({x:86,y:trench?31:43,width:68,height:lapel?84:48},120,trench?35:47,0,neck,.9));
      }
    } else if (layer==="ribbon") {
      if (sailor) put(layer,sailor.ribbon);
      else put(layer,rigid({x:90,y:62,width:60,height:54},120,80,0,neck+(34*.9-2)*aspect,.9));
    } else if (layer==="print") put(layer,rigid({x:100,y:95,width:40,height:45},120,118,0,t.chestY+13,.9));
    else if (layer==="strings") {
      const anchor=projectArtworkPoint(body,{x:120,y:54})||{x:0,y:neck+6};
      put(layer,rigid({x:98,y:48,width:44,height:56},120,54,anchor.x,anchor.y,.9));
    } else if (layer==="cuff-left"||layer==="cuff-right") {
      const left=layer==="cuff-left",knit=["knit","cardigan","hoodie"].includes(item.kind),tee=item.kind==="tee",trench=item.kind==="trench";
      const source={x:left?(tee?52.5:trench?62:knit?64:66):(tee?187.5:trench?178:knit?176:174),y:tee?110:trench?171:knit?203:181};
      const direction={x:3,y:tee?(left?22:-22)/29*3:knit?(left?7:-7)/30*3:0};
      const pieces=body.filter(piece=>piece.surface===(left?"sleeve-left":"sleeve-right"));
      const anchor=projectArtworkPoint(pieces,source),edge=projectArtworkPoint(pieces,{x:source.x+direction.x,y:source.y+direction.y});
      if (anchor&&edge) {
        const dx=edge.x-anchor.x,dy=(edge.y-anchor.y)/aspect;
        const scale=Math.max(.65,Math.min(1.15,Math.hypot(dx,dy)/Math.hypot(direction.x,direction.y)));
        const angle=Math.atan2(dy,dx)-Math.atan2(direction.y,direction.x);
        put(layer,rigid({x:source.x-23,y:source.y-18,width:46,height:36},source.x,source.y,anchor.x,anchor.y,scale,angle));
      }
    } else if (layer==="laces-left"||layer==="laces-right") {
      const source=catalogArtworkAnchor(item,layer);
      const anchor=source&&projectArtworkPoint(body,source);
      const horizontal=source&&projectArtworkPoint(body,{x:source.x+8,y:source.y});
      const vertical=source&&projectArtworkPoint(body,{x:source.x,y:source.y+8});
      if(source&&anchor&&horizontal&&vertical){
        const sx=Math.hypot(horizontal.x-anchor.x,(horizontal.y-anchor.y)/aspect)/8;
        const sy=Math.hypot(vertical.x-anchor.x,(vertical.y-anchor.y)/aspect)/8;
        const scale=Math.max(.2,Math.min(sx,sy));
        const boots=item.kind==="boots";
        put(layer,rigid({x:source.x-21,y:boots?110:115,width:42,height:boots?86:64},source.x,source.y,anchor.x,anchor.y,scale));
      }
    } else {
      const source=catalogArtworkAnchor(item,layer);
      const anchor=source&&projectArtworkPoint(body,source);
      if (source&&anchor) {
        const small=layer.startsWith("button-")||layer==="buckle";
        const halfW=small?(layer==="buckle"?12:6):22,halfH=small?(layer==="buckle"?12:6):25;
        put(layer,rigid({x:source.x-halfW,y:source.y-halfH,width:halfW*2,height:halfH*2},source.x,source.y,anchor.x,anchor.y,small?1:.9));
      }
    }
  }
  return [...back,...body,...front];
}
