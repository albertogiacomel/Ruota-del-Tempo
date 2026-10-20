import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { TAU } from './spin.js';

/** A complete, disposable wheel. All segment colors share one draw call. */
export function createWheelModel(items) {
  const resources = [];
  const keep = resource => { resources.push(resource); return resource; };
  const mesh = (geometry, material) => new THREE.Mesh(keep(geometry), keep(material));
  const metal = color => new THREE.MeshStandardMaterial({color, metalness:.55, roughness:.32});
  const wheel = new THREE.Group(), pointer = new THREE.Group();
  const step = TAU / items.length;
  const cylinder = (radius, depth, color, z) => {
    const part = mesh(new THREE.CylinderGeometry(radius, radius, depth, 64), metal(color));
    part.rotation.x = Math.PI / 2; part.position.z = z; wheel.add(part); return part;
  };
  cylinder(2.07, .30, 0x243451, -.08);
  const segments = items.map((item, index) => {
    const center = Math.PI / 2 - index * step;
    const shape = new THREE.Shape(); shape.moveTo(0, 0);
    shape.absarc(0, 0, 1.94, center-step/2+.009, center+step/2-.009, false); shape.lineTo(0,0);
    const geometry = new THREE.ExtrudeGeometry(shape,{depth:.19,bevelEnabled:true,bevelSize:.022,bevelThickness:.025,bevelSegments:2,steps:1,curveSegments:18});
    const color = new THREE.Color(item.color), count = geometry.attributes.position.count;
    const colors = new Float32Array(count*3);
    for(let i=0;i<count;i++)color.toArray(colors,i*3);
    geometry.setAttribute('color',new THREE.BufferAttribute(colors,3)); geometry.clearGroups();
    return geometry;
  });
  const faces = mergeGeometries(segments);
  for(const geometry of segments)geometry.dispose();
  if(!faces)throw new Error('Wheel segment geometry could not be merged');
  wheel.add(mesh(faces,new THREE.MeshStandardMaterial({vertexColors:true,roughness:.52,metalness:.04})));
  for(const [radius,tube,color,z] of [[2.05,.085,0xf3bd4a,.10],[1.955,.025,0xffe9a5,.21]]){
    const rim = mesh(new THREE.TorusGeometry(radius,tube,12,112),metal(color)); rim.position.z=z; wheel.add(rim);
  }
  const studs = keep(new THREE.InstancedMesh(keep(new THREE.SphereGeometry(.033,8,6)),keep(metal(0xfff3bf)),items.length*3));
  const placement = new THREE.Object3D();
  for(let i=0;i<studs.count;i++){
    const a=i*TAU/studs.count; placement.position.set(2.05*Math.cos(a),2.05*Math.sin(a),.188);
    placement.updateMatrix(); studs.setMatrixAt(i,placement.matrix);
  }
  wheel.add(studs);
  cylinder(.34,.15,0x263857,.30); cylinder(.27,.13,0xffe6a3,.40);
  const star = new THREE.Shape();
  for(let i=0;i<10;i++){
    const a=Math.PI/2+i*Math.PI/5,r=i%2?.075:.15;
    if(i)star.lineTo(r*Math.cos(a),r*Math.sin(a));else star.moveTo(r*Math.cos(a),r*Math.sin(a));
  }
  star.closePath();
  const emblem=mesh(new THREE.ShapeGeometry(star),new THREE.MeshBasicMaterial({color:0x263857})); emblem.position.z=.47; wheel.add(emblem);
  const labelCanvas=document.createElement('canvas'); labelCanvas.width=labelCanvas.height=1024;
  const ctx=labelCanvas.getContext('2d');
  if(!ctx)throw new Error('Wheel label canvas unavailable');
  ctx.translate(512,512); ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.font='800 48px system-ui, sans-serif';
  items.forEach((item,index)=>{
    ctx.save(); ctx.rotate(index*step); ctx.translate(0,-322); ctx.rotate(-Math.PI/2);
    ctx.lineWidth=6; ctx.strokeStyle='#fff'; ctx.fillStyle='#17233d';
    ctx.strokeText(item.label,0,0,220); ctx.fillText(item.label,0,0,220); ctx.restore();
  });
  const texture=keep(new THREE.CanvasTexture(labelCanvas)); texture.colorSpace=THREE.SRGBColorSpace;
  const labels=mesh(new THREE.PlaneGeometry(4,4),new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false}));
  labels.position.z=.23; wheel.add(labels);
  const selection=new THREE.Group(); selection.visible=false;
  for(const [inner,outer,opacity] of [[.37,1.88,.15],[1.82,1.93,.95]]){
    const glow=mesh(new THREE.RingGeometry(inner,outer,40,1,Math.PI/2-step/2+.018,step-.036),new THREE.MeshBasicMaterial({color:0xfff4b2,transparent:true,opacity,depthWrite:false}));
    glow.position.z=.245; selection.add(glow);
  }
  wheel.add(selection);
  // The support stays fixed; the beveled blade pivots around a visible axle.
  const support=mesh(new THREE.BoxGeometry(.53,.20,.17),metal(0x243451)); support.position.set(0,2.34,.16); pointer.add(support);
  const pivot=new THREE.Group(); pivot.position.set(0,2.34,.37); pointer.add(pivot);
  const bladeShape=new THREE.Shape(); bladeShape.moveTo(-.135,.03); bladeShape.lineTo(.135,.03);
  bladeShape.lineTo(.10,-.20); bladeShape.lineTo(0,-.51); bladeShape.lineTo(-.10,-.20); bladeShape.closePath();
  const blade=mesh(new THREE.ExtrudeGeometry(bladeShape,{depth:.09,bevelEnabled:true,bevelSize:.025,bevelThickness:.025,bevelSegments:3}),new THREE.MeshStandardMaterial({color:0xe54563,roughness:.28,metalness:.18}));
  pivot.add(blade);
  for(const [radius,depth,color,z] of [[.14,.11,0xf3bd4a,.49],[.065,.025,0xfff5d8,.56]]){
    const axle=mesh(new THREE.CylinderGeometry(radius,radius,depth,32),metal(color)); axle.rotation.x=Math.PI/2; axle.position.set(0,2.34,z); pointer.add(axle);
  }
  return {wheel,pointer,pivot,selection,resources,step};
}
