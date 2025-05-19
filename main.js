import * as THREE from './build/three.module.js';
import { OrbitControls } from './build/OrbitControls.js';
import { GLTFLoader } from './build/GLTFLoader.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
const hemiLight = new THREE.HemisphereLight(0xaaaaaa, 0x444444, 0.3);
scene.add(hemiLight);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 5, -10);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer();
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// OrbitControls setup
let isFreeCamera = false;
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.enablePan = true;
controls.enableZoom = true;
controls.enabled = false; // start disabled

const toggleCameraBtn = document.getElementById('toggleCameraBtn');
toggleCameraBtn.addEventListener('click', () => {
  isFreeCamera = !isFreeCamera;
  controls.enabled = isFreeCamera;
  toggleCameraBtn.textContent = isFreeCamera ? 'Exit Free Camera' : 'Enter Free Camera';
  if (isFreeCamera && car) {
    controls.target.copy(car.position);
  }
});

const lightToggleBtn = document.getElementById('lightToggleBtn');
lightToggleBtn.addEventListener('click', () => {
  lightsOn = !lightsOn;
  headlightLeft.visible = lightsOn;
  headlightRight.visible = lightsOn;
  taillightLeft.visible = lightsOn;
  taillightRight.visible = lightsOn;
  lightToggleBtn.textContent = lightsOn ? 'Turn Lights Off' : 'Turn Lights On';
});
;

// Add ambient lighting
const ambientLight = new THREE.AmbientLight(0x404040, 0.3);
scene.add(ambientLight);

// Add moonlight (bluish directional light)
const moon = new THREE.DirectionalLight(0x8899ff, 0.2);
moon.castShadow = true;
scene.add(moon);

const sun = new THREE.DirectionalLight(0xffffff, 10);

sun.position.set(0, 50, -50);
// sun.target.position.set(0, 0, 0);
scene.add(sun.target);
sun.shadow.bias = -0.001;
sun.shadow.mapSize.width = 2048;
sun.shadow.mapSize.height = 2048;
sun.position.set(100, 100, 0);
sun.castShadow = true;
scene.add(sun);

const sunRadius = 100;
let sunAngle = 0;

const boxGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.1); // width, height, depth
const boxMaterial = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
const box = new THREE.Mesh(boxGeometry, boxMaterial);

box.position.set(0.65, 1, -2.75); // X, Y, Z — lifts it 0.5 above ground
scene.add(box);

let car = null;

// Load car model
const loader = new GLTFLoader();
loader.load(
  '../cars/Dodge SRT Tomahawk/source/dodge_srt_tomahawk_x.glb',
  function (gltf) {
    car = gltf.scene;
    car.scale.set(100, 100, 100);
    car.position.y = 0.2;
    car.traverse(n => { if (n.isMesh) { n.castShadow = true; n.receiveShadow = true; } });
    scene.add(car);

    // Add headlights
    const headlightLeft = new THREE.SpotLight(0xffffff, 1.5, 200, Math.PI / 2, 0.075, 2);
    const headlightRight = new THREE.SpotLight(0xffffff, 1.5, 200, Math.PI / 2, 0.075, 2);

    headlightLeft.target.position.set(0.85, 0.65, 2.25);          
    headlightLeft.target.position.set(1, 0.1, 15);

    headlightRight.target.position.set(-0.85, 0.65, 2.25);
    headlightRight.target.position.set(-1, 0.1, 15);

    headlightLeft.visible = false;
    headlightRight.visible = false;

    car.add(headlightLeft);
    car.add(headlightLeft.target);
    car.add(headlightRight);
    car.add(headlightRight.target);

    // Add taillights
    const taillightLeft = new THREE.SpotLight(0xFF0000, 0.25, 200, Math.PI / 2, 0.075, 2);
    const taillightRight = new THREE.SpotLight(0xFF0000, 0.25, 200, Math.PI / 2, 0.075, 2);

    taillightLeft.target.position.set(0.65, 1, -3);
    taillightLeft.target.position.set(0.65, 1, -2.5);

    taillightRight.target.position.set(-0.65, 1, -3);
    taillightRight.target.position.set(-0.65, 1, -2.5);

    taillightLeft.visible = true;
    taillightRight.visible = true;

    car.add(taillightLeft);
    car.add(taillightRight);

    let lightsOn = false;
    lightToggleBtn.addEventListener('click', () => {
      lightsOn = !lightsOn;
      headlightLeft.visible = lightsOn;
      headlightRight.visible = lightsOn;
    });

    console.log(gltf.scene);
  },
  undefined,
  function (error) {
    console.error('An error occurred while loading the car model:', error);
  }
);

// Road logic
const roadSegmentLength = 30;
const roadWidth = 10;
const visibleSegments = 20;
const roadSegments = [];
let lastZ = 0;

function createRoadSegment(z) {
  const geometry = new THREE.BoxGeometry(roadWidth, 0.1, roadSegmentLength, 64, 1, 64);
  
  const textureLoader = new THREE.TextureLoader();

  // Load maps
  const roadColorMap = textureLoader.load('../textures/road_diffuse.png');
  const roadNormalMap = textureLoader.load('../textures/road_normal.png');
  const roadBumpMap = textureLoader.load('../textures/road_bump.png');
  const roadDisplacementMap = textureLoader.load('../textures/road_displacement.png');

  // Set wrap mode for seamless tiling
  [roadColorMap, roadNormalMap, roadBumpMap, roadDisplacementMap].forEach(tex => {
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1, 1);
  });

  const roadMaterial = new THREE.MeshStandardMaterial({
    color: 0x333333,
    map: roadColorMap,
    normalMap: roadNormalMap,
    bumpMap: roadBumpMap,
    bumpScale: 0.1,
    displacementMap: roadDisplacementMap,
    displacementScale: 0.2,
    roughness: 0.9,
    metalness: 0.1
  });

    const material = roadMaterial;
    const segment = new THREE.Mesh(geometry, material);
    segment.position.set(0, 0, z);
    segment.castShadow = true;
    segment.receiveShadow = true;
    scene.add(segment);
    roadSegments.push(segment);
  }

for (let i = 0; i < visibleSegments; i++) {
  createRoadSegment(i * roadSegmentLength);
  lastZ = i * roadSegmentLength;
}

// Animate
let speed = 1;
const maxSpeed = 2.5;
const minSpeed = 0.1;

const keys = { w: false, s: false };

document.addEventListener('keydown', (event) => {
  if (event.key.toLowerCase() === 'w') keys.w = true;
  if (event.key.toLowerCase() === 's') keys.s = true;
});

document.addEventListener('keyup', (event) => {
  if (event.key.toLowerCase() === 'w') keys.w = false;
  if (event.key.toLowerCase() === 's') keys.s = false;
});

function updateSpeed() {
  const resistance = (speed / maxSpeed) ** 2;

  if (keys.w) {
    const accel = 0.0018 * (1 - resistance); // softer acceleration curve
    speed += accel;
  } else if (keys.s) {
    const brake = 0.0025 + 0.003 * resistance; // slower but steady braking
    speed -= brake;
  } else {
    const coastDrag = 0.00025 + 0.0025 * resistance; // gentle drag
    speed -= coastDrag;
  }

  speed = Math.max(minSpeed, Math.min(maxSpeed, speed));
}

const needle = document.getElementById('needle');
const speedLabel = document.getElementById('speedLabel');

function animate() {

  const kmh = speed * 100;
  const angle = -90 + (kmh / 270) * 180;
  needle.style.transform = `rotate(${angle}deg)`;
  speedLabel.innerText = `${Math.round(kmh)} km/h`;

  updateSpeed();

  // Day-Night cycle rotation
  sunAngle += 0.0005;
  const x = sunRadius * Math.cos(sunAngle);
  const y = sunRadius * Math.sin(sunAngle);
  sun.position.set(x, y, 0);
  sun.color.setHSL(0.1, 1, Math.max(0.2, y / sunRadius));

  // Position moon opposite the sun but offset (appears in front and above car)
  const moonX = -sunRadius * Math.cos(sunAngle) + 30;
  const moonY = -sunRadius * Math.sin(sunAngle) + 40;
  const moonZ = 100;
  moon.position.set(moonX, moonY, moonZ);

  // Adjust moon intensity based on time of day
  sun.intensity = Math.max(0.1, y / sunRadius);
  moon.intensity = Math.max(0.1, -y / sunRadius);

  requestAnimationFrame(animate);

  if (car) {
    car.position.z = 0; // Fixed car

    // Move road segments to simulate motion
    for (let segment of roadSegments) {
      segment.position.z -= speed;
    }

    // Recycle segments
    while (roadSegments.length && roadSegments[0].position.z < -roadSegmentLength) {
      const oldSegment = roadSegments.shift();
      scene.remove(oldSegment);
      oldSegment.geometry.dispose();
      oldSegment.material.dispose();
    
      // Determine position of last segment
      const lastSegment = roadSegments[roadSegments.length - 1];
      const newZ = lastSegment.position.z + roadSegmentLength;
    
      // Create new segment at correct z
      createRoadSegment(newZ);
    }

    if (isFreeCamera) {
      controls.target.copy(car.position);
      controls.update();
    } else {
      camera.position.set(car.position.x, car.position.y + 2.5, car.position.z - 7.5);
      camera.lookAt(car.position);
    }    
  }

  if (car && car.position.z + visibleSegments * roadSegmentLength > lastZ) {
    const lastSegment = roadSegments[roadSegments.length - 1];
    const newZ = lastSegment.position.z + roadSegmentLength;
    createRoadSegment(newZ);
  }

  while (
    roadSegments.length &&
    car &&
    roadSegments[0].position.z + roadSegmentLength < car.position.z - 10
  ) {
    const oldSegment = roadSegments.shift();
    scene.remove(oldSegment);
    oldSegment.geometry.dispose();
    oldSegment.material.dispose();
  }

  renderer.render(scene, camera);
}

animate();