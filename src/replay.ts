import type { Frame, GraphRequest, Transport } from "./types.js";
/** Finite, offline Graph boundary. Each reader gets its own instance. */
export class Replay {
  readonly requests: GraphRequest[][] = [];
  private cursor = 0;
  constructor(private readonly frames: Frame[]) {}
  readonly send: Transport = async (requests) => {
    this.requests.push(structuredClone(requests));
    const frame = this.frames[this.cursor++];
    if (!frame) throw new Error("Trace exhausted at batch " + this.cursor);
    return new Response(JSON.stringify(frame.body), {
      status: frame.outerStatus,
      headers: frame.gzip ? { "content-encoding": "gzip" } : {},
    });
  };
  assertConsumed(): void {
    if (this.cursor !== this.frames.length)
      throw new Error("Unconsumed frames: " + (this.frames.length - this.cursor));
  }
}
