import * as THREE from 'three';
import { TAU } from './spin.js';

/** No independent animation loop. The game requests draws only after a change. */
export function createWheel(canvas, onContextLost) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-2.55, 2.55, 2.55, -2.55, .1, 30);
  camera.position.set(0, -2.1, 10); camera.lookAt(0, 0, 0);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x46669a, 2.4));
  const light = new THREE.DirectionalLight(0xffffff, 3); light.position.set(-3, 5, 6); scene.add(light);
  let wheel = new THREE.Group(); scene.add(wheel);
  let resources = [], disposed = false, pointer;
  const models = new Map();
  const keep = resource => { resources.push(resource); return resource; };
  const mesh = (geometry, material) => new THREE.Mesh(keep(geometry), keep(material));
  const draw = () => { if (!disposed) renderer.render(scene, camera); };
  const resize = () => {
    const size = Math.max(1, Math.round(canvas.getBoundingClientRect().width));
    renderer.setSize(size, size, false); draw();
  };
  const observer = new ResizeObserver(resize); observer.observe(canvas);
  const lost = event => { event.preventDefault(); onContextLost(); };
  canvas.addEventListener('webglcontextlost', lost);
  const disposeModels = () => {
    const all = new Set(resources);
    for (const model of models.values()) for (const resource of model.resources) all.add(resource);
    for (const resource of all) resource.dispose();
    models.clear(); resources = []; scene.clear();
  };
  return {
    draw,
    setItems(items) {
      const key = JSON.stringify(items);
      scene.remove(wheel); if (pointer) scene.remove(pointer);
      if (models.has(key)) {
        const model = models.get(key); models.delete(key); models.set(key, model);
        ({wheel, pointer, resources} = model); scene.add(wheel, pointer); return;
      }
      wheel = new THREE.Group(); resources = []; scene.add(wheel);
      const step = TAU / items.length;
      items.forEach((item, index) => {
        const center = Math.PI / 2 - index * step;
        const shape = new THREE.Shape(); shape.moveTo(0, 0);
        shape.absarc(0, 0, 1.94, center - step / 2 + .008, center + step / 2 - .008, false);
        shape.lineTo(0, 0);
        const part = mesh(new THREE.ExtrudeGeometry(shape, { depth: .17, bevelEnabled: true, bevelSize: .025, bevelThickness: .025, bevelSegments: 2, steps: 1, curveSegments: 18 }), new THREE.MeshStandardMaterial({ color: item.color, roughness: .37, metalness: .08 }));
        wheel.add(part);
      });
      const rim = mesh(new THREE.TorusGeometry(2.02, .09, 12, 96), new THREE.MeshStandardMaterial({ color: 0xf9cd54, metalness: .65, roughness: .28 }));
      rim.position.z = .08; wheel.add(rim);
      const hub = mesh(new THREE.CylinderGeometry(.25, .29, .28, 40), new THREE.MeshStandardMaterial({ color: 0xfff5ce, metalness: .4, roughness: .25 }));
      hub.rotation.x = Math.PI / 2; hub.position.z = .3; wheel.add(hub);
      const labelCanvas = document.createElement('canvas'); labelCanvas.width = labelCanvas.height = 1024;
      const ctx = labelCanvas.getContext('2d');
      ctx.translate(512, 512); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = '800 48px system-ui, sans-serif';
      items.forEach((item, index) => {
        ctx.save(); ctx.rotate(index * step);
        ctx.translate(0, -322); ctx.rotate(-Math.PI / 2);
        ctx.lineWidth = 6; ctx.strokeStyle = '#fff'; ctx.fillStyle = '#17233d';
        ctx.strokeText(item.label, 0, 0, 220); ctx.fillText(item.label, 0, 0, 220); ctx.restore();
      });
      const texture = keep(new THREE.CanvasTexture(labelCanvas)); texture.colorSpace = THREE.SRGBColorSpace;
      const labels = mesh(new THREE.PlaneGeometry(4, 4), new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false }));
      labels.position.z = .205; wheel.add(labels);
      const pointerShape = new THREE.Shape(); pointerShape.moveTo(-.16, 2.37); pointerShape.lineTo(.16, 2.37); pointerShape.lineTo(0, 1.99); pointerShape.closePath();
      pointer = mesh(new THREE.ExtrudeGeometry(pointerShape, { depth: .18, bevelEnabled: false }), new THREE.MeshStandardMaterial({ color: 0xe94662, metalness: .15, roughness: .4 }));
      pointer.userData.pointer = true; pointer.position.z = .32; scene.add(pointer);
      models.set(key, {wheel, pointer, resources});
      // At most the two most recent localized day/month wheels retain GPU resources.
      if (models.size > 2) {
        const oldest = models.keys().next().value;
        for (const resource of models.get(oldest).resources) resource.dispose();
        models.delete(oldest);
      }
    },
    setAngle(angle) { wheel.rotation.z = angle; draw(); },
    dispose() {
      if (disposed) return;
      disposed = true; observer.disconnect(); canvas.removeEventListener('webglcontextlost', lost);
      disposeModels(); renderer.dispose(); renderer.forceContextLoss();
    },
  };
}
