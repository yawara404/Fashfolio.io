export interface MeshPoint { x: number; y: number }
export interface ArtworkAnchor { source: MeshPoint; target: MeshPoint }
export interface ArtworkPiece { clip: string; transform: string; sourceTriangle?: string; region?: string; layer?: import("./garmentLayers").GarmentArtworkLayer; surface?: "bodice"|"sleeve-left"|"sleeve-right" }
type Triangle = [number, number, number];
const cross = (a: MeshPoint, b: MeshPoint, c: MeshPoint) => (b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
const n = (x: number) => String(Math.round(x*100000)/100000);

/** A small Delaunay cage lets the existing illustration follow sleeve/waist landmarks. */
function triangulate(input: MeshPoint[]): Triangle[] {
  const count = input.length;
  const points = [...input, { x: -10000, y: -10000 }, { x: 10000, y: -10000 }, { x: 0, y: 10000 }];
  let triangles: Triangle[] = [[count, count+1, count+2]];
  for (let i=0; i<count; i++) {
    const p = points[i]!;
    const bad = triangles.filter(([ia,ib,ic]) => {
      const a=points[ia]!, b=points[ib]!, c=points[ic]!;
      const ax=a.x-p.x, ay=a.y-p.y, bx=b.x-p.x, by=b.y-p.y, cx=c.x-p.x, cy=c.y-p.y;
      const det=(ax*ax+ay*ay)*(bx*cy-by*cx)-(bx*bx+by*by)*(ax*cy-ay*cx)+(cx*cx+cy*cy)*(ax*by-ay*bx);
      return det > .000001;
    });
    const edges = new Map<string, [number, number]>();
    for (const [a,b,c] of bad) for (const [u,v] of [[a,b],[b,c],[c,a]] as [number,number][]) {
      const key=[Math.min(u,v),Math.max(u,v)].join(":");
      if (edges.has(key)) edges.delete(key); else edges.set(key,[u,v]);
    }
    triangles=triangles.filter((triangle)=>!bad.includes(triangle));
    for (const [a,b] of edges.values()) {
      const area=cross(points[a]!,points[b]!,p);
      if (Math.abs(area)>.000001) triangles.push(area>0 ? [a,b,i] : [b,a,i]);
    }
  }
  return triangles.filter((t)=>t.every((i)=>i<count));
}

export function affinePiece(source: [MeshPoint,MeshPoint,MeshPoint], target: [MeshPoint,MeshPoint,MeshPoint]): ArtworkPiece {
  const [p,q,r]=source, [a,b,c]=target;
  const det=cross(p,q,r);
  const xx=((b.x-a.x)*(r.y-p.y)-(c.x-a.x)*(q.y-p.y))/det;
  const xy=((c.x-a.x)*(q.x-p.x)-(b.x-a.x)*(r.x-p.x))/det;
  const yx=((b.y-a.y)*(r.y-p.y)-(c.y-a.y)*(q.y-p.y))/det;
  const yy=((c.y-a.y)*(q.x-p.x)-(b.y-a.y)*(r.x-p.x))/det;
  // A fixed overlap along each edge closes raster hairlines even on long, thin
  // cloth triangles. Proportional centroid expansion left cracks on trouser legs.
  const margin=.65, orientation=Math.sign(det);
  const normals=source.map((v,i)=>{
    const next=source[(i+1)%3]!,dx=next.x-v.x,dy=next.y-v.y,length=Math.hypot(dx,dy);
    return {x:orientation*dy/length,y:-orientation*dx/length};
  });
  const clip=source.map((v,i)=>{
    const before=normals[(i+2)%3]!,after=normals[i]!;
    const x=before.x+after.x,y=before.y+after.y;
    const scale=Math.min(margin/Math.max(.0001,x*after.x+y*after.y),3/Math.max(.0001,Math.hypot(x,y)));
    return `${n(v.x+x*scale)} ${n(v.y+y*scale)}`;
  }).join(" ");
  return { clip, sourceTriangle:source.map(v=>`${n(v.x)} ${n(v.y)}`).join(" "), transform:`matrix(${n(xx)} ${n(yx)} ${n(xy)} ${n(yy)} ${n(a.x-xx*p.x-xy*p.y)} ${n(a.y-yx*p.x-yy*p.y)})` };
}

export function projectArtworkPoint(pieces: ArtworkPiece[], point: MeshPoint): MeshPoint | undefined {
  const piece=pieces.find(piece=>{
    const numbers=(piece.sourceTriangle||piece.clip).split(" ").map(Number);
    const vertices=[0,2,4].map(i=>({x:numbers[i]!,y:numbers[i+1]!}));
    const signs=vertices.map((p,i)=>cross(p,vertices[(i+1)%3]!,point));
    return signs.every(v=>v>=-.0001)||signs.every(v=>v<=.0001);
  });
  if (!piece) return;
  const [a,b,c,d,e,f]=piece.transform.slice(7,-1).split(" ").map(Number);
  return {x:a!*point.x+c!*point.y+e!,y:b!*point.x+d!*point.y+f!};
}

export function artworkMesh(anchors: ArtworkAnchor[]): ArtworkPiece[] {
  return triangulate(anchors.map(a=>a.source)).map(t=>affinePiece(t.map(i=>anchors[i]!.source) as [MeshPoint,MeshPoint,MeshPoint],t.map(i=>anchors[i]!.target) as [MeshPoint,MeshPoint,MeshPoint]));
}

export function artworkBox(source: {x:number;y:number;width:number;height:number}, target: {x:number;y:number;width:number;height:number}): ArtworkPiece[] {
  const src=[{x:source.x,y:source.y},{x:source.x+source.width,y:source.y},{x:source.x+source.width,y:source.y+source.height},{x:source.x,y:source.y+source.height}];
  const dst=[{x:target.x,y:target.y},{x:target.x+target.width,y:target.y},{x:target.x+target.width,y:target.y+target.height},{x:target.x,y:target.y+target.height}];
  return [[0,1,2],[0,2,3]].map(t=>affinePiece(t.map(i=>src[i]!) as [MeshPoint,MeshPoint,MeshPoint],t.map(i=>dst[i]!) as [MeshPoint,MeshPoint,MeshPoint]));
}
