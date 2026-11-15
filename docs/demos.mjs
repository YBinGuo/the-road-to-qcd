// Stage value → { title, load: () => import('./demos/example.mjs') }.
// A demo module exports mount(host, { signal, stage }), which may return
// { pause(), resume(), dispose() }. The AbortSignal ends when the panel closes.
export const demos = new Map();
