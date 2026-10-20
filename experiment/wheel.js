import * as THREE from 'three';
import { createWheelModel } from './wheel-model.js';
import { pointerDeflection } from './spin.js';

/** Draw only on resize, changed state or an active spin; no idle animation loop. */
export function createWheel(canvas,onContextLost) {
  const renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5)); renderer.setClearColor(0x000000,0);
  const scene=new THREE.Scene();
  const camera=new THREE.OrthographicCamera(-2.65,2.65,2.65,-2.65,.1,30);
  camera.position.set(0,-3.1,10); camera.lookAt(0,.03,0);
  scene.add(new THREE.HemisphereLight(0xffffff,0x536a98,2.2));
  const light=new THREE.DirectionalLight(0xffffff,3); light.position.set(-3,5,6); scene.add(light);
  const models=new Map();
  let model,disposed=false,count=7,angle=0,speed=0,selected=null;
  const draw=()=>{
    if(disposed)return;
    renderer.render(scene,camera);
    const stats={drawCalls:renderer.info.render.calls,geometryCount:renderer.info.memory.geometries,textureCount:renderer.info.memory.textures,selectedIndex:selected??'',pointerAngle:model?.pivot.rotation.z.toFixed(4)??'0'};
    for(const [key,value] of Object.entries(stats))if(canvas.dataset[key]!==String(value))canvas.dataset[key]=String(value);
  };
  const resize=()=>{
    const size=Math.max(1,Math.round(canvas.getBoundingClientRect().width));
    renderer.setSize(size,size,false); draw();
  };
  const observer=new ResizeObserver(resize); observer.observe(canvas);
  const lost=event=>{event.preventDefault();onContextLost();};
  canvas.addEventListener('webglcontextlost',lost);
  const update=()=>{
    if(!model)return;
    model.wheel.rotation.z=angle;
    model.pivot.rotation.z=pointerDeflection(angle,count,speed);
    model.selection.visible=selected!==null;
    if(selected!==null)model.selection.rotation.z=-selected*model.step;
    draw();
  };
  const disposeModel=value=>{for(const resource of value.resources)resource.dispose();};
  return {
    setItems(items){
      const key=JSON.stringify(items); count=items.length;
      if(model)scene.remove(model.wheel,model.pointer);
      if(models.has(key)){
        model=models.get(key);models.delete(key);models.set(key,model);
      }else{
        model=createWheelModel(items);models.set(key,model);
        if(models.size>2){const oldest=models.keys().next().value;disposeModel(models.get(oldest));models.delete(oldest);}
      }
      scene.add(model.wheel,model.pointer);
    },
    setAngle(value,angularSpeed=0){angle=value;speed=angularSpeed;update();},
    select(index){selected=index;update();},
    dispose(){
      if(disposed)return;
      disposed=true;observer.disconnect();canvas.removeEventListener('webglcontextlost',lost);
      for(const value of models.values())disposeModel(value);
      models.clear();scene.clear();renderer.dispose();renderer.forceContextLoss();
    },
  };
}
