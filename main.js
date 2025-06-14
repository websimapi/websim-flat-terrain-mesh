import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let scene, camera, renderer, controls, gridHelper;

function init() {
    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb); // Sky blue background
    scene.fog = new THREE.Fog(0x87ceeb, 50000, 300000);

    // Camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 100, 400000);
    camera.position.set(0, 20000, 40000);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // Controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.minDistance = 1000;
    controls.maxDistance = 150000;
    controls.maxPolarAngle = Math.PI / 2.1; // Prevent camera from going under the ground

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(130000, 100000, 80000); // Positioned to give some angle
    scene.add(directionalLight);

    // Terrain
    const terrainSize = 256000; // 256km
    const divisions = 256; // This creates 256x256 grid cells, each 1km x 1km

    // Green ground plane
    const groundGeometry = new THREE.PlaneGeometry(terrainSize, terrainSize);
    const groundMaterial = new THREE.MeshStandardMaterial({
        color: 0x228B22, // ForestGreen
    });
    const groundPlane = new THREE.Mesh(groundGeometry, groundMaterial);
    groundPlane.rotation.x = -Math.PI / 2;
    scene.add(groundPlane);

    // Grid to visualize the terrain cells
    gridHelper = new THREE.GridHelper(terrainSize, divisions, 0xffffff, 0xffffff);
    gridHelper.position.y = 1; // Position slightly above the ground plane to ensure visibility
    scene.add(gridHelper);

    // Event Listeners
    window.addEventListener('resize', onWindowResize, false);

    // Debug Menu
    const debugMenu = document.getElementById('debug-menu');
    const toggleGridCheckbox = document.getElementById('toggle-grid');

    window.addEventListener('keydown', (event) => {
        // Use 'Backquote' which is the key for ` and ~ on US keyboards.
        if (event.code === 'Backquote') {
            event.preventDefault();
            debugMenu.classList.toggle('hidden');
        }
    });

    if (toggleGridCheckbox) {
        toggleGridCheckbox.addEventListener('change', (event) => {
            if (gridHelper) {
                gridHelper.visible = event.target.checked;
            }
        });
    }

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