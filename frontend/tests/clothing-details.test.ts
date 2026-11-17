import {describe,expect,it} from "vitest";
import catalog from "../data/wardrobe.json";
import {catalogArtworkLayers,catalogArtworkSvg} from "../utils/catalogArtwork";
import {fitCatalogArtwork} from "../utils/catalogFitting";
import {characterGeometry} from "../utils/mannequinGeometry";
import {projectArtworkPoint} from "../utils/garmentMesh";
import type {Garment} from "../types/wardrobe";

const items=catalog.items as Garment[];
const structural=new Set(["body","lining-back","waistband","straps"]);

describe("independent clothing decorations",()=>{
  it("preserves decoration aspect ratios in final screen space for every pose and proportion",()=>{
    for(const gender of ["girl","boy"] as const)for(const heads of [5,6,7])for(const pose of ["relax","t-pose"]){
      const frame=characterGeometry(heads,gender,pose);
      for(const item of items.filter(item=>["inner","tops","outer","bottoms","shoes"].includes(item.category))){
        const pieces=fitCatalogArtwork(frame.rig,item);
        for(const layer of catalogArtworkLayers(item)) expect(pieces.some(piece=>piece.layer===layer),`${item.id}: missing ${layer}`).toBe(true);
        for(const piece of pieces.filter(piece=>piece.layer&&!structural.has(piece.layer))){
          const [a,b,c,d]=piece.transform.slice(7,-1).split(" ").map(Number);
          const x={x:a!*frame.sx,y:b!*frame.sy},y={x:c!*frame.sx,y:d!*frame.sy};
          const w=Math.hypot(x.x,x.y),h=Math.hypot(y.x,y.y);
          expect(w/h,`${item.id} ${piece.layer} ${heads} ${pose}: aspect`).toBeCloseTo(1,4);
          expect((x.x*y.x+x.y*y.y)/(w*h),`${item.id} ${piece.layer}: shear`).toBeCloseTo(0,4);
        }
      }
    }
  });
  it("keeps the sailor collar panels separated and ties them with a full-size bow",()=>{
    const sailor=items.find(item=>item.id==="sailor-top")!;
    expect(catalogArtworkLayers(sailor)).toEqual(expect.arrayContaining(["collar-left","collar-right","collar-back","ribbon"]));
    expect(catalogArtworkLayers(sailor)).not.toContain("collar-front");
    const left=catalogArtworkSvg(sailor,[],false,"collar-left"),right=catalogArtworkSvg(sailor,[],false,"collar-right");
    expect(left).toContain("113 96");
    expect(right).toContain('scale(-1 1)');
    for(const pose of ["relax","t-pose"]){
      const pieces=fitCatalogArtwork(characterGeometry(5,"girl",pose).rig,sailor);
      const a=projectArtworkPoint(pieces.filter(p=>p.layer==="collar-left"),{x:113,y:96})!;
      const b=projectArtworkPoint(pieces.filter(p=>p.layer==="collar-right"),{x:127,y:96})!;
      expect(b.x-a.x).toBeGreaterThan(12);
      const ribbon=pieces.filter(p=>p.layer==="ribbon");
      const l=projectArtworkPoint(ribbon,{x:97,y:112})!,r=projectArtworkPoint(ribbon,{x:143,y:112})!;
      expect(r.x-l.x).toBeGreaterThan(40);
      expect(Math.abs(projectArtworkPoint(ribbon,{x:120,y:112})!.y-a.y)).toBeLessThan(5);
    }
  });
  it("fits the actual rigid turtleneck just below the chin",()=>{
    const knit=items.find(item=>item.id==="rib-knit")!;
    for(const heads of [5,6,7]){
      const rig=characterGeometry(heads,"girl").rig;
      const pieces=fitCatalogArtwork(rig,knit).filter(piece=>piece.layer==="collar-front");
      const opening=projectArtworkPoint(pieces,{x:120,y:36})!,hem=projectArtworkPoint(pieces,{x:120,y:56})!;
      expect(opening.y).toBeGreaterThan(rig.torso.neckTopY+3);
      expect(hem.y-opening.y).toBeLessThan(22);
    }
  });
  it("cuts open-neck bodices along their collars and U-necks and aligns them with the collar layers",()=>{
    for(const id of ["piped-cardigan","zip-hoodie","graphic-tee","crop-knit","ribbon-blouse","lace-blouse","mens-shirt","sailor-top","short-blouson","checked-jacket","mens-blazer","trench"]){
      const item=items.find(entry=>entry.id===id)!;
      const bodySvg=catalogArtworkSvg(item,[],false,"body");
      expect(bodySvg,id).not.toMatch(/99 45H141|100 35H140|99 46 120 57 141 46|100 46Q120 62 140 46/);
      for(const heads of [5,6,7])for(const pose of ["relax","t-pose"] as const){
        const rig=characterGeometry(heads,"girl",pose).rig;
        const pieces=fitCatalogArtwork(rig,item);
        const body=pieces.filter(p=>!p.layer||p.layer==="body");
        const collar=pieces.filter(p=>p.layer==="collar-front"||p.layer==="collar-left");
        const topPoint=id==="trench"?{x:100,y:35}:{x:99,y:id==="crop-knit"||id==="piped-cardigan"?45:46};
        const bottomY=id==="trench"?108:["checked-jacket","mens-blazer","short-blouson"].includes(id)?113:id==="graphic-tee"?57:id==="piped-cardigan"||id==="zip-hoodie"?55:65;
        const bottomPoint={x:["checked-jacket","mens-blazer","short-blouson","trench"].includes(id)?117:120,y:bottomY};
        const bodyTop=projectArtworkPoint(body,topPoint)!,collarTop=projectArtworkPoint(collar,topPoint)!;
        const bodyBottom=projectArtworkPoint(body,bottomPoint)!,collarBottom=projectArtworkPoint(collar,bottomPoint)!;
        expect(bodyTop.x,`${id} ${heads} ${pose} top.x`).toBeCloseTo(collarTop.x,2);
        expect(bodyTop.y,`${id} ${heads} ${pose} top.y`).toBeCloseTo(collarTop.y,2);
        expect(bodyBottom.x,`${id} ${heads} ${pose} bottom.x`).toBeCloseTo(collarBottom.x,2);
        expect(bodyBottom.y,`${id} ${heads} ${pose} bottom.y`).toBeCloseTo(collarBottom.y,2);
      }
    }
  });
});
