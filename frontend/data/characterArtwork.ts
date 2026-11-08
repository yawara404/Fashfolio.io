/** Original generated artwork; SVG crops keep the exact face and alpha. */
export const characterArtwork = {
  girl: "/avatars/jito-girl-v1.png",
  boy: "/avatars/jito-boy-v1.png",
  body: "/avatars/jito-base-v1.png",
  width: 1024,
  height: 1536,
  centerX: 512,
  crownY: 40,
  chinY: 290,
  bodyOriginY: 330,
  groundY: 1522,
} as const;

export const artworkBodyX = (x: number) => (x - characterArtwork.centerX) * .4;
export const artworkBodyY = (y: number) => (y - characterArtwork.bodyOriginY) * 380 / (characterArtwork.groundY - characterArtwork.bodyOriginY);
