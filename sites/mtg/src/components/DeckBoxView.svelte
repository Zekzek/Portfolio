<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import type { DeckBox } from "../lib/types";
  import { LOCAL_SERVER, authHeaders } from "../lib/connection.svelte";

  let { box, colors, commanderImage = null, backImage = null, onClose }: {
    box: DeckBox; colors: string | null; commanderImage?: string | null; backImage?: string | null; onClose: () => void;
  } = $props();

  let host: HTMLDivElement;
  let status = $state("Loading the model…");
  let open = $state(0); // 0 = closed, 1 = opened flat
  let lift = $state(0); // lifting floors: 0 = flat, 1 = swung up against the fore-edge wall
  let cleanup: (() => void) | null = null;
  let setOpen: ((v: number) => void) | null = null;
  let setLift: ((v: number) => void) | null = null;
  // Read the value before the call: with setOpen?.(open), a null setOpen skips reading it, so the effect never re-ran.
  $effect(() => { const v = open; setOpen?.(v); });
  $effect(() => { const v = lift; setLift?.(v); });
  // A part's STL. From this PC's server (the hosted page connected to it) the request carries the sign-in,
  // which plain loaders and download links don't send; signed bucket links and local URLs need nothing.
  async function fetchPart(url: string): Promise<ArrayBuffer> {
    const headers = url.startsWith(LOCAL_SERVER) ? await authHeaders() : {};
    const r = await fetch(url, { headers });
    if (!r.ok) throw new Error(`fetch for "${url}" responded with ${r.status}: ${r.statusText}`);
    return r.arrayBuffer();
  }
  async function download(name: string, url: string) {
    try {
      const href = URL.createObjectURL(new Blob([await fetchPart(url)], { type: "model/stl" }));
      const a = Object.assign(document.createElement("a"), { href, download: `${box.label ?? "deckbox"}-${name}.stl` });
      a.click();
      setTimeout(() => URL.revokeObjectURL(href), 10000);
    } catch (e) {
      status = `Couldn't download ${name}.stl: ${(e as Error).message}`;
    }
  }
  const hasFloors = $derived(!!box.parts.floor && !!box.geometry?.floors);

  // Each part in the filament planned for it (box.json "colors"); older builds fall back to the deck's first color.
  const TINT: Record<string, number> = { W: 0xd8cfb4, U: 0x3d6fa8, B: 0x4a4350, R: 0xa8433a, G: 0x3f7a4a };
  const fallback = $derived(TINT[(colors ?? "").charAt(0)] ?? 0x8a7b6a);
  const paint = (part: string, or: number) => {
    const c = box.colors?.[part];
    return c ? parseInt(c.replace("#", ""), 16) : or;
  };
  const [w, h, t] = $derived(box.outside);
  const over = $derived(box.capacity != null ? box.cards - box.capacity : 0);

  onMount(async () => {
    const g = box.geometry;
    if (!g) { status = "This box was built by an older deckbox.py; rebuild it to see it here."; return; }
    try {
      const THREE = await import("three");
      const { STLLoader } = await import("three/examples/jsm/loaders/STLLoader.js");
      const { OrbitControls } = await import("three/examples/jsm/controls/OrbitControls.js");

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      host.appendChild(renderer.domElement);
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(35, 1, 1, 3000);
      scene.add(new THREE.HemisphereLight(0xffffff, 0x404040, 1.6));
      const sun = new THREE.DirectionalLight(0xffffff, 2.2);
      sun.position.set(120, 260, 160);
      scene.add(sun);

      const mat = (color: number, extra: Record<string, unknown> = {}) =>
        new THREE.MeshStandardMaterial({ color, roughness: 0.65, metalness: 0.05, ...extra });
      const loader = new STLLoader();
      const load = async (url: string | undefined, color: number) => {
        if (!url) return null;
        const geo = loader.parse(await fetchPart(url));
        geo.computeVertexNormals();
        return new THREE.Mesh(geo, mat(color));
      };
      const lighter = new THREE.Color(fallback).offsetHSL(0, 0, 0.08).getHex();
      // Parts are named by the print they go in: base (the tray), cover, spine; then floor and gem.
      const part = (name: string, color: number) => load(box.parts[name], paint(name, color));
      const [tray, pages, inlayBack, inlayBackGlow, cover, inlayWhite, inlayBorder, inlayGlow, spine, label, floor, gem] = await Promise.all([
        part("base", fallback), part("base_pages", 0xf0ede6), part("base_border", 0xd0703a), part("base_glow", 0x8dff6a),
        part("cover", lighter), part("cover_frame", 0xf4f4f4), part("cover_border", 0xd0703a), part("cover_glow", 0x8dff6a),
        part("spine", lighter), part("spine_label", 0xd9b44a),
        g.floors ? part("floor", 0xb8a58a) : Promise.resolve(null), part("gem", 0xa64dff),
      ]);
      if (!tray || !spine || !cover) throw new Error("missing parts (built before the print-step names? rebuild the box)");
      // Everything below is in deckbox.scad's axes (Z up); the model group turns that into three.js's Y up.
      const model = new THREE.Group();
      model.rotation.x = -Math.PI / 2;
      scene.add(model);
      const book = new THREE.Group(); // centered on the closed book's footprint
      book.position.set(-(g.x0 + g.width / 2), -(g.y0 + g.height / 2), 0);
      model.add(book);

      // The STLs come lying on their outside faces, as printed; these put them back where they go.
      // spine: printed = rotate -90 about Y, then up by spine_s. cover: printed = flipped about Y, then up by thick.
      spine.rotation.y = Math.PI / 2;
      spine.position.x = -g.spine_s;
      if (label) { label.rotation.y = Math.PI / 2; label.position.x = -g.spine_s; }
      for (const m of [cover, inlayWhite, inlayGlow, inlayBorder]) if (m) { m.rotation.y = Math.PI; m.position.z = g.thick; }

      // Hinges: the spine turns about the back axis, the cover about the front one (both along Y).
      const hinge = (z: number) => {
        const pivot = new THREE.Group();
        pivot.position.set(g.axis_x, 0, z);
        const local = new THREE.Group();
        local.position.set(-g.axis_x, 0, -z);
        pivot.add(local);
        return { pivot, local };
      };
      const back = hinge(g.axis_back);
      const front = hinge(g.axis_front);
      book.add(tray, back.pivot);
      if (pages) book.add(pages);
      back.local.add(spine, front.pivot);
      if (label) back.local.add(label);
      front.local.add(cover);
      if (inlayWhite) front.local.add(inlayWhite);
      if (inlayGlow) front.local.add(inlayGlow);
      if (inlayBorder) front.local.add(inlayBorder);
      // the back cover's inlays print in place with the tray, face down
      for (const m of [inlayBack, inlayBackGlow]) if (m) book.add(m);
      // gems: printed table up at the origin; each sits in its corner socket, inlay_d into the cover
      if (gem && g.gems) {
        for (const [x, y] of [[g.gem_x0, g.gem_y0], [g.gem_x1, g.gem_y0], [g.gem_x0, g.gem_y1], [g.gem_x1, g.gem_y1]]) {
          const one = new THREE.Mesh(gem.geometry, gem.material);
          one.position.set(x ?? 0, y ?? 0, g.thick - (g.inlay_d ?? 0.6));
          front.local.add(one);
        }
      }

      // Two stacks of sleeved cards, filled to this deck's count, each on its lifting floor (if any). A floor
      // turns about its hinge at the fore-edge end; the floor STL is the lower well's, in place.
      const stackMat = mat(0x2a4d69);
      const perStack = [Math.ceil(box.cards / 2), Math.floor(box.cards / 2)];
      const pivots: InstanceType<typeof THREE.Group>[] = [];
      const stacks: InstanceType<typeof THREE.Mesh>[] = [];
      [g.well_y1, g.well_y2].forEach((y, i) => {
        const pivot = new THREE.Group();
        pivot.position.set(g.floor_ax ?? 0, 0, g.floor_az ?? 0);
        const local = new THREE.Group();
        local.position.set(-(g.floor_ax ?? 0), 0, -(g.floor_az ?? 0));
        pivot.add(local);
        book.add(pivot);
        pivots.push(pivot);
        const n = Math.min(perStack[i], g.capacity / 2);
        const sh = Math.max(0.5, n * g.card_t);
        const stack = new THREE.Mesh(new THREE.BoxGeometry(g.well_w - 1.5, g.well_h - 1.5, sh), stackMat);
        stack.position.set(g.well_x + g.well_w / 2, y + g.well_h / 2, g.floor_z + sh / 2);
        local.add(stack);
        stacks.push(stack);
        if (floor) {
          const f = i === 0 ? floor : new THREE.Mesh(floor.geometry, floor.material);
          f.position.y = i === 0 ? 0 : (g.floor_dy ?? 0);
          local.add(f);
        }
      });
      // Lifting: the floors tip the stacks up at the binding end; past a third of the way the cards are out,
      // and the floors swing on up to lean on the fore-edge wall, clear of the back cover's hard sleeve.
      setLift = (v) => {
        pivots.forEach((p) => { p.rotation.y = v * (95 * Math.PI) / 180; });
        stacks.forEach((st) => { st.visible = v < 0.34; });
      };
      setLift(lift);

      // A card in its hard sleeve behind a window: the commander in the cover, and one in the back cover.
      // back = true: it faces out of the back (turned over about Y, so it reads upright from behind).
      const display = (parent: InstanceType<typeof THREE.Group>, z: number, image: string | null, back: boolean) => {
        const out = back ? -1 : 1;
        const sleeve = new THREE.Mesh(new THREE.PlaneGeometry(76, 102),
          mat(0xe8eef2, { transparent: true, opacity: 0.35, side: THREE.DoubleSide }));
        sleeve.position.set(g.window_x, g.window_y, z - 0.4 * out);
        parent.add(sleeve);
        // Not awaited: the page's own card images can keep it queued for a while, and the box shouldn't wait.
        if (image) {
          new THREE.TextureLoader().setCrossOrigin("anonymous").loadAsync(image).then((tex) => {
            tex.colorSpace = THREE.SRGBColorSpace;
            const card = new THREE.Mesh(new THREE.PlaneGeometry(63, 88), new THREE.MeshBasicMaterial({ map: tex }) /* faces out only */);
            card.position.set(g.window_x, g.window_y, z - 0.2 * out);
            if (back) card.rotation.y = Math.PI;
            parent.add(card);
          }, () => {});
        }
      };
      if (box.counted.commander) display(front.local, g.card_z, commanderImage, false);
      if (g.back_display) display(book, g.back_z ?? 1.6, backImage, true);

      // Opening: the spine swings down flat to the left, and the cover a further quarter turn.
      setOpen = (v) => { back.pivot.rotation.y = -v * Math.PI / 2; front.pivot.rotation.y = -v * Math.PI / 2; };
      setOpen(open);

      const controls = new OrbitControls(camera, renderer.domElement);
      // Between the closed book and the opened one, looking down at the cover from its bottom edge.
      controls.target.set(-w * 0.35, t / 2, 0);
      controls.enableDamping = true;
      camera.position.set(w * 0.5, h * 1.75, h * 1.45);
      controls.update();

      const resize = () => {
        const { clientWidth: cw, clientHeight: ch } = host;
        renderer.setSize(cw, ch, false);
        camera.aspect = cw / ch;
        camera.updateProjectionMatrix();
      };
      const ro = new ResizeObserver(resize);
      ro.observe(host);
      resize();
      let frame = 0;
      const tick = () => { controls.update(); renderer.render(scene, camera); frame = requestAnimationFrame(tick); };
      tick();
      status = "";
      cleanup = () => {
        cancelAnimationFrame(frame);
        ro.disconnect();
        controls.dispose();
        scene.traverse((o) => {
          if (o instanceof THREE.Mesh) {
            o.geometry.dispose();
            const m = o.material as { dispose(): void; map?: { dispose(): void } | null };
            m.map?.dispose();
            m.dispose();
          }
        });
        renderer.dispose();
        renderer.domElement.remove();
      };
    } catch (e) {
      status = `Couldn't show the model: ${(e as Error).message}`;
    }
  });
  onDestroy(() => cleanup?.());

  // Download buttons grouped by print: a part's name starts with its print (base_pages goes with base).
  const prints = $derived.by(() => {
    const groups = new Map<string, [string, string][]>();
    for (const [name, url] of Object.entries(box.parts)) {
      const key = name.split("_")[0];
      groups.set(key, [...(groups.get(key) ?? []), [name, url]]);
    }
    return [...groups];
  });
  const times = (name: string) => (name === "floor" ? " ×2" : name === "gem" ? " ×4" : "");
</script>

<section class="box" aria-label="Deck box">
  <div class="head">
    <h2>Deck box</h2>
    <p class="meta mono">
      {w} × {h} × {t} mm{box.capacity ? ` · holds ${box.capacity} sleeved cards in two stacks` : ""} · this deck: {box.cards}
      ({box.counted.deck} deck{box.counted.tokens ? ` + ${box.counted.tokens} tokens` : ""}{box.counted.extra ? ` + ${box.counted.extra} extra` : ""}){box.counted.commander ? " + commander in a hard sleeve in the cover" : ""}{box.backCard ? ` + ${box.backCard} in the back cover` : box.geometry?.back_display ? " · a hard sleeve in the back cover for any card" : ""}
      · {box.geometry?.magnets ?? 4} magnet pairs {box.magnet[0]}×{box.magnet[1]} mm · hinge pins: pipe cleaners{hasFloors ? " · a lifting floor in each well" : ""}
    </p>
    <button class="btn quiet" onclick={onClose}>Close</button>
  </div>
  {#if over > 0}<p class="warn">This deck needs {over} more {over === 1 ? "card" : "cards"} of room than the box holds.</p>{/if}
  <div class="stage" bind:this={host}>
    {#if status}<p class="status">{status}</p>{/if}
  </div>
  <div class="foot">
    <label class="lid">
      <span class="eyebrow">Open</span>
      <input type="range" min="0" max="1" step="0.01" bind:value={open} aria-label="Open the book" />
    </label>
    {#if hasFloors}
      <label class="lid">
        <span class="eyebrow">Lift floors</span>
        <input type="range" min="0" max="1" step="0.01" bind:value={lift} aria-label="Lift the floors" />
      </label>
    {/if}
    <span class="dim">Drag to turn, scroll to zoom.</span>
    <span class="downloads">
      {#each prints as [print, files] (print)}
        <span class="print" aria-label="{print} print">
          {#each files as [name, url] (name)}
            <a class="btn" href={url} download="{box.label ?? 'deckbox'}-{name}.stl" onclick={(e) => { e.preventDefault(); download(name, url); }}>{name}.stl{times(name)}</a>
          {/each}
        </span>
      {/each}
    </span>
  </div>
</section>

<style>
  .box {
    border: 1px solid var(--line); border-radius: var(--radius-m); background: var(--surface);
    padding: var(--space-4); display: flex; flex-direction: column; gap: var(--space-3);
  }
  .head { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2) var(--space-4); }
  h2 { font-size: var(--step-1); }
  .meta { color: var(--muted); font-size: var(--step--1); flex: 1; }
  .warn { margin: 0; color: var(--danger, #b3412f); font-size: var(--step--1); }
  .stage { position: relative; height: min(30rem, 70vh); border-radius: var(--radius-m); background: var(--bg); overflow: hidden; }
  .stage :global(canvas) { width: 100%; height: 100%; display: block; touch-action: none; }
  .status { position: absolute; inset: 0; display: grid; place-items: center; margin: 0; color: var(--muted); }
  .foot { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2) var(--space-4); font-size: var(--step--1); }
  .lid { display: flex; align-items: center; gap: var(--space-2); }
  .dim { color: var(--muted); flex: 1; }
  .downloads { display: flex; flex-wrap: wrap; gap: var(--space-2) var(--space-4); }
  .print { display: flex; flex-wrap: wrap; gap: var(--space-1, 0.25rem); padding: 0.2rem; border-radius: var(--radius-m); background: var(--bg); outline: 1px dashed var(--line); }
  .btn { font: inherit; font-size: var(--step--1); padding: 0.4rem 0.75rem; border-radius: var(--radius-m); border: 1px solid var(--line); background: var(--bg); color: var(--fg); cursor: pointer; text-decoration: none; }
  .btn:hover { border-color: var(--accent); }
  .btn.quiet { color: var(--muted); }
</style>
