<script lang="ts">
  // The sculpted beetle deck box (an experiment, this PC only): MTG/DeckBox/scarab_ai. Every part's STL comes
  // already in place (z up, mm), so this only moves what moves: the wing covers swing up about their hinges
  // at the head plate, the head plate lifts off (taking the wings) when it's a part of its own ("lid"; newer
  // builds keep it on the tray), and the legs and mandibles pull away.
  import { onDestroy, onMount } from "svelte";
  import type { BeetleBox } from "../lib/types";
  import { LOCAL_SERVER, authHeaders } from "../lib/connection.svelte";

  let { beetle, label = null, onClose }: { beetle: BeetleBox; label?: string | null; onClose: () => void } = $props();

  let host: HTMLDivElement;
  let section: HTMLElement;
  // Fullscreen (as the book box's viewer): the whole viewer, controls included, fills the screen; where the browser
  // can't put an element in fullscreen (iPhone Safari), it fills the window instead
  let full = $state(false);
  let fakeFull = $state(false);
  const nativeFull = () => typeof document !== "undefined" && !!document.fullscreenEnabled;
  async function toggleFull() {
    if (nativeFull()) {
      try {
        if (document.fullscreenElement) await document.exitFullscreen();
        else await section.requestFullscreen();
        return;
      } catch { /* refused: fill the window instead */ }
    }
    fakeFull = !fakeFull;
  }
  onMount(() => {
    const sync = () => (full = document.fullscreenElement === section);
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape" && fakeFull) fakeFull = false; };
    document.addEventListener("fullscreenchange", sync);
    addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("fullscreenchange", sync);
      removeEventListener("keydown", esc);
      if (document.fullscreenElement === section) document.exitFullscreen().catch(() => {});
    };
  });
  const isFull = $derived(full || fakeFull);
  let status = $state("Loading the model…");
  let wings = $state(0);   // 0 = closed, 1 = fully open
  let lid = $state(0);     // 0 = on, 1 = lifted off
  let apart = $state(0);   // 0 = legs on, 1 = pulled away
  let out = $state(0);     // 0 = card boxes in, 1 = both taken out (and hidden)
  let set: ((w: number, l: number, a: number, o: number) => void) | null = null;
  $effect(() => { const w = wings, l = lid, a = apart, o = out; set?.(w, l, a, o); });
  let cleanup: (() => void) | null = null;

  async function fetchPart(url: string): Promise<ArrayBuffer> {
    const headers = url.startsWith(LOCAL_SERVER) ? await authHeaders() : {};
    const r = await fetch(url, { headers });
    if (!r.ok) throw new Error(`fetch for "${url}" responded with ${r.status}: ${r.statusText}`);
    return r.arrayBuffer();
  }
  async function download(name: string, url: string) {
    try {
      const href = URL.createObjectURL(new Blob([await fetchPart(url)], { type: "model/stl" }));
      const a = Object.assign(document.createElement("a"), { href, download: `${label ?? "beetle"}-${name}.stl` });
      a.click();
      setTimeout(() => URL.revokeObjectURL(href), 10000);
    } catch (e) {
      status = `Couldn't download ${name}.stl: ${(e as Error).message}`;
    }
  }
  const hex = (c: string | undefined, or: number) => (c ? parseInt(c.replace("#", ""), 16) : or);

  onMount(async () => {
    try {
      const THREE = await import("three");
      const { STLLoader } = await import("three/examples/jsm/loaders/STLLoader.js");
      const { PLYLoader } = await import("three/examples/jsm/loaders/PLYLoader.js");
      const { OrbitControls } = await import("three/examples/jsm/controls/OrbitControls.js");
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      host.appendChild(renderer.domElement);
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(35, 1, 1, 5000);
      // sky light from above, a lighter ground bounce and a soft light from below, so the underside (belly, legs,
      // the inside of the wings) never goes black
      scene.add(new THREE.HemisphereLight(0xffffff, 0xb8b0a0, 1.6));
      scene.add(new THREE.AmbientLight(0xffffff, 0.8));
      const sun = new THREE.DirectionalLight(0xffffff, 2.2);
      sun.position.set(160, 320, 200);
      scene.add(sun);
      const under = new THREE.DirectionalLight(0xfff4e0, 3.0);
      under.position.set(-120, -300, -80);
      scene.add(under);
      // and a soft headlight riding with the camera: whichever side you turn to look at is lit
      const head = new THREE.DirectionalLight(0xffffff, 1.4);
      head.position.set(0, 0, 1);
      camera.add(head);
      scene.add(camera);
      const mat = (color: number) => new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.1 });
      // colored meshes (PLY, a color per vertex: gems, gold trim, shell greens) when the build made them
      // (low metalness: with nothing for metal to reflect, the shadowed side would go black)
      const painted = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.45, metalness: 0.08 });
      const loader = new STLLoader();
      const plyLoader = new PLYLoader();
      const load = async (name: string, color: number) => {
        const ply = beetle.view?.[name];
        const geo = ply ? plyLoader.parse(await fetchPart(ply)) : loader.parse(await fetchPart(beetle.parts[name]));
        geo.computeVertexNormals();
        return new THREE.Mesh(geo, ply ? painted : mat(color));
      };
      const c = beetle.colors ?? {};
      const limbNames = beetle.limbs;
      const trays = Object.keys(beetle.parts).filter((n) => n.startsWith("tray"));
      let done = 0;
      const hasLid = "lid" in beetle.parts;
      const total = 2 + (hasLid ? 1 : 0) + trays.length + limbNames.length;
      const track = <T,>(p: Promise<T>) => p.then((v) => { done++; status = `Loading the model… ${done}/${total}`; return v; });
      const platePromise = hasLid ? track(load("lid", hex(c.lid, 0x24552e))) : Promise.resolve(null);
      const [wingR, wingL, ...rest] = await Promise.all([
        track(load("wing_r", hex(c.wing_r, 0x2e6b3a))), track(load("wing_l", hex(c.wing_l, 0x2e6b3a))),
        ...trays.map((n) => track(load(n, hex(c.tray, 0x3b2f1e)))),
        ...limbNames.map((n) => track(load(n, hex(c.limb, 0xc9a227)))),
      ]);
      const plate = await platePromise;
      const trayParts = rest.slice(0, trays.length), limbs = rest.slice(trays.length);

      // zask_beetle.scad's axes (Z up, head toward +Y) inside a group that turns them to three.js's Y up
      const model = new THREE.Group();
      model.rotation.x = -Math.PI / 2;
      scene.add(model);
      for (const m of trayParts) model.add(m);
      // the card boxes, as plain blocks
      // (tipped about the cavity floor's front edge when the build tilts them: [degrees, y, z of that edge])
      const boxMat = mat(0xe8e2d4);
      const [tiltDeg, py, pz] = beetle.boxTilt ?? [0, 0, 0];
      const cards = new THREE.Group();
      cards.position.set(0, py, pz);
      cards.rotation.x = (tiltDeg * Math.PI) / 180;
      model.add(cards);
      const boxes = beetle.boxes.map(([x, y, z, w, l, h]) => {
        const b = new THREE.Mesh(new THREE.BoxGeometry(w, l, h), boxMat);
        b.position.set(x + w / 2, y + l / 2 - py, z + h / 2 - pz);
        cards.add(b);
        return { mesh: b, home: b.position.clone(), len: l };
      });
      // taking the boxes out, as by hand: the wings' way out is up, leaning back toward the tail (a straight lift
      // catches the opened wings). The box behind goes first; the one under the head plate slides back into its
      // place, then follows. In the cards' own (tipped) axes.
      const xAxis = new THREE.Vector3(1, 0, 0), tip = (tiltDeg * Math.PI) / 180;
      const lean = (20 * Math.PI) / 180;
      const lift = new THREE.Vector3(0, -Math.sin(lean), Math.cos(lean)).applyAxisAngle(xAxis, -tip).multiplyScalar(170);
      const ease = (t: number) => { const c = Math.min(1, Math.max(0, t)); return c * c * (3 - 2 * c); };
      const order = boxes.map((b, i) => i).sort((i, j) => boxes[i].home.y - boxes[j].home.y);   // rear first
      const takeOut = (o: number) => {
        order.forEach((i, k) => {
          const b = boxes[i];
          if (k === 0) {
            b.mesh.position.copy(b.home).addScaledVector(lift, ease(o / 0.45));
          } else {
            const back = boxes[order[0]].home.y - b.home.y;           // into the first one's place
            b.mesh.position.copy(b.home);
            b.mesh.position.y += back * ease((o - 0.45) / 0.2);
            b.mesh.position.addScaledVector(lift, ease((o - 0.65) / 0.33));
          }
          b.mesh.visible = o < 0.995;
        });
      };
      // the head plate carries the wings' hinges: lifting it takes them along
      const top = new THREE.Group();
      model.add(top);
      if (plate) top.add(plate);
      const [hx, hy, hz] = beetle.hinge;
      const t = (beetle.tilt * Math.PI) / 180;
      const hinge = (mesh: InstanceType<typeof THREE.Mesh>, axis: InstanceType<typeof THREE.Vector3>, sign: number) => {
        const pivot = new THREE.Group();
        pivot.position.set(hx, hy, hz);
        mesh.position.set(-hx, -hy, -hz);
        pivot.add(mesh);
        top.add(pivot);
        return (deg: number) => pivot.quaternion.setFromAxisAngle(axis, (sign * deg * Math.PI) / 180);
      };
      // each axis drops outward by the tilt. The left wing is the right one mirrored, and a mirror turns a
      // rotation's sense around: about the mirrored axis it turns the other way (or both rear ends wouldn't rise).
      // newer builds give each wing a hinge of its own (on its side, swinging it out more than up)
      type H = { at: [number, number, number]; axis: [number, number, number]; sign: number };
      const wh = beetle.wingHinge as Record<string, H | number | undefined> | null | undefined;
      const own = (mesh: InstanceType<typeof THREE.Mesh>, h: H) => {
        const pivot = new THREE.Group();
        pivot.position.set(...h.at);
        mesh.position.set(-h.at[0], -h.at[1], -h.at[2]);
        pivot.add(mesh);
        top.add(pivot);
        const axis = new THREE.Vector3(...h.axis).normalize();
        return (deg: number) => pivot.quaternion.setFromAxisAngle(axis, (h.sign * deg * Math.PI) / 180);
      };
      const hr = wh?.wing_r as H | undefined, hl = wh?.wing_l as H | undefined;
      const turnR = hr ? own(wingR, hr) : hinge(wingR, new THREE.Vector3(Math.cos(t), 0, -Math.sin(t)), -1);
      const turnL = hl ? own(wingL, hl) : hinge(wingL, new THREE.Vector3(-Math.cos(t), 0, -Math.sin(t)), 1);
      const openDeg = typeof wh?.open === "number" ? wh.open : 100;
      // legs and mandibles pull out of their sockets: along each one's own axis when the build gives it, else
      // straight away from the body's middle
      const away = limbs.map((m, i) => {
        const ax = beetle.limbAxis?.[limbNames[i]];
        model.add(m);
        if (ax) return new THREE.Vector3(...ax).normalize();
        m.geometry.computeBoundingBox();
        const ctr = m.geometry.boundingBox!.getCenter(new THREE.Vector3());
        return new THREE.Vector3(ctr.x, ctr.y - (beetle.center ?? -26), 0).normalize();
      });
      set = (w, l, a, o) => {
        takeOut(o);
        turnR(w * openDeg); turnL(w * openDeg);
        top.position.z = l * 70;
        limbs.forEach((m, i) => m.position.copy(away[i]).multiplyScalar(a * 40));
      };
      set(wings, lid, apart, out);

      const controls = new OrbitControls(camera, renderer.domElement);
      controls.target.set(0, 60, 0);
      controls.enableDamping = true;
      camera.position.set(-300, 280, -380);   // from the front left: the head is toward -z here
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
          if (o instanceof THREE.Mesh) { o.geometry.dispose(); (o.material as { dispose(): void }).dispose(); }
        });
        renderer.dispose();
        renderer.domElement.remove();
      };
    } catch (e) {
      status = `Couldn't show the model: ${(e as Error).message}`;
    }
  });
  onDestroy(() => cleanup?.());
  const [W, L, H] = $derived(beetle.outside);
</script>

<section class="box" class:full={isFull} class:fake={fakeFull} aria-label="Beetle deck box" bind:this={section}>
  <div class="head">
    <h2>Beetle box</h2>
    <p class="meta mono">
      about {W} × {L} × {H} mm with the legs · an experiment from the Zask art (Hunyuan3D 2.1), this PC only ·
      two card boxes inside · wings hinged at the sides{beetle.limbs.length ? " · legs and mandibles plug in, on magnets" : ""}
    </p>
    <button class="btn quiet" onclick={toggleFull} aria-pressed={isFull} title={isFull ? "Leave fullscreen (Esc)" : "Fill the screen"}>
      {isFull ? "Exit fullscreen" : "Fullscreen"}
    </button>
    {#if !isFull}<button class="btn quiet" onclick={onClose}>Close</button>{/if}
  </div>
  <div class="stage" bind:this={host}>
    {#if status}<p class="status">{status}</p>{/if}
  </div>
  <div class="foot">
    <label class="ctl"><span class="eyebrow">Open wings</span>
      <input type="range" min="0" max="1" step="0.01" bind:value={wings} aria-label="Open the wing covers" /></label>
    {#if beetle.boxes.length}
      <label class="ctl"><span class="eyebrow">Take out cards</span>
        <input type="range" min="0" max="1" step="0.01" bind:value={out} aria-label="Take the card boxes out" /></label>
    {/if}
    {#if "lid" in beetle.parts}
      <label class="ctl"><span class="eyebrow">Lift head plate</span>
        <input type="range" min="0" max="1" step="0.01" bind:value={lid} aria-label="Lift the head plate off" /></label>
    {/if}
    {#if beetle.limbs.length}
      <label class="ctl"><span class="eyebrow">Legs off</span>
        <input type="range" min="0" max="1" step="0.01" bind:value={apart} aria-label="Pull the legs and mandibles off" /></label>
    {/if}
    <span class="dim">Drag to turn, scroll to zoom.</span>
    <span class="downloads">
      {#each Object.entries(beetle.parts) as [name, url] (name)}
        <a class="btn" href={url} download="{label ?? 'beetle'}-{name}.stl" onclick={(e) => { e.preventDefault(); download(name, url); }}>{name.replace("limb_", "")}.stl</a>
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
  /* Fullscreen: the model takes whatever the header and controls leave. */
  .box.full { border-radius: 0; border: 0; height: 100%; width: 100%; box-sizing: border-box; }
  .box.fake { position: fixed; inset: 0; z-index: 1000; height: 100dvh;
    padding: max(var(--space-4), env(safe-area-inset-top)) max(var(--space-4), env(safe-area-inset-right)) max(var(--space-4), env(safe-area-inset-bottom)) max(var(--space-4), env(safe-area-inset-left)); }
  .box.full .stage { flex: 1; height: auto; min-height: 0; }
  .box.full .meta { display: none; }
  .stage { position: relative; height: min(34rem, 72vh); border-radius: var(--radius-m); background: var(--bg); overflow: hidden; }
  .stage :global(canvas) { width: 100%; height: 100%; display: block; touch-action: none; }
  .status { position: absolute; inset: 0; display: grid; place-items: center; margin: 0; color: var(--muted); }
  .foot { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2) var(--space-4); font-size: var(--step--1); }
  .ctl { display: flex; align-items: center; gap: var(--space-2); }
  .dim { color: var(--muted); flex: 1; }
  .downloads { display: flex; flex-wrap: wrap; gap: var(--space-1, 0.25rem); }
  .btn { font: inherit; font-size: var(--step--1); padding: 0.4rem 0.75rem; border-radius: var(--radius-m); border: 1px solid var(--line); background: var(--bg); color: var(--fg); cursor: pointer; text-decoration: none; }
  .btn:hover { border-color: var(--accent); }
  .btn.quiet { color: var(--muted); }
</style>
