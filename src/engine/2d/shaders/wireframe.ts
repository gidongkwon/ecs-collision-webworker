import { createProgramFromSources } from "../gl";

const vertexShaderSource = /*glsl*/ `#version 300 es
in vec4 a_position;
uniform mat4 u_matrix;
void main() {
  gl_Position = u_matrix * a_position;
}`;

const fragmentShaderSource = /*glsl*/ `#version 300 es
precision highp float;
uniform float u_collisionFlag;
out vec4 outColor;
void main() {
  outColor = vec4(1.0, 1.0 * u_collisionFlag, 1.0 * u_collisionFlag, 1.0);
}`;

export interface WireframeShader {
  program: WebGLProgram;
  vertexArray: WebGLVertexArrayObject;
  attribLocations: {
    position: number;
  };
  uniformLocations: {
    collisionFlag: WebGLUniformLocation | null;
    matrix: WebGLUniformLocation | null;
  };
}

export function initWireframeShader(gl: WebGL2RenderingContext): WireframeShader {
  const program = createProgramFromSources(gl, [vertexShaderSource, fragmentShaderSource]);
  if (program == null) {
    throw new Error("Creating wireframe program failed.");
  }

  return {
    program,
    vertexArray: gl.createVertexArray()!,
    attribLocations: {
      position: gl.getAttribLocation(program, 'a_position'),
    },
    uniformLocations: {
      collisionFlag: gl.getUniformLocation(program, 'u_collisionFlag'),
      matrix: gl.getUniformLocation(program, 'u_matrix'),
    },
  };
}