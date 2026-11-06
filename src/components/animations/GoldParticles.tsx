import { useRef } from 'react';
import { useSceneAnimation } from './AnimationProvider';

interface Particle { x: number; y: number; z: number; s: number; a: string; r: number }

export function GoldParticles() {
  const ref = useRef<HTMLCanvasElement>(null);
  useSceneAnimation(ref, canvas => {
    const context = canvas.getContext('2d');
    const journey = canvas.closest<HTMLElement>('#journey')!;
    const stage = canvas.parentElement!;
    let width = 0, height = 0, ratio = 1;
    let particles: Particle[] = [];
    let bottom = 0;
    let cleared = true;
    return {
      id: 'gold-particles', element: journey,
      active: frame => !frame.reducedMotion && frame.scrollY < bottom,
      layout(frame) {
        const rect = journey.getBoundingClientRect();
        bottom = rect.top + frame.scrollY + rect.height;
        if (journey.style.contentVisibility === 'hidden') return;
        const nextRatio = devicePixelRatio || 1;
        const nextWidth = Math.floor(stage.clientWidth * nextRatio), nextHeight = Math.floor(stage.clientHeight * nextRatio);
        if (nextWidth === width && nextHeight === height && ratio === nextRatio) return;
        ratio = nextRatio;
        width = canvas.width = nextWidth;
        height = canvas.height = nextHeight;
        cleared = true;
        particles = Array.from({ length: 60 }, () => {
          const z = Math.random() * 0.9 + 0.1;
          return { x: Math.random() * width, y: Math.random() * height, z, s: Math.random() * Math.PI * 2, a: `rgba(240,210,140,${0.12 + z * 0.45})`, r: z * 2 * ratio };
        });
      },
      leave() { if (!cleared) { context?.clearRect(0, 0, width, height); cleared = true; } },
      update(_, frame) {
        if (!context) return false;
        context.clearRect(0, 0, width, height);
        cleared = false;
        const time = Math.min(frame.deltaTime, 0.05) * 51;
        for (const particle of particles) {
          particle.y -= particle.z * 0.3 * ratio * time;
          particle.x += Math.sin(particle.s += 0.01 * time) * 0.3 * time;
          if (particle.y < 0) { particle.y = height; particle.x = Math.random() * width; }
          context.fillStyle = particle.a;
          context.beginPath();
          context.arc(particle.x, particle.y, particle.r, 0, 7);
          context.fill();
        }
        return true;
      },
    };
  });
  return <canvas id="dust" ref={ref} aria-hidden="true" />;
}
