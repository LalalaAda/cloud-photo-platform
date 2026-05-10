import type { Buffer } from 'node:buffer';

declare module 'heic-convert' {
  function convert(buffer: Buffer, options?: { quality?: number }): Promise<Buffer>;
  export = convert;
}
