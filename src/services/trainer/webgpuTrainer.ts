// WebGPU compute scaffolding for 3D Gaussian Splatting.
//
// This is intentionally a stub — production training stays in the Python script
// under scripts/train.py. The point of this file is to give a place to iterate
// the rendering / projection kernel in-browser so future phases can move work
// off Python entirely.

declare global {
  interface Navigator {
    gpu?: GPU;
  }
}

export async function webgpuAvailable(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.gpu) return false;
  try {
    const adapter = await navigator.gpu.requestAdapter();
    return !!adapter;
  } catch {
    return false;
  }
}

const PROJECT_WGSL = /* wgsl */ `
struct Gaussian {
  pos: vec3<f32>,
  alpha: f32,
};

struct Camera {
  view_proj: mat4x4<f32>,
};

@group(0) @binding(0) var<storage, read> gaussians: array<Gaussian>;
@group(0) @binding(1) var<uniform> camera: Camera;
@group(0) @binding(2) var<storage, read_write> projected: array<vec4<f32>>;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  let i = gid.x;
  if (i >= arrayLength(&gaussians)) { return; }
  let g = gaussians[i];
  let clip = camera.view_proj * vec4<f32>(g.pos, 1.0);
  let ndc = clip.xyz / clip.w;
  projected[i] = vec4<f32>(ndc, g.alpha);
}
`;

export async function smokeTest(): Promise<number> {
  const gpu = navigator.gpu!;
  const adapter = await gpu.requestAdapter();
  if (!adapter) throw new Error('no adapter');
  const device = await adapter.requestDevice();

  const N = 1024;
  const gaussianStride = 16;
  const gaussianBytes = new ArrayBuffer(N * gaussianStride);
  const view = new DataView(gaussianBytes);
  for (let i = 0; i < N; i++) {
    view.setFloat32(i * gaussianStride + 0, Math.random() * 2 - 1, true);
    view.setFloat32(i * gaussianStride + 4, Math.random() * 2 - 1, true);
    view.setFloat32(i * gaussianStride + 8, Math.random() * 2 - 1, true);
    view.setFloat32(i * gaussianStride + 12, 1.0, true);
  }

  const gaussianBuf = device.createBuffer({
    size: gaussianBytes.byteLength,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(gaussianBuf, 0, gaussianBytes);

  const camera = new Float32Array(16);
  camera[0] = 1; camera[5] = 1; camera[10] = 1; camera[15] = 1;
  const cameraBuf = device.createBuffer({
    size: camera.byteLength,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(cameraBuf, 0, camera);

  const outBuf = device.createBuffer({
    size: N * 16,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
  });

  const module = device.createShaderModule({ code: PROJECT_WGSL });
  const pipeline = device.createComputePipeline({
    layout: 'auto',
    compute: { module, entryPoint: 'main' },
  });
  const bind = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: { buffer: gaussianBuf } },
      { binding: 1, resource: { buffer: cameraBuf } },
      { binding: 2, resource: { buffer: outBuf } },
    ],
  });

  const t0 = performance.now();
  const enc = device.createCommandEncoder();
  const pass = enc.beginComputePass();
  pass.setPipeline(pipeline);
  pass.setBindGroup(0, bind);
  pass.dispatchWorkgroups(Math.ceil(N / 64));
  pass.end();
  device.queue.submit([enc.finish()]);
  await device.queue.onSubmittedWorkDone();
  return performance.now() - t0;
}
