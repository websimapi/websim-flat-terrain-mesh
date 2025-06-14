import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let scene, camera, renderer, controls, gridHelper, groundPlane;

function generateTerrain(widthKm, depthKm, cellSizeM) {
    // Cleanup old terrain
    if (groundPlane) {
        scene.remove(groundPlane);
        groundPlane.geometry.dispose();
        groundPlane.material.dispose();
    }
    if (gridHelper) {
        scene.remove(gridHelper);
        gridHelper.geometry.dispose();
        gridHelper.material.dispose();
    }

    const widthM = widthKm * 1000;
    const depthM = depthKm * 1000;

    // Green ground plane
    const groundGeometry = new THREE.PlaneGeometry(widthM, depthM);
    const groundMaterial = new THREE.MeshStandardMaterial({
        color: 0x228B22, // ForestGreen
    });
    groundPlane = new THREE.Mesh(groundGeometry, groundMaterial);
    groundPlane.rotation.x = -Math.PI / 2;
    scene.add(groundPlane);

    // Grid to visualize the terrain cells
    const maxSize = Math.max(widthM, depthM);
    const divisions = Math.round(maxSize / cellSizeM);

    gridHelper = new THREE.GridHelper(maxSize, divisions, 0xffffff, 0xffffff);
    gridHelper.position.y = 1; // Position slightly above the ground plane to ensure visibility
    
    const toggleGridCheckbox = document.getElementById('toggle-grid');
    if (toggleGridCheckbox) {
         gridHelper.visible = toggleGridCheckbox.checked;
    }
   
    scene.add(gridHelper);

    // Update camera, controls, fog based on new terrain size
    const maxDim = Math.max(widthM, depthM);
    camera.far = maxDim * 2;
    camera.updateProjectionMatrix();

    controls.maxDistance = maxDim * 1.5;
    
    scene.fog.near = maxDim * 0.1;
    scene.fog.far = maxDim * 1.5;
}

function init() {
    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb); // Sky blue background
    scene.fog = new THREE.Fog(0x87ceeb, 50000, 300000);

    // Camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 100, 400000);
    // camera.position.set(0, 20000, 40000); // Position will be set dynamically

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

    // Event Listeners
    window.addEventListener('resize', onWindowResize, false);

    // Debug Menu
    const debugMenu = document.getElementById('debug-menu');
    const toggleGridCheckbox = document.getElementById('toggle-grid');
    const generateBtn = document.getElementById('generate-terrain');

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

    if (generateBtn) {
        generateBtn.addEventListener('click', () => {
            const width = parseFloat(document.getElementById('terrain-width').value);
            const depth = parseFloat(document.getElementById('terrain-depth').value);
            const cellSize = parseFloat(document.getElementById('grid-cell-size').value);

            if (isNaN(width) || isNaN(depth) || isNaN(cellSize) || width <= 0 || depth <= 0 || cellSize <= 0) {
                alert("Please enter valid positive numbers for terrain dimensions.");
                return;
            }

            generateTerrain(width, depth, cellSize);
            
            const maxDimM = Math.max(width * 1000, depth * 1000);
            camera.position.set(0, maxDimM / 8, maxDimM / 4);
            controls.target.set(0, 0, 0);
            controls.update();
        });
    }

    // Initial terrain generation
    generateBtn.click();

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