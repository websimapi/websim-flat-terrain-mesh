import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let scene, camera, renderer, controls, localGridHelper, groundPlane;
let raycaster, mouse;

function generateTerrain(widthM, depthM) {
    // Cleanup old terrain
    if (groundPlane) {
        scene.remove(groundPlane);
        groundPlane.geometry.dispose();
        groundPlane.material.dispose();
    }

    // Green ground plane
    const groundGeometry = new THREE.PlaneGeometry(widthM, depthM);
    const groundMaterial = new THREE.MeshStandardMaterial({
        color: 0x228B22, // ForestGreen
    });
    groundPlane = new THREE.Mesh(groundGeometry, groundMaterial);
    groundPlane.rotation.x = -Math.PI / 2;
    scene.add(groundPlane);

    // Update camera, controls, fog based on new terrain size
    const maxDim = Math.max(widthM, depthM);
    camera.far = maxDim * 2;
    camera.updateProjectionMatrix();

    controls.maxDistance = maxDim * 1.5;
    
    scene.fog.near = maxDim * 0.1;
    scene.fog.far = maxDim * 1.5;
}

function updateLocalGrid(cellSizeM, divisions = 20) {
    if (localGridHelper) {
        scene.remove(localGridHelper);
        localGridHelper.geometry.dispose();
        localGridHelper.material.dispose();
    }

    const size = cellSizeM * divisions;
    localGridHelper = new THREE.GridHelper(size, divisions, 0xffffff, 0xffffff);
    localGridHelper.position.y = 1; // Position slightly above the ground plane to ensure visibility
    localGridHelper.visible = false; // Initially hidden
   
    scene.add(localGridHelper);
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

    // Raycaster and mouse
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(130000, 100000, 80000); // Positioned to give some angle
    scene.add(directionalLight);

    // Event Listeners
    window.addEventListener('resize', onWindowResize, false);
    window.addEventListener('mousemove', onMouseMove, false);

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
            // Visibility is now handled in the animate loop based on mouse position and this checkbox.
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

            const widthM = width * 1000;
            const depthM = depth * 1000;

            generateTerrain(widthM, depthM);
            updateLocalGrid(cellSize);
            
            const maxDimM = Math.max(widthM, depthM);
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

function onMouseMove(event) {
    // calculate mouse position in normalized device coordinates
    // (-1 to +1) for both components
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);

    // Update local grid position based on mouse
    const showGrid = document.getElementById('toggle-grid').checked;
    if (showGrid && groundPlane && localGridHelper) {
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObject(groundPlane);
        
        if (intersects.length > 0) {
            localGridHelper.visible = true;
            const intersectPoint = intersects[0].point;
            const cellSize = parseFloat(document.getElementById('grid-cell-size').value);
            
            // Snap the grid center to the nearest grid line intersection
            localGridHelper.position.x = Math.round(intersectPoint.x / cellSize) * cellSize;
            localGridHelper.position.z = Math.round(intersectPoint.z / cellSize) * cellSize;
        } else {
            localGridHelper.visible = false;
        }
    } else if (localGridHelper) {
        localGridHelper.visible = false;
    }

    controls.update();
    renderer.render(scene, camera);
}

init();