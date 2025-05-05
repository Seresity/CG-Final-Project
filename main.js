import * as THREE from './build/three.module.js';
import { OrbitControls } from './build/OrbitControls.js';
import { GLTFLoader } from './build/GLTFLoader.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
scene.add(new THREE.AmbientLight(0xffffff, 0.5));

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 5, -10);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer();
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

// Lighting
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(10, 20, 10);
scene.add(light);

let car = null;

// Load car model
const loader = new GLTFLoader();
loader.load(
  '../cars/2019 Gumbert Apollo/source/2019_gumpert_apollo.glb',
  function (gltf) {
    car = gltf.scene;
    car.scale.set(100, 100, 100);
    car.position.y = 1;
    scene.add(car);
    console.log(gltf.scene);
  },
  undefined,
  function (error) {
    console.error('An error occurred while loading the car model:', error);
  }
);

// Road logic
const roadSegmentLength = 20;
const roadWidth = 10;
const visibleSegments = 10;
const roadSegments = [];
let lastZ = 0;

function createRoadSegment(z) {
  const geometry = new THREE.BoxGeometry(roadWidth, 0.1, roadSegmentLength);
  const material = new THREE.MeshStandardMaterial({ color: 0x333333 });
  const segment = new THREE.Mesh(geometry, material);
  segment.position.set(0, 0, z);
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
  requestAnimationFrame(animate);

  if (car) {
    car.position.z += speed;

    if (isFreeCamera) {
      controls.target.copy(car.position); // always follow the car
      controls.update();
    } else {
      camera.position.z = car.position.z - 10;
      camera.lookAt(car.position);
    }
       
  }

  if (car && car.position.z + visibleSegments * roadSegmentLength > lastZ) {
    lastZ += roadSegmentLength;
    createRoadSegment(lastZ);
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