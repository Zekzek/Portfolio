<script lang="ts">
  // The sculpted beetle deck box (an experiment, this PC only): MTG/DeckBox/scarab_ai. Every part's STL comes
  // already in place (z up, mm), so this only moves what moves: the wing covers swing up about their hinges
  // at the head plate, the head plate lifts off (taking the wings), and the legs and mandibles pull away.
  import { onDestroy, onMount } from "svelte";
  import type { BeetleBox } from "../lib/types";
  import { LOCAL_SERVER, authHeaders } from "../lib/connection.svelte";

  let { beetle, label = null, onClose }: { beetle: BeetleBox; label?: string | null; onClose: () => void } = $props();

  let host: HTMLDivElement;
  let status = $state("Loading the model…");
  let wings = $state(0);   // 0 = closed, 1 = fully open
  let lid = $state(0);     // 0 = on, 1 = lifted off
  let apart = $state(0);   // 0 = legs on, 1 = pulled away
  let set: ((w: number, l: number, a: number) => void) | null = null;
  $effect(() => { const w = wings, l = lid, a = apart; set?.(w, l, a); });
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
      scene.add(new THREE.HemisphereLight(0xffffff, 0x404040, 1.6));
      const sun = new THREE.DirectionalLight(0xffffff, 2.2);
      sun.position.set(160, 320, 200);
      scene.add(sun);
      const mat = (color: number) => new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.1 });
      // colored meshes (PLY, a color per vertex: gems, gold trim, shell greens) when the build made them
      const painted = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.38, metalness: 0.25 });
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
      const total = 3 + trays.length + limbNames.length;
      const track = <T,>(p: Promise<T>) => p.then((v) => { done++; status = `Loading the model… ${done}/${total}`; return v; });
      const [wingR, wingL, plate, ...rest] = await Promise.all([
        track(load("wing_r", hex(c.wing_r, 0x2e6b3a))), track(load("wing_l", hex(c.wing_l, 0x2e6b3a))),
        track(load("lid", hex(c.lid, 0x24552e))),
        ...trays.map((n) => track(load(n, hex(c.tray, 0x3b2f1e)))),
        ...limbNames.map((n) => track(load(n, hex(c.limb, 0xc9a227)))),
      ]);
      const trayParts = rest.slice(0, trays.length), limbs = rest.slice(trays.length);

      // zask_beetle.scad's axes (Z up, head toward +Y) inside a group that turns them to three.js's Y up
      const model = new THREE.Group();
      model.rotation.x = -Math.PI / 2;
      scene.add(model);
      for (const m of trayParts) model.add(m);
      // the card boxes, as plain blocks
      const boxMat = mat(0xe8e2d4);
      for (const [x, y, z, w, l, h] of beetle.boxes) {
        const b = new THREE.Mesh(new THREE.BoxGeometry(w, l, h), boxMat);
        b.position.set(x + w / 2, y + l / 2, z + h / 2);
        model.add(b);
      }
      // the head plate carries the wings' hinges: lifting it takes them along
      const top = new THREE.Group();
      model.add(top);
      top.add(plate);
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
      const turnR = hinge(wingR, new THREE.Vector3(Math.cos(t), 0, -Math.sin(t)), -1);
      const turnL = hinge(wingL, new THREE.Vector3(-Math.cos(t), 0, -Math.sin(t)), 1);
      // legs and mandibles pull straight away from the body's middle
      const away = limbs.map((m) => {
        m.geometry.computeBoundingBox();
        const ctr = m.geometry.boundingBox!.getCenter(new THREE.Vector3());
        const d = new THREE.Vector3(ctr.x, ctr.y - (beetle.center ?? -26), 0).normalize();
        model.add(m);
        return d;
      });
      set = (w, l, a) => {
        turnR(w * 100); turnL(w * 100);              // the head plate stops them just past 105 degrees
        top.position.z = l * 70;
        limbs.forEach((m, i) => m.position.copy(away[i]).multiplyScalar(a * 40));
      };
      set(wings, lid, apart);

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

<section class="box" aria-label="Beetle deck box">
  <div class="head">
    <h2>Beetle box</h2>
    <p class="meta mono">
      about {W} × {L} × {H} mm with the legs · an experiment from the Zask art (Hunyuan3D 2.1), this PC only ·
      two card boxes inside · wings hinge at the head plate · legs and mandibles on magnets
    </p>
    <button class="btn quiet" onclick={onClose}>Close</button>
  </div>
  <div class="stage" bind:this={host}>
    {#if status}<p class="status">{status}</p>{/if}
  </div>
  <div class="foot">
    <label class="ctl"><span class="eyebrow">Open wings</span>
      <input type="range" min="0" max="1" step="0.01" bind:value={wings} aria-label="Open the wing covers" /></label>
    <label class="ctl"><span class="eyebrow">Lift head plate</span>
      <input type="range" min="0" max="1" step="0.01" bind:value={lid} aria-label="Lift the head plate off" /></label>
    <label class="ctl"><span class="eyebrow">Legs off</span>
      <input type="range" min="0" max="1" step="0.01" bind:value={apart} aria-label="Pull the legs and mandibles off" /></label>
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
