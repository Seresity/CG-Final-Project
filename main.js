// =============================
// [SECTION]: Imports 
// =============================
import * as THREE from './build/three.module.js';
import { OrbitControls } from './build/OrbitControls.js';
import { GLTFLoader } from './build/GLTFLoader.js';

// =============================
// [SECTION]: Scene Initialisation
// =============================
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
let snowParticleSystem = null;
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);
const textureLoader = new THREE.TextureLoader();

// =============================
// [SECTION]: LIGHT SETUP
// =============================
const moon = new THREE.DirectionalLight(0x8899ff, 0.1);
moon.castShadow = true;
scene.add(moon);

const sun = new THREE.DirectionalLight(0xffffff, 5);
sun.position.set(100, 100, 0);
sun.castShadow = true;
sun.shadow.bias = -0.001;
sun.shadow.mapSize.width = 2048;
sun.shadow.mapSize.height = 2048;
scene.add(sun);
const sunRadius = 100;
let sunAngle = Math.PI / 2;

// =============================
// [SECTION]: LOADING
// =============================
const loadingDiv = document.getElementById('loading');
let itemsToLoad = 4;
let itemsLoaded = 0;
function itemLoaded() {
  itemsLoaded++;
  if (itemsLoaded >= itemsToLoad) {
    loadingDiv.style.display = 'none';
    for (let i = 0; i < visibleSegments; i++) {
      const zPos = i * (roadSegmentLength - overlapLength);
      createRoadSegment(zPos);
    }
  }
}

// =============================
// [SECTION]: CAMERA
// =============================
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.enablePan = true;
controls.enableZoom = true;
controls.enabled = false;

let cameraMode = 'thirdPerson';
const toggleCameraBtn = document.getElementById('toggleCameraBtn');
toggleCameraBtn.addEventListener('click', () => {
  if (cameraMode === 'thirdPerson') {
    cameraMode = 'freeCamera';
    controls.enabled = true;
    toggleCameraBtn.textContent = 'Enter First Person';
    if (car) controls.target.copy(car.position);
  } else if (cameraMode === 'freeCamera') {
    cameraMode = 'firstPerson';
    controls.enabled = false;
    toggleCameraBtn.textContent = 'Enter Third Person';
  } else {
    cameraMode = 'thirdPerson';
    controls.enabled = false;
    toggleCameraBtn.textContent = 'Enter Free Camera';
  }
});

// =============================
// [SECTION]: SKY & WEATHER
// =============================
const dayColor = new THREE.Color(0x50b1f3);
const nightColor = new THREE.Color(0x003050);
const cloudColor = new THREE.Color(0xA4B8BD);
const rainColor = new THREE.Color(0x7e8cb4)

let isCloudy = false;
let isRaining = false;
let isSnowing = false;
let changeColor = dayColor;
let weatherState = "clear";
let currentColor;
function updateSkyColor() {
  const t = Math.max(0, sun.position.y / sunRadius);
  changeColor = isCloudy ? cloudColor : dayColor;
  if (isCloudy) {
    changeColor = isRaining ? rainColor : cloudColor;
  }
  currentColor = nightColor.clone().lerp(changeColor, t);
  scene.background = currentColor;
  if (!isRaining) {
    scene.fog = new THREE.Fog(currentColor, 1, 650 + 350*t);
  }
  else {
    scene.fog = new THREE.Fog(currentColor, 1, 450 + 250*t);
  }
  
}

const toggleWeatherButton = document.getElementById("weatherToggleBtn");
toggleWeatherButton.addEventListener('click', () => {
  changeWeather(weatherState);
});

let clouds = [];
let rainQuad;

function addRain() {
  const uniforms = {
    iResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
    iTime: { value: 0 }
  };

  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: document.getElementById('vertexShaderRain').textContent,
    fragmentShader: document.getElementById('fragmentShaderRain').textContent,
    transparent: true
  });

  rainQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  camera.add(rainQuad);
  rainQuad.position.set(0,0,-0.5);
  scene.add(camera);
  return material, uniforms;
}

let rainM, rainU;

function addClouds() {
  textureLoader.load("../textures/smoke.png", function(texture){
    const cloudGeo = new THREE.PlaneGeometry(500,500);
    const cloudMaterial = new THREE.MeshLambertMaterial({
      map: texture,
      transparent: true,
      alphaTest: 0.2
    });

    for (let p=0; p<100; p++) {
      let cloud = new THREE.Mesh(cloudGeo, cloudMaterial);
      cloud.position.set(
        Math.random()*2400 -1200,
        400,
        Math.random()*2000 - 1000
      );
      
      
      cloud.rotation.x = 90;
      cloud.rotation.y = 0;
      cloud.rotation.z = 0;
      cloud.material.opacity = 0.6;
      clouds.push(cloud);
      scene.add(cloud);
    }
  });
  
}

function removeClouds() {
  while (clouds.length) {
    const oldCloud = clouds.shift();
    scene.remove(oldCloud);
  }
  
}

function removeRain() {
  camera.remove(rainQuad);
}

function removeSnow() {
  if (snowParticleSystem) {
    scene.remove(snowParticleSystem.points);
    snowParticleSystem = null;
  }
}

// Weather changing via button
function changeWeather(state) {
  if (state == "clear") {
    weatherState = "cloudy";
    isCloudy = true;
    addClouds();
  }
  else if (state == "cloudy") {
    weatherState = "snowy";
    isSnowing = true;
    snowParticleSystem = new SnowParticleSystem(scene);
  }
  else if (state == "snowy") {
    weatherState = "rainy";
    isSnowing = false;
    removeSnow();
    isRaining = true;
    rainM, rainU = addRain();
  }
  else if (state == "rainy") {
    weatherState = "clear";
    isCloudy = false;
    isRaining = false;
    removeRain();
    removeClouds();
  }
}

class SnowParticleSystem {
  constructor(scene) {
    this.count = 1500;
    const positions = new Float32Array(this.count * 3);
    this.velocities = new Float32Array(this.count);

    for (let i = 0; i < this.count; i++) {
      positions[i * 3] = Math.random() * 200 - 100;
      positions[i * 3 + 1] = Math.random() * 100 + 50;
      positions[i * 3 + 2] = Math.random() * 200 - 100;

      this.velocities[i] = 0.5 + Math.random() * 1.5;
    }

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    this.material = new THREE.PointsMaterial({
      color: 0xFFFFFF,
      size: 0.5,
      transparent: true,
      depthWrite: false,
    });

    this.points = new THREE.Points(this.geometry, this.material);
    scene.add(this.points);
  }

  update(delta) {
    const positions = this.geometry.attributes.position.array;

    for (let i = 0; i < this.count; i++) {
      positions[i * 3 + 1] -= this.velocities[i] * delta * 60;

      if (positions[i * 3 + 1] < 0) {
        positions[i * 3] = Math.random() * 200 - 100;
        positions[i * 3 + 1] = 100;
        positions[i * 3 + 2] = Math.random() * 200 - 100;
      }
    }

    this.geometry.attributes.position.needsUpdate = true;
  }
}

// =============================
// [SECTION]: CAR
// =============================
let headlightLeft, headlightRight;
let taillightLeft, taillightRight, taillightMiddle;
let lightLeft, lightRight;
let interiorLight;
let car = null;
const loader = new GLTFLoader();
function loadCar(carURL) {
  loader.load(
    carURL,
    function (gltf) {
      car = gltf.scene;
      car.scale.set(100, 100, 100);
      car.position.y = 0.2;

      car.traverse(n => {
        if (n.isMesh) {
          n.castShadow = true;
          n.receiveShadow = true;
        }
      });

      if (carURL == '../cars/Dodge SRT Tomahawk/source/dodge_srt_tomahawk_x.glb') {
        car.name = 'Dodge';
      }
      else {
        car.name = 'Apollo';
      }

      // === Add lights + targets ===
      function createSpotlight({ color, intensity, distance, angle, penumbra, decay }, position, targetPos) {
        const light = new THREE.SpotLight(color, intensity, distance, angle, penumbra, decay);
        light.position.copy(position);
        light.castShadow = true;

        const target = new THREE.Object3D();
        target.position.copy(targetPos);
        light.target = target;

        scene.add(light, target);
        return light;
      }

      // === Headlight Indicators ===
      lightLeft = createSpotlight(
        { color: 0xffffff, intensity: 7.5, distance: 0.5, angle: Math.PI / 4, penumbra: 0.1, decay: 1 },
        new THREE.Vector3(car.position.x + 0.855, car.position.y + 0.545, car.position.z + 2.25),
        new THREE.Vector3(car.position.x + 0.85, car.position.y + 0.625, car.position.z + 2.15)
      );

      lightRight = createSpotlight(
        { color: 0xffffff, intensity: 7.5, distance: 0.5, angle: Math.PI / 4, penumbra: 0.1, decay: 1 },
        new THREE.Vector3(car.position.x - 0.855, car.position.y + 0.545, car.position.z + 2.25),
        new THREE.Vector3(car.position.x - 0.85, car.position.y + 0.625, car.position.z + 2.15)
      );

      // === Functional Headlights ===
      headlightLeft = createSpotlight(
        { color: 0xffffff, intensity: 2.5, distance: 200, angle: Math.PI / 8, penumbra: 1, decay: 2 },
        new THREE.Vector3(car.position.x + 0.75, car.position.y + 1, car.position.z + 1.55),
        new THREE.Vector3(car.position.x + 0.85, car.position.y + 0.25, car.position.z + 25)
      );

      headlightRight = createSpotlight(
        { color: 0xffffff, intensity: 2.5, distance: 200, angle: Math.PI / 8, penumbra: 1, decay: 2 },
        new THREE.Vector3(car.position.x - 0.75, car.position.y + 1, car.position.z + 1.55),
        new THREE.Vector3(car.position.x - 0.85, car.position.y + 0.25, car.position.z + 25)
      );

      // === Taillights ===
      if (car.name == 'Dodge') {
        taillightLeft = createSpotlight(
          { color: 0xff0000, intensity: 5, distance: 0.5, angle: Math.PI / 2, penumbra: 0.2, decay: 2 },
          new THREE.Vector3(car.position.x + 0.85, car.position.y + 0.7, car.position.z - 2.275),
          new THREE.Vector3(car.position.x + 0.75, car.position.y + 0.7, car.position.z - 2.3)
        );

        taillightRight = createSpotlight(
          { color: 0xff0000, intensity: 5, distance: 0.5, angle: Math.PI / 2, penumbra: 0.2, decay: 2 },
          new THREE.Vector3(car.position.x - 0.85, car.position.y + 0.7, car.position.z - 2.275),
          new THREE.Vector3(car.position.x - 0.75, car.position.y + 0.7, car.position.z - 2.3)
        );
      }
      else {
        taillightLeft = createSpotlight(
          { color: 0xff0000, intensity: 5, distance: 0.5, angle: Math.PI / 2, penumbra: 0.2, decay: 2 },
          new THREE.Vector3(car.position.x + 0.85, car.position.y + 0.6, car.position.z - 2.275),
          new THREE.Vector3(car.position.x + 0.75, car.position.y + 0.6, car.position.z - 2.3)
        );

        taillightRight = createSpotlight(
          { color: 0xff0000, intensity: 5, distance: 0.5, angle: Math.PI / 2, penumbra: 0.2, decay: 2 },
          new THREE.Vector3(car.position.x - 0.85, car.position.y + 0.6, car.position.z - 2.275),
          new THREE.Vector3(car.position.x - 0.75, car.position.y + 0.6, car.position.z - 2.3)
        );
      }
      
      if (car.name == 'Dodge') {
        taillightMiddle = createSpotlight(
          { color: 0xff0000, intensity: 5, distance: 0.5, angle: Math.PI / 2, penumbra: 0.2, decay: 2 },
          new THREE.Vector3(car.position.x, car.position.y + 0.725, car.position.z - 2.275),
          new THREE.Vector3(car.position.x, car.position.y + 0.725, car.position.z - 2.3)
        );
      }
      

      interiorLight = createSpotlight(
        { color: 0xffffff, intensity: 10, distance: 0.5, angle: Math.PI, penumbra: 0.2, decay: 2 },
        new THREE.Vector3(car.position.x, car.position.y + 0.725, car.position.z + 0.5),
        new THREE.Vector3(car.position.x, car.position.y + 0.715, car.position.z)
      );
      
      scene.add(car);

      let lightsOn = true;
      lightToggleBtn.addEventListener('click', () => {
        lightsOn = !lightsOn;
        [lightLeft, lightRight, headlightLeft, headlightRight, interiorLight, taillightLeft, taillightRight, taillightMiddle].forEach(light => {
          light.visible = lightsOn;
        });
        lightToggleBtn.textContent = lightsOn ? 'Turn Lights Off' : 'Turn Lights On';
      });
    },
    undefined,
    function (error) {
      console.error('An error occurred while loading the car model:', error);
    }
  );
  return car;
}

let Dodge, Apollo;

function loadFirstCar() {
  Dodge = loadCar('../cars/Dodge SRT Tomahawk/source/dodge_srt_tomahawk_x.glb');
}
loadFirstCar();

function changeCar() {
  if (car.name == 'Dodge') {
    scene.remove(car);
    disposeHierarchy(car);
    [
      lightLeft, lightRight, headlightLeft, headlightRight, 
      taillightLeft, taillightRight, taillightMiddle, interiorLight
    ].forEach(light => {
      if (light) {
        scene.remove(light);
        light.dispose?.();
        if (light.target) { scene.remove(light.target); }
      }
    });
    Apollo = loadCar('../cars/2019 Gumbert Apollo/source/2019_gumpert_apollo.glb');
  }
  else {
    if (car.name == 'Apollo') {
    scene.remove(car);
    disposeHierarchy(car);
    [
      lightLeft, lightRight, headlightLeft, headlightRight, 
      taillightLeft, taillightRight, taillightMiddle, interiorLight
    ].forEach(light => {
      if (light) {
        scene.remove(light);
        light.dispose?.();
        if (light.target) { scene.remove(light.target); }
      }
    });
    Dodge = loadCar('../cars/Dodge SRT Tomahawk/source/dodge_srt_tomahawk_x.glb');
    }
  }
}

function disposeHierarchy(node) {
  node.traverse(child => {
    if (child.isMesh) {
      if (child.geometry) { child.geometry.dispose(); }

      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach(mat => {
            disposeMaterial(mat);
          });
        }
        else {
          disposeMaterial(child.material);
        }
      }
    }
  });
}

function disposeMaterial(material) {
  for (const key in material) {
    const value = material[key];
    if (value && value.isTexture) {
      value.dispose();
    }
  }
  material.dispose();
}

const carChangeButton = document.getElementById('carChangeBtn');
carChangeButton.addEventListener('click', () => {
  changeCar();
});


// =============================
// [SECTION]: Road + Tiles
// =============================
const roadSegmentLength = 60;
const roadWidth = 10;
const visibleSegments = 15;
const roadSegments = [];
const overlapPercent = 0.1;
const overlapLength = roadSegmentLength * overlapPercent;

function createRoadSegment(z) {
  const group = new THREE.Group();
  group.position.z = z;

  // Center road with full material setup
  const roadGeometry = new THREE.BoxGeometry(roadWidth, 0.1, roadSegmentLength);
  const textureLoader = new THREE.TextureLoader();

  const roadColorMap = textureLoader.load('../textures/road_diffuse.png');
  const roadNormalMap = textureLoader.load('../textures/road_normal.png');
  const roadBumpMap = textureLoader.load('../textures/road_bump.png');
  const roadDisplacementMap = textureLoader.load('../textures/road_displacement.png');

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

  const road = new THREE.Mesh(roadGeometry, roadMaterial);
  road.castShadow = true;
  road.receiveShadow = true;
  road.position.set(0, 0, 0);
  group.add(road);

  // Side tiles with environment decorations
  const sideTileWidth = roadWidth * 4;
  for (let i = 1; i <= 2; i++) {
    const offset = roadWidth / 2 + sideTileWidth * i - sideTileWidth / 2;
    const sideMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, map: soilTexture });

    const createSide = (xOffset) => {
      const sideGeometry = new THREE.BoxGeometry(sideTileWidth, 0.1, roadSegmentLength);
      const side = new THREE.Mesh(sideGeometry, sideMaterial);

      side.position.set(xOffset, 0.125, 0);
      side.castShadow = true;
      side.receiveShadow = true;
      group.add(side);

      const numObjects = 2 + Math.floor(Math.random() * 3);
      for (let j = 0; j < numObjects; j++) {
        const randZ = (Math.random() - 0.5) * roadSegmentLength;
        const offsetX = xOffset + (Math.random() - 0.5) * sideTileWidth;
        const randType = Math.random();

        const treeBuffer = 20; // half of the 40-unit road width
        const maxOffset = sideTileWidth / 2;
        let treePosX;

        // Generate X position relative to the side tile center (xOffset),
        // but clamp it to avoid the center road area
        do {
          const localOffset = (Math.random() - 0.5) * sideTileWidth;
          treePosX = xOffset + localOffset;
        } while (Math.abs(treePosX) < treeBuffer);

        const treePosY = 0.125;
        const treeScale = 0.03;
        const treePosZ = (Math.random() - 0.5) * 10;

        if (randType < 0.1 && treeModel) {
          const scale = 0.1 + Math.random() * 0.2;
          const rot = (Math.random() - 0.5) * 0.3;
          const tree = spawnEnvObject(treeModel, treePosX, treePosY, treePosZ, treeScale * (1 + Math.random() * 0.4), rot);
          if (tree) group.add(tree);
         }
         else if (randType < 0.5 && rockModel) {
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

// =============================
// [SECTION]: ENVIRONMENT
// =============================
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(1000, 1000),
  new THREE.MeshStandardMaterial({ color: 0x222222 })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

let soilTexture = null;
textureLoader.load('textures/TCOM_Sand_Muddy2_2x2_2K_albedo.png', texture => {
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4);
  soilTexture = texture;
  itemLoaded();
});

const gltfLoader = new GLTFLoader();
gltfLoader.load('models/lowpoly_pine_tree/scene.gltf', gltf => { treeModel = gltf.scene; itemLoaded(); });
gltfLoader.load('models/lowpoly_rocks/scene.gltf', gltf => { rockModel = gltf.scene; itemLoaded(); });
gltfLoader.load('models/lowpoly_grass/scene.gltf', gltf => { grassModel = gltf.scene; itemLoaded(); });

let treeModel, rockModel, grassModel = null;
gltfLoader.load('models/lowpoly_pine_tree/scene.gltf', gltf => { treeModel = gltf.scene; });
gltfLoader.load('models/lowpoly_rocks/scene.gltf', gltf => { rockModel = gltf.scene; });
gltfLoader.load('models/lowpoly_grass/scene.gltf', gltf => { grassModel = gltf.scene; });

function spawnGrassPatch(group, x, y, z, baseScale) {
  if (!grassModel) return;
  const patchSize = 20;
  const numBlades = Math.floor(Math.random() * 5);
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
          dynamicEnvMeshes.push(child); // Track it
        }
      });
    group.add(blade);
  }
}

const dynamicEnvMeshes = [];
function spawnEnvObject(model, x, y, z, scale = 2.5, rotationY = 0) {
  if (!model) return null;

  const obj = model.clone();
  obj.scale.setScalar(scale);
  obj.rotation.y = rotationY;

  // Temporarily add to scene to compute bounding box
  scene.add(obj);
  obj.updateWorldMatrix(true, true);

  // Compute world bounding box
  const box = new THREE.Box3().setFromObject(obj);
  const heightOffset = box.min.y;

  // Remove from scene after computing box
  scene.remove(obj);

  // Set final position with grounded offset
  obj.position.set(x, y - heightOffset, z);

  // Traverse and add shadows + lighting reactions
  obj.traverse(child => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
      dynamicEnvMeshes.push(child);
    }
  });

  return obj;
}

// =============================
// [SECTION]: SPEED
// =============================
let speed = 2;
let cruiseControl = false;
let cruiseSpeed = speed;
const maxSpeed = 5;
const minSpeed = 0.1;

const keys = {
  w: false,
  s: false,
  a: false,
  d: false,
  shift: false,
};

function updateCruiseUI(enabled) {
  const cruiseIcon = document.getElementById('cruiseIcon');
  const needle = document.getElementById('needle');
  if (cruiseIcon) cruiseIcon.style.display = enabled ? 'block' : 'none';
  if (needle) needle.classList.toggle('cruise', enabled);
}
updateCruiseUI(false);

// Key press events
document.addEventListener('keydown', (e) => {
  const key = e.key.toLowerCase();
  if (key === 'w') keys.w = true;
  if (key === 's') keys.s = true;
  if (key === 'a') keys.a = true;
  if (key === 'd') keys.d = true;
  if (e.key === 'Shift') keys.shift = true;
  if (key === 'q') {
    cruiseControl = !cruiseControl;
    if (cruiseControl) cruiseSpeed = speed;
    updateCruiseUI(cruiseControl);
  } else if (key === 'q' && cruiseControl) {
    cruiseControl = false;
  }
});

document.addEventListener('keyup', (e) => {
  const key = e.key.toLowerCase();
  if (key === 'w') keys.w = false;
  if (key === 's') keys.s = false;
  if (key === 'a') keys.a = false;
  if (key === 'd') keys.d = false;
  if (e.key === 'Shift') keys.shift = false;
});

// Speed update logic based on input and resistance
function updateSpeed() {
  if (cruiseControl) {
    speed = cruiseSpeed;
    return;
  }
  
  const resistance = (speed / maxSpeed) ** 2;

  if (keys.w) {
    const boost = keys.shift ? 5 : 1.5;
    speed += boost * 0.0015 * (1 - resistance);
  } else if (keys.s) {
    speed -= 0.0025 + 0.006 * resistance;
  } else {
    speed -= 0.00025 + 0.0025 * resistance;
  }

  speed = THREE.MathUtils.clamp(speed, minSpeed, maxSpeed);
}

// =============================
// [SECTION]: ANIMATE
// =============================

const clock = new THREE.Clock();

function animate(time) {
  requestAnimationFrame(animate);
  updateSkyColor();

  sunAngle += 0.0005;
  const sunX = sunRadius * Math.cos(sunAngle);
  const sunY = sunRadius * Math.sin(sunAngle);
  sun.position.set(sunX, sunY, 0);
  sun.color.setHSL(0.1, 1, Math.max(0.2, sunY / sunRadius));

  // Moon (opposite side of sun)
  moon.position.set(-sunX + 30, -sunY + 40, 100);

  // Adjust light intensities
  const lightFactor = Math.max(0.1, sunY / sunRadius);
  sun.intensity = lightFactor;
  moon.intensity = Math.max(0.1, -sunY / sunRadius);

  // === Day/Night UI Pointer ===
  const normalized = (Math.cos(sunAngle) + 1) / 2;
  dayNightPointer.style.left = `${normalized * 100}%`;

  // === Update Speedometer ===
  const kmh = speed * 50;
  const angle = -90 + (kmh / 270) * 180;
  needle.style.transform = `rotate(${angle}deg)`;
  speedLabel.innerText = `${Math.round(kmh)} km/h`;

  updateSpeed();

  // === Environment Lighting Adjustment ===
  dynamicEnvMeshes.forEach(mesh => {
    if (!mesh.material?.color) return;

    const dayColor = new THREE.Color(0xffffff);
    const nightColor = new THREE.Color(0x111111);
    mesh.material.color.lerpColors(nightColor, dayColor, lightFactor);

    if (mesh.material.emissive) {
      mesh.material.emissive.set(0x111133);
      mesh.material.emissiveIntensity = 0.2 * (1 - lightFactor);
    }
  });

  // === cloud rotation logic ===
  if (isCloudy && clouds.length > 0) {
    clouds.forEach(p => {
      //let zRot = p.rotation.z;
      p.rotation.x = camera.rotation.x;
      p.rotation.y = camera.rotation.y;
      p.rotation.z -= 0.002;
      //zRot -= 0.002;
      //p.lookAt(camera.position);
      if (isRaining) {
        p.position.y = 300;
      }
    })
  }

  // === rain dropping logic ===
  if (isRaining) {
    rainU.iTime.value = clock.getElapsedTime();
    rainQuad.lookAt(camera.position);
  }

  if (isSnowing && snowParticleSystem) {
    snowParticleSystem.update(clock.getDelta());
  }

  // === Car & Road Logic ===
  if (car) {
    // === Update Light Positions with Car Movement ===
  if (headlightLeft && headlightRight && taillightLeft && taillightRight && taillightMiddle && lightLeft && lightRight) {
      const { x, y, z } = car.position;

      lightLeft.position.set(x + 0.855, y + 0.545, z + 2.25);
      lightLeft.target.position.set(x + 0.85, y + 0.625, z + 2.15);

      lightRight.position.set(x - 0.855, y + 0.545, z + 2.25);
      lightRight.target.position.set(x - 0.85, y + 0.625, z + 2.15);

      headlightLeft.position.set(x + 0.75, y + 1, z + 1.55);
      headlightLeft.target.position.set(x + 0.85, y + 0.25, z + 25);

      headlightRight.position.set(x - 0.75, y + 1, z + 1.55);
      headlightRight.target.position.set(x - 0.85, y + 0.25, z + 25);

      taillightLeft.position.set(x + 0.85, y + 0.7, z - 2.275);
      taillightLeft.target.position.set(x + 0.75, y + 0.7, z - 2.3);

      taillightRight.position.set(x - 0.85, y + 0.7, z - 2.275);
      taillightRight.target.position.set(x - 0.75, y + 0.7, z - 2.3);

      taillightMiddle.position.set(x, y + 0.725, z - 2.275);
      taillightMiddle.target.position.set(x, y + 0.725, z - 2.3);

      interiorLight.position.set(x, y + 0.725, z + 0.5);
      interiorLight.target.position.set(x, y + 0.715, z);
    }

    car.position.z = 0;

    if (car) {
      const lateralSpeed = 0.1;
      const maxLateral = roadWidth / 2 - 1;

      if (keys.d) {
        car.position.x = Math.max(car.position.x - lateralSpeed, -maxLateral);
      }
      if (keys.a) {
        car.position.x = Math.min(car.position.x + lateralSpeed, maxLateral);
      }
    }

    for (let segment of roadSegments) {
      segment.position.z -= speed;
    }

    while (roadSegments.length && roadSegments[0].position.z < -roadSegmentLength * 1.5) {
      const oldSegment = roadSegments.shift();
      scene.remove(oldSegment);
    }

    const lastSegment = roadSegments[roadSegments.length - 1];
    if (lastSegment && lastSegment.position.z < roadSegmentLength * (visibleSegments - 1)) {
      const newZ = lastSegment.position.z + roadSegmentLength - overlapLength;
      createRoadSegment(newZ);
    }

    if (cameraMode === 'freeCamera') {
      if (car) controls.target.copy(car.position);
      controls.update();
    } else if (cameraMode === 'firstPerson') {
      if (car) {
        camera.position.set(car.position.x, car.position.y + 1.5, car.position.z + 1.5);
        camera.lookAt(car.position.x, car.position.y + 1, car.position.z + 10);
      }
    } else {
      if (car) {
        camera.position.set(0, 2.5, -12.5);
        camera.lookAt(0, 1, 5);
      }
    }
  }

  // === Render Scene ===
  renderer.render(scene, camera);
}

animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  if (rainM != null) {
    rainM.uniforms.iResolution.value.set(window.innerWidth, window.innerHeight);
  }
});