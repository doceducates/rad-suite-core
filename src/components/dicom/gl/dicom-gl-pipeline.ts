import { VERTEX_SHADER_SOURCE, FRAGMENT_SHADER_SOURCE } from './shaders';
import type { ParsedDicomMeta } from '@/services/dicom-loader.service';

export interface RenderUniforms {
  windowWidth: number;
  windowCenter: number;
  invert: boolean;
  zoom: number;
  pan: { x: number; y: number };
  rotate: number;
  flip: boolean;
  colormapId?: string;
}

export class DicomGlPipeline {
  private gl: WebGL2RenderingContext;
  private program: WebGLProgram;
  private texture: WebGLTexture | null = null;
  private lutTexture: WebGLTexture | null = null;
  private vao: WebGLVertexArrayObject | null = null;
  private lastSliceId: string | null = null;
  private currentLutKey: string | null = null;

  // Uniform locations
  private uTransformLoc: WebGLUniformLocation | null = null;
  private uTexLoc: WebGLUniformLocation | null = null;
  private uIsSignedLoc: WebGLUniformLocation | null = null;
  private uSlopeLoc: WebGLUniformLocation | null = null;
  private uInterceptLoc: WebGLUniformLocation | null = null;
  private uWwLoc: WebGLUniformLocation | null = null;
  private uWcLoc: WebGLUniformLocation | null = null;
  private uInvertLoc: WebGLUniformLocation | null = null;
  private uColorLutLoc: WebGLUniformLocation | null = null;
  private uUseColorLutLoc: WebGLUniformLocation | null = null;

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;
    this.program = this.initProgram();
    this.initBuffers();
    this.cacheUniformLocations();
  }

  private compileShader(type: number, src: string): WebGLShader {
    const shader = this.gl.createShader(type)!;
    this.gl.shaderSource(shader, src);
    this.gl.compileShader(shader);
    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      const err = this.gl.getShaderInfoLog(shader);
      this.gl.deleteShader(shader);
      throw new Error(`Shader compile failure: ${err}`);
    }
    return shader;
  }

  private initProgram(): WebGLProgram {
    const vs = this.compileShader(this.gl.VERTEX_SHADER, VERTEX_SHADER_SOURCE);
    const fs = this.compileShader(this.gl.FRAGMENT_SHADER, FRAGMENT_SHADER_SOURCE);
    const prog = this.gl.createProgram()!;
    this.gl.attachShader(prog, vs);
    this.gl.attachShader(prog, fs);
    this.gl.linkProgram(prog);
    if (!this.gl.getProgramParameter(prog, this.gl.LINK_STATUS)) {
      throw new Error(`GL Program link failed: ${this.gl.getProgramInfoLog(prog)}`);
    }
    return prog;
  }

  private initBuffers() {
    this.vao = this.gl.createVertexArray();
    this.gl.bindVertexArray(this.vao);

    // Quad: [pos.x, pos.y, tex.x, tex.y] - texture Y inverted for DICOM top-down orientation
    const quadData = new Float32Array([
      -1, -1, 0, 1,
       1, -1, 1, 1,
      -1,  1, 0, 0,
       1,  1, 1, 0,
    ]);

    const vbo = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, vbo);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, quadData, this.gl.STATIC_DRAW);

    const aPos = this.gl.getAttribLocation(this.program, 'a_position');
    const aTex = this.gl.getAttribLocation(this.program, 'a_texCoord');

    this.gl.enableVertexAttribArray(aPos);
    this.gl.vertexAttribPointer(aPos, 2, this.gl.FLOAT, false, 16, 0);

    this.gl.enableVertexAttribArray(aTex);
    this.gl.vertexAttribPointer(aTex, 2, this.gl.FLOAT, false, 16, 8);

    this.gl.bindVertexArray(null);
  }

  private cacheUniformLocations() {
    this.uTransformLoc = this.gl.getUniformLocation(this.program, 'u_transform');
    this.uTexLoc = this.gl.getUniformLocation(this.program, 'u_texture');
    this.uIsSignedLoc = this.gl.getUniformLocation(this.program, 'u_isSigned');
    this.uSlopeLoc = this.gl.getUniformLocation(this.program, 'u_rescaleSlope');
    this.uInterceptLoc = this.gl.getUniformLocation(this.program, 'u_rescaleIntercept');
    this.uWwLoc = this.gl.getUniformLocation(this.program, 'u_windowWidth');
    this.uWcLoc = this.gl.getUniformLocation(this.program, 'u_windowCenter');
    this.uInvertLoc = this.gl.getUniformLocation(this.program, 'u_invert');
    this.uColorLutLoc = this.gl.getUniformLocation(this.program, 'u_colorLut');
    this.uUseColorLutLoc = this.gl.getUniformLocation(this.program, 'u_useColorLut');
  }

  public uploadLutTexture(lutData: Uint8Array, lutKey: string): void {
    if (this.currentLutKey === lutKey && this.lutTexture) return;

    const gl = this.gl;
    if (!this.lutTexture) {
      this.lutTexture = gl.createTexture();
    }

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.lutTexture);
    gl.texImage2D(
      gl.TEXTURE_2D, 0, gl.RGBA, 256, 1, 0,
      gl.RGBA, gl.UNSIGNED_BYTE, lutData
    );

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    this.currentLutKey = lutKey;
  }

  public uploadSliceTexture(
    pixelData: Int16Array | Uint16Array | Uint8Array,
    meta: ParsedDicomMeta,
    sliceKey: string
  ): void {
    if (this.lastSliceId === sliceKey && this.texture) return;

    const gl = this.gl;
    if (!this.texture) {
      this.texture = gl.createTexture();
    }

    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 2);

    const isSigned = pixelData instanceof Int16Array;
    const uint16View = isSigned
      ? new Uint16Array(pixelData.buffer, pixelData.byteOffset, pixelData.length)
      : (pixelData as Uint16Array);

    gl.texImage2D(
      gl.TEXTURE_2D, 0, gl.R16UI, meta.columns, meta.rows, 0,
      gl.RED_INTEGER, gl.UNSIGNED_SHORT, uint16View
    );

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    this.lastSliceId = sliceKey;
  }

  public render(meta: ParsedDicomMeta, uniforms: RenderUniforms): void {
    const gl = this.gl;
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clearColor(0.01, 0.02, 0.05, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    if (!this.texture) return;

    gl.useProgram(this.program);
    gl.bindVertexArray(this.vao);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);

    gl.uniform1i(this.uTexLoc, 0);
    gl.uniform1i(this.uIsSignedLoc, meta.pixelRepresentation === 1 ? 1 : 0);
    gl.uniform1f(this.uSlopeLoc, meta.rescaleSlope ?? 1.0);
    gl.uniform1f(this.uInterceptLoc, meta.rescaleIntercept ?? 0.0);
    gl.uniform1f(this.uWwLoc, uniforms.windowWidth);
    gl.uniform1f(this.uWcLoc, uniforms.windowCenter);

    const isMono1 = meta.photometricInterpretation === 'MONOCHROME1';
    const shouldInvert = isMono1 ? !uniforms.invert : uniforms.invert;
    gl.uniform1i(this.uInvertLoc, shouldInvert ? 1 : 0);

    const hasColormap = Boolean(uniforms.colormapId && uniforms.colormapId !== 'grayscale' && this.lutTexture);
    gl.uniform1i(this.uUseColorLutLoc, hasColormap ? 1 : 0);
    if (hasColormap && this.lutTexture) {
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, this.lutTexture);
      gl.uniform1i(this.uColorLutLoc, 1);
    }

    // Compute 2D affine transformation matrix for zoom, pan, rotation, and flip
    const mat = this.computeTransformMatrix(gl.canvas.width, gl.canvas.height, uniforms);
    gl.uniformMatrix3fv(this.uTransformLoc, false, mat);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.bindVertexArray(null);
  }

  private computeTransformMatrix(cw: number, ch: number, u: RenderUniforms): Float32Array {
    const sx = (u.flip ? -u.zoom : u.zoom);
    const sy = u.zoom;
    const rad = (u.rotate * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    const tx = (u.pan.x / (cw * 0.5));
    const ty = -(u.pan.y / (ch * 0.5));

    return new Float32Array([
      sx * cos,  sin,       0,
     -sin,       sy * cos,  0,
      tx,        ty,        1,
    ]);
  }

  public destroy(): void {
    if (this.texture) this.gl.deleteTexture(this.texture);
    if (this.lutTexture) this.gl.deleteTexture(this.lutTexture);
    if (this.vao) this.gl.deleteVertexArray(this.vao);
    if (this.program) this.gl.deleteProgram(this.program);
  }
}
