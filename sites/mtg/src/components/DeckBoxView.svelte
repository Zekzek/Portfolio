<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import type { DeckBox } from "../lib/types";

  let { box, colors, commanderImage = null, backImage = null, onClose }: {
    box: DeckBox; colors: string | null; commanderImage?: string | null; backImage?: string | null; onClose: () => void;
  } = $props();

  let host: HTMLDivElement;
  let status = $state("Loading the model…");
  let open = $state(0); // 0 = closed, 1 = opened flat
  let lift = $state(0); // card trays: 0 = in the box, 1 = lifted out
  let cleanup: (() => void) | null = null;
  let setOpen: ((v: number) => void) | null = null;
  let setLift: ((v: number) => void) | null = null;
  // Read the value before the call: with setOpen?.(open), a null setOpen skips reading it, so the effect never re-ran.
  $effect(() => { const v = open; setOpen?.(v); });
  $effect(() => { const v = lift; setLift?.(v); });
  const hasTrays = $derived(!!box.parts.cardtray && !!box.geometry?.cardtrays);

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
        const geo = await loader.loadAsync(url);
        geo.computeVertexNormals();
        return new THREE.Mesh(geo, mat(color));
      };
      const lighter = new THREE.Color(fallback).offsetHSL(0, 0, 0.08).getHex();
      const [tray, spine, cover, label, cardtray, inlayWhite, inlayGlow, gem, inlayBorder, inlayBack, inlayBackGlow] = await Promise.all([
        load(box.parts.tray, paint("tray", fallback)), load(box.parts.spine, paint("spine", lighter)),
        load(box.parts.cover, paint("cover", lighter)), load(box.parts.label, paint("label", 0xd9b44a)),
        g.cardtrays ? load(box.parts.cardtray, paint("cardtray", 0xb8a58a)) : Promise.resolve(null),
        load(box.parts.inlay_white, paint("inlay_white", 0xf4f4f4)),
        load(box.parts.inlay_glow, paint("inlay_glow", 0x8dff6a)),
        load(box.parts.gem, paint("gem", 0xa64dff)),
        load(box.parts.inlay_border, paint("inlay_border", 0xd0703a)),
        load(box.parts.inlay_back, paint("inlay_back", 0xd0703a)),
        load(box.parts.inlay_back_glow, paint("inlay_back_glow", 0x8dff6a)),
      ]);
      if (!tray || !spine || !cover) throw new Error("missing parts");
      // The tray prints its back cover and hinge in one filament and its pages in another (a change at pages_z):
      // paint each vertex by its height.
      const change = g.pages_z ?? g.panel_t;
      if (box.colors?.pages && change) {
        const below = new THREE.Color(paint("tray", fallback)), above = new THREE.Color(paint("pages", 0xf0ede6));
        const pos = tray.geometry.getAttribute("position");
        const col = new Float32Array(pos.count * 3);
        // each triangle takes one color, by its highest corner, so faces don't blend across the change
        for (let i = 0; i < pos.count; i += 3) {
          const top = Math.max(pos.getZ(i), pos.getZ(i + 1), pos.getZ(i + 2));
          const c = top > change + 0.05 ? above : below;
          for (let k = 0; k < 3; k++) col.set([c.r, c.g, c.b], (i + k) * 3);
        }
        tray.geometry.setAttribute("color", new THREE.BufferAttribute(col, 3));
        tray.material = mat(0xffffff, { vertexColors: true });
      }

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

      // Two stacks of sleeved cards, filled to this deck's count, each in its lift-out card tray (if any).
      const stackMat = mat(0x2a4d69);
      const perStack = [Math.ceil(box.cards / 2), Math.floor(box.cards / 2)];
      const lifters: InstanceType<typeof THREE.Group>[] = [];
      [g.well_y1, g.well_y2].forEach((y, i) => {
        const lifter = new THREE.Group(); // moves up when the trays are lifted out
        book.add(lifter);
        lifters.push(lifter);
        const n = Math.min(perStack[i], g.capacity / 2);
        const sh = Math.max(0.5, n * g.card_t);
        const stack = new THREE.Mesh(new THREE.BoxGeometry(g.well_w - 1.5, g.well_h - 1.5, sh), stackMat);
        stack.position.set(g.well_x + g.well_w / 2, y + g.well_h / 2, g.floor_z + sh / 2);
        lifter.add(stack);
        if (cardtray) {
          const t = i === 0 ? cardtray : new THREE.Mesh(cardtray.geometry, cardtray.material);
          t.position.set(g.cardtray_x ?? 0, (i === 0 ? g.cardtray_y1 : g.cardtray_y2) ?? 0, g.cardtray_z ?? 0);
          lifter.add(t);
        }
      });
      // Lifted out: straight up clear of the base, then set down beside it on the fore-edge side.
      setLift = (v) => lifters.forEach((l) => {
        const up = Math.min(1, v * 2);
        const out = Math.max(0, v * 2 - 1);
        l.position.set(out * (g.width + 15), 0, (up - out) * (g.thick + 5) - out * (g.cardtray_z ?? 0));
      });
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

  const parts = $derived(Object.entries(box.parts));
</script>

<section class="box" aria-label="Deck box">
  <div class="head">
    <h2>Deck box</h2>
    <p class="meta mono">
      {w} × {h} × {t} mm{box.capacity ? ` · holds ${box.capacity} sleeved cards in two stacks` : ""} · this deck: {box.cards}
      ({box.counted.deck} deck{box.counted.tokens ? ` + ${box.counted.tokens} tokens` : ""}{box.counted.extra ? ` + ${box.counted.extra} extra` : ""}){box.counted.commander ? " + commander in a hard sleeve in the cover" : ""}{box.backCard ? ` + ${box.backCard} in the back cover` : box.geometry?.back_display ? " · a hard sleeve in the back cover for any card" : ""}
      · {box.geometry?.magnets ?? 4} magnet pairs {box.magnet[0]}×{box.magnet[1]} mm · hinge pins: 1.75 mm filament{hasTrays ? " · a lift-out card tray in each well" : ""}
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
    {#if hasTrays}
      <label class="lid">
        <span class="eyebrow">Lift trays</span>
        <input type="range" min="0" max="1" step="0.01" bind:value={lift} aria-label="Lift the card trays out" />
      </label>
    {/if}
    <span class="dim">Drag to turn, scroll to zoom.</span>
    <span class="downloads">
      {#each parts as [name, url] (name)}
        <a class="btn" href={url} download="{box.label ?? 'deckbox'}-{name}.stl">{name}.stl{name === "cardtray" ? " ×2" : name === "gem" ? " ×4" : ""}</a>
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
  .downloads { display: flex; flex-wrap: wrap; gap: var(--space-2); }
  .btn { font: inherit; font-size: var(--step--1); padding: 0.4rem 0.75rem; border-radius: var(--radius-m); border: 1px solid var(--line); background: var(--bg); color: var(--fg); cursor: pointer; text-decoration: none; }
  .btn:hover { border-color: var(--accent); }
  .btn.quiet { color: var(--muted); }
</style>
