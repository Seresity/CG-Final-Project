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

const toggleBtn = document.getElementById('toggleCameraBtn');
toggleBtn.addEventListener('click', () => {
  isFreeCamera = !isFreeCamera;
  controls.enabled = isFreeCamera;
  toggleBtn.textContent = isFreeCamera ? 'Exit Free Camera' : 'Enter Free Camera';
  if (isFreeCamera && car) {
    controls.target.copy(car.position);
  }
});

const sun = new THREE.DirectionalLight(0xffffff, 4);

sun.position.set(0, 50, -50);
sun.target.position.set(0, 0, 0);
scene.add(sun.target);
sun.shadow.bias = -0.001;
sun.shadow.mapSize.width = 2048;
sun.shadow.mapSize.height = 2048;
sun.position.set(100, 100, 0);
sun.castShadow = true;
scene.add(sun);

const sunRadius = 100;
let sunAngle = 0;

let car = null;

// Load car model
const loader = new GLTFLoader();
loader.load(
  '../cars/2019 Gumbert Apollo/source/2019_gumpert_apollo.glb',
  function (gltf) {
    car = gltf.scene;
    car.scale.set(100, 100, 100);
    car.position.y = 0.04;
    car.traverse(n => { if (n.isMesh) { n.castShadow = true; n.receiveShadow = true; } });
    scene.add(car);

    // Ensure car materials respond to lighting
    car.traverse((child) => {
      if (child.isMesh) {
        child.material = new THREE.MeshStandardMaterial({
          color: child.material.color || 0xffffff,
          map: child.material.map || null,
          metalness: 0.5,
          roughness: 0.8,
        });
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    // Add headlights
    const headlightLeft = new THREE.SpotLight(0xffffff, 2, 200, Math.PI / 2, 0.075, 2);
    const headlightRight = headlightLeft.clone();

    headlightLeft.position.set(0.8, 1.2, 2.8);          
    headlightLeft.target.position.set(0.8, 1.2, 10);

    headlightLeft.target.position.set(0.8, 1.2, 2.8);
    headlightRight.target.position.set(-0.8, 1.2, 10);

    headlightLeft.visible = false;
    headlightRight.visible = false;

    car.add(headlightLeft);
    car.add(headlightLeft.target);
    car.add(headlightRight);
    car.add(headlightRight.target);

    // Add taillights
    const taillightLeft = new THREE.SpotLight(0xffffff, 2, 200, Math.PI / 2, 0.075, 2);
    const taillightRight = taillightLeft.clone();

    taillightLeft.position.set(0.5, 0.6, -2.25);
    taillightLeft.target.position.set(0.8, 1.2, 10);

    taillightRight.position.set(-0.5, 0.6, -2.25);
    taillightRight.target.position.set(0.8, 1.2, 10);

    taillightLeft.visible = false;
    taillightRight.visible = false;

    car.add(taillightLeft);
    car.add(taillightRight);

    // UI to toggle lights
    const lightToggleBtn = document.createElement('button');
    lightToggleBtn.innerText = 'Toggle Car Lights';
    lightToggleBtn.style.position = 'absolute';
    lightToggleBtn.style.top = '50px';
    lightToggleBtn.style.left = '10px';
    lightToggleBtn.style.zIndex = '1';
    document.body.appendChild(lightToggleBtn);

    let lightsOn = false;
    lightToggleBtn.addEventListener('click', () => {
      lightsOn = !lightsOn;
      headlightLeft.visible = lightsOn;
      headlightRight.visible = lightsOn;
      taillightLeft.visible = lightsOn;
      taillightRight.visible = lightsOn;
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
  const geometry = new THREE.BoxGeometry(roadWidth, 0.1, roadSegmentLength);
  const material = new THREE.MeshStandardMaterial({ color: 0x333333 });
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
let speed = 0.5;

function animate() {
  // Day-Night cycle rotation
  sunAngle += 0.001;
  const x = sunRadius * Math.cos(sunAngle);
  const y = sunRadius * Math.sin(sunAngle);
  sun.position.set(x, y, 0);
  sun.intensity = Math.max(0.1, y / sunRadius);
  sun.color.setHSL(0.1, 1, Math.max(0.2, y / sunRadius));

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