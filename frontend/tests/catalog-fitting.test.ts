import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import sources from "../data/garmentArtwork.json";
import catalog from "../data/wardrobe.json";
import { catalogArtworkSvg, catalogArtworkUrl } from "../utils/catalogArtwork";
import { fitCatalogArtwork } from "../utils/catalogFitting";
import { characterGeometry, characterHeadRig } from "../utils/mannequinGeometry";
import { studioPoses } from "../data/studioPoses";
import type { Garment } from "../types/wardrobe";

const items=catalog.items as Garment[];
const palette=["#E8BFCB","#FAF7EF","#BECDE0","#B7ADC8","#555164"];

const project=(pieces:ReturnType<typeof fitCatalogArtwork>,x:number,y:number)=>{
      const piece=pieces.filter(piece=>!piece.layer||piece.layer === "body").find(p=>{
        const n=(p.sourceTriangle||p.clip).split(" ").map(Number);
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


describe("the same clothing design in the catalogue and fitting room",()=>{
  it("uses every authored SVG without substituting a generic clothing shape",()=>{
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
    for(const pose of studioPoses)for(const gender of ["girl","boy"] as const)for(const heads of [5,6,7]) {
      const rig=characterGeometry(heads,gender,pose.id).rig;
      for(const item of items) {
        const head=item.category==="head"||["earrings","hoops"].includes(item.kind);
        const pieces=fitCatalogArtwork(head?characterHeadRig(rig):rig,item);
        expect(pieces.length).toBeGreaterThan(0);
        for(const piece of pieces) {
          expect(piece.clip+piece.transform).not.toMatch(/NaN|Infinity|undefined/);
          const [a,b,c,d]=piece.transform.slice(7,-1).split(" ").map(Number);
          expect(a!*d!-b!*c!,`${item.id} ${gender} ${heads} ${pose.id}: ${piece.clip}`).toBeGreaterThan(0);
        }
      }
    }
  });
  it("lets hems hang below their supported edges while keeping cropped jackets above the hips", () => {
    const rig=characterGeometry(5,"girl").rig;
    for (const id of ["short-blouson", "rib-knit", "graphic-tee", "piped-cardigan", "trench"]) {
      const item=items.find(item=>item.id===id)!;
      const pieces=fitCatalogArtwork(rig,item);
      const hem=id==="trench"?224:["rib-knit","piped-cardigan"].includes(id)?219:210;
      const edge=id==="trench"?68:id==="graphic-tee"?83:id==="short-blouson"?86:85;
      const centre=project(pieces,120,hem), side=project(pieces,edge,hem);
      expect(centre.y).toBeGreaterThan(side.y+1);
      if (id==="short-blouson") expect(centre.y).toBeLessThan(rig.torso.hipY);
    }
  });

  it("wraps the turtleneck below the chin with a shallow rounded seam instead of a pointed bib", () => {
    const knit = items.find(item => item.id === "rib-knit")!;
    for (const pose of studioPoses) for (const gender of ["girl", "boy"] as const) for (const heads of [5, 6, 7]) {
      const r = characterGeometry(heads, gender, pose.id).rig;
      const pieces = fitCatalogArtwork(r, knit);
      const opening = project(pieces, 120, 30), front = project(pieces, 120, 61.5);
      const left = project(pieces, 102, 55), right = project(pieces, 138, 55);
      expect(opening.y).toBeGreaterThan(r.torso.neckTopY + 3);
      expect(front.y - opening.y).toBeLessThan(22);
      expect(front.y - (left.y + right.y) / 2).toBeGreaterThan(1);
      expect(front.y - (left.y + right.y) / 2).toBeLessThan(5);
      expect(right.x - left.x).toBeGreaterThan(r.torso.neckHalfW * 2);
      expect(right.x - left.x).toBeLessThan(r.torso.neckHalfW * 3);
    }
  });

  it("places the two original shoe drawings on separate feet without cutting into the neighbouring shoe", () => {
    const rig = characterGeometry(5, "girl").rig;
    for (const item of items.filter(item => item.category === "shoes")) {
      const pieces = fitCatalogArtwork(rig, item);
      const boots=["boots","long-boots"].includes(item.kind);
      const soleY=boots?221:214,soleX=boots?69:67;
      const left = project(pieces, soleX, soleY), right = project(pieces, soleX+100, soleY);
      expect(right.x - left.x, item.id).toBeCloseTo(rig.feet.right.toe.x - rig.feet.left.toe.x, 2);
      expect(right.y, item.id).toBeCloseTo(left.y, 2);
    }
  });

  it("rolls free hems outward from their supported row on each clothing type", () => {
    const samples=[
      {id:"ribbon-blouse",x:120,y:210,half:34,bandHalf:34*.98,band:16},
      {id:"rib-knit",x:120,y:219,half:35,bandHalf:35*.98,band:16},
      {id:"short-blouson",x:120,y:210,half:34,bandHalf:34*.98,band:16},
      {id:"trench",x:120,y:224,half:52,bandHalf:52*.98,band:16},
      {id:"pleated-skirt",x:120,y:200,half:64,bandHalf:64-29*18/146,band:18},
      {id:"long-skirt",x:120,y:224,half:64,bandHalf:64-29*18/170,band:18},
      {id:"long-cape",x:120,y:205,half:74,bandHalf:67,band:16},
      {id:"wide-jeans",x:89.5,y:224,half:18.5,bandX:89.5+5*18/64,bandHalf:18.5*.98,band:18},
      {id:"tailored-shorts",x:89.5,y:150,half:18.5,bandHalf:18.5*.98,band:12},
    ];
    for (const sample of samples) {
      const r=characterGeometry(5,"girl").rig;
      const pieces=fitCatalogArtwork(r,items.find(item=>item.id===sample.id)!);
      const edge=project(pieces,sample.x-sample.half,sample.y);
      const centre=project(pieces,sample.x,sample.y);
      const bandX=sample.bandX??sample.x;
      const supported=project(pieces,bandX-sample.bandHalf,sample.y-sample.band);
      const supportedCentre=project(pieces,bandX,sample.y-sample.band);
      expect(Math.abs(edge.x-centre.x),sample.id).toBeGreaterThan(Math.abs(supported.x-supportedCentre.x)+.5);
    }
  });

  it("fits the blouse body to a skirt without cropping its artwork or changing its sleeves", () => {
    const r=characterGeometry(5,"girl").rig;
    const blouse=items.find(item=>item.id==="ribbon-blouse")!;
    const loose=fitCatalogArtwork(r,blouse);
    const waist=fitCatalogArtwork(r,blouse,{waistFit:true});
    expect(waist.filter(piece=>!piece.region)).toEqual(loose.filter(piece=>!piece.region));
    const edge=project(waist,120,214.5);
    expect(edge.y).toBeGreaterThan(r.torso.waistY+12);
    expect(edge.y).toBeLessThan(r.torso.hipY);
    expect(project(waist,120,57)).toEqual(project(loose,120,57));
  });

  it("wraps every skirt around the hips instead of scaling a narrow flat thumbnail",()=>{
    for(const heads of [5,6,7])for(const item of items.filter(i=>["skirt","tiered","long-skirt"].includes(i.kind))) {
      const r=characterGeometry(heads,"girl").rig, pieces=fitCatalogArtwork(r,item);
      const half=35+29*46/((item.kind==="long-skirt"?224:200)-54);
      for(const side of [-1,1]) {
        const hip=project(pieces,120+side*half,100);
        expect(Math.abs(hip.x)).toBeGreaterThan(r.torso.hipHalfW+2);
        expect(Math.abs(hip.x)).toBeLessThan(r.torso.hipHalfW+5);
        expect(hip.y).toBeCloseTo(r.torso.hipY+3,2);
      }
    }
  });
  it("sews skirt and trouser waistbands to the actual waist instead of a wide rectangular belt",()=>{
    for(const heads of [5,6,7])for(const item of items.filter(item=>["bottoms","underwear"].includes(item.category)&&item.kind!=="tights")){
      const rig=characterGeometry(heads,"girl").rig,pieces=fitCatalogArtwork(rig,item);
      const skirt=["skirt","tiered","long-skirt"].includes(item.kind);
      const top=project(pieces,skirt?85:83,skirt?54:38);
      const lower=project(pieces,skirt?85:83,skirt?68:52);
      expect(Math.abs(top.x),item.id).toBeLessThanOrEqual(rig.torso.waistHalfW+1.01);
      expect(Math.abs(lower.x),item.id).toBeLessThanOrEqual(rig.torso.waistHalfW+2.01);
      expect(lower.y-top.y).toBeGreaterThan(9);
      expect(lower.y-top.y).toBeLessThan(12);
    }
  });
  it("keeps the fitted athletic shorts shorter than cycling shorts without removing their fabric legs",()=>{
    const rig=characterGeometry(5,"girl").rig;
    const short=fitCatalogArtwork(rig,items.find(item=>item.id==="cotton-inner-shorts")!);
    const spats=fitCatalogArtwork(rig,items.find(item=>item.id==="inner-spats")!);
    const hem=project(short,89.5,126),longHem=project(spats,89.5,150);
    expect(hem.y).toBeGreaterThan(rig.torso.crotchY+15);
    expect(hem.y).toBeLessThan(rig.legs.left.root.y+rig.legs.left.upper*.30);
    expect(longHem.y-hem.y).toBeGreaterThan(40);
  });
});
