import type { ArtworkAnchor } from "~/utils/garmentMesh";

interface HemSource {
  x: number;
  y: number;
  halfWidth: number;
  curve?: number;
  bandHeight?: number;
  bandX?: number;
  bandHalfWidth?: number;
}

interface HemTarget {
  x?: number;
  y: number;
  halfWidth: number;
  bandHeight?: number;
  bandX?: number;
  bandHalfWidth?: number;
}

export interface HemFinish {
  /** Free edges roll outward while the row above keeps its fitted width. */
  flare: number;
  /** The centre hangs lower than the supported side edges. */
  sag: number;
  /** Slightly lifted corners show the turn of the fabric. */
  curl: number;
}

/**
 * Shape the existing illustration with two matching rows of landmarks.
 * The supported row leaves the waist/hip fit intact; the free edge can flare
 * and hang. Dense, continuous rows keep drawn piping and pleats curved together.
 */
export function addHangingHem(
  anchors: ArtworkAnchor[],
  source: HemSource,
  target: HemTarget,
  finish: HemFinish,
) {
  const put = (sx: number, sy: number, x: number, y: number) => {
    const anchor = { source: { x: sx, y: sy }, target: { x, y } };
    const index = anchors.findIndex(value => Math.abs(value.source.x - sx) < 1e-5 && Math.abs(value.source.y - sy) < 1e-5);
    if (index < 0) anchors.push(anchor);
    else anchors[index] = anchor;
  };
  for (const fraction of [-1, -.75, -.5, -.25, 0, .25, .5, .75, 1]) {
    const round = 1 - fraction * fraction;
    const corner = Math.abs(fraction) ** 6;
    put(
      (source.bandX ?? source.x) + (source.bandHalfWidth ?? source.halfWidth * .98) * fraction,
      source.y - (source.bandHeight ?? 16) + (source.curve ?? 0) * .3 * round,
      (target.bandX ?? target.x ?? 0) + (target.bandHalfWidth ?? target.halfWidth * .97) * fraction,
      target.y - (target.bandHeight ?? 12) + finish.sag * .3 * round,
    );
    put(
      source.x + source.halfWidth * fraction,
      source.y + (source.curve ?? 0) * round,
      (target.x ?? 0) + (target.halfWidth + finish.flare) * fraction,
      target.y + finish.sag * round - finish.curl * corner,
    );
  }
}
