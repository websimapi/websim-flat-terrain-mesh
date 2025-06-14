import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let scene, camera, renderer, controls, localGridHelper, groundPlane;
let raycaster, mouse;
let sun, sunLight, ambientLight;
let timeOfDay = 12; // 0-24 hours
let sunCycleSpeed = 0;
let autoSunCycle = false;
let sunIntensity = 1;

function createSun() {
    // Create sun geometry and material
    const sunGeometry = new THREE.SphereGeometry(5000, 32, 32);
    const sunMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        emissive: 0xffff00,
        emissiveIntensity: 0.8
    });
    
    sun = new THREE.Mesh(sunGeometry, sunMaterial);
    scene.add(sun);
    
    // Create sun light
    sunLight = new THREE.DirectionalLight(0xffffff, sunIntensity);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    scene.add(sunLight);
    
    updateSunPosition();
}

function updateSunPosition() {
    if (!sun || !sunLight) return;
    
    // Convert time to angle (0-24 hours to 0-360 degrees)
    const angle = (timeOfDay / 24) * Math.PI * 2 - Math.PI / 2; // Start at sunrise
    const sunDistance = 200000;
    
    // Calculate sun position
    const sunX = Math.cos(angle) * sunDistance;
    const sunY = Math.sin(angle) * sunDistance;
    const sunZ = 0;
    
    sun.position.set(sunX, sunY, sunZ);
    sunLight.position.copy(sun.position);
    sunLight.target.position.set(0, 0, 0);
    
    // Update sun appearance based on time
    const dayIntensity = Math.max(0, Math.sin(angle + Math.PI / 2));
    const sunColor = getSunColor(timeOfDay);
    const skyColor = getSkyColor(timeOfDay);
    
    sun.material.color.setHex(sunColor);
    sun.material.emissive.setHex(sunColor);
    sun.material.emissiveIntensity = 0.8 * dayIntensity;
    
    sunLight.intensity = sunIntensity * dayIntensity;
    sunLight.color.setHex(sunColor);
    
    // Update ambient light (check if it exists first)
    if (ambientLight) {
        const ambientIntensity = Math.max(0.1, dayIntensity * 0.4);
        ambientLight.intensity = ambientIntensity;
        ambientLight.color.setHex(skyColor);
    }
    
    // Update sky color (check if scene and fog exist first)
    if (scene) {
        scene.background.setHex(skyColor);
        if (scene.fog) {
            scene.fog.color.setHex(skyColor);
        }
    }
}

function getSunColor(time) {
    // Sunrise/sunset colors
    if (time < 6 || time > 18) {
        return 0x4169e1; // Royal blue for night
    } else if (time < 8 || time > 16) {
        return 0xff6347; // Tomato for sunrise/sunset
    } else {
        return 0xffffff; // White for day
    }
}

function getSkyColor(time) {
    // Sky color based on time
    if (time < 5 || time > 19) {
        return 0x000033; // Dark blue for night
    } else if (time < 7 || time > 17) {
        return 0xff7f50; // Coral for sunrise/sunset
    } else if (time < 9 || time > 15) {
        return 0x87ceeb; // Sky blue for morning/evening
    } else {
        return 0x87ceeb; // Sky blue for day
    }
}

function updateTimeDisplay() {
    const hours = Math.floor(timeOfDay);
    const minutes = Math.floor((timeOfDay - hours) * 60);
    const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    document.getElementById('time-display').textContent = timeString;
}

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

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
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
    mouse = new THREE.Vector2();

    // Lighting
    ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    // Create sun and sun lighting
    createSun();

    // Event Listeners
    window.addEventListener('resize', onWindowResize, false);
    window.addEventListener('mousemove', onMouseMove, false);

    // Admin Menu
    const adminMenu = document.getElementById('admin-menu');
    const toggleGridCheckbox = document.getElementById('toggle-grid');
    const generateBtn = document.getElementById('generate-terrain');
    const gridCellSizeInput = document.getElementById('grid-cell-size');
    
    // Sun controls
    const timeOfDaySlider = document.getElementById('time-of-day');
    const sunCycleSpeedInput = document.getElementById('sun-cycle-speed');
    const autoCycleCheckbox = document.getElementById('auto-cycle');
    const sunIntensitySlider = document.getElementById('sun-intensity');

    window.addEventListener('keydown', (event) => {
        if (event.code === 'Backquote') {
            event.preventDefault();
            adminMenu.classList.toggle('hidden');
        }
    });

    // Sun control event listeners
    if (timeOfDaySlider) {
        timeOfDaySlider.addEventListener('input', (event) => {
            timeOfDay = parseFloat(event.target.value);
            updateSunPosition();
            updateTimeDisplay();
        });
    }

    if (sunCycleSpeedInput) {
        sunCycleSpeedInput.addEventListener('change', (event) => {
            sunCycleSpeed = parseFloat(event.target.value);
        });
    }

    if (autoCycleCheckbox) {
        autoCycleCheckbox.addEventListener('change', (event) => {
            autoSunCycle = event.target.checked;
        });
    }

    if (sunIntensitySlider) {
        sunIntensitySlider.addEventListener('input', (event) => {
            sunIntensity = parseFloat(event.target.value);
            updateSunPosition();
        });
    }

    if (gridCellSizeInput) {
        gridCellSizeInput.addEventListener('change', () => {
            const cellSize = parseFloat(gridCellSizeInput.value);
            if (!isNaN(cellSize) && cellSize > 0) {
                updateLocalGrid(cellSize);
            }
        });
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
            const minZoom = parseFloat(document.getElementById('min-zoom').value);
            const maxZoom = parseFloat(document.getElementById('max-zoom').value);

            if (isNaN(width) || isNaN(depth) || isNaN(cellSize) || width <= 0 || depth <= 0 || cellSize <= 0 || isNaN(minZoom) || isNaN(maxZoom) || minZoom <= 0 || maxZoom <= 0 || minZoom >= maxZoom) {
                alert("Please enter valid positive numbers for terrain dimensions and zoom. Min zoom must be a positive number and less than max zoom.");
                return;
            }

            camera.near = Math.max(0.1, minZoom * 0.1);
            camera.updateProjectionMatrix();

            const widthM = width * 1000;
            const depthM = depth * 1000;

            generateTerrain(widthM, depthM);
            updateLocalGrid(cellSize);

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
    
    // Initialize time display
    updateTimeDisplay();

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

    // Update sun cycle
    if (autoSunCycle && sunCycleSpeed > 0) {
        timeOfDay += sunCycleSpeed * 0.016; // Approximate 60fps
        if (timeOfDay >= 24) timeOfDay = 0;
        
        document.getElementById('time-of-day').value = timeOfDay;
        updateSunPosition();
        updateTimeDisplay();
    }

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