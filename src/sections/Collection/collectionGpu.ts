import { createGpuSurface } from '../../utils/gpuSurface';
import { prepareImageElement } from '../../utils/imageLoading';

const vertex = `#version 300 es
layout(location=0) in vec2 aUV;
out vec2 vUV;
out float vAlpha;
uniform vec2 uViewport;
uniform vec2 uCard;
uniform vec2 uRotation;
uniform float uRadius;
uniform bool uReflection;
void main(){
  vec2 local=(aUV-.5)*uCard;
  vUV=aUV;vAlpha=1.0;
  if(uReflection){local.y=uCard.y*.5+10.0+aUV.y*uCard.y*.3;vUV.y=1.0-aUV.y*.3;vAlpha=.18*(1.0-aUV.y);}
  float x=uRotation.x*local.x+uRotation.y*uRadius;
  float z=-uRotation.y*local.x+uRotation.x*uRadius;
  float rx=-.06981317008;
  float y=local.y*cos(rx)-z*sin(rx);
  z=local.y*sin(rx)+z*cos(rx)-uRadius;
  float w=1600.0-z;
  gl_Position=vec4(3200.0*x/uViewport.x,.4*w-3200.0*(.14*uViewport.y+y)/uViewport.y,0.0,w);
}`;

const fragment = `#version 300 es
precision highp float;
in vec2 vUV;
in float vAlpha;
out vec4 color;
uniform sampler2D uImage;
uniform vec2 uCard;
uniform vec2 uImageSize;
uniform float uBrightness;
float rounded(vec2 p,vec2 size,float top,float bottom){
  vec2 c=p-size*.5;float r=c.y<0.0?top:bottom;
  vec2 q=abs(c)-size*.5+r;
  return min(max(q.x,q.y),0.0)+length(max(q,0.0))-r;
}
float coverage(float d){float a=max(fwidth(d),.00001);return 1.0-smoothstep(-a*.5,a*.5,d);}
vec3 gold(float t){
  vec3 a=vec3(142.,106.,46.)/255.,b=vec3(217.,181.,108.)/255.,c=vec3(243.,217.,149.)/255.,d=vec3(201.,163.,91.)/255.;
  if(t<.28)return mix(a,b,t/.28);
  if(t<.45)return mix(b,c,(t-.28)/.17);
  if(t<.62)return mix(c,d,(t-.45)/.17);
  return mix(d,a,(t-.62)/.38);
}
void main(){
  vec2 pixel=vUV*uCard;
  float alpha=coverage(rounded(pixel,uCard,uCard.x*.5,3.0*uCard.x/1998.0))*vAlpha;
  if(alpha<.00001)discard;
  vec2 direction=vec2(.984807753,.173648178);
  float t=clamp(.5+dot(pixel-uCard*.5,direction)/dot(uCard,abs(direction)),0.0,1.0);
  vec3 rgb=gold(t);
  vec2 inside=uCard-12.0;
  vec2 ip=pixel-6.0;
  float imageAlpha=coverage(rounded(ip,inside,inside.x*.5,2.0*inside.x/1998.0));
  vec2 uv=ip/inside;
  float scale=max(inside.x/uImageSize.x,inside.y/uImageSize.y);
  uv=(uv-.5)*inside/(uImageSize*scale)+.5;
  vec3 photo=texture(uImage,clamp(uv,0.0,1.0)).rgb;
  rgb=mix(rgb,photo,imageAlpha)*uBrightness;
  color=vec4(rgb*alpha,alpha);
}`;

export function createCollectionGpu(canvas: HTMLCanvasElement, images: readonly HTMLImageElement[], invalidate: () => void) {
  const surface = createGpuSurface(canvas, vertex, fragment, invalidate);
  const textures: (WebGLTexture | null)[] = images.map(() => null);
  const order = images.map((_, i) => i);
  const cosines = new Float64Array(images.length), sines = new Float64Array(images.length);
  const removers: (() => void)[] = [];
  let uploaded = 0, disposed = false, unsupported = false;
  let width = 0, height = 0, cardWidth = 0, radius = 0;
  const releaseTextures = () => {
    textures.forEach(texture => { if (texture) surface?.gl.deleteTexture(texture); });
    textures.fill(null);
    uploaded = 0;
  };
  if (surface) {
    const { gl } = surface;
    const textureLimit = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number;
    const anisotropic = gl.getExtension('EXT_texture_filter_anisotropic');
    const fallback = () => {
      unsupported = true;
      releaseTextures();
      surface.suspend();
      invalidate();
    };
    images.forEach((image, i) => {
      let uploading = false;
      const upload = () => {
        if (uploading || textures[i] || disposed || unsupported || !surface.available) return;
        uploading = true;
        void prepareImageElement(image, 'low').then(ready => {
          if (!ready) { uploading = false; return; }
          if (disposed || unsupported || !surface.available) return;
          // Keep the native original image if a device cannot hold its full
          // dimensions. Never resize the source to fit a smaller GPU texture.
          if (image.naturalWidth > textureLimit || image.naturalHeight > textureLimit) {
            fallback();
            return;
          }
          const texture = gl.createTexture();
          if (!texture) { fallback(); return; }
          gl.bindTexture(gl.TEXTURE_2D, texture);
          gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
          // Sample the full original texture. Pre-generated lower-resolution
          // levels softened embroidery compared with the native CSS image.
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
          if (anisotropic) gl.texParameterf(gl.TEXTURE_2D, anisotropic.TEXTURE_MAX_ANISOTROPY_EXT, gl.getParameter(anisotropic.MAX_TEXTURE_MAX_ANISOTROPY_EXT) as number);
          // Allocation failures are reported through WebGL's error state. Never
          // hide the decoded CSS fallback behind an incomplete GPU texture.
          if (gl.getError() !== gl.NO_ERROR) {
            gl.deleteTexture(texture);
            fallback();
            return;
          }
          textures[i] = texture;
          uploaded++;
          if (uploaded === images.length) invalidate();
        }).catch(() => { uploading = false; });
      };
      image.addEventListener('load', upload);
      removers.push(() => image.removeEventListener('load', upload));
      if (image.complete && image.naturalWidth) upload();
    });
  }
  return {
    layout(w: number, h: number, cw: number, r: number) { width = w; height = h; cardWidth = cw; radius = r; },
    draw(progress: number) {
      if (!surface?.available || unsupported || uploaded !== images.length || !surface.resize(width, height, devicePixelRatio || 1)) return false;
      const { gl, uniform } = surface;
      surface.begin();
      gl.uniform2f(uniform('uViewport'), width, height); gl.uniform2f(uniform('uCard'), cardWidth, cardWidth * 1.5);
      gl.uniform1f(uniform('uRadius'), radius); gl.uniform1i(uniform('uImage'), 0);
      const angle = -progress * (images.length - 1) * 360 / images.length;
      images.forEach((_, i) => { const theta = (i * 360 / images.length + angle) * Math.PI / 180; cosines[i] = Math.cos(theta); sines[i] = Math.sin(theta); });
      order.sort((a, b) => cosines[a] - cosines[b]);
      for (const reflection of [true, false]) {
        gl.uniform1i(uniform('uReflection'), reflection ? 1 : 0);
        for (const i of order) {
          gl.bindTexture(gl.TEXTURE_2D, textures[i]);
          gl.uniform2f(uniform('uRotation'), cosines[i], sines[i]);
          gl.uniform2f(uniform('uImageSize'), images[i].naturalWidth, images[i].naturalHeight);
          gl.uniform1f(uniform('uBrightness'), .4 + .6 * ((cosines[i] + 1) / 2));
          gl.drawArrays(gl.TRIANGLES, 0, 6);
        }
      }
      return true;
    },
    suspend: () => surface?.suspend(),
    dispose() {
      disposed = true;
      removers.forEach(remove => remove());
      releaseTextures();
      surface?.dispose();
    },
  };
}
