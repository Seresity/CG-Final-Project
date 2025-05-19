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
//renderer.shadowMap.enabled = true; //commented out because the other object's shadows are not properly shown and it reduces lag due to large object quantity.
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

let soilTexture = null;

const loadingDiv = document.getElementById('loading');

let itemsToLoad = 4; // number of items to load: soil texture + 3 models
let itemsLoaded = 0;

function itemLoaded() {
  itemsLoaded++;
  if (itemsLoaded >= itemsToLoad) {
    // All assets loaded - hide loading message
    loadingDiv.style.display = 'none';

    // Now start generating road segments
  for (let i = 0; i < visibleSegments; i++) {
  const zPos = i * (roadSegmentLength - overlapLength);
  createRoadSegment(zPos);
    }
  }
}
// Load soil texture
const textureLoader = new THREE.TextureLoader();
textureLoader.load('textures/TCOM_Sand_Muddy2_2x2_2K_albedo.png', (texture) => {
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4); 
  soilTexture = texture;
  itemLoaded();
});

// Load models
const gltfLoader = new GLTFLoader();

gltfLoader.load('models/lowpoly_pine_tree/scene.gltf', (gltf) => {
  treeModel = gltf.scene;
  itemLoaded();
});
gltfLoader.load('models/lowpoly_rocks/scene.gltf', (gltf) => {
  rockModel = gltf.scene;
  itemLoaded();
});
gltfLoader.load('models/lowpoly_grass/scene.gltf', (gltf) => {
  grassModel = gltf.scene;
  itemLoaded();
});


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

// Environment Loading logic

let treeModel = null;
let rockModel = null;
let grassModel = null;

gltfLoader.load('models/lowpoly_pine_tree/scene.gltf', (gltf) => {
  treeModel = gltf.scene;
});

gltfLoader.load('models/lowpoly_rocks/scene.gltf', (gltf) => {
  rockModel = gltf.scene;
});

gltfLoader.load('models/lowpoly_grass/scene.gltf', (gltf) => {
  grassModel = gltf.scene;
});
// Set up for groups of grass blades
function spawnGrassPatch(group, x, y, z, baseScale) {
  if (!grassModel) return;
  const patchSize = 5; // radius of the patch area
  const numBlades = 30 + Math.floor(Math.random() * 5); 
  for (let i = 0; i < numBlades; i++) {
    const offsetX = (Math.random() - 0.5) * patchSize;
    const offsetZ = (Math.random() - 0.5) * patchSize;
    const scale = baseScale * (1.5 + Math.random()); 
    const blade = grassModel.clone();
    blade.position.set(x + offsetX, y, z + offsetZ);
    blade.scale.setScalar(scale);
    blade.rotation.y = Math.random() * Math.PI * 2;

    blade.traverse(child => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    group.add(blade); 
  }
}

// Envrionment Generation Logic
function spawnEnvObject(model, x, y, z, scale = 3, rotationY = 0) {
  if (!model) return null;
  const obj = model.clone();
  obj.position.set(x, y, z);
  obj.scale.setScalar(scale);
  obj.rotation.y = rotationY;
  obj.traverse(child => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
  return obj; 
}



// Road Logic
const roadSegmentLength = 30;
const roadWidth = 10;
const visibleSegments = 8;
const roadSegments = [];
let lastZ = 0;

const overlapPercent = 0.1; // 10% - incase there are phantom gaps
const overlapLength = roadSegmentLength * overlapPercent;

function createRoadSegment(z) {
  const group = new THREE.Group();
  group.position.z = z;

  // Center road
  const roadGeometry = new THREE.BoxGeometry(roadWidth, 0.1, roadSegmentLength);
  const roadMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
  const road = new THREE.Mesh(roadGeometry, roadMaterial);
  road.castShadow = true;
  road.receiveShadow = true;
  road.position.set(0, 0, 0);
  group.add(road);

  // Side tiles
  const sideCount = 2;
  for (let i = 1; i <= sideCount; i++) {
    const offset = roadWidth * i;
    const sideMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, map: soilTexture });

    const createSide = (xOffset) => {
      const side = new THREE.Mesh(roadGeometry.clone(), sideMaterial);
      side.position.set(xOffset, 0, 0);
      side.castShadow = true;
      side.receiveShadow = true;
      group.add(side);

      // Spawn objects
      const numObjects = 2 + Math.floor(Math.random() * 3); 
      for (let j = 0; j < numObjects; j++) {
  const randZ = (Math.random() - 0.5) * roadSegmentLength;

  const offsetX = xOffset + (Math.random() - 0.5) * roadWidth * 0.9;

  const randType = Math.random();

  // Have tree's position X randomised
  let treePosX;
  if (Math.random() < 0.5) {
  treePosX = 20 + Math.random() * (30 - 20);
  } else {
    treePosX = 0 - Math.random() * 5; 
  }
  // The tree model has internal offset X
  const treePosY = 2.5;
  const treeScale = 0.03;
  const treePosZ = (Math.random() - 0.5) * 10;

  if (randType < 0.1 && treeModel) {
    const scale = 0.1 + Math.random() * 0.2;
    const rot = (Math.random() - 0.5) * 0.3; 
    const tree = spawnEnvObject(treeModel, treePosX, treePosY, treePosZ , treeScale * (1 + Math.random() * (1.4 - 1)), rot);
    if (tree) group.add(tree);
  } else if (randType < 0.5 && rockModel) {
    const scale = 0.1 + Math.random() * 0.4;
    const rot = Math.random() * Math.PI * 2;
    const rock = spawnEnvObject(rockModel, offsetX, 0, randZ, scale, rot);
    if (rock) group.add(rock);
  } else if (grassModel) {
    const baseScale = 0.3 + Math.random() * 0.3;
    spawnGrassPatch(group, xOffset, 0, randZ, baseScale);
  }
      }
    };
    createSide(-offset);
    createSide(offset);
  }
  scene.add(group);
  roadSegments.push(group);
}


// Animation

// Speed Logic
let speed = 0.5;
const minSpeed = 0.25; // 30 km/h
const maxSpeed = 0.75; // 90 km/h
const speedStep = 0.05;

const speedDisplay = document.getElementById('speedDisplay');

// Converts internal speed to km/h
function updateSpeedDisplay() {
  const kmph = Math.round(speed * 120); // 0.5 -> 60, 0.75 -> 90, etc.
  speedDisplay.textContent = `Speed: ${kmph} km/h`;
}
updateSpeedDisplay();

window.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowUp' || e.key.toLowerCase() === 'w') {
    speed = Math.min(maxSpeed, speed + speedStep);
    updateSpeedDisplay();
  } else if (e.key === 'ArrowDown' || e.key.toLowerCase() === 's') {
    speed = Math.max(minSpeed, speed - speedStep);
    updateSpeedDisplay();
  }
});

function animate() {
  sunAngle += 0.001;
  const x = sunRadius * Math.cos(sunAngle);
  const y = sunRadius * Math.sin(sunAngle);
  sun.position.set(x, y, 0);
  sun.intensity = Math.max(0.1, y / sunRadius);
  sun.color.setHSL(0.1, 1, Math.max(0.2, y / sunRadius));

  requestAnimationFrame(animate);

  if (car) {
    car.position.z = 0;

// Move segments back
for (let segment of roadSegments) {
  segment.position.z -= speed;
}

// Remove segments that are fully behind the camera
while (roadSegments.length && roadSegments[0].position.z < -roadSegmentLength * 1.5) {
  const oldSegment = roadSegments.shift();
  scene.remove(oldSegment);
}

// Add new segments if the last segment is nearing the visible end
const lastSegment = roadSegments[roadSegments.length - 1];
if (lastSegment && lastSegment.position.z < roadSegmentLength * (visibleSegments - 1)) {
  const newZ = lastSegment.position.z + roadSegmentLength - overlapLength;
  createRoadSegment(newZ);
}

    if (!isFreeCamera) {
      camera.position.z = car.position.z - 10;
      camera.position.x = car.position.x;
      camera.position.y = 5;
      camera.lookAt(car.position);
    }
  }

  controls.update();
  renderer.render(scene, camera);
}

animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
