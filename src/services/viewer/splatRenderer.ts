// Minimal point-cloud-style preview for parsed splats. A faithful 3DGS
// rasteriser needs per-frame depth sort + EWA ellipse splatting which is a
// large chunk of code; this renderer draws coloured points and is meant as a
// fast first pass while the kernel work in webgpuTrainer.ts catches up.

import { ParsedSplat } from './splatLoader';
import { perspective } from './camera';

const VERT = `#version 300 es
in vec3 a_pos;
in vec4 a_color;
uniform mat4 u_view;
uniform mat4 u_proj;
uniform float u_size;
out vec4 v_color;
void main() {
  vec4 view = u_view * vec4(a_pos, 1.0);
  gl_Position = u_proj * view;
  float z = max(-view.z, 0.1);
  gl_PointSize = u_size / z;
  v_color = a_color;
}`;

const FRAG = `#version 300 es
precision mediump float;
in vec4 v_color;
out vec4 outColor;
void main() {
  vec2 c = gl_PointCoord - vec2(0.5);
  float r2 = dot(c, c);
  if (r2 > 0.25) discard;
  float a = exp(-r2 * 12.0) * v_color.a;
  outColor = vec4(v_color.rgb, a);
}`;

export interface RendererHandle {
  render(view: Float32Array, fovy: number): void;
  dispose(): void;
}

export function createRenderer(
  gl: WebGL2RenderingContext,
  splat: ParsedSplat,
  options: { backgroundColor?: [number, number, number, number]; pointSize?: number } = {},
): RendererHandle {
  const bg = options.backgroundColor ?? [0.04, 0.04, 0.06, 1];
  const pointSize = options.pointSize ?? 2.5;

  const program = link(gl, VERT, FRAG);
  gl.useProgram(program);

  const posBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
  gl.bufferData(gl.ARRAY_BUFFER, splat.positions, gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(program, 'a_pos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 0, 0);

  const colorBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, colorBuf);
  const floatColors = new Float32Array(splat.count * 4);
  for (let i = 0; i < splat.count; i++) {
    floatColors[i * 4 + 0] = splat.colors[i * 4 + 0] / 255;
    floatColors[i * 4 + 1] = splat.colors[i * 4 + 1] / 255;
    floatColors[i * 4 + 2] = splat.colors[i * 4 + 2] / 255;
    floatColors[i * 4 + 3] = splat.colors[i * 4 + 3] / 255;
  }
  gl.bufferData(gl.ARRAY_BUFFER, floatColors, gl.STATIC_DRAW);
  const aColor = gl.getAttribLocation(program, 'a_color');
  gl.enableVertexAttribArray(aColor);
  gl.vertexAttribPointer(aColor, 4, gl.FLOAT, false, 0, 0);

  const uView = gl.getUniformLocation(program, 'u_view');
  const uProj = gl.getUniformLocation(program, 'u_proj');
  const uSize = gl.getUniformLocation(program, 'u_size');

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  return {
    render(view, fovy) {
      const w = gl.drawingBufferWidth;
      const h = gl.drawingBufferHeight;
      gl.viewport(0, 0, w, h);
      gl.clearColor(bg[0], bg[1], bg[2], bg[3]);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(program);
      gl.uniformMatrix4fv(uView, false, view);
      gl.uniformMatrix4fv(uProj, false, perspective(fovy, w / Math.max(h, 1), 0.05, 200));
      gl.uniform1f(uSize, pointSize * h);
      gl.drawArrays(gl.POINTS, 0, splat.count);
    },
    dispose() {
      gl.deleteBuffer(posBuf);
      gl.deleteBuffer(colorBuf);
      gl.deleteProgram(program);
    },
  };
}

function compile(gl: WebGL2RenderingContext, src: string, type: number): WebGLShader {
  const sh = gl.createShader(type);
  if (!sh) throw new Error('createShader failed');
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(sh);
    gl.deleteShader(sh);
    throw new Error(`Shader compile failed: ${log}`);
  }
  return sh;
}

function link(gl: WebGL2RenderingContext, vSrc: string, fSrc: string): WebGLProgram {
  const v = compile(gl, vSrc, gl.VERTEX_SHADER);
  const f = compile(gl, fSrc, gl.FRAGMENT_SHADER);
  const program = gl.createProgram();
  if (!program) throw new Error('createProgram failed');
  gl.attachShader(program, v);
  gl.attachShader(program, f);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(program);
    throw new Error(`Program link failed: ${log}`);
  }
  return program;
}
