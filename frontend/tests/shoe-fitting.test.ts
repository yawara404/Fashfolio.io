import {describe,it,expect} from "vitest";
import catalog from "../data/wardrobe.json";
import {characterGeometry} from "../utils/mannequinGeometry";
import {fitCatalogArtwork} from "../utils/catalogFitting";
import {projectArtworkPoint} from "../utils/garmentMesh";
import {artworkBodyX,artworkBodyY} from "../data/characterArtwork";
import {catalogArtworkLayers} from "../utils/catalogArtwork";
import type {Garment} from "../types/wardrobe";
const shoes=(catalog.items as Garment[]).filter(item=>item.category === "shoes");

describe("shoes sewn to the illustrated feet",()=>{
  it("keeps every outsole on the same ground and covers the bare toes at every proportion",()=>{
    for(const gender of ["girl","boy"] as const)for(const heads of [5,6,7])for(const pose of ["relax","t-pose"])for(const item of shoes){
      const rig=characterGeometry(heads,gender,pose).rig;
      const pieces=fitCatalogArtwork(rig,item).filter(p=>!p.layer);
      const boot=["boots","long-boots"].includes(item.kind);
      for(const [i,key] of (["left","right"] as const).entries()){
        const left=projectArtworkPoint(pieces,{x:(boot?30:29)+i*100,y:boot?221:214})!;
        const right=projectArtworkPoint(pieces,{x:(boot?108:105)+i*100,y:boot?221:214})!;
        expect(left.y,item.id).toBeCloseTo(rig.feet[key].groundY+2,2);
        expect(right.y,item.id).toBeCloseTo(left.y,2);
        expect(left.x,item.id).toBeLessThan(rig.feet[key].toe.x-rig.feet[key].halfW);
        expect(right.x,item.id).toBeGreaterThan(rig.feet[key].toe.x+rig.feet[key].halfW);
      }
    }
  });
  it("wraps the long boot shaft around the actual calf instead of leaving bare skin beside it",()=>{
    const item=shoes.find(item=>item.id === "long-boots")!;
    const rig=characterGeometry(5,"girl").rig,pieces=fitCatalogArtwork(rig,item);
    for(const [i,key] of (["left","right"] as const).entries()){
      const y=artworkBodyY(1245),top=rig.legs[key].mid.y+18;
      const f=(y-top)/(rig.feet[key].ankle.y-top);
      const left=projectArtworkPoint(pieces,{x:47-5*f+i*100,y:38+140*f})!;
      const right=projectArtworkPoint(pieces,{x:94-5*f+i*100,y:38+140*f})!;
      expect(left.x).toBeLessThan(artworkBodyX(i===0?398:544)-1);
      expect(right.x).toBeGreaterThan(artworkBodyX(i===0?472:618)+1);
      expect(left.y).toBeCloseTo(y,2);
      expect(right.y).toBeCloseTo(y,2);
    }
  });
  it("keeps open shoe backs behind the foot and laces independent of the shoe mesh",()=>{
    for(const id of ["mary-janes","loafers","sandals"]) expect(catalogArtworkLayers(shoes.find(item=>item.id===id)!)).toContain("lining-back");
    for(const id of ["ankle-boots","sneakers"]) expect(catalogArtworkLayers(shoes.find(item=>item.id===id)!)).toEqual(expect.arrayContaining(["laces-left","laces-right"]));
  });
});
