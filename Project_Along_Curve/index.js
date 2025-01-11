import * as THREE from 'three';
import { OrbitControls } from 'jsm/controls/OrbitControls.js';
import { RenderPass } from 'jsm/postprocessing/RenderPass.js';
import { EffectComposer } from 'jsm/postprocessing/EffectComposer.js';
import { UnrealBloomPass } from 'jsm/postprocessing/UnrealBloomPass.js';

const w = window.innerWidth;
const h = window.innerHeight;

// Anti-aliasing is a technique used to smooth out the jagged edges of a 3D object.
const renderer = new THREE.WebGLRenderer({antialias: true});

// Set size for renderer
renderer.setSize(w, h);
// Uppend to the DOM the canvas element (domElement)
document.body.appendChild(renderer.domElement);

// field of view 75 degrees
// aspect ratio
// near - if something gonna closer to the camera it will be invisiable
// far - if something gonna further to the camera it will be invisiable

const camera = new THREE.PerspectiveCamera(75, w / h, 0.1, 1000);
camera.position.set(0, 0, 5); // move the camera back to see what at the center of the scene
camera.lookAt(0, 0, 0); // where the camera is looking at

const scene = new THREE.Scene(); // Create a scene

scene.fog = new THREE.FogExp2(0x000000, 0.3); // Add fog to the scene

// OrbitControls is a utility that allows you to move the camera around the scene
const controls = new OrbitControls(camera, renderer.domElement);

controls.enableDamping = true; // an animation loop is required when either damping or auto-rotation are enabled
// damping is used to smooth out the movement of the camera

controls.dampingFactor = 0.25; // the damping factor (0 = no damping, 1 = full damping)
// effect of damping factor (0.25) is that the camera will stop moving after 75% of the way to the target

// HemisphereLight is a simple light that gets emitted from all directions
// const light = new THREE.HemisphereLight(0xffffff, 1);
// light.position.set(0, 20, 10);
// scene.add(light);

const renderScene = new RenderPass(scene, camera);
const effectBloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
effectBloom.threshold = 0.2;
effectBloom.strength = 3.5;
effectBloom.radius = 0.5;
const composer = new EffectComposer(renderer);
composer.addPass(renderScene);
composer.addPass(effectBloom);  

//Create a closed wavey loop
const curve = new THREE.CatmullRomCurve3( [
	new THREE.Vector3( -10, 0, 10 ),
	new THREE.Vector3( -5, 5, 5 ),
	new THREE.Vector3( 0, 0, 0 ),
	new THREE.Vector3( 5, -5, 5 ),
	new THREE.Vector3( 10, 0, 10 )
] );

console.log(curve);

const points = curve.getPoints( 100 );
const geometry = new THREE.BufferGeometry().setFromPoints(points);

const material = new THREE.LineBasicMaterial({ 
    color: 0xfffffff
 });

// Create the final object to add to the scene
const curveObject = new THREE.Line( geometry, material );

// scene.add(curveObject);
// First argument is the curve, second is the number of segments, third is the radius of the tube, 
// fourth is the number of radial segments, fifth is if the tube is closed or not
const tubeGeometry = new THREE.TubeGeometry(curve, 64, 1, 8, false);
// const tubeMaterial = new THREE.MeshBasicMaterial({ 
//   color: 0xfffffff,
//   side: THREE.DoubleSide,
//   wireframe: true // For debugging
// });

// const tube = new THREE.Mesh(tubeGeometry, tubeMaterial);
// scene.add(tube);

// Add axes helper for orientation
// const axesHelper = new THREE.AxesHelper(20);
// scene.add(axesHelper);

const edges = new THREE.EdgesGeometry(tubeGeometry, 0.2);
const lineMat = new THREE.LineBasicMaterial({ color: 0xffffff });
const tubeLines = new THREE.LineSegments(edges, lineMat);

scene.add(tubeLines);

const qunatity = 10;
const boxGeometry = new THREE.BoxGeometry(0.075, 0.075, 0.075);
const boxMat = new THREE.MeshBasicMaterial({
  color: 0xffffff,
  wireframe: true
});

const boxes = [];
const helpers = [];
const rotationData = [];

for (let i = 0; i < qunatity; i++) {
  const rote = new THREE.Vector3(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
  const box = new THREE.Mesh(boxGeometry, boxMat);
  const p = (i / qunatity + Math.random() * 0.1) % 1;
  const pos = tubeGeometry.parameters.path.getPointAt(p);
  pos.x += Math.random() - 0.4;
  pos.z += Math.random() - 0.4;

  const edges = new THREE.EdgesGeometry(boxGeometry, 0.2);
  const lineMat = new THREE.LineBasicMaterial({ color: 0x00ff00 });
  const boxLines = new THREE.LineSegments(edges, lineMat);
  boxLines.position.copy(pos);
  boxLines.rotation.set(rote.x, rote.y, rote.z);
  scene.add(boxLines);
  
  
  // Set box position and rotation first
  box.position.copy(pos);
  box.rotation.set(rote.x, rote.y, rote.z);
  scene.add(box);  // Add box to scene
  
  // Create a box helper for the box
  const helper = new THREE.BoxHelper(box, 0xffff00); 
  // The purpose of the box helper is to show the bounding box of the box
  // Can we rotate the helper? Yes, the helper will rotate with the box
  
  scene.add(helper);

  // Add rotation speeds per box
  rotationData.push({
    speed: new THREE.Vector3(
        Math.random() * 0.02,
        Math.random() * 0.02,
        Math.random() * 0.02
    )
  });

  boxes.push(box);
  helpers.push(helper);
}

function updateCamera(t) {
  const time =  t * 0.15; // Get the current time and convert it to seconds by multiplying by 0.001  
  const loopTime = 5 * 1000; // 10 seconds in milliseconds for the loop
  const p = (time % loopTime) / loopTime; // Get the time in the loop by getting the remainder of the current time divided by the loop time
  // t is a value between 0 and 1 that represents the position in the loop
  const pos = tubeGeometry.parameters.path.getPointAt(p); // Get the position on the curve at time t
  const lookAt = tubeGeometry.parameters.path.getPointAt(p); // Get the position on the curve slightly ahead of the current position
  camera.position.copy(pos); // Set the camera position to the current position
  camera.lookAt(lookAt); // Make the camera look at the next position
}

// Wil all every second
function animate(t = 0) {
  // Add rotation animation
  boxes.forEach((box, index) => {
    // Apply rotation
    box.rotation.x += rotationData[index].speed.x;
    box.rotation.y += rotationData[index].speed.y;
    box.rotation.z += rotationData[index].speed.z;
    
    // Force helper update
    helpers[index].update();
  });

  updateCamera(t);
  controls.update();
  composer.render(scene, camera);
  requestAnimationFrame(animate);
}

animate();