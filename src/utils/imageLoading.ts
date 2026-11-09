export type ImagePriority = 'high' | 'low' | 'auto';
type LoadState = 'requested' | 'loaded' | 'failed';
type DecodeState = 'pending' | 'queued' | 'decoding' | 'decoded' | 'failed';

interface ImageResource {
  url: string;
  image: HTMLImageElement;
  priority: ImagePriority;
  loadState: LoadState;
  decodeState: DecodeState;
  failed: boolean;
  loaded: Promise<boolean>;
  ready: Promise<boolean>;
  resolveReady: (ready: boolean) => void;
}

interface PreparedImage {
  priority: ImagePriority;
  fallbackSource: string;
  ready: Promise<boolean>;
}

interface PreparedBackground {
  priority: ImagePriority;
  resource: ImageResource;
  ready: Promise<boolean>;
}

export interface ImageBootstrap {
  criticalReady: Promise<void>;
  allReady: Promise<void>;
}

export interface ImageGroupResult {
  total: number;
  ready: number;
  failed: number;
}

export interface ImageLoadingSummary {
  requested: number;
  loaded: number;
  decoded: number;
  failed: number;
}

const resources = new Map<string, ImageResource>();
const preparedImages = new WeakMap<HTMLImageElement, PreparedImage>();
const preparedBackgrounds = new WeakMap<HTMLElement, PreparedBackground>();
const decodeQueue: ImageResource[] = [];
const priorityOrder: Record<ImagePriority, number> = { high: 0, auto: 1, low: 2 };
const maxConcurrentDecodes = 2;
let activeDecodes = 0;
let decodeDrainScheduled = false;

function normalizeSource(source: string) {
  const value = source.trim();
  if (!value || value.startsWith('data:')) return value;
  try { return new URL(value, document.baseURI).href; }
  catch { return value; }
}

function scheduleDecodeDrain() {
  if (decodeDrainScheduled) return;
  decodeDrainScheduled = true;
  // Yield between decode batches so image preparation never monopolizes a frame.
  setTimeout(() => {
    decodeDrainScheduled = false;
    drainDecodeQueue();
  }, 0);
}

function finishDecode(resource: ImageResource, decoded: boolean) {
  resource.decodeState = decoded ? 'decoded' : 'failed';
  resource.failed ||= !decoded;
  resource.resolveReady(decoded);
}

function drainDecodeQueue() {
  decodeQueue.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  while (activeDecodes < maxConcurrentDecodes && decodeQueue.length) {
    const resource = decodeQueue.shift()!;
    if (resource.decodeState !== 'queued') continue;
    resource.decodeState = 'decoding';
    activeDecodes++;
    const decoding = typeof resource.image.decode === 'function'
      ? resource.image.decode()
      : Promise.resolve();
    void decoding.then(() => finishDecode(resource, true))
      .catch(() => finishDecode(resource, false))
      .finally(() => {
        activeDecodes--;
        scheduleDecodeDrain();
      });
  }
}

function enqueueDecode(resource: ImageResource) {
  if (resource.decodeState !== 'pending') return;
  resource.decodeState = 'queued';
  decodeQueue.push(resource);
  scheduleDecodeDrain();
}

function createResource(url: string, priority: ImagePriority): ImageResource {
  const image = new Image();
  image.decoding = 'async';
  image.loading = 'eager';
  image.fetchPriority = priority;

  let resolveLoaded!: (loaded: boolean) => void;
  let resolveReady!: (ready: boolean) => void;
  const loaded = new Promise<boolean>(resolve => { resolveLoaded = resolve; });
  const ready = new Promise<boolean>(resolve => { resolveReady = resolve; });
  const resource: ImageResource = {
    url,
    image,
    priority,
    loadState: 'requested',
    decodeState: 'pending',
    failed: false,
    loaded,
    ready,
    resolveReady,
  };

  let settled = false;
  const finishLoad = (success: boolean) => {
    if (settled) return;
    settled = true;
    image.removeEventListener('load', onLoad);
    image.removeEventListener('error', onError);
    resource.loadState = success ? 'loaded' : 'failed';
    resource.failed ||= !success;
    resolveLoaded(success);
  };
  const onLoad = () => finishLoad(true);
  const onError = () => finishLoad(false);
  image.addEventListener('load', onLoad);
  image.addEventListener('error', onError);
  image.src = url;
  if (image.complete) queueMicrotask(() => finishLoad(image.naturalWidth > 0));

  void loaded.then(success => {
    if (success) enqueueDecode(resource);
    else finishDecode(resource, false);
  });
  return resource;
}

function promote(resource: ImageResource, priority: ImagePriority) {
  if (priorityOrder[priority] >= priorityOrder[resource.priority]) return;
  resource.priority = priority;
  resource.image.fetchPriority = priority;
  if (resource.decodeState === 'queued') scheduleDecodeDrain();
}

function requestImage(source: string, priority: ImagePriority) {
  const url = normalizeSource(source);
  const existing = resources.get(url);
  if (existing) {
    promote(existing, priority);
    return existing;
  }
  const resource = createResource(url, priority);
  resources.set(url, resource);
  return resource;
}

function settleResources(records: Iterable<ImageResource>) {
  return Promise.all(Array.from(records, resource => resource.ready)).then(() => undefined);
}

export function startImageBootstrap(
  sources: readonly string[],
  highPrioritySources: readonly string[] = [],
): ImageBootstrap {
  const critical = new Map<string, ImageResource>();
  const all = new Map<string, ImageResource>();

  // Critical requests are created first. Every remaining URL is still assigned
  // immediately; browser fetch priority controls network contention while the
  // decode queue independently limits main-thread pressure.
  highPrioritySources.forEach(source => {
    const resource = requestImage(source, 'high');
    critical.set(resource.url, resource);
    all.set(resource.url, resource);
  });
  sources.forEach(source => {
    const normalized = normalizeSource(source);
    if (!normalized) return;
    const resource = requestImage(normalized, critical.has(normalized) ? 'high' : 'low');
    all.set(resource.url, resource);
  });

  return {
    criticalReady: settleResources(critical.values()),
    allReady: settleResources(all.values()),
  };
}

function imageSource(image: HTMLImageElement) {
  return image.currentSrc || image.getAttribute('src') || image.dataset.imageSrc || '';
}

export function prepareImageElement(image: HTMLImageElement, priority: ImagePriority = 'auto') {
  const existing = preparedImages.get(image);
  if (existing && priorityOrder[priority] < priorityOrder[existing.priority]) {
    existing.priority = priority;
  }
  const effectivePriority = existing?.priority ?? priority;
  image.loading = 'eager';
  image.decoding = 'async';
  image.fetchPriority = effectivePriority;
  if (image.dataset.imageSrcset) image.srcset = image.dataset.imageSrcset;
  if (image.dataset.imageSrc) image.src = image.dataset.imageSrc;

  if (existing) {
    const selected = imageSource(image) || existing.fallbackSource;
    if (selected) promote(requestImage(selected, existing.priority), existing.priority);
    return existing.ready;
  }

  const fallbackSource = imageSource(image);
  if (!fallbackSource) return Promise.resolve(true);
  requestImage(fallbackSource, priority);
  const prepared: PreparedImage = { priority, fallbackSource, ready: Promise.resolve(true) };
  prepared.ready = new Promise<boolean>(resolve => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      image.removeEventListener('load', finish);
      image.removeEventListener('error', finish);
      const selected = imageSource(image) || prepared.fallbackSource;
      void requestImage(selected, prepared.priority).ready.then(resolve);
    };
    image.addEventListener('load', finish);
    image.addEventListener('error', finish);
    if (image.complete) queueMicrotask(finish);
  });
  preparedImages.set(image, prepared);
  return prepared.ready;
}

function prepareBackgroundElement(background: HTMLElement, priority: ImagePriority) {
  const existing = preparedBackgrounds.get(background);
  if (existing) {
    if (priorityOrder[priority] < priorityOrder[existing.priority]) {
      existing.priority = priority;
      promote(existing.resource, priority);
    }
    return existing.ready;
  }
  const source = background.dataset.imageBackground;
  if (!source) return Promise.resolve(true);
  const resource = requestImage(source, priority);
  const ready = resource.ready.then(decoded => {
    // A decoded source is ideal. If decoding itself failed after a successful
    // transfer, still let CSS attempt its native fallback rendering.
    if ((decoded || resource.loadState === 'loaded') && background.isConnected) {
      background.style.backgroundImage = `url(${JSON.stringify(resource.url)})`;
    }
    return decoded;
  });
  preparedBackgrounds.set(background, { priority, resource, ready });
  return ready;
}

export async function prepareImageGroup(
  root: ParentNode,
  priority: ImagePriority = 'auto',
): Promise<ImageGroupResult> {
  const tasks: Promise<boolean>[] = [];
  if (root instanceof HTMLImageElement) tasks.push(prepareImageElement(root, priority));
  root.querySelectorAll<HTMLImageElement>('img').forEach(image => {
    tasks.push(prepareImageElement(image, priority));
  });
  if (root instanceof HTMLElement && root.hasAttribute('data-image-background')) {
    tasks.push(prepareBackgroundElement(root, priority));
  }
  root.querySelectorAll<HTMLElement>('[data-image-background]').forEach(background => {
    tasks.push(prepareBackgroundElement(background, priority));
  });
  const results = await Promise.all(tasks);
  const ready = results.filter(Boolean).length;
  return { total: results.length, ready, failed: results.length - ready };
}

export function getImageLoadingSummary(): ImageLoadingSummary {
  let loaded = 0, decoded = 0, failed = 0;
  resources.forEach(resource => {
    if (resource.loadState === 'loaded') loaded++;
    if (resource.decodeState === 'decoded') decoded++;
    if (resource.failed) failed++;
  });
  return { requested: resources.size, loaded, decoded, failed };
}
