const socket = io();
let scene, camera, renderer, model, controls, clock;
let isAnimating = true;

function init() {
    // Inicializar escena
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x333333);

    // Configurar cámara
    const container = document.getElementById('modelContainer');
    camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(0, 0, 4); // Posición más cercana y centrada
    camera.lookAt(0, 0, 0);

    // Configurar renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    const containerSize = Math.min(container.clientWidth, container.clientHeight);
    renderer.setSize(containerSize, containerSize);
    container.appendChild(renderer.domElement);

    // Inicializar reloj
    clock = new THREE.Clock();

    // Iluminación
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);

    // Controles
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = true;
    controls.minDistance = 2;
    controls.maxDistance = 8;
    controls.target.set(0, 0, 0);
    controls.update();

    // Cargar modelo
    const loader = new THREE.GLTFLoader();
    loader.load(
        '/assets/modelo.glb',
        function (gltf) {
            model = gltf.scene;
            scene.add(model);

            // Cargar MatCap y aplicar material
            const textureLoader = new THREE.TextureLoader();
            const matcapTexture = textureLoader.load('/assets/matcap_iridescent.png');
            const matcapMaterial = new THREE.MeshMatcapMaterial({ matcap: matcapTexture });

            // Buscar morphTargets y aplicar material
            model.traverse((child) => {
                if (child.isMesh) {
                    child.material = matcapMaterial;

                    if (child.morphTargetDictionary) {
                        console.log('MorphTargets encontrados:', child.morphTargetDictionary);
                        const morphControls = document.getElementById('morphControls');

                        // Mapeo actualizado con los nombres exactos del modelo
                        const customNames = {
                            '🪼 Medusa': 'Chrysaora plocamia',
                            '🪸 Coral': 'Agaricia fragilis',
                            '🐙 Pulpo': 'Octopus briareus',
                            '🌸 Flor': 'Epidendrum secundum',
                            '🌵 Cactus': 'Miconia squamulosa',
                            '🌿 Helecho': 'Bidens rubifolia'
                        };

                        // Para debuggear
                        console.log('Nombres de morphTargets disponibles:', Object.keys(child.morphTargetDictionary));

                        // Crear sliders para cada morphTarget
                        Object.entries(child.morphTargetDictionary).forEach(([name, index]) => {
                            const group = document.createElement('div');
                            group.className = 'slider-group';

                            const label = document.createElement('label');
                            label.textContent = customNames[name] || name;

                            const slider = document.createElement('input');
                            slider.type = 'range';
                            slider.min = '0';
                            slider.max = '1';
                            slider.step = '0.01';
                            slider.value = child.morphTargetInfluences[index] || 0;

                            slider.addEventListener('input', (e) => {
                                const value = parseFloat(e.target.value);
                                child.morphTargetInfluences[index] = value;

                                // Cambiar color del knob según el valor
                                const hue = value * 120; // Cambia de 0 (rojo) a 120 (verde)
                                slider.style.background = `conic-gradient(
                                    hsl(${hue}, 70%, 50%) 0%,
                                    hsl(${hue}, 70%, 50%) ${value * 100}%,
                                    hsl(${hue - 60}, 20%, 20%) ${value * 100}%,
                                    hsl(${hue - 60}, 20%, 20%) 100%
                                )`;
                            });

                            // Establecer color inicial
                            const initialValue = parseFloat(slider.value);
                            const initialHue = initialValue * 120;
                            slider.style.background = `conic-gradient(
                                hsl(${initialHue}, 70%, 50%) 0%,
                                hsl(${initialHue}, 70%, 50%) ${initialValue * 100}%,
                                hsl(${initialHue - 60}, 20%, 20%) ${initialValue * 100}%,
                                hsl(${initialHue - 60}, 20%, 20%) 100%
                            )`;

                            group.appendChild(slider);
                            group.appendChild(label);
                            morphControls.appendChild(group);
                        });
                    }
                }
            });

            // Centrar y ajustar modelo
            const box = new THREE.Box3().setFromObject(model);
            const center = box.getCenter(new THREE.Vector3());
            model.position.sub(center);

            // Escalar a tamaño razonable
            const size = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z);
            const scale = 2 / maxDim;
            model.scale.multiplyScalar(scale);

            // Ocultar mensaje de carga
            const loadingMessage = document.getElementById('loadingMessage');
            if (loadingMessage) loadingMessage.style.display = 'none';
        },
        undefined,
        function (error) {
            console.error('Error cargando el modelo:', error);
        }
    );

    // Event listener para redimensionar
    window.addEventListener('resize', onWindowResize, false);

    // Iniciar animación
    animate();
}

function onWindowResize() {
    const container = document.getElementById('modelContainer');
    const containerSize = Math.min(container.clientWidth, container.clientHeight);
    camera.aspect = 1; // Mantener aspecto cuadrado
    camera.updateProjectionMatrix();
    renderer.setSize(containerSize, containerSize);
}

function animate() {
    if (!isAnimating) return;

    requestAnimationFrame(animate);
    const delta = clock.getDelta();

    if (model) {
        model.rotation.y += 0.005; // Rotación suave
    }

    controls.update();
    renderer.render(scene, camera);
}

// Event Listeners
document.getElementById('modelSize').addEventListener('input', (e) => {
    if (model) {
        const size = parseFloat(e.target.value);
        model.scale.setScalar(size);
    }
});

document.getElementById('modelColor').addEventListener('input', (e) => {
    if (model) {
        const hue = parseInt(e.target.value);
        const color = new THREE.Color(`hsl(${hue}, 70%, 50%)`);
        model.traverse((child) => {
            if (child.isMesh) {
                child.material.color = color;
            }
        });
    }
});

document.getElementById('sendModel').addEventListener('click', () => {
    if (model) {
        let morphTargetsData = {};

        // Capturar el estado actual de los morphTargets
        model.traverse((child) => {
            if (child.isMesh && child.morphTargetDictionary && child.morphTargetInfluences) {
                morphTargetsData[child.name] = {
                    dictionary: { ...child.morphTargetDictionary },
                    influences: Array.from(child.morphTargetInfluences)
                };
                console.log(`Capturando morphTargets para ${child.name}:`, morphTargetsData[child.name]);
            }
        });

        const modelData = {
            color: document.getElementById('modelColor').value,
            size: document.getElementById('modelSize').value,
            modelPath: '/assets/modelo.glb',
            morphTargets: morphTargetsData,
            position: {
                x: model.position.x,
                y: model.position.y,
                z: model.position.z
            },
            rotation: {
                x: model.rotation.x,
                y: model.rotation.y,
                z: model.rotation.z
            }
        };

        console.log('Enviando modelo con morphTargets:', modelData);
        socket.emit('cube-created', modelData);
    }
});

// Función para mostrar feedback visual
function showFeedback(message) {
    const feedback = document.createElement('div');
    feedback.textContent = message;
    feedback.style.position = 'fixed';
    feedback.style.top = '20px';
    feedback.style.right = '20px';
    feedback.style.backgroundColor = '#4CAF50';
    feedback.style.color = 'white';
    feedback.style.padding = '10px';
    feedback.style.borderRadius = '5px';
    feedback.style.zIndex = '1000';
    document.body.appendChild(feedback);

    setTimeout(() => feedback.remove(), 2000);
}

// Función para pausar/reanudar animación
function toggleAnimation() {
    isAnimating = !isAnimating;
    if (isAnimating) {
        animate();
    }
}

// Iniciar aplicación
init();
