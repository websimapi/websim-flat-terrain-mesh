import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let scene, camera, renderer, controls, localGridHelper, groundPlane;
let raycaster;

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

    // controls.maxDistance = maxDim * 1.5; // Now user-controlled via debug menu
    
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
    
    // Prevent z-fighting and rendering glitches by telling the grid to render on top.
    localGridHelper.material.depthTest = false;
    localGridHelper.material.depthWrite = false;
    localGridHelper.material.fog = false;
    localGridHelper.material.transparent = true;
    localGridHelper.renderOrder = 1; // Render grid on top of other objects

    localGridHelper.position.y = 10; // Position more above the ground plane to ensure visibility
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
    renderer = new THREE.WebGLRenderer({ antialias: true, logarithmicDepthBuffer: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // Controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.minDistance = 10;
    controls.maxDistance = 400000;
    controls.maxPolarAngle = Math.PI / 2; // Prevent camera from going under the ground

    // Raycaster and mouse
    raycaster = new THREE.Raycaster();

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(130000, 100000, 80000); // Positioned to give some angle
    scene.add(directionalLight);

    // Event Listeners
    window.addEventListener('resize', onWindowResize, false);

    // Admin Menu
    const adminMenu = document.getElementById('admin-menu');
    const toggleGridCheckbox = document.getElementById('toggle-grid');
    const generateBtn = document.getElementById('generate-terrain');
    const gridCellSizeInput = document.getElementById('grid-cell-size');
    const gridRenderDistanceInput = document.getElementById('grid-render-distance');

    function handleGridSettingsChange() {
        if (!gridCellSizeInput || !gridRenderDistanceInput) return;
        const cellSize = parseFloat(gridCellSizeInput.value);
        const renderDistance = parseFloat(gridRenderDistanceInput.value);
        
        if (!isNaN(cellSize) && cellSize > 0 && !isNaN(renderDistance) && renderDistance > 0) {
            const divisions = Math.max(2, Math.round(renderDistance / cellSize));
            updateLocalGrid(cellSize, divisions);
        }
    }

    window.addEventListener('keydown', (event) => {
        // Use 'Backquote' which is the key for ` and ~ on US keyboards.
        if (event.code === 'Backquote') {
            event.preventDefault();
            adminMenu.classList.toggle('hidden');
        }
    });

    if (gridCellSizeInput) {
        gridCellSizeInput.addEventListener('change', handleGridSettingsChange);
    }
    
    if (gridRenderDistanceInput) {
        gridRenderDistanceInput.addEventListener('change', handleGridSettingsChange);
    }

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
            const renderDistance = parseFloat(document.getElementById('grid-render-distance').value);
            const minZoom = parseFloat(document.getElementById('min-zoom').value);
            const maxZoom = parseFloat(document.getElementById('max-zoom').value);

            if (isNaN(width) || isNaN(depth) || isNaN(cellSize) || isNaN(renderDistance) || width <= 0 || depth <= 0 || cellSize <= 0 || renderDistance <= 0 || isNaN(minZoom) || isNaN(maxZoom) || minZoom <= 0 || maxZoom <= 0 || minZoom >= maxZoom) {
                alert("Please enter valid positive numbers for terrain dimensions, zoom, and grid settings. Min zoom must be a positive number and less than max zoom.");
                return;
            }

            camera.near = Math.max(0.1, minZoom * 0.1);
            camera.updateProjectionMatrix();

            const widthM = width * 1000;
            const depthM = depth * 1000;

            generateTerrain(widthM, depthM);

            const divisions = Math.max(2, Math.round(renderDistance / cellSize));
            updateLocalGrid(cellSize, divisions);

            controls.minDistance = minZoom;
            controls.maxDistance = maxZoom;
            
            const maxDimM = Math.max(widthM, depthM);
            camera.position.set(0, maxDimM / 8, maxDimM / 4);
            controls.target.set(0, 0, 0);
            controls.update();
        });
    }

    // Import/Export functionality
    const exportBtn = document.getElementById('export-terrain');
    const importBtn = document.getElementById('import-terrain');
    const importFileInput = document.getElementById('import-file-input');

    if(exportBtn) {
        exportBtn.addEventListener('click', () => {
            const settings = {
                terrainWidth: document.getElementById('terrain-width').value,
                terrainDepth: document.getElementById('terrain-depth').value,
                minZoom: document.getElementById('min-zoom').value,
                maxZoom: document.getElementById('max-zoom').value,
                gridCellSize: document.getElementById('grid-cell-size').value,
                gridRenderDistance: document.getElementById('grid-render-distance').value,
                showGrid: document.getElementById('toggle-grid').checked,
                cameraPosition: camera.position.toArray(),
                cameraTarget: controls.target.toArray()
            };

            const jsonString = JSON.stringify(settings, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'terrain-settings.json';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        });
    }

    if(importBtn) {
        importBtn.addEventListener('click', () => {
            importFileInput.click();
        });
    }

    if(importFileInput) {
        importFileInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (!file) {
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const settings = JSON.parse(e.target.result);

                    if (typeof settings !== 'object' || settings === null) throw new Error("Invalid JSON format");

                    document.getElementById('terrain-width').value = settings.terrainWidth ?? '256';
                    document.getElementById('terrain-depth').value = settings.terrainDepth ?? '256';
                    document.getElementById('min-zoom').value = settings.minZoom ?? '10';
                    document.getElementById('max-zoom').value = settings.maxZoom ?? '400000';
                    document.getElementById('grid-cell-size').value = settings.gridCellSize ?? '1000';
                    document.getElementById('grid-render-distance').value = settings.gridRenderDistance ?? '20000';
                    document.getElementById('toggle-grid').checked = settings.showGrid ?? true;

                    // Trigger regeneration with new settings
                    generateBtn.click();
                    
                    // Restore camera state if present in the imported file
                    if (settings.cameraPosition && Array.isArray(settings.cameraPosition) && settings.cameraPosition.length === 3) {
                        camera.position.fromArray(settings.cameraPosition);
                    }
                    if (settings.cameraTarget && Array.isArray(settings.cameraTarget) && settings.cameraTarget.length === 3) {
                        controls.target.fromArray(settings.cameraTarget);
                    }
                    controls.update(); // This is crucial for OrbitControls to apply the changes

                } catch (error) {
                    alert(`Error loading or parsing settings file: ${error.message}`);
                }
            };
            reader.readAsText(file);
            
            // Reset input to allow re-selection of the same file
            event.target.value = '';
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

    // Update local grid position based on where the camera is looking
    const showGrid = document.getElementById('toggle-grid').checked;
    if (showGrid && groundPlane && localGridHelper) {
        // Cast a ray from the center of the camera's view
        raycaster.setFromCamera({ x: 0, y: 0 }, camera);
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