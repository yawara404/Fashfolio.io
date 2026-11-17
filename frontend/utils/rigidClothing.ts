import { affinePiece, type MeshPoint } from "~/utils/garmentMesh";

/** Uniform scale/rotation in screen space, compensating for body proportions. */
export function rigidArtwork(box:{x:number;y:number;width:number;height:number}, sourceAnchor:MeshPoint, targetAnchor:MeshPoint, scale:number, aspect=1, angle=0) {
  const source=[{x:box.x,y:box.y},{x:box.x+box.width,y:box.y},{x:box.x+box.width,y:box.y+box.height},{x:box.x,y:box.y+box.height}];
  const cos=Math.cos(angle),sin=Math.sin(angle);
  const target=source.map(p=>{
    const x=(p.x-sourceAnchor.x)*scale,y=(p.y-sourceAnchor.y)*scale;
    return {x:targetAnchor.x+x*cos-y*sin,y:targetAnchor.y+(x*sin+y*cos)*aspect};
  });
  return [[0,1,2],[0,2,3]].map(indices=>affinePiece(indices.map(i=>source[i]!) as [MeshPoint,MeshPoint,MeshPoint],indices.map(i=>target[i]!) as [MeshPoint,MeshPoint,MeshPoint]));
}
