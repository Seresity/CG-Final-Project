import * as THREE from './build/three.module.js';
import { OrbitControls } from './build/OrbitControls.js';
import { GLTFLoader } from './build/GLTFLoader.js';

// === SCENE SETUP ===
const scene = new THREE.Scene();
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

const dayColor = new THREE.Color(0x87ceeb);
const nightColor = new THREE.Color(0x000010);
const rainColor = new THREE.Color(0x003366);
let isRaining = false;
let changeColor;

function updateSkyColor() {
  const t = Math.max(0, sun.position.y / sunRadius);
  if (isRaining) {
    changeColor = rainColor;
  }
  else {
    changeColor = dayColor;
  }
  const currentColor = nightColor.clone().lerp(changeColor, t);
  
  
  scene.background = currentColor;
}


// === CAMERA CONTROLS ===
let isFreeCamera = false;
let lightsOn = true;
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.enablePan = true;
controls.enableZoom = true;
controls.enabled = false;

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


// === weather toggling ===
let weatherState = "clear";

const toggleWeatherButton = document.getElementById("weatherToggleBtn");
toggleWeatherButton.addEventListener('click', () => {
  changeWeather(weatherState);
});

// === LIGHT SETUP ===
const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
scene.add(ambientLight);

const moon = new THREE.DirectionalLight(0x8899ff, 0.2);
moon.castShadow = true;
scene.add(moon);

const sun = new THREE.DirectionalLight(0xffffff, 10);
sun.position.set(100, 100, 0);
sun.castShadow = true;
sun.shadow.bias = -0.001;
sun.shadow.mapSize.width = 2048;
sun.shadow.mapSize.height = 2048;
scene.add(sun);
const sunRadius = 100;
let sunAngle = Math.PI / 2;

// === LOADING ===
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

// === SOIL ===
let soilTexture = null;
const textureLoader = new THREE.TextureLoader();
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
  const patchSize = 5;
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
      dynamicEnvMeshes.push(child);
    }
  });
  return obj;
}

// === CAR MODEL & HEADLIGHTS ===
let car = null;
const loader = new GLTFLoader();
loader.load(
  '../cars/Dodge SRT Tomahawk/source/dodge_srt_tomahawk_x.glb',
  function (gltf) {
    car = gltf.scene;
    car.scale.set(100, 100, 100);
    car.position.y = 0.2;
    // Apply shadows and look for headlight meshes
    car.traverse(n => {
      if (n.isMesh) {
        n.castShadow = true;
        n.receiveShadow = true;
      }
    });

    // === Utility: Add lights + targets ===
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
    const lightLeft = createSpotlight(
      { color: 0xffffff, intensity: 7.5, distance: 0.5, angle: Math.PI / 4, penumbra: 0.1, decay: 1 },
      new THREE.Vector3(0.855, 0.545, car.position.z + 2.25),
      new THREE.Vector3(0.85, 0.625, car.position.z + 2.15)
    );

    const lightRight = createSpotlight(
      { color: 0xffffff, intensity: 7.5, distance: 0.5, angle: Math.PI / 4, penumbra: 0.1, decay: 1 },
      new THREE.Vector3(-0.855, 0.545, car.position.z + 2.25),
      new THREE.Vector3(-0.85, 0.625, car.position.z + 2.15)
    );

    // === Functional Headlights ===
    const headlightLeft = createSpotlight(
      { color: 0xffffff, intensity: 2, distance: 200, angle: Math.PI / 8, penumbra: 1, decay: 2 },
      new THREE.Vector3(0.75, 1, car.position.z + 1.55),
      new THREE.Vector3(0.85, 0.1, car.position.z + 25)
    );

    const headlightRight = createSpotlight(
      { color: 0xffffff, intensity: 2, distance: 200, angle: Math.PI / 8, penumbra: 1, decay: 2 },
      new THREE.Vector3(-0.75, 1, car.position.z + 1.55),
      new THREE.Vector3(-0.85, 0.1, car.position.z + 25)
    );

    // === Taillights ===
    const taillightLeft = createSpotlight(
      { color: 0xff0000, intensity: 5, distance: 0.1, angle: Math.PI / 2, penumbra: 0.2, decay: 2 },
      new THREE.Vector3(0.85, 0.7, car.position.z - 2.25),
      new THREE.Vector3(0.75, 0.7, car.position.z - 2.3)
    );

    const taillightRight = createSpotlight(
      { color: 0xff0000, intensity: 5, distance: 0.1, angle: Math.PI / 2, penumbra: 0.2, decay: 2 },
      new THREE.Vector3(-0.85, 0.7, car.position.z - 2.25),
      new THREE.Vector3(-0.75, 0.7, car.position.z - 2.3)
    );

    const taillightMiddle = createSpotlight(
      { color: 0xff0000, intensity: 5, distance: 0.1, angle: Math.PI / 2, penumbra: 0.2, decay: 2 },
      new THREE.Vector3(0, 0.725, car.position.z - 2.25),
      new THREE.Vector3(0, 0.725, car.position.z - 2.3)
    );
    scene.add(car);

    let lightsOn = true;
    lightToggleBtn.addEventListener('click', () => {
      lightsOn = !lightsOn;
      [lightLeft, lightRight, headlightLeft, headlightRight].forEach(light => {
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

// === Road Decoration Setup ===
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
  const sideTileWidth = roadWidth * 2;
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
        const offsetX = xOffset + (Math.random() - 0.5) * sideTileWidth * 0.9;
        const randType = Math.random();

        let treePosX;
        if (Math.random() < 0.5) {
          treePosX = 20 + Math.random() * 10;
        } else {
          treePosX = 0 - Math.random() * 5; 
        }
        
        const treePosY = 3.5;
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

// === Speed Control ===
let speed = 2;
const maxSpeed = 5;
const minSpeed = 0.1;

const keys = {
  w: false,
  s: false, 
  shift: false
};

// Key press handling
document.addEventListener('keydown', (e) => {
  const key = e.key.toLowerCase();
  if (key === 'w') keys.w = true;
  if (key === 's') keys.s = true;
  if (e.key === 'Shift') keys.shift = true;
});

document.addEventListener('keyup', (e) => {
  const key = e.key.toLowerCase();
  if (key === 'w') keys.w = false;
  if (key === 's') keys.s = false;
  if (e.key === 'Shift') keys.shift = false;
});

// Update speed based on input and resistance
function updateSpeed() {
  const resistance = (speed / maxSpeed) ** 2;

  if (keys.w) {
    const boost = keys.shift ? 5 : 1.5;
    speed += boost * 0.0015 * (1 - resistance); // Acceleration
  } else if (keys.s) {
    speed -= 0.0025 + 0.006 * resistance; // Braking
  } else {
    speed -= 0.00025 + 0.0025 * resistance; // Coasting drag
  }

  speed = THREE.MathUtils.clamp(speed, minSpeed, maxSpeed);
}

let clouds = [];



function addRain() {
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
  // const material = new THREE.ShaderMaterial({
  //   vertexShader: document.getElementById('vertexShader').textContent,
  //   fragmentShader: document.getElementById('fragmentShader').textContent,
  //   uniforms: uniforms
    
  // })

}

function removeRain() {
  while (clouds.length) {
    const oldCloud = clouds.shift();
    scene.remove(oldCloud);
  }
  
}

// Weather changing via button
function changeWeather(state) {
  if (state == "clear") {
    weatherState = "rainy";
    isRaining = true;
    addRain();
  }
  else if (state == "rainy") {
    weatherState = "clear";
    isRaining = false;
    removeRain();
  }
}

// Dashboard UI
const needle = document.getElementById('needle');
const speedLabel = document.getElementById('speedLabel');

function animate() {
  requestAnimationFrame(animate);

  // === Update Sky and Light ===
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

  if (isRaining && clouds.length > 0) {
    clouds.forEach(p => {
      //let zRot = p.rotation.z;
      p.rotation.x = camera.rotation.x;
      p.rotation.y = camera.rotation.y;
      p.rotation.z -= 0.002;
      //zRot -= 0.002;
      //p.lookAt(camera.position);
    })
  }
  

  // === Car & Road Logic ===
  if (car) {
    car.position.z = 0;

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

    if (isFreeCamera) {
      controls.target.copy(car.position);
      controls.update();
    } else {
      camera.position.set(car.position.x, car.position.y + 2.5, car.position.z - 7.5);
      camera.lookAt(car.position);
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
});