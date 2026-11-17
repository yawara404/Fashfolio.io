export interface PoseRenderBounds { x: number; y: number; width: number; height: number }
export interface PoseRender { imageUrl: string; bounds: PoseRenderBounds }
export interface PoseRenderRecord { key: string; image: Blob; bounds: PoseRenderBounds; createdAt: number }
