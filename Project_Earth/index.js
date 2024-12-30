import * as THREE from 'three';
import { OrbitControls } from 'jsm/controls/OrbitControls.js';
import getStarfield from "./src/getStarfield.js";
import { getFresnelMat } from "./src/getFresnelMat.js";

const w = window.innerWidth;
const h = window.innerHeight;

const starfield = getStarfield({numStars: 2000});

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
camera.position.z = 2; // move the camera back to see what at the center of the scene

const scene = new THREE.Scene();
scene.add(starfield);

// OrbitControls is a utility that allows you to move the camera around the scene
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; // an animation loop is required when either damping or auto-rotation are enabled
controls.dampingFactor = 0.25; // the damping factor (0 = no damping, 1 = full damping)


// Group is a type of object that allows you to group multiple objects 
// together. This is useful when you want to apply transformations to
// multiple objects at once.
// We gonna add the earthMesh to the earthGroup instead of the scene.
const earthGroup = new THREE.Group();
// -23.4 degrees is the tilt of the earth's axis relative to its orbit around the sun
earthGroup.rotation.z = -23.4 * Math.PI / 180; // tilt the earthGroup by 23.4 degrees
scene.add(earthGroup);

// IcosahedronGeometry is a type of geometry that represents a 3D object
// with 20 faces. It is a polyhedron with 20 faces, 12 vertices, and 30 edges.
// The second paramtere of the IcosahedronGeometry constructor
// is the detail parameter (will define quantity of shapes).
const geometry = new THREE.IcosahedronGeometry(1, 12);

// MeshBasicMaterial - not interact with light
// But not requre the light on the scene 
// const material = new THREE.MeshBasicMaterial(
//     {
//         color: 0x00ff00,
//         wireframe: true
//     }
// );


const loader = new THREE.TextureLoader();
// Require the light on the scene.
// In Three.js, the flatShading property in the 
// MeshStandardMaterial configuration determines how the shading
// is computed for the faces of a 3D object.
// const material = new THREE.MeshStandardMaterial(
//     {
//         map: loader.load('assets/00_earthmap4k.jpg'),
//         // color: 0xffff00,
//         // flatShading: true
//     }
// );

const dayTexture = new THREE.TextureLoader().load('assets/00_earthmap4k.jpg');
const nightTexture = new THREE.TextureLoader().load('assets/03_earthlights1k.jpg');

const earthMaterial = new THREE.ShaderMaterial({
  uniforms: {
    dayMap: { value: dayTexture },
    nightMap: { value: nightTexture },
    // Define sun direction in world space
    sunDirection: { value: new THREE.Vector3(1, 0, 0).normalize() }
  },
  vertexShader: `
    varying vec2 vUv;
    varying vec3 vNormalWorld;  // Changed to world space
    
    void main() {
      vUv = uv;
      // Transform normal to world space
      vNormalWorld = normalize(modelMatrix * vec4(normal, 0.0)).xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D dayMap;
    uniform sampler2D nightMap;
    uniform vec3 sunDirection;
    
    varying vec2 vUv;
    varying vec3 vNormalWorld;  // Changed to world space
    
    void main() {
      // Use world space coordinates for light calculation
      float intensity = dot(normalize(sunDirection), normalize(vNormalWorld));
      
      vec4 dayColor = texture2D(dayMap, vUv);
      vec4 nightColor = texture2D(nightMap, vUv);
      
      float threshold = 0.1;
      float smoothFactor = smoothstep(-threshold, threshold, -intensity);
      
      gl_FragColor = mix(dayColor, nightColor, smoothFactor);
    }
  `
});


const earthMesh = new THREE.Mesh(geometry, earthMaterial);
earthGroup.add(earthMesh);


// HemisphereLight is a type of light source that simulates natural lighting by
// emitting light from the sky and the ground. It provides a more
// realistic ambient light compared to the standard AmbientLight,
// which illuminates objects uniformly from all directions.
// The first parameter of the HemisphereLight constructor is the sky color,
// and the second parameter is the ground color.

// Material which sits on top of the earth mesh.
// const lightsMat = new THREE.MeshBasicMaterial({
//     // color: 0x00ff00,
//     map: loader.load('assets/03_earthlights1k.jpg'),
//     blending: THREE.AdditiveBlending,
// });
// const lightsMesh = new THREE.Mesh(geometry, lightsMat);
// earthGroup.add(lightsMesh);

const cloudMat = new THREE.MeshBasicMaterial({
    map: loader.load('assets/05_earthcloudmaptrans.png'),
    transparent: true,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    opacity: 0.8
});

const cloudMesh = new THREE.Mesh(geometry, cloudMat);
cloudMesh.scale.setScalar(1.02);

earthGroup.add(cloudMesh);

const fresnelMat = getFresnelMat();
const glowMesh = new THREE.Mesh(geometry, fresnelMat);
glowMesh.scale.setScalar(1.025);

earthGroup.add(glowMesh);

// const hemiLight = new THREE.HemisphereLight(0xfffffff, 0xffffff);
// scene.add(hemiLight);

// DirectionalLight is a type of light source that emits light in a specific direction.
const sunLight = new THREE.DirectionalLight(0xffffff);
sunLight.position.set(-2, 0.5, 1.5);
scene.add(sunLight);

// Add AxesHelper to visualize 3D space
const axesHelper = new THREE.AxesHelper(5);
axesHelper.position.x = -2;
axesHelper.position.y = 0.5;
axesHelper.position.z = 1.5;
scene.add(axesHelper);

// Wil all every second
function animate() {
    // Update sun direction
    earthMaterial.uniforms.sunDirection.value.copy(sunLight.position);
    // Runs every second
    // console.log(Date.now());
    // API for the browser to call a function to update the animation
    requestAnimationFrame(animate);
    // Animated scale of the mesh
    // mesh.scale.setScalar(Math.sin(Date.now() * 0.001) * 0.5 + 1.0); // scale the mesh

    // We need to add roation for our new mesh to not see z-fight effect
    // lightsMesh.rotation.y += 0.002;
    cloudMesh.rotation.y += 0.002;
    cloudMesh.rotation.x += Math.random() * 0.0005;
    earthMesh.rotation.y += 0.002;
    glowMesh.rotation.y += 0.002;
    controls.update();
    renderer.render(scene, camera);
}

animate();