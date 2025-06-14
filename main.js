import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Sky } from 'three/addons/objects/Sky.js';
import { Lensflare, LensflareElement } from 'three/addons/objects/Lensflare.js';

let scene, camera, renderer, controls, localGridHelper, groundPlane;
let raycaster, mouse;
let sky, sun, sunLight;

const effectController = {
    turbidity: 10,
    rayleigh: 3,
    mieCoefficient: 0.005,
    mieDirectionalG: 0.7,
    timeOfDay: 12, // 0-24
    animateSun: true,
    shadowsEnabled: true,
};

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
    groundPlane.receiveShadow = true;
    scene.add(groundPlane);

    // Update camera, controls, fog based on new terrain size
    const maxDim = Math.max(widthM, depthM);
    camera.far = maxDim * 2;
    camera.updateProjectionMatrix();

    // Update shadow camera frustum
    if (sunLight) {
        sunLight.shadow.camera.left = -widthM / 2;
        sunLight.shadow.camera.right = widthM / 2;
        sunLight.shadow.camera.top = depthM / 2;
        sunLight.shadow.camera.bottom = -depthM / 2;
        sunLight.shadow.camera.updateProjectionMatrix();
    }
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

function updateSunAndShadows() {
    if (!sky || !sun || !sunLight) return;

    const time = effectController.timeOfDay;
    // Calculate sun elevation: 0 at 6h and 18h, 90 at 12h.
    const elevation = Math.max(0, Math.sin((time - 6) / 12 * Math.PI)) * 90;
    // Keep azimuth fixed for a simple east-west sun path
    const azimuth = 180;

    const phi = THREE.MathUtils.degToRad(90 - elevation);
    const theta = THREE.MathUtils.degToRad(azimuth);

    sun.setFromSphericalCoords(1, phi, theta);

    sky.material.uniforms['sunPosition'].value.copy(sun);
    sky.material.uniforms['turbidity'].value = effectController.turbidity;
    sky.material.uniforms['rayleigh'].value = effectController.rayleigh;
    sky.material.uniforms['mieCoefficient'].value = effectController.mieCoefficient;
    sky.material.uniforms['mieDirectionalG'].value = effectController.mieDirectionalG;

    sunLight.position.copy(sun).multiplyScalar(400000); // Distant sun
    sunLight.target.position.set(0, 0, 0); // Always look at origin
    sunLight.visible = elevation > 0 && effectController.shadowsEnabled;
}

function init() {
    // Scene
    scene = new THREE.Scene();

    // Camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 100, 400000);
    // camera.position.set(0, 20000, 40000); // Position will be set dynamically

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
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

    // Lighting and Sky
    sun = new THREE.Vector3();

    sky = new Sky();
    sky.scale.setScalar(450000);
    scene.add(sky);
    
    sunLight = new THREE.DirectionalLight(0xffffff, 3);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 100;
    sunLight.shadow.camera.far = 1000000;
    scene.add(sunLight);
    scene.add(sunLight.target);

    // Lensflare
    const textureLoader = new THREE.TextureLoader();
    const textureFlare0 = textureLoader.load('lensflare0.png');
    const textureFlare3 = textureLoader.load('lensflare3.png');

    const lensflare = new Lensflare();
    lensflare.addElement(new LensflareElement(textureFlare0, 512, 0, sunLight.color));
    lensflare.addElement(new LensflareElement(textureFlare3, 60, 0.6));
    lensflare.addElement(new LensflareElement(textureFlare3, 70, 0.7));
    lensflare.addElement(new LensflareElement(textureFlare3, 120, 0.9));
    lensflare.addElement(new LensflareElement(textureFlare3, 70, 1.0));
    sunLight.add(lensflare);

    // Event Listeners
    window.addEventListener('resize', onWindowResize, false);
    window.addEventListener('mousemove', onMouseMove, false);

    // Admin Menu
    const adminMenu = document.getElementById('admin-menu');
    const toggleGridCheckbox = document.getElementById('toggle-grid');
    const generateBtn = document.getElementById('generate-terrain');
    const gridCellSizeInput = document.getElementById('grid-cell-size');
    const timeOfDaySlider = document.getElementById('time-of-day');
    const timeOfDayValue = document.getElementById('time-of-day-value');
    const animateSunCheckbox = document.getElementById('animate-sun');
    const toggleShadowsCheckbox = document.getElementById('toggle-shadows');
    const shadowQualitySelect = document.getElementById('shadow-quality');

    const turbiditySlider = document.getElementById('turbidity');
    const turbidityValue = document.getElementById('turbidity-value');
    const rayleighSlider = document.getElementById('rayleigh');
    const rayleighValue = document.getElementById('rayleigh-value');
    const mieCoefficientSlider = document.getElementById('mie-coefficient');
    const mieCoefficientValue = document.getElementById('mie-coefficient-value');
    const mieDirectionalGSlider = document.getElementById('mie-directional-g');
    const mieDirectionalGValue = document.getElementById('mie-directional-g-value');

    window.addEventListener('keydown', (event) => {
        // Use 'Backquote' which is the key for ` and ~ on US keyboards.
        if (event.code === 'Backquote') {
            event.preventDefault();
            adminMenu.classList.toggle('hidden');
        }
    });

    timeOfDaySlider.addEventListener('input', (event) => {
        const time = parseFloat(event.target.value);
        effectController.timeOfDay = time;
        const hours = Math.floor(time);
        const minutes = Math.floor((time - hours) * 60);
        timeOfDayValue.textContent = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
        updateSunAndShadows();
    });
    
    animateSunCheckbox.addEventListener('change', (event) => {
        effectController.animateSun = event.target.checked;
    });

    toggleShadowsCheckbox.addEventListener('change', (event) => {
        effectController.shadowsEnabled = event.target.checked;
        renderer.shadowMap.enabled = effectController.shadowsEnabled;
        groundPlane.material.needsUpdate = true; // Force redraw to remove/add shadows
        updateSunAndShadows();
    });

    shadowQualitySelect.addEventListener('change', (event) => {
        const quality = parseInt(event.target.value, 10);
        sunLight.shadow.mapSize.width = quality;
        sunLight.shadow.mapSize.height = quality;
        // Re-rendering is handled in the animate loop
    });

    turbiditySlider.addEventListener('input', (event) => {
        const value = parseFloat(event.target.value);
        effectController.turbidity = value;
        turbidityValue.textContent = value.toFixed(1);
        updateSunAndShadows();
    });

    rayleighSlider.addEventListener('input', (event) => {
        const value = parseFloat(event.target.value);
        effectController.rayleigh = value;
        rayleighValue.textContent = value.toFixed(2);
        updateSunAndShadows();
    });

    mieCoefficientSlider.addEventListener('input', (event) => {
        const value = parseFloat(event.target.value);
        effectController.mieCoefficient = value;
        mieCoefficientValue.textContent = value.toFixed(3);
        updateSunAndShadows();
    });

    mieDirectionalGSlider.addEventListener('input', (event) => {
        const value = parseFloat(event.target.value);
        effectController.mieDirectionalG = value;
        mieDirectionalGValue.textContent = value.toFixed(2);
        updateSunAndShadows();
    });

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
                cameraTarget: controls.target.toArray(),
                timeOfDay: effectController.timeOfDay,
                animateSun: effectController.animateSun,
                shadowsEnabled: effectController.shadowsEnabled,
                shadowQuality: document.getElementById('shadow-quality').value,
                turbidity: effectController.turbidity,
                rayleigh: effectController.rayleigh,
                mieCoefficient: effectController.mieCoefficient,
                mieDirectionalG: effectController.mieDirectionalG
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
                    
                    document.getElementById('time-of-day').value = settings.timeOfDay ?? 12;
                    document.getElementById('animate-sun').checked = settings.animateSun ?? true;
                    document.getElementById('toggle-shadows').checked = settings.shadowsEnabled ?? true;
                    document.getElementById('shadow-quality').value = settings.shadowQuality ?? '2048';

                    document.getElementById('turbidity').value = settings.turbidity ?? 10;
                    document.getElementById('rayleigh').value = settings.rayleigh ?? 3;
                    document.getElementById('mie-coefficient').value = settings.mieCoefficient ?? 0.005;
                    document.getElementById('mie-directional-g').value = settings.mieDirectionalG ?? 0.7;

                    // Manually trigger change events to apply settings
                    document.getElementById('time-of-day').dispatchEvent(new Event('input'));
                    document.getElementById('animate-sun').dispatchEvent(new Event('change'));
                    document.getElementById('toggle-shadows').dispatchEvent(new Event('change'));
                    document.getElementById('shadow-quality').dispatchEvent(new Event('change'));

                    document.getElementById('turbidity').dispatchEvent(new Event('input'));
                    document.getElementById('rayleigh').dispatchEvent(new Event('input'));
                    document.getElementById('mie-coefficient').dispatchEvent(new Event('input'));
                    document.getElementById('mie-directional-g').dispatchEvent(new Event('input'));

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
    updateSunAndShadows(); // Set initial sun position

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

    if (effectController.animateSun) {
        // Advance time of day, wrapping around 24 hours
        effectController.timeOfDay = (effectController.timeOfDay + 0.01) % 24;
        
        // Update UI slider and text
        const timeOfDaySlider = document.getElementById('time-of-day');
        const timeOfDayValue = document.getElementById('time-of-day-value');
        timeOfDaySlider.value = effectController.timeOfDay;
        const hours = Math.floor(effectController.timeOfDay);
        const minutes = Math.floor((effectController.timeOfDay - hours) * 60);
        timeOfDayValue.textContent = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
        
        updateSunAndShadows();
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