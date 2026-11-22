// WebGL2 Shaders for hardware-accelerated 16-bit DICOM rendering

export const VERTEX_SHADER_SOURCE = `#version 300 es
in vec2 a_position;
in vec2 a_texCoord;

uniform mat3 u_transform;

out vec2 v_texCoord;

void main() {
  vec3 transformed = u_transform * vec3(a_position, 1.0);
  gl_Position = vec4(transformed.xy, 0.0, 1.0);
  v_texCoord = a_texCoord;
}
`;

export const FRAGMENT_SHADER_SOURCE = `#version 300 es
precision highp float;
precision highp int;

in vec2 v_texCoord;
out vec4 fragColor;

uniform highp usampler2D u_texture;
uniform int u_isSigned;
uniform float u_rescaleSlope;
uniform float u_rescaleIntercept;
uniform float u_windowWidth;
uniform float u_windowCenter;
uniform int u_invert;
uniform sampler2D u_colorLut;
uniform int u_useColorLut;

void main() {
  uint rawUint = texture(u_texture, v_texCoord).r;
  float rawVal = float(rawUint);
  if (u_isSigned == 1 && rawUint >= 32768u) {
    rawVal = float(int(rawUint) - 65536);
  }

  // 1. Rescale to Hounsfield Units (HU)
  float hu = rawVal * u_rescaleSlope + u_rescaleIntercept;

  // 2. Window / Level linear contrast transfer function
  float low = u_windowCenter - (u_windowWidth * 0.5);
  float range = max(1.0, u_windowWidth);
  float intensity = clamp((hu - low) / range, 0.0, 1.0);

  // 3. Inversion support (e.g. MONOCHROME1 or user toggle)
  if (u_invert == 1) {
    intensity = 1.0 - intensity;
  }

  // 4. Sample OHIF / vtk.js 1D Color Lookup Table or output Monochrome
  if (u_useColorLut == 1) {
    fragColor = texture(u_colorLut, vec2(intensity, 0.5));
  } else {
    fragColor = vec4(intensity, intensity, intensity, 1.0);
  }
}
`;
