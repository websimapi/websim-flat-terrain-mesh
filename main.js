import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let scene, camera, renderer, controls;

function init() {
    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb); // Sky blue background
    scene.fog = new THREE.Fog(0x87ceeb, 100, 500);

    // Camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
    camera.position.set(0, 50, 100);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // Controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.minDistance = 10;
    controls.maxDistance = 500;
    controls.maxPolarAngle = Math.PI / 2.1; // Prevent camera from going under the ground

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(100, 100, 50);
    scene.add(directionalLight);

    // Terrain
    // We interpret 256km x 254km as 256m x 254m for performance reasons.
    // A 1x1m grid is achieved by setting the width/height segments to match the size.
    const terrainWidth = 256;
    const terrainHeight = 254;
    const geometry = new THREE.PlaneGeometry(terrainWidth, terrainHeight, terrainWidth, terrainHeight);

    // Use a wireframe material to visualize the 1x1m grid
    const material = new THREE.MeshStandardMaterial({
        color: 0x228B22, // ForestGreen
        wireframe: true
    });
    
    const terrain = new THREE.Mesh(geometry, material);
    terrain.rotation.x = -Math.PI / 2; // Rotate the plane to be horizontal
    scene.add(terrain);
    
    // Non-wireframe ground plane underneath
    const groundMaterial = new THREE.MeshStandardMaterial({
        color: 0x228B22,
        side: THREE.DoubleSide
    });
    const groundPlane = new THREE.Mesh(geometry, groundMaterial);
    groundPlane.rotation.x = -Math.PI / 2;
    groundPlane.position.y = -0.01; // Slightly below the wireframe to avoid z-fighting
    scene.add(groundPlane);

    // Event Listeners
    window.addEventListener('resize', onWindowResize, false);

    // Start animation loop
    animate();
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

init();

