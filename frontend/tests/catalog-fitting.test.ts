import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import sources from "../data/garmentArtwork.json";
import catalog from "../data/wardrobe.json";
import { catalogArtworkSvg, catalogArtworkUrl } from "../utils/catalogArtwork";
import { fitCatalogArtwork } from "../utils/catalogFitting";
import { characterGeometry, characterHeadRig } from "../utils/mannequinGeometry";
import type { Garment } from "../types/wardrobe";

const items=catalog.items as Garment[];
const palette=["#E8BFCB","#FAF7EF","#BECDE0","#B7ADC8","#555164"];

describe("the same clothing design in the catalogue and fitting room",()=>{
  it("uses all 42 authored SVGs without substituting a generic clothing shape",()=>{
    expect(Object.keys(sources)).toHaveLength(items.length);
    for(const item of items) {
      const original=readFileSync(resolve(process.cwd(),`public/garments/${item.id}.svg`),"utf8").trim();
      expect(catalogArtworkSvg(item,[],false)).toBe(original);
      expect(decodeURIComponent(catalogArtworkUrl(item,[],false).split(",").slice(1).join(","))).toBe(original);
    }
  });
  it("changes only paint colours and preserves collars, ribbons, seams and patterns",()=>{
    for(const item of items) {
      const original=catalogArtworkSvg(item,[],false);
      const recoloured=catalogArtworkSvg(item,palette,true);
      expect(recoloured.replace(/#[0-9a-f]{6}/gi,"COLOR")).toBe(original.replace(/#[0-9a-f]{6}/gi,"COLOR"));
    }
    const blouse=catalogArtworkSvg(items.find(i=>i.id==="ribbon-blouse")!,palette,true);
    expect(blouse).toContain('fill="#E8BFCB"');
    expect(blouse).toContain('fill="#FAF7EF"');
    expect(blouse).toContain('fill="#B7ADC8"');
  });
  it("fits every design at 5, 6 and 7 heads without folding or mirroring any artwork tile",()=>{
    for(const gender of ["girl","boy"] as const)for(const heads of [5,6,7]) {
      const rig=characterGeometry(heads,gender).rig;
      for(const item of items) {
        const head=item.category==="head"||["earrings","hoops"].includes(item.kind);
        const pieces=fitCatalogArtwork(head?characterHeadRig(rig):rig,item);
        expect(pieces.length).toBeGreaterThan(0);
        for(const piece of pieces) {
          expect(piece.clip+piece.transform).not.toMatch(/NaN|Infinity|undefined/);
          const [a,b,c,d]=piece.transform.slice(7,-1).split(" ").map(Number);
          expect(a!*d!-b!*c!,`${item.id} ${gender} ${heads}: ${piece.clip}`).toBeGreaterThan(0);
        }
      }
    }
  });
  it("wraps every skirt around the hips instead of scaling a narrow flat thumbnail",()=>{
    const project=(pieces:ReturnType<typeof fitCatalogArtwork>,x:number,y:number)=>{
      const piece=pieces.find(p=>{
        const n=p.clip.split(" ").map(Number);
        const signs=[0,2,4].map((i)=>{
          const j=(i+2)%6;
          return (n[j]!-n[i]!)*(y-n[i+1]!)-(n[j+1]!-n[i+1]!)*(x-n[i]!);
        });
        return signs.every(s=>s>=-.0001)||signs.every(s=>s<=.0001);
      })!;
      expect(piece).toBeDefined();
      const [a,b,c,d,e,f]=piece.transform.slice(7,-1).split(" ").map(Number);
      return {x:a!*x+c!*y+e!,y:b!*x+d!*y+f!};
    };
    for(const heads of [5,6,7])for(const item of items.filter(i=>["skirt","tiered","long-skirt"].includes(i.kind))) {
      const r=characterGeometry(heads,"girl").rig, pieces=fitCatalogArtwork(r,item);
      const half=35+29*46/((item.kind==="long-skirt"?224:200)-54);
      for(const side of [-1,1]) {
        const hip=project(pieces,120+side*half,100);
        expect(Math.abs(hip.x)).toBeGreaterThan(r.torso.hipHalfW+8);
        expect(hip.y).toBeCloseTo(r.torso.hipY+3,2);
      }
    }
  });
});
