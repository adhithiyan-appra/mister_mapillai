export interface GpuSurface {
  gl: WebGL2RenderingContext;
  program: WebGLProgram;
  readonly available: boolean;
  uniform: (name: string) => WebGLUniformLocation | null;
  resize: (width: number, height: number, ratio: number) => boolean;
  begin: () => void;
  suspend: () => void;
  dispose: () => void;
}

export function createGpuSurface(canvas: HTMLCanvasElement, vertexSource: string, fragmentSource: string, invalidate: () => void): GpuSurface | null {
  const gl = canvas.getContext('webgl2', { alpha: true, antialias: true, premultipliedAlpha: true, depth: false, stencil: false, preserveDrawingBuffer: false });
  if (!gl) return null;
  const releaseContext = () => gl.getExtension('WEBGL_lose_context')?.loseContext();
  const shaders: WebGLShader[] = [];
  const compile = (type: number, source: string) => {
    const shader = gl.createShader(type);
    if (!shader) return null;
    shaders.push(shader);
    gl.shaderSource(shader, source); gl.compileShader(shader);
    return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null;
  };
  const vertex = compile(gl.VERTEX_SHADER, vertexSource), fragment = compile(gl.FRAGMENT_SHADER, fragmentSource);
  const program = gl.createProgram();
  if (!vertex || !fragment || !program) { shaders.forEach(shader => gl.deleteShader(shader)); if (program) gl.deleteProgram(program); releaseContext(); return null; }
  gl.attachShader(program, vertex); gl.attachShader(program, fragment); gl.linkProgram(program);
  shaders.forEach(shader => gl.deleteShader(shader));
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) { gl.deleteProgram(program); releaseContext(); return null; }
  const buffer = gl.createBuffer(), array = gl.createVertexArray();
  if (!buffer || !array) {
    if (buffer) gl.deleteBuffer(buffer);
    if (array) gl.deleteVertexArray(array);
    gl.deleteProgram(program);
    releaseContext();
    return null;
  }
  gl.bindVertexArray(array); gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.disable(gl.DEPTH_TEST); gl.disable(gl.CULL_FACE);
  gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  const locations = new Map<string, WebGLUniformLocation | null>();
  const limit = gl.getParameter(gl.MAX_RENDERBUFFER_SIZE) as number;
  let available = true;
  let unsupportedWidth = 0, unsupportedHeight = 0;
  const lost = (event: Event) => { event.preventDefault(); available = false; invalidate(); };
  canvas.addEventListener('webglcontextlost', lost);
  return {
    gl, program,
    get available() { return available && !gl.isContextLost(); },
    uniform(name) {
      if (!locations.has(name)) locations.set(name, gl.getUniformLocation(program, name));
      return locations.get(name)!;
    },
    resize(width, height, ratio) {
      const w = Math.ceil(width * ratio), h = Math.ceil(height * ratio);
      // Unsupported physical resolutions use the original CSS renderer, never a
      // downscaled canvas. Image quality is not traded for a smaller framebuffer.
      if (!available || w < 1 || h < 1) return false;
      if (w === unsupportedWidth && h === unsupportedHeight) return false;
      if (w > limit || h > limit) {
        unsupportedWidth = w; unsupportedHeight = h;
        canvas.width = canvas.height = 1;
        return false;
      }
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
      // Some drivers clamp the actual backing buffer despite accepting the
      // canvas attributes. Prefer the original CSS over a silently reduced DPR.
      if (gl.drawingBufferWidth !== w || gl.drawingBufferHeight !== h) {
        unsupportedWidth = w; unsupportedHeight = h;
        canvas.width = canvas.height = 1;
        return false;
      }
      unsupportedWidth = unsupportedHeight = 0;
      gl.viewport(0, 0, w, h);
      return true;
    },
    begin() { gl.useProgram(program); gl.bindVertexArray(array); gl.disable(gl.SCISSOR_TEST); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); },
    suspend() { canvas.width = canvas.height = 1; },
    dispose() {
      available = false;
      canvas.removeEventListener('webglcontextlost', lost);
      gl.useProgram(null);
      gl.bindVertexArray(null);
      gl.deleteBuffer(buffer); gl.deleteVertexArray(array); gl.deleteProgram(program);
      canvas.width = canvas.height = 1;
      // React Strict Mode can immediately set up the same canvas again. Release
      // owned resources without asynchronously losing that reusable context.
    },
  };
}

