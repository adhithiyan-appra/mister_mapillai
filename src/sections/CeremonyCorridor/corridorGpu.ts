import { createGpuSurface } from '../../utils/gpuSurface';

const vertex = `#version 300 es
layout(location=0) in vec2 aUV;
out vec2 vUV;
uniform vec2 uViewport;
uniform vec2 uOrigin;
uniform float uCamera;
uniform float uWallX;
uniform float uDepth;
uniform float uWallHeight;
uniform float uFloorY;
uniform highp int uPlane;
void main(){
  vUV=aUV;
  vec3 p;
  if(uPlane==0)p=vec3((aUV.x*2.0-1.0)*uWallX,uFloorY,1200.0-aUV.y*uDepth);
  else p=vec3(float(uPlane)*uWallX,(aUV.y-.5)*uWallHeight,1200.0-aUV.x*uDepth);
  float w=1100.0-p.z-uCamera;
  gl_Position=vec4(2200.0*p.x/uViewport.x+(uOrigin.x*2.0/uViewport.x-1.0)*w,(1.0-uOrigin.y*2.0/uViewport.y)*w-2200.0*p.y/uViewport.y,0.0,w);
}`;

const fragment = `#version 300 es
precision highp float;
in vec2 vUV;
out vec4 color;
uniform float uWallX;
uniform float uDepth;
uniform float uWallHeight;
uniform float uFloorY;
uniform highp int uPlane;
// Colours mirror the CSS tokens: --m-950, --m-800, --m-900, --m-600, --gold, --gold-lo.
const vec3 dark=vec3(30.0,3.0,4.0)/255.0;
const vec3 ground=vec3(58.0,6.0,7.0)/255.0;
const vec3 wall=vec3(42.0,4.0,5.0)/255.0;
const vec3 red=vec3(110.0,22.0,27.0)/255.0;
const vec3 gold=vec3(201.0,163.0,91.0)/255.0;
const vec3 low=vec3(142.0,106.0,46.0)/255.0;
float band(float x,float start,float end){float a=max(fwidth(x),0.0001);return smoothstep(start-a*.5,start+a*.5,x)*(1.0-smoothstep(end-a*.5,end+a*.5,x));}
void main(){
  vec3 rgb;
  if(uPlane==0){
      float x=vUV.x*uWallX*2.0,y=vUV.y*uDepth;
      vec2 tile=vec2(x,y)/60.0;
      vec2 cell=mod(tile,2.0);
      float fx=max(fwidth(tile.x),.00001),fy=max(fwidth(tile.y),.00001);
      float sx=clamp((cell.x-1.0)/fx+.5,0.0,1.0),sy=clamp((cell.y-1.0)/fy+.5,0.0,1.0);
      float checker=sx*(1.0-sy)+(1.0-sx)*sy;
      if(fx>1.0||fy>1.0)checker=.5;
      rgb=mix(ground,gold,.13*checker);
      float edge=.9*max(1.0-x/(uWallX*.4),(x-uWallX*1.6)/(uWallX*.4));
      rgb=mix(rgb,dark,clamp(edge,0.0,.9));
  }else{
      float x=vUV.x*uDepth,y=vUV.y*uWallHeight;
      // The floor occludes the lower wall in the original 3D scene.
      if(y-uWallHeight*.5>uFloorY)discard;
      float tile=mod(x,760.0);
      rgb=mix(wall,red,band(tile,642.0,718.0));
      rgb=mix(rgb,low,clamp(band(tile,640.0,642.0)+band(tile,718.0,720.0),0.0,1.0));
      float v=y/uWallHeight;
      float fade=v<.25?.95*(1.0-v/.25):v>.7?.9*(v-.7)/.3:0.0;
      rgb=mix(rgb,dark,fade);
  }
  color=vec4(rgb,1.0);
}`;

export function createCorridorGpu(canvas: HTMLCanvasElement, invalidate: () => void) {
  const surface = createGpuSurface(canvas, vertex, fragment, invalidate);
  let width = 0, height = 0, wallX = 0, depth = 0, wallHeight = 0, floorY = 0, mobile = false;
  return {
    layout(w: number, h: number, x: number, d: number, wh: number, fy: number, isMobile: boolean) {
      width = w; height = h; wallX = x; depth = d; wallHeight = wh; floorY = fy; mobile = isMobile;
    },
    draw(camera: number) {
      if (!surface?.available || !surface.resize(width, height, devicePixelRatio || 1)) return false;
      const { gl, uniform } = surface;
      surface.begin();
      gl.uniform2f(uniform('uViewport'), width, height);
      gl.uniform2f(uniform('uOrigin'), width * (mobile ? .5 : .68), height * (mobile ? .4 : .5));
      gl.uniform1f(uniform('uCamera'), camera); gl.uniform1f(uniform('uWallX'), wallX);
      gl.uniform1f(uniform('uDepth'), depth); gl.uniform1f(uniform('uWallHeight'), wallHeight);
      gl.uniform1f(uniform('uFloorY'), floorY);
      // The original information panel completely covers these pixels. Culling
      // that covered area saves fill work without changing any visible sample.
      const left = mobile ? 0 : Math.floor(canvas.width * .44 * .62);
      const bottom = mobile ? Math.floor(canvas.height * .24) : 0;
      gl.enable(gl.SCISSOR_TEST);
      gl.scissor(left, bottom, canvas.width - left, canvas.height - bottom);
      // Perspective interpolation is performed by the GPU's rasterizer, rather
      // than repeating ray/plane divisions for every physical screen pixel.
      for (const plane of [0, -1, 1]) {
        gl.uniform1i(uniform('uPlane'), plane);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      }
      gl.disable(gl.SCISSOR_TEST);
      return true;
    },
    suspend: () => surface?.suspend(),
    dispose: () => surface?.dispose(),
  };
}
