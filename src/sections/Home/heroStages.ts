/**
 * The hero's eight stages: one place to set which frames each stage plays and how long it takes.
 *
 * One deliberate scroll (wheel, trackpad, swipe or key) starts the next stage; the stage then plays on its own clock from the frame
 * on screen to its last frame, whether or not the visitor keeps scrolling, and holds there until the next scroll. Scrolling up plays
 * the current stage backwards to the previous stage's last frame. The controller is in HeroSection.tsx; playback is in
 * frameRenderer.ts (FrameRenderer.play).
 *
 * Frame numbers are 1-based and inclusive, as in the frame files. Consecutive stages either share their boundary frame (one ends on
 * 45 and the next starts from it) or follow on (one ends on 27, the next starts at 28). Either way a stage begins on the frame the
 * previous one stopped on and moves straight to its own next frame, so a shared frame is shown once and never replayed: stage 4
 * begins on 45 and plays 46-86; stage 3 begins on 27 and plays 28-45.
 *
 * `duration` (seconds) follows each stage's length and how much its picture changes from frame to frame, measured on the footage
 * (median per-frame change, 0-255, for the original 13-23 / 23-45 split of stages 2 and 3; their durations were kept when the
 * boundary moved to 27/28): 1: 17.2   2: 27.9   3: 12.0   4: 2.9   5: 18.7   6: 16.6   7: 13.7   8: 4.9. A stage of many
 * frames or fast-changing frames gets longer, within 2.5-4 s, so no stage races and none drags.
 */
export interface HeroStage {
  /** First frame of the stage (1-based). The first stage starts at 1. */
  from: number;
  /** Last frame of the stage (1-based, inclusive): where it stops and waits for the next scroll. The last stage ends on the final frame. */
  to: number;
  /** Seconds the stage takes to play. */
  duration: number;
}

export const HERO_STAGES: readonly HeroStage[] = [
  { from: 1, to: 12, duration: 2.5 },
  { from: 13, to: 27, duration: 2.6 },
  { from: 28, to: 45, duration: 2.9 },
  { from: 45, to: 86, duration: 3.5 },
  { from: 87, to: 122, duration: 4.0 },
  { from: 123, to: 143, duration: 3.0 },
  { from: 144, to: 171, duration: 3.2 },
  { from: 172, to: 202, duration: 3.0 },
];

/**
 * Between two frames, dissolve one into the next instead of cutting. Off: every frame is shown on its own, whole and sharp, as the
 * footage was made. (On, two frames are blended on screen for most of a stage, ~87% of drawn display frames, which reads as
 * ghosting/softness.)
 */
export const CROSSFADE = false;

export interface StagePlan {
  /** Frames to play, 0-based: the frame on screen as the stage begins, and the frame it stops on. */
  start: number;
  end: number;
  /** Playing time in ms. */
  ms: number;
}

export interface StageMap {
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
    const { from, to, duration } = stages[i];
    if (!(Number.isInteger(from) && Number.isInteger(to) && from <= to)) return `stage ${i + 1}: ${from}-${to} is not a frame range`;
    if (!(duration > 0)) return `stage ${i + 1}: duration must be above 0`;
    if (i && from !== stages[i - 1].to && from !== stages[i - 1].to + 1) {
      return `stage ${i + 1} must start on frame ${stages[i - 1].to} (shared) or ${stages[i - 1].to + 1}, not ${from}`;
    }
    if (i && to <= stages[i - 1].to) return `stage ${i + 1} adds no frames after stage ${i}`;
  }
  return null;
}

export function buildStageMap(stages: readonly HeroStage[], count: number): StageMap {
  const problem = invalid(stages, count);
  if (problem) {
    // A mistake in the table must not break the hero: play the whole sequence as one stage instead, and say why.
    console.error(`HERO_STAGES ignored: ${problem}.`);
    stages = [{ from: 1, to: count, duration: 8 }];
  }
  const rests = [0, ...stages.map(stage => stage.to - 1)];
  return {
    stages: stages.map((stage, i) => ({ start: rests[i], end: rests[i + 1], ms: stage.duration * 1000 })),
    rest: k => rests[Math.max(0, Math.min(rests.length - 1, k))],
  };
}
