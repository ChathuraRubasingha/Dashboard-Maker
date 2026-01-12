/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// Type declarations for dom-to-image-more
declare module 'dom-to-image-more' {
  interface Options {
    quality?: number
    bgcolor?: string
    width?: number
    height?: number
    style?: Partial<CSSStyleDeclaration>
    filter?: (node: Node) => boolean
    cacheBust?: boolean
    imagePlaceholder?: string
  }

  export function toPng(node: Node, options?: Options): Promise<string>
  export function toJpeg(node: Node, options?: Options): Promise<string>
  export function toBlob(node: Node, options?: Options): Promise<Blob>
  export function toSvg(node: Node, options?: Options): Promise<string>
  export function toPixelData(node: Node, options?: Options): Promise<Uint8ClampedArray>
}
