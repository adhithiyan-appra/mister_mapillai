type Priority = 'high' | 'low' | 'auto';
interface ImageTask { priority: Priority; run: (priority: Priority) => Promise<void> }

const pending: ImageTask[] = [];
const preparedImages = new WeakMap<HTMLImageElement, ImageTask>();
const preparedBackgrounds = new WeakMap<HTMLElement, ImageTask>();
const priorityOrder: Record<Priority, number> = { high: 0, auto: 1, low: 2 };
let active = 0;

function drain() {
  while (active < 2 && pending.length) {
    pending.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
    // A distant preload must leave room for a newly approaching chapter. Two
    // low-priority transfers previously occupied both slots until too late.
    if (active && pending[0].priority === 'low') break;
    const task = pending.shift()!;
    active++;
    void task.run(task.priority).catch(() => {
      // Image failures must never interrupt the scroll animation scheduler.
    }).finally(() => { active--; drain(); });
  }
}

function enqueue(priority: Priority, run: ImageTask['run']) {
  const task = { priority, run };
  pending.push(task);
  drain();
  return task;
}

export function prepareImageGroup(root: ParentNode, priority: Priority = 'auto') {
  root.querySelectorAll<HTMLImageElement>('img').forEach(image => {
    // Promote an upcoming image when it becomes current, without issuing a second request.
    const queued = preparedImages.get(image);
    if (queued) {
      if (priorityOrder[priority] < priorityOrder[queued.priority]) {
        queued.priority = priority;
        image.fetchPriority = priority;
        drain();
      }
      return;
    }
    const task = enqueue(priority, async fetchPriority => {
      if (!image.isConnected) { preparedImages.delete(image); return; }
      image.fetchPriority = fetchPriority;
      image.loading = 'eager';
      if (image.dataset.imageSrcset) image.srcset = image.dataset.imageSrcset;
      if (image.dataset.imageSrc) image.src = image.dataset.imageSrc;
      try { await image.decode(); }
      catch { preparedImages.delete(image); }
    });
    preparedImages.set(image, task);
  });
  root.querySelectorAll<HTMLElement>('[data-image-background]').forEach(background => {
    const queued = preparedBackgrounds.get(background);
    if (queued) {
      if (priorityOrder[priority] < priorityOrder[queued.priority]) {
        queued.priority = priority;
        drain();
      }
      return;
    }
    const task = enqueue(priority, async fetchPriority => {
      if (!background.isConnected) { preparedBackgrounds.delete(background); return; }
      const image = new Image();
      image.decoding = 'async';
      image.fetchPriority = fetchPriority;
      image.src = background.dataset.imageBackground!;
      try {
        await image.decode();
        if (background.isConnected) background.style.backgroundImage = `url("${image.src}")`;
      } catch { preparedBackgrounds.delete(background); }
    });
    preparedBackgrounds.set(background, task);
  });
}
