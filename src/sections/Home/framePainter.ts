/**
 * Puts a decoded hero frame on the canvas at the size it is shown. DOM-free, so it runs in the frame worker (OffscreenCanvas) or on
 * the page's own canvas.
 *
 * The frames are 1920×1088 and almost never shown at exactly that size, so every draw is a resample. The browser's own canvas and
 * compositor scaling (bilinear, mipmapped) keeps only 69-87% of the fine detail an ideal Lanczos resample keeps (measured on frame 32 at
 * the sizes the hero is drawn on 100%, 125% and 150% laptops, 3× phones and 2× screens; the figure is the Laplacian-variance ratio
 * against PIL's Lanczos). LanczosPainter resamples on the GPU with a separable Lanczos-3 filter instead (WebGL2): 99.8-100% of the
 * detail at every one of those sizes, and the same picture as the reference to within 0.1 of a grey level. Where WebGL2 is missing or
 * would run in software, Painter2D draws with the canvas's own filter, as before.
 */

export type HeroCanvas = OffscreenCanvas | HTMLCanvasElement;

/** Canvas size and where (and at what size) frames are drawn, in device pixels. */
export interface PaintLayout {
  canvasWidth: number;
  canvasHeight: number;
  x: number;
  y: number;
  w: number;
  h: number;
  /** The frame covers the whole canvas (no letterbox to paint). */
  cover: boolean;
}

export interface Painter {
  readonly kind: 'webgl2' | '2d';
  /** Sizes the drawing buffer (device pixels); this clears it. */
  size(width: number, height: number): void;
  /** Fills the canvas with the letterbox colour (before any frame has been drawn). */
  clear(layout: PaintLayout): void;
  /**
   * Draws `frame` into the layout's frame rectangle. `letterbox`: the space around the frame must be painted too. False when nothing
   * could be drawn (a lost GPU context): try again later.
   */
  paint(layout: PaintLayout, frame: ImageBitmap, letterbox: boolean): boolean;
  /** Gets `bitmap` ready to be painted next (uploads it to the GPU), so painting it later costs only the resampling. */
  prepare(bitmap: ImageBitmap): void;
  dispose(): void;
}

const LETTERBOX = '#3a0811';
const LETTERBOX_RGB = [58 / 255, 8 / 255, 17 / 255] as const;

type Context2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

/** The canvas's own drawImage scaling: the fallback where WebGL2 is not available. */
class Painter2D implements Painter {
  readonly kind = '2d';

  constructor(private readonly canvas: HeroCanvas, private readonly context: Context2D) {}

  size(width: number, height: number) {
    if (this.canvas.width === width && this.canvas.height === height) return;
    this.canvas.width = width;
    this.canvas.height = height;
    this.context.imageSmoothingEnabled = true;
    this.context.imageSmoothingQuality = 'high';
  }

  clear(layout: PaintLayout) {
    this.context.fillStyle = LETTERBOX;
    this.context.fillRect(0, 0, layout.canvasWidth, layout.canvasHeight);
  }

  paint(layout: PaintLayout, frame: ImageBitmap, letterbox: boolean) {
    // The canvas keeps its pixels between draws, so the letterbox is painted only when asked.
    if (!layout.cover && letterbox) this.clear(layout);
    this.context.drawImage(frame, layout.x, layout.y, layout.w, layout.h);
    return true;
  }

  // drawImage uploads in the GPU process, off this thread: nothing to do ahead.
  prepare() {}

  dispose() {}
}

const VERTEX = `#version 300 es
in vec2 corner;
void main() { gl_Position = vec4(corner, 0.0, 1.0); }`;

/**
 * One pass of a separable Lanczos-3 resample: along x (source columns to output columns) or along y. The kernel is stretched by the
 * shrink factor when shrinking, so every source pixel contributes (no aliasing); weights are normalised. Texels are read exactly
 * (texelFetch), never through the GPU's own filtering.
 */
const FRAGMENT = `#version 300 es
precision highp float;
precision highp int;
uniform sampler2D source;
uniform int axis;            // 0: along x, 1: along y
uniform float scale;         // output length / input length along the axis
uniform int inputLength;     // input texels along the axis
uniform vec2 origin;         // the output rectangle's lower-left corner, in window coordinates
uniform float outputHeight;  // the output rectangle's height
uniform bool flip;           // rows counted from the rectangle's top (the canvas), not its bottom (a texture)
out vec4 color;
const float PI = 3.141592653589793;
float lanczos3(float x) {
  x = abs(x);
  if (x < 1e-4) return 1.0;
  if (x >= 3.0) return 0.0;
  float a = PI * x;
  return 3.0 * sin(a) * sin(a / 3.0) / (a * a);
}
void main() {
  vec2 p = gl_FragCoord.xy - origin;
  if (flip) p.y = outputHeight - p.y;
  ivec2 at = ivec2(p);
  float centre = (axis == 0 ? p.x : p.y) / scale - 0.5;
  float stretch = min(scale, 1.0);
  float reach = 3.0 / stretch;
  int first = int(floor(centre - reach)) + 1;
  int last = int(floor(centre + reach));
  vec4 sum = vec4(0.0);
  float total = 0.0;
  for (int i = first; i <= last; i++) {
    float weight = lanczos3((float(i) - centre) * stretch);
    int c = clamp(i, 0, inputLength - 1);
    sum += weight * texelFetch(source, axis == 0 ? ivec2(c, at.y) : ivec2(at.x, c), 0);
    total += weight;
  }
  color = sum / total;
}`;

const GL_OPTIONS: WebGLContextAttributes = {
  alpha: false,
  antialias: false,
  depth: false,
  stencil: false,
  preserveDrawingBuffer: false,
  // A software-rendered WebGL (no usable GPU) would resample slower than the canvas's own drawImage: use that instead.
  failIfMajorPerformanceCaveat: true,
  powerPreference: 'default',
};

interface Program {
  program: WebGLProgram;
  vao: WebGLVertexArrayObject;
  uniforms: Record<'source' | 'axis' | 'scale' | 'inputLength' | 'origin' | 'outputHeight' | 'flip', WebGLUniformLocation | null>;
}

function buildProgram(gl: WebGL2RenderingContext): Program | null {
  const program = gl.createProgram();
  if (!program) return null;
  for (const [type, source] of [[gl.VERTEX_SHADER, VERTEX], [gl.FRAGMENT_SHADER, FRAGMENT]] as const) {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    gl.attachShader(program, shader);
  }
  gl.bindAttribLocation(program, 0, 'corner');
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
  const vao = gl.createVertexArray();
  const buffer = gl.createBuffer();
  if (!vao || !buffer) return null;
  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  // One triangle that covers the whole viewport.
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.bindVertexArray(null);
  const at = (name: string) => gl.getUniformLocation(program, name);
  return {
    program, vao,
    uniforms: { source: at('source'), axis: at('axis'), scale: at('scale'), inputLength: at('inputLength'), origin: at('origin'), outputHeight: at('outputHeight'), flip: at('flip') },
  };
}

let supported: boolean | undefined;
/** WebGL2 on a GPU, and the resampler compiles: tried once on a throwaway canvas, so a failure leaves the real one free for 2D. */
function lanczosSupported(): boolean {
  if (supported !== undefined) return supported;
  supported = false;
  try {
    const probe = typeof OffscreenCanvas === 'function' ? new OffscreenCanvas(1, 1) : typeof document !== 'undefined' ? document.createElement('canvas') : null;
    const gl = probe?.getContext('webgl2', GL_OPTIONS) as WebGL2RenderingContext | null | undefined;
    if (gl) {
      supported = !!buildProgram(gl) && !gl.isContextLost();
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    }
  } catch { supported = false; }
  return supported;
}

interface Slot { texture: WebGLTexture; width: number; height: number; holds: ImageBitmap | null }

/**
 * GPU Lanczos-3 resampling (see the file comment). Each frame is uploaded once; a draw is two passes through an intermediate.
 *
 * Uploading a 1920×1088 frame takes this thread 8-15 ms (up to ~30), the passes about nothing. Done as the frame is due, the upload
 * made frames land up to 20 ms late, unevenly; so the next frame is uploaded ahead (prepare) into a spare texture while the current
 * one is on screen, and its turn only swaps textures and resamples.
 */
class LanczosPainter implements Painter {
  readonly kind = 'webgl2';
  private program: Program | null = null;
  /** Source textures: the frame shown, and the next frame, uploaded ahead. */
  private slots: (Slot | null)[] = [null, null];
  /** The first pass's output: the frame resampled along x, still at the source's height. */
  private middle: { texture: WebGLTexture; framebuffer: WebGLFramebuffer; width: number; height: number } | null = null;
  private lost = false;
  private disposed = false;

  constructor(private readonly canvas: HeroCanvas, private readonly gl: WebGL2RenderingContext, onRestored: () => void) {
    this.program = buildProgram(gl);
    if (!this.program) throw new Error('hero resampler did not build');
    // The GPU was reset: keep the context (preventDefault), rebuild once it is back, and redraw.
    (canvas as EventTarget).addEventListener('webglcontextlost', event => { event.preventDefault(); this.lost = true; });
    (canvas as EventTarget).addEventListener('webglcontextrestored', () => {
      if (this.disposed) return;
      this.slots = [null, null];
      this.middle = null;
      this.program = buildProgram(gl);
      this.lost = !this.program;
      if (!this.lost) onRestored();
    });
  }

  size(width: number, height: number) {
    if (this.canvas.width === width && this.canvas.height === height) return;
    this.canvas.width = width;
    this.canvas.height = height;
  }

  clear(layout: PaintLayout) {
    if (this.lost) return;
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, layout.canvasWidth, layout.canvasHeight);
    gl.clearColor(LETTERBOX_RGB[0], LETTERBOX_RGB[1], LETTERBOX_RGB[2], 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
  }

  paint(layout: PaintLayout, frame: ImageBitmap) {
    if (this.lost || !this.program || layout.w < 1 || layout.h < 1) return false;
    const gl = this.gl;
    // The drawing buffer is not kept between frames, so the letterbox is painted every time (a clear: free).
    this.clear(layout);
    gl.useProgram(this.program.program);
    gl.bindVertexArray(this.program.vao);
    gl.uniform1i(this.program.uniforms.source, 0);
    gl.activeTexture(gl.TEXTURE0);
    // A frame uploaded ahead is swapped into place rather than uploaded again.
    if (this.slots[1]?.holds === frame) this.slots.reverse();
    this.resample(layout, this.load(0, frame));
    gl.bindVertexArray(null);
    return !gl.isContextLost();
  }

  prepare(bitmap: ImageBitmap) {
    if (this.lost || this.slots.some(slot => slot?.holds === bitmap)) return;
    this.load(1, bitmap);
  }

  /** The frame's texture, uploading the bitmap unless that slot already holds it. */
  private load(index: 0 | 1, bitmap: ImageBitmap): Slot {
    const gl = this.gl;
    let slot = this.slots[index];
    if (!slot || slot.width !== bitmap.width || slot.height !== bitmap.height) {
      if (slot) gl.deleteTexture(slot.texture);
      const texture = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA8, bitmap.width, bitmap.height);
      this.parameters();
      slot = this.slots[index] = { texture, width: bitmap.width, height: bitmap.height, holds: null };
    }
    gl.bindTexture(gl.TEXTURE_2D, slot.texture);
    if (slot.holds !== bitmap) {
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      // (Asking for premultiplied colours instead, the same for these opaque frames, measured 2.5× slower in Chrome.)
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, bitmap);
      slot.holds = bitmap;
    }
    return slot;
  }

  private parameters() {
    const gl = this.gl;
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }

  /** The intermediate for a frame `width` wide and `height` (the source's) tall: half-float where it can be drawn to, else 8-bit. */
  private intermediate(width: number, height: number) {
    const gl = this.gl;
    if (this.middle && this.middle.width === width && this.middle.height === height) return this.middle;
    if (this.middle) { gl.deleteTexture(this.middle.texture); gl.deleteFramebuffer(this.middle.framebuffer); }
    const framebuffer = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    // Half floats keep the filter's overshoot (its sharpening lobes) between the passes; 8 bits would clip it.
    const formats = gl.getExtension('EXT_color_buffer_float') ? [gl.RGBA16F, gl.RGBA8] : [gl.RGBA8];
    let texture: WebGLTexture | null = null;
    for (const format of formats) {
      texture = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texStorage2D(gl.TEXTURE_2D, 1, format, width, height);
      this.parameters();
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
      if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE) break;
      gl.deleteTexture(texture);
      texture = null;
    }
    this.middle = { texture: texture!, framebuffer, width, height };
    return this.middle;
  }

  /** Both passes for one frame: along x into the intermediate, then along y into the frame's rectangle on the canvas. */
  private resample(layout: PaintLayout, slot: Slot) {
    const gl = this.gl, u = this.program!.uniforms;
    const middle = this.intermediate(layout.w, slot.height);
    gl.bindFramebuffer(gl.FRAMEBUFFER, middle.framebuffer);
    gl.viewport(0, 0, layout.w, slot.height);
    gl.bindTexture(gl.TEXTURE_2D, slot.texture);
    gl.uniform1i(u.axis, 0);
    gl.uniform1f(u.scale, layout.w / slot.width);
    gl.uniform1i(u.inputLength, slot.width);
    gl.uniform2f(u.origin, 0, 0);
    gl.uniform1i(u.flip, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    // The canvas's rows run bottom-up in GL: the rectangle's lower-left corner, and the pass counts rows from its top.
    const bottom = layout.canvasHeight - layout.y - layout.h;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(layout.x, bottom, layout.w, layout.h);
    gl.bindTexture(gl.TEXTURE_2D, middle.texture);
    gl.uniform1i(u.axis, 1);
    gl.uniform1f(u.scale, layout.h / slot.height);
    gl.uniform1i(u.inputLength, slot.height);
    gl.uniform2f(u.origin, layout.x, bottom);
    gl.uniform1f(u.outputHeight, layout.h);
    gl.uniform1i(u.flip, 1);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  dispose() {
    this.disposed = true;
    this.gl.getExtension('WEBGL_lose_context')?.loseContext();
  }
}

/**
 * The painter for the hero canvas: GPU Lanczos where WebGL2 runs on a GPU, otherwise the canvas's own 2D drawing. null = the canvas
 * cannot draw at all. `onRestored` is called when a lost GPU context is back and the frame must be drawn again.
 */
export function createPainter(canvas: HeroCanvas, onRestored: () => void): Painter | null {
  if (lanczosSupported()) {
    let gl: WebGL2RenderingContext | null = null;
    try { gl = canvas.getContext('webgl2', GL_OPTIONS) as WebGL2RenderingContext | null; } catch { gl = null; }
    if (gl) {
      try { return new LanczosPainter(canvas, gl, onRestored); } catch { return null; }
    }
  }
  const context = canvas.getContext('2d', { alpha: false }) as Context2D | null;
  return context ? new Painter2D(canvas, context) : null;
}
