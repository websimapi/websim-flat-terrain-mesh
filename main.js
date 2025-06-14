import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let scene, camera, renderer, controls, gridHelper, groundPlane;
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

function createPolarGridHelper(radius, circles, radials, color = 0xffffff) {
    const group = new THREE.Group();
    const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.35, depthTest: false });

    // Circles
    const circleDivisions = 128;
    for (let i = 1; i <= circles; i++) {
        const circleRadius = (radius / circles) * i;
        const points = [];
        for (let j = 0; j <= circleDivisions; j++) {
            const angle = (j / circleDivisions) * Math.PI * 2;
            points.push(new THREE.Vector3(Math.cos(angle) * circleRadius, 0, Math.sin(angle) * circleRadius));
        }
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const circle = new THREE.Line(geometry, material);
        group.add(circle);
    }

    // Radials
    for (let i = 0; i < radials; i++) {
        const angle = (i / radials) * Math.PI * 2;
        const points = [
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius)
        ];
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(geometry, material);
        group.add(line);
    }

    return group;
}

function updateGrid() {
    if (gridHelper) {
        scene.remove(gridHelper);
        gridHelper.traverse(child => {
            if (child.isLine) {
                child.geometry.dispose();
                // material is shared, dispose it only once
                if(child.material) child.material.dispose();
            }
        });
    }

    const radius = parseFloat(document.getElementById('grid-radius').value);
    const spacing = parseFloat(document.getElementById('grid-cell-size').value);

    if (isNaN(radius) || isNaN(spacing) || radius <= 0 || spacing <= 0) {
        return;
    }

    const circles = Math.max(1, Math.floor(radius / spacing));
    const radials = 16; 

    gridHelper = createPolarGridHelper(radius, circles, radials, 0xffffff);
    gridHelper.position.y = 1; // Position slightly above the ground plane to ensure visibility
    gridHelper.visible = false; // Initially hidden
    gridHelper.renderOrder = 1; // Render on top of the ground plane
   
    scene.add(gridHelper);
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
    controls.minDistance = 10;
    controls.maxDistance = 400000;
    controls.maxPolarAngle = Math.PI / 2; // Prevent camera from going under the ground

    // Raycaster
    raycaster = new THREE.Raycaster();

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(130000, 100000, 80000); // Positioned to give some angle
    scene.add(directionalLight);

    // Event Listeners
    window.addEventListener('resize', onWindowResize, false);
    window.addEventListener('mousemove', onMouseMove, false);

    // Admin Menu
    const adminMenu = document.getElementById('admin-menu');
    const toggleGridCheckbox = document.getElementById('toggle-grid');
    const generateBtn = document.getElementById('generate-terrain');
    const gridRadiusInput = document.getElementById('grid-radius');
    const gridCellSizeInput = document.getElementById('grid-cell-size');

    window.addEventListener('keydown', (event) => {
        // Use 'Backquote' which is the key for ` and ~ on US keyboards.
        if (event.code === 'Backquote') {
            event.preventDefault();
            adminMenu.classList.toggle('hidden');
        }
    });

    if (gridRadiusInput) {
        gridRadiusInput.addEventListener('change', updateGrid);
    }
    
    if (gridCellSizeInput) {
        gridCellSizeInput.addEventListener('change', updateGrid);
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
            const minZoom = parseFloat(document.getElementById('min-zoom').value);
            const maxZoom = parseFloat(document.getElementById('max-zoom').value);

            if (isNaN(width) || isNaN(depth) || width <= 0 || depth <= 0 || isNaN(minZoom) || isNaN(maxZoom) || minZoom <= 0 || maxZoom <= 0 || minZoom >= maxZoom) {
                alert("Please enter valid positive numbers for terrain dimensions and zoom. Min zoom must be a positive number and less than max zoom.");
                return;
            }

            camera.near = Math.max(0.1, minZoom * 0.1);
            camera.updateProjectionMatrix();

            const widthM = width * 1000;
            const depthM = depth * 1000;

            generateTerrain(widthM, depthM);
            updateGrid();

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
                gridRadius: document.getElementById('grid-radius').value,
                gridCellSize: document.getElementById('grid-cell-size').value,
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
                    document.getElementById('grid-radius').value = settings.gridRadius ?? '10000';
                    document.getElementById('grid-cell-size').value = settings.gridCellSize ?? '1000';
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

    // Update grid position based on camera view
    const showGrid = document.getElementById('toggle-grid').checked;
    if (showGrid && groundPlane && gridHelper) {
        raycaster.setFromCamera({ x: 0, y: 0 }, camera); // Ray from center of screen
        const intersects = raycaster.intersectObject(groundPlane);
        
        if (intersects.length > 0) {
            gridHelper.visible = true;
            const intersectPoint = intersects[0].point;
            
            gridHelper.position.x = intersectPoint.x;
            gridHelper.position.z = intersectPoint.z;
            gridHelper.position.y = intersectPoint.y + 1;

            // Scale grid based on camera distance from its target point on the ground
            const distance = camera.position.distanceTo(intersectPoint);
            
            // Adjust scale factor to make grid appear larger when further away
            const baseDistance = 20000; // An arbitrary distance for baseline scale
            let scale = distance / baseDistance;
            scale = Math.max(0.1, Math.min(scale, 10.0)); // Clamp scale
            gridHelper.scale.set(scale, scale, scale);

        } else {
            gridHelper.visible = false;
        }
    } else if (gridHelper) {
        gridHelper.visible = false;
    }

    controls.update();
    renderer.render(scene, camera);
}

init();