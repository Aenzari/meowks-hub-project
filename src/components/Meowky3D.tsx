import { useEffect, useRef } from "react";
import * as THREE from "three";

type Meowky3DProps={formId:number;mood?:"happy"|"focused"|"sleepy";className?:string};
const palettes=["#f4d9b7","#f39a79","#72c8d0","#a9a0e9","#79b991","#f2c45f","#817bd2","#8dc8ed","#bd8bba","#e9c77c"];
const accents=["#42bfa7","#ff947a","#3b9eae","#7669c5","#438b68","#c18a27","#d0a4ff","#67a8dc","#e98aa9","#f2cf79"];
function sphere(parent:THREE.Group,geometry:THREE.SphereGeometry,material:THREE.Material,position:[number,number,number],scale:[number,number,number]){const mesh=new THREE.Mesh(geometry,material);mesh.position.set(...position);mesh.scale.set(...scale);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh}
export function Meowky3D({formId,mood="happy",className}:Meowky3DProps){
 const host=useRef<HTMLDivElement>(null);
 const moodRef=useRef(mood);
 useEffect(()=>{moodRef.current=mood;},[mood]);
 useEffect(()=>{
  const element=host.current;if(!element)return;
  const scene=new THREE.Scene();scene.background=null;
  const camera=new THREE.PerspectiveCamera(34,1,.1,100);camera.position.set(0,1.15,7.4);
  const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:"low-power"});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.7));renderer.setSize(element.clientWidth,element.clientHeight);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;element.appendChild(renderer.domElement);
  scene.add(new THREE.HemisphereLight(0xfff4df,0x52657b,2.1));
  const key=new THREE.DirectionalLight(0xffffff,3.2);key.position.set(-3,5,5);key.castShadow=true;scene.add(key);
  const rim=new THREE.PointLight(0x72d7bd,15,12);rim.position.set(3,2,2);scene.add(rim);
  const fur=new THREE.MeshStandardMaterial({color:palettes[Math.max(0,Math.min(9,formId-1))],roughness:.72});
  const cream=new THREE.MeshStandardMaterial({color:"#fff4df",roughness:.85});
  const pink=new THREE.MeshStandardMaterial({color:"#f58f83",roughness:.6});
  const dark=new THREE.MeshStandardMaterial({color:"#493d38",roughness:.4});
  const accent=new THREE.MeshStandardMaterial({color:accents[Math.max(0,Math.min(9,formId-1))],metalness:.35,roughness:.35,emissive:accents[Math.max(0,Math.min(9,formId-1))],emissiveIntensity:.12});
  const cat=new THREE.Group();scene.add(cat);
  sphere(cat,new THREE.SphereGeometry(1,40,32),fur,[0,-.55,0],[.83,1.03,.62]);
  sphere(cat,new THREE.SphereGeometry(1,40,32),cream,[0,-.63,.49],[.48,.65,.18]);
  const head=new THREE.Group();head.position.set(0,.55,.05);cat.add(head);
  sphere(head,new THREE.SphereGeometry(1,48,36),fur,[0,0,0],[1.04,.91,.77]);
  const earGeo=new THREE.ConeGeometry(.34,.92,32);
  for(const side of [-1,1]){
   const ear=new THREE.Mesh(earGeo,fur);ear.position.set(side*.69,.72,-.02);ear.rotation.z=side*-.28;ear.castShadow=true;head.add(ear);
   const inner=new THREE.Mesh(new THREE.ConeGeometry(.19,.58,24),pink);inner.position.set(side*.69,.76,.18);inner.rotation.z=side*-.28;head.add(inner);
   sphere(head,new THREE.SphereGeometry(1,24,18),dark,[side*.39,-.08,.69],[.075,.12,.055]);
   sphere(head,new THREE.SphereGeometry(1,16,12),cream,[side*.365,-.035,.742],[.023,.032,.015]);
   sphere(head,new THREE.SphereGeometry(1,24,16),pink,[side*.68,-.31,.57],[.2,.11,.055]);
  }
  sphere(head,new THREE.SphereGeometry(1,20,16),pink,[0,-.25,.77],[.09,.065,.045]);
  const smile=new THREE.Mesh(new THREE.TorusGeometry(.13,.018,8,24,Math.PI),dark);smile.position.set(0,-.34,.77);smile.rotation.z=Math.PI;head.add(smile);
  for(const side of [-1,1]){const paw=sphere(cat,new THREE.SphereGeometry(1,24,18),fur,[side*.66,-1.1,.22],[.25,.36,.28]);paw.rotation.z=side*-.2;}
  const tailCurve=new THREE.CatmullRomCurve3([new THREE.Vector3(.58,-1.05,-.28),new THREE.Vector3(1.05,-.8,-.25),new THREE.Vector3(1.18,-.15,-.2),new THREE.Vector3(.85,.05,-.2)]);
  const tail=new THREE.Mesh(new THREE.TubeGeometry(tailCurve,36,.105,12,false),fur);tail.castShadow=true;cat.add(tail);
  const crown=new THREE.Group();crown.position.set(0,1.55,0);head.add(crown);
  if(formId>=2){const ring=new THREE.Mesh(new THREE.TorusGeometry(.34,.055,12,48),accent);ring.rotation.x=Math.PI/2;ring.position.y=.12;crown.add(ring);}
  if(formId>=5){for(let i=0;i<3;i++){const gem=new THREE.Mesh(new THREE.OctahedronGeometry(.12+i*.025),accent);gem.position.set((i-1)*.28,.2+(i===1?.12:0),.02);crown.add(gem);}}
  if(formId>=9){const halo=new THREE.Mesh(new THREE.TorusGeometry(.55,.025,8,64),accent);halo.rotation.x=Math.PI/2;halo.position.y=.45;crown.add(halo);}
  if(formId>=3){for(const side of [-1,1]){const fin=new THREE.Mesh(new THREE.ConeGeometry(.2,.48,5),accent);fin.position.set(side*1.02,.45,.02);fin.rotation.z=side*-Math.PI/2;head.add(fin);}}
  if(formId>=4){const star=new THREE.Mesh(new THREE.OctahedronGeometry(.16),accent);star.position.set(0,1.92,.08);crown.add(star);}
  if(formId>=5){for(let i=0;i<5;i++){const petal=new THREE.Mesh(new THREE.SphereGeometry(.12,16,12),accent);const a=i*Math.PI*2/5;petal.position.set(Math.cos(a)*.32,.12+Math.sin(a)*.2,.08);petal.scale.set(.8,1.35,.55);crown.add(petal);}}
  if(formId>=6){for(let i=0;i<8;i++){const ray=new THREE.Mesh(new THREE.BoxGeometry(.045,.22,.045),accent);const a=i*Math.PI/4;ray.position.set(Math.cos(a)*.48,.2+Math.sin(a)*.48,.02);ray.rotation.z=-a;crown.add(ray);}}
  if(formId>=7){const moon=new THREE.Mesh(new THREE.TorusGeometry(.4,.07,10,48,Math.PI*1.55),accent);moon.position.set(0,.3,.12);moon.rotation.z=-.5;crown.add(moon);}
  if(formId>=8){for(const side of [-1,1]){const crystal=new THREE.Mesh(new THREE.OctahedronGeometry(.22),accent);crystal.position.set(side*.52,.2,.12);crystal.scale.y=1.7;crown.add(crystal);}}
  if(formId>=9){const orbit=new THREE.Mesh(new THREE.TorusGeometry(.72,.025,8,64),accent);orbit.rotation.set(.5,.25,.4);orbit.position.y=.18;crown.add(orbit);}
  if(formId>=10){for(const side of [-1,1]){const wing=new THREE.Mesh(new THREE.SphereGeometry(.48,24,18),cream);wing.position.set(side*1.02,-.05,-.18);wing.scale.set(.75,1.35,.24);wing.rotation.z=side*-.5;cat.add(wing);}const halo2=new THREE.Mesh(new THREE.TorusGeometry(.78,.035,10,64),accent);halo2.position.set(0,2.05,0);halo2.rotation.x=.25;crown.add(halo2);}
  const ground=new THREE.Mesh(new THREE.CircleGeometry(1.35,48),new THREE.MeshBasicMaterial({color:accents[Math.max(0,Math.min(9,formId-1))],transparent:true,opacity:.12}));ground.rotation.x=-Math.PI/2;ground.position.y=-1.62;scene.add(ground);
  const resize=()=>{const w=Math.max(1,element.clientWidth),h=Math.max(1,element.clientHeight);camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h);};const observer=new ResizeObserver(resize);observer.observe(element);
  let frame=0;let raf=0;const animate=()=>{raf=requestAnimationFrame(animate);frame+=.012;const activeMood=moodRef.current;cat.position.y=Math.sin(frame*(activeMood==="happy"?2:1.5))*(activeMood==="sleepy"?.025:.075);cat.rotation.y=Math.sin(frame*.65)*(activeMood==="happy"?.22:.16);head.rotation.z=Math.sin(frame*(activeMood==="happy"?2.1:1.1))*(activeMood==="happy"?.045:.025);head.rotation.x=activeMood==="sleepy"?.08:0;tail.rotation.x=Math.sin(frame*(activeMood==="happy"?3.2:2))*(activeMood==="sleepy"?.06:.15);head.scale.y=activeMood==="sleepy"?.97:1;renderer.render(scene,camera);};animate();
  return()=>{cancelAnimationFrame(raf);observer.disconnect();renderer.dispose();scene.traverse(object=>{if(object instanceof THREE.Mesh){object.geometry.dispose();const material=object.material;if(Array.isArray(material))material.forEach(m=>m.dispose());else material.dispose();}});element.removeChild(renderer.domElement);};
 },[formId]);
 return <div ref={host} className={className??"meowky-3d-canvas"} role="img" aria-label={`3D Meowky companion, evolution form ${formId}`}/>;
}
