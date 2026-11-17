export type GarmentArtworkLayer = "body" | "collar-back" | "collar-front" | "collar-left" | "collar-right" | "ribbon" | "lining-back" | "cuff-left" | "cuff-right" | "waistband" | "print" | "strings" | "straps" | "pocket-left" | "pocket-right" | "buckle" | "laces-left" | "laces-right" | `button-${number}`;

/** Keep the catalogue drawing editable as stacked fabric pieces, like a 2D rig. */
export function garmentArtworkLayer(source: string, layer: GarmentArtworkLayer) {
  const groups: { name: string; start: number; end: number; content: string }[] = [];
  const named = /<g\b[^>]*data-garment-layer="([^"]+)"[^>]*>/g;
  for (const match of source.matchAll(named)) {
    const tags = /<\/?g\b[^>]*>/g;
    tags.lastIndex = match.index! + match[0].length;
    let depth = 1, tag: RegExpExecArray | null;
    while ((tag = tags.exec(source))) {
      depth += tag[0].startsWith("</") ? -1 : 1;
      if (!depth) { groups.push({ name:match[1]!, start:match.index!, end:tags.lastIndex, content:source.slice(match.index! + match[0].length,tag.index) }); break; }
    }
  }
  if (layer === "body") {
    let body = source;
    for (const group of groups.reverse()) body = body.slice(0,group.start) + body.slice(group.end);
    return body;
  }
  const selected = groups.filter(group => group.name === layer);
  if (!selected.length) return "";
  const start = source.indexOf(">",source.indexOf("<g ")) + 1;
  return source.slice(0,start) + selected.map(group=>group.content).join("") + source.slice(source.lastIndexOf("</g>"));
}
