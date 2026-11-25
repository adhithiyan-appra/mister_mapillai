/**
 * The hero's stages: one place to set which frames each stage plays, and how fast.
 *
 * One deliberate scroll (wheel, trackpad, swipe or key) plays one whole stage: it runs on its own clock from its first frame to its
 * last, whether or not the visitor keeps scrolling, stops on that exact frame and holds it until the next deliberate scroll. A scroll
 * up plays the stage back, from its last frame to its first, and holds there. The controller is in HeroSection.tsx; playback is in
 * frameRenderer.ts (FrameRenderer.play).
 *
 * Frame numbers are 1-based and inclusive, as in the frame files (hero-frames/v3, 203 frames). The stages follow each other with no
 * gap and no overlap, so every frame is played exactly once going forward:
 *   1  1-32     the walk up to the shop, inside, the assistant's greeting
 *   2  33-69    the kiosk: Engagement / Sangeet, Muhurtham, Reception, and their fabric close-ups
 *   3  70-108   the portfolio wall, the ribbon transformation, the pink sherwani
 *   4  109-135  the navy swirl, the suit, the reception hall
 *   5  136-172  the gold swirl and red ribbon, the veshti on the mandap, its close-ups
 *   6  173-203  the brand end card
 * The hero takes seven scrolls: six stages, then the seventh scroll leaves the finished hero for the next section. There is no seventh
 * frame range: the sequence has 203 frames and stages 1-6 already play every one of them.
 */
export interface HeroStage {
  /** First frame of the stage (1-based). The first stage starts at 1; every other starts right after the previous one's last frame. */
  from: number;
  /** Last frame of the stage (1-based, inclusive): where it stops and waits for the next scroll. The last stage ends on the final frame. */
  to: number;
}

export const HERO_STAGES: readonly HeroStage[] = [
  { from: 1, to: 32 },
  { from: 33, to: 69 },
  { from: 70, to: 108 },
  { from: 109, to: 135 },
  { from: 136, to: 172 },
  { from: 173, to: 203 },
];

/**
 * Playing speed in frames per second, the same for every stage and both directions, constant from a stage's first frame to its last:
 * every frame is on screen for the same 125 ms. Slow and even, like the footage played at a third of its speed; the stages last
 * 3.4-4.9 s (25 s in all, about the pace the hero has always had).
 */
export const HERO_FPS = 8;

/** Crossfading between frames is off: every frame is shown on its own, whole and sharp. */
export const CROSSFADE = false;

export interface StagePlan {
  /** Frames to play, 0-based: the frame on screen as the stage begins, and the frame it stops on. */
  start: number;
  end: number;
  /** Playing time in ms. */
  ms: number;
}

export interface StageMap {
  /** Number of stages. */
  count: number;
  /** First and last frame (0-based) of stage `k` (0-based). */
  start(k: number): number;
  end(k: number): number;
  /** Playing time (ms) of a move over `frames` frames at HERO_FPS. */
  duration(frames: number): number;
  /** Forward plays from the frame at rest after `k` stages to the next stage's last frame. */
  stages: readonly StagePlan[];
  /** The frame (0-based) on screen at rest after `k` stages (0: frame 1, before the first stage). */
  rest(k: number): number;
}

/** Checks the stages fit the sequence; returns a reason when they do not. */
function invalid(stages: readonly HeroStage[], count: number): string | null {
  if (!stages.length) return 'no stages';
  if (stages[0].from !== 1) return `the first stage must start at frame 1, not ${stages[0].from}`;
  if (stages[stages.length - 1].to !== count) return `the last stage must end on frame ${count}, not ${stages[stages.length - 1].to}`;
  for (let i = 0; i < stages.length; i++) {
    const { from, to } = stages[i];
    if (!(Number.isInteger(from) && Number.isInteger(to) && from <= to)) return `stage ${i + 1}: ${from}-${to} is not a frame range`;
    if (i && from !== stages[i - 1].to + 1) return `stage ${i + 1} must start on frame ${stages[i - 1].to + 1}, right after stage ${i}, not ${from}`;
  }
  return null;
}

export function buildStageMap(stages: readonly HeroStage[], count: number): StageMap {
  const problem = invalid(stages, count);
  if (problem) {
    // A mistake in the table must not break the hero: play the whole sequence as one stage instead, and say why.
    console.error(`HERO_STAGES ignored: ${problem}.`);
    stages = [{ from: 1, to: count }];
  }
  const at = (k: number) => stages[Math.max(0, Math.min(stages.length - 1, k))];
  const duration = (frames: number) => Math.max(1, Math.abs(frames)) / HERO_FPS * 1000;
  const rests = [0, ...stages.map(stage => stage.to - 1)];
  return {
    count: stages.length,
    start: k => at(k).from - 1,
    end: k => at(k).to - 1,
    duration,
    stages: stages.map((_, i) => ({ start: rests[i], end: rests[i + 1], ms: duration(rests[i + 1] - rests[i]) })),
    rest: k => rests[Math.max(0, Math.min(rests.length - 1, k))],
  };
}
