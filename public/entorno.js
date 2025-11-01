import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VRButton } from './VRButton.js';
import { XRControllerModelFactory } from './XRControllerModelFactory.js';


class ModelViewer {
    constructor() {
        this.socket = io();
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.clock = new THREE.Clock();
        this.models = [];
        this.modelCache = new Map(); // Cache para modelos cargados
        this.matcapMaterial = null; // Material base para los modelos
        this.isAnimating = true;
        this.maxModels = 20; // Límite de modelos en escena
        this.vrExitButton = null; // Botón para salir de VR

        this.controller1 = null;
        this.controller2 = null;
        this.controllerGrip1 = null;
        this.controllerGrip2 = null;
        this.raycaster = null;
        this.intersected = []; // To store intersected objects by controllers
        this.tempMatrix = new THREE.Matrix4();

        // Bind 'this' for event handlers
        this.onSelectStart = this.onSelectStart.bind(this);
        this.onSelectEnd = this.onSelectEnd.bind(this);

        this.init();
        this.setupSocketListeners();
        this.setupEventListeners();
    }

    init() {
        try {
            // Cargar y configurar el material MatCap una vez
            const textureLoader = new THREE.TextureLoader();
            const matcapTexture = textureLoader.load('/assets/matcap_iridescent.png');
            this.matcapMaterial = new THREE.MeshMatcapMaterial({ matcap: matcapTexture });

            this.createScene();
            this.createCamera();
            this.createRenderer();
            this.setupXR();
            this.createLighting();
            this.createHelpers();
            this.createControls();
            this.animate();

            console.log('ModelViewer inicializado correctamente');
        } catch (error) {
            console.error('Error inicializando ModelViewer:', error);
            this.showError('Error inicializando el visor 3D');
        }
    }

    createScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x2a2a2a);

        // Fog para mejor atmósfera
        this.scene.fog = new THREE.Fog(0x2a2a2a, 10, 50);
    }

    createCamera() {
        const aspect = window.innerWidth / window.innerHeight;
        this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);
        this.camera.position.set(15, 12, 15);
        this.camera.lookAt(0, 0, 0);
    }

    createRenderer() {
        const container = document.getElementById('environment');
        if (!container) {
            throw new Error('Contenedor #environment no encontrado');
        }

        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
            powerPreference: "high-performance"
        });

        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.outputEncoding = THREE.sRGBEncoding;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.2;
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        container.appendChild(this.renderer.domElement);
    }

    createLighting() {
        // Luz ambiental suave
        const hemisphereLight = new THREE.HemisphereLight(0x87ceeb, 0x544332, 0.6);
        this.scene.add(hemisphereLight);

        // Luz direccional principal con sombras
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 10, 5);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 50;
        directionalLight.shadow.camera.left = -10;
        directionalLight.shadow.camera.right = 10;
        directionalLight.shadow.camera.top = 10;
        directionalLight.shadow.camera.bottom = -10;
        this.scene.add(directionalLight);

        // Luz de relleno
        const fillLight = new THREE.DirectionalLight(0x4a90e2, 0.3);
        fillLight.position.set(-5, 3, -5);
        this.scene.add(fillLight);
    }

    createHelpers() {
        // Plano invisible para recibir sombras
        const planeGeometry = new THREE.PlaneGeometry(50, 50);
        const planeMaterial = new THREE.ShadowMaterial({ opacity: 0.3 });
        const plane = new THREE.Mesh(planeGeometry, planeMaterial);
        plane.rotation.x = -Math.PI / 2;
        plane.position.y = -0.01;
        plane.receiveShadow = true;
        this.scene.add(plane);
    }

    createControls() {
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = false; // Desactivar para un control preciso y sin inercia
        this.controls.screenSpacePanning = false;
        this.controls.minDistance = 3;
        this.controls.maxDistance = 30;
        this.controls.maxPolarAngle = Math.PI / 2;
        this.controls.autoRotate = false;
        this.controls.autoRotateSpeed = 0.5;
    }

    setupXR() {
        this.renderer.xr.enabled = true;
        document.body.appendChild(VRButton.createButton(this.renderer));

        // controllers
        this.controller1 = this.renderer.xr.getController(0);
        this.controller1.addEventListener('selectstart', this.onSelectStart);
        this.controller1.addEventListener('selectend', this.onSelectEnd);
        this.scene.add(this.controller1);

        this.controller2 = this.renderer.xr.getController(1);
        this.controller2.addEventListener('selectstart', this.onSelectStart);
        this.controller2.addEventListener('selectend', this.onSelectEnd);
        this.scene.add(this.controller2);

        const controllerModelFactory = new XRControllerModelFactory();

        this.controllerGrip1 = this.renderer.xr.getControllerGrip(0);
        this.controllerGrip1.add(controllerModelFactory.createControllerModel(this.controllerGrip1));
        this.scene.add(this.controllerGrip1);

        this.controllerGrip2 = this.renderer.xr.getControllerGrip(1);
        this.controllerGrip2.add(controllerModelFactory.createControllerModel(this.controllerGrip2));
        this.scene.add(this.controllerGrip2);

        // Pointer lines
        const geometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -1)]);
        const line = new THREE.Line(geometry);
        line.name = 'line';
        line.scale.z = 5;

        this.controller1.add(line.clone());
        this.controller2.add(line.clone());

        this.raycaster = new THREE.Raycaster();
    }

    onSelectStart(event) {
        const controller = event.target;
        const intersections = this.getIntersections(controller);

        if (intersections.length > 0) {
            const intersection = intersections[0];
            let object = intersection.object;

            // Check if the intersected object is the exit button
            if (this.vrExitButton && this.vrExitButton.children.includes(object)) {
                 const session = this.renderer.xr.getSession();
                 if (session) session.end();
                 return; // Stop further processing
            }


            // It's a creature, find the parent group
            let parent = object.parent;
            while (parent && !this.models.includes(parent)) {
                parent = parent.parent;
            }
            if (parent && parent.userData) {
                parent.userData.isTickled = true;
                parent.userData.tickleTime = 1.0; // 1 second
            }
        }
    }

    onSelectEnd(event) {
        // We can add visual feedback here if needed, e.g., change controller line color
    }

    getIntersections(controller) {
        this.tempMatrix.identity().extractRotation(controller.matrixWorld);
        this.raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
        this.raycaster.ray.direction.set(0, 0, -1).applyMatrix4(this.tempMatrix);
        
        // Intersect with models and the exit button
        const objectsToIntersect = [...this.models];
        if (this.vrExitButton) {
            objectsToIntersect.push(this.vrExitButton);
        }

        return this.raycaster.intersectObjects(objectsToIntersect, true);
    }


    setupSocketListeners() {
        this.socket.on('new-cube', (modelData) => {
            this.handleNewModel(modelData);
        });

        this.socket.on('connect', () => {
            console.log('Conectado al servidor');
            this.showNotification('Conectado al servidor', 'success');
        });

        this.socket.on('disconnect', () => {
            console.log('Desconectado del servidor');
            this.showNotification('Desconectado del servidor', 'warning');
        });

        this.socket.on('error', (error) => {
            console.error('Error de socket:', error);
            this.showError('Error de conexión');
        });
    }

    setupEventListeners() {
        // Redimensionado de ventana
        window.addEventListener('resize', () => this.onWindowResize(), false);

        // Controles de teclado
        document.addEventListener('keydown', (event) => {
            switch (event.code) {
                case 'Space':
                    event.preventDefault();
                    this.toggleAnimation();
                    break;
                case 'KeyR':
                    this.controls.autoRotate = !this.controls.autoRotate;
                    break;
                case 'KeyC':
                    this.clearAllModels();
                    break;
            }
        });

        // Detectar visibilidad de la página
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.isAnimating = false;
                this.renderer.setAnimationLoop(null);
            } else {
                this.isAnimating = true;
                this.animate();
            }
        });
    }

    async handleNewModel(modelData) {
        try {
            console.log('Recibiendo modelo:', modelData);

            // Verificar límite de modelos
            if (this.models.length >= this.maxModels) {
                this.removeOldestModel();
            }

            const model = await this.loadModel(modelData);
            if (model) {
                this.addModelToScene(model, modelData);
                this.showNotification(`Modelo ${this.models.length} agregado`, 'success');
            }
        } catch (error) {
            console.error('Error manejando nuevo modelo:', error);
            this.showError('Error cargando modelo');
        }
    }

    loadModel(modelData) {
        return new Promise((resolve, reject) => {
            // Verificar cache
            if (this.modelCache.has(modelData.modelPath)) {
                const cachedModel = this.modelCache.get(modelData.modelPath);
                resolve(this.prepareModel(cachedModel.clone(true), modelData));
                return;
            }

            const loader = new GLTFLoader();

            // Timeout para evitar esperas infinitas
            const timeoutId = setTimeout(() => {
                reject(new Error('Timeout cargando modelo'));
            }, 10000);

            loader.load(
                modelData.modelPath,
                (gltf) => {
                    clearTimeout(timeoutId);

                    // Guardar en cache
                    this.modelCache.set(modelData.modelPath, gltf.scene);

                    const model = this.prepareModel(gltf.scene.clone(true), modelData);
                    resolve(model);
                },
                (progress) => {
                    const percent = (progress.loaded / progress.total * 100);
                    console.log(`Cargando modelo: ${percent.toFixed(1)}%`);
                },
                (error) => {
                    clearTimeout(timeoutId);
                    reject(error);
                }
            );
        });
    }

    prepareModel(model, modelData) {
        // Aplicar morphTargets
        if (modelData.morphTargets) {
            this.applyMorphTargets(model, modelData.morphTargets);
        }

        // Clonar el material base para cada modelo para permitir colores únicos
        const newMaterial = this.matcapMaterial.clone();

        // Convertir el HUE recibido a un color y aplicarlo como tinte
        if (modelData.color) {
            const hue = parseInt(modelData.color) / 360; // Normalizar el HUE a un rango de 0-1
            const saturation = 0.7;
            const lightness = 0.5;
            newMaterial.color.setHSL(hue, saturation, lightness);
        }

        // Aplicar materiales y propiedades
        model.traverse((child) => {
            if (child.isMesh) {
                child.material = newMaterial;

                // Configurar sombras
                child.castShadow = true;
                child.receiveShadow = true;

                // Optimización: frustum culling
                child.frustumCulled = true;
            }
        });

        return model;
    }

    applyMorphTargets(model, morphTargets) {
        model.traverse((child) => {
            if (child.isMesh && child.morphTargetDictionary && morphTargets[child.name]) {
                const morphData = morphTargets[child.name];

                if (child.morphTargetInfluences && morphData.influences) {
                    morphData.influences.forEach((influence, index) => {
                        if (index < child.morphTargetInfluences.length) {
                            child.morphTargetInfluences[index] = influence;
                        }
                    });

                    console.log(`MorphTargets aplicados a ${child.name}`);
                }
            }
        });
    }

    addModelToScene(model, modelData) {
        // Posicionamiento inteligente para evitar solapamientos
        const position = this.findOptimalPosition();
        model.position.copy(position);

        // Aplicar rotación si se especifica
        if (modelData.rotation) {
            model.rotation.set(
                modelData.rotation.x || 0,
                modelData.rotation.y || 0,
                modelData.rotation.z || 0
            );
        }

        const size = parseFloat(modelData.size || 1.0);
        const speedFactor = 1 / Math.sqrt(size);

        // Determinar la "personalidad" de la forma según el morph dominante
        let dominantShape = 'default';
        let maxInfluence = 0.1; // Umbral mínimo para considerar una forma como dominante

        if (modelData.morphTargets) {
            const meshName = Object.keys(modelData.morphTargets)[0];
            if (meshName) {
                const morphs = modelData.morphTargets[meshName];
                if (morphs && morphs.influences && morphs.dictionary) {
                    morphs.influences.forEach((influence, index) => {
                        if (influence > maxInfluence) {
                            maxInfluence = influence;
                            dominantShape = Object.keys(morphs.dictionary).find(key => morphs.dictionary[key] === index) || 'default';
                        }
                    });
                }
            }
        }

        // Agregar identificador único y datos de animación
        const maxLifespan = 180; // 3 minutos
        model.userData = {
            id: Date.now() + Math.random(),
            createdAt: Date.now(),
            originalData: modelData,
            originalSize: size,
            dominantShape: dominantShape,
            lifespan: maxLifespan,
            maxLifespan: maxLifespan,
            velocity: new THREE.Vector3(
                (Math.random() - 0.5) * 0.8, // Velocidad X
                (Math.random() - 0.5) * 0.3, // Velocidad Y
                (Math.random() - 0.5) * 0.8  // Velocidad Z
            ).multiplyScalar(speedFactor),
            acceleration: new THREE.Vector3(),
            isTickled: false,
            tickleTime: 0
        };

        this.scene.add(model);
        this.models.push(model);
    }

    findOptimalPosition() {
        const maxAttempts = 10;
        const minDistance = 3;

        for (let i = 0; i < maxAttempts; i++) {
            const position = new THREE.Vector3(
                (Math.random() - 0.5) * 16,
                Math.random() * 2,
                (Math.random() - 0.5) * 16
            );

            let tooClose = false;
            for (const model of this.models) {
                if (model.position.distanceTo(position) < minDistance) {
                    tooClose = true;
                    break;
                }
            }

            if (!tooClose) {
                return position;
            }
        }

        // Si no encuentra posición óptima, usar una aleatoria
        return new THREE.Vector3(
            (Math.random() - 0.5) * 20,
            Math.random() * 3,
            (Math.random() - 0.5) * 20
        );
    }

    removeOldestModel() {
        if (this.models.length > 0) {
            const oldestModel = this.models.shift();
            this.scene.remove(oldestModel);

            // Limpiar geometrías y materiales
            this.disposeModel(oldestModel);

            console.log('Modelo más antiguo eliminado');
        }
    }

    disposeModel(model) {
        model.traverse((child) => {
            if (child.geometry) {
                child.geometry.dispose();
            }
            if (child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach(material => material.dispose());
                } else {
                    child.material.dispose();
                }
            }
        });
    }

    clearAllModels() {
        this.models.forEach(model => {
            this.scene.remove(model);
            this.disposeModel(model);
        });
        this.models.length = 0;
        this.showNotification('Todos los modelos eliminados', 'info');
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    toggleAnimation() {
        this.isAnimating = !this.isAnimating;
        if (this.isAnimating) {
            this.animate();
        } else {
            this.renderer.setAnimationLoop(null);
        }
        this.showNotification(
            this.isAnimating ? 'Animación reanudada' : 'Animación pausada',
            'info'
        );
    }

    animate() {
        this.renderer.setAnimationLoop(() => {
            if (!this.isAnimating) return;

            const delta = this.clock.getDelta();
            const elapsedTime = this.clock.getElapsedTime();

            // VR Exit Button Logic
            if (this.renderer.xr.isPresenting) {
                if (!this.vrExitButton) {
                    const buttonGeometry = new THREE.PlaneGeometry(0.6, 0.15);
                    const canvas = document.createElement('canvas');
                    const canvasWidth = 512;
                    const canvasHeight = 128;
                    canvas.width = canvasWidth;
                    canvas.height = canvasHeight;
                    const context = canvas.getContext('2d');
                    context.fillStyle = 'rgba(0, 0, 0, 0.7)';
                    context.fillRect(0, 0, canvasWidth, canvasHeight);
                    context.font = 'bold 50px sans-serif';
                    context.fillStyle = 'white';
                    context.textAlign = 'center';
                    context.textBaseline = 'middle';
                    context.fillText('Salir de VR', canvasWidth / 2, canvasHeight / 2);
                    const buttonTexture = new THREE.CanvasTexture(canvas);
                    const buttonMaterial = new THREE.MeshBasicMaterial({ map: buttonTexture, transparent: true });
                    this.vrExitButton = new THREE.Group();
                    this.vrExitButton.add(new THREE.Mesh(buttonGeometry, buttonMaterial));
                    this.vrExitButton.position.set(0, -0.5, -2);
                    this.camera.add(this.vrExitButton);
                }
            } else {
                if (this.vrExitButton) {
                    this.camera.remove(this.vrExitButton);
                    this.vrExitButton = null;
                }
            }


            // Límites del área de movimiento
            const bounds = { x: 10, y: 6, z: 10 };

            // --- Lógica de Comportamiento y Animación ---

            // Parámetros del comportamiento de agrupación (flocking)
            const perceptionRadius = 5; // Radio de percepción para encontrar vecinos
            const separationDistance = 1.5; // Distancia mínima para empezar a separar
            const colorAffinityThreshold = 45; // Umbral de HUE (de 360) para considerar colores "similares"
            const cohesionForce = 0.0005;
            const separationForce = 0.005;
            const maxSpeed = 1.5;
            const minSpeed = 0.2;

            // 1. Calcular aceleraciones basadas en el comportamiento
            this.models.forEach(model => {
                // Tickle animation
                if (model.userData.isTickled) {
                    model.position.x += (Math.random() - 0.5) * 0.1;
                    model.position.y += (Math.random() - 0.5) * 0.1;
                    model.userData.tickleTime -= delta;
                    if (model.userData.tickleTime <= 0) {
                        model.userData.isTickled = false;
                    }
                }


                model.userData.acceleration.set(0, 0, 0);
                const centerOfMass = new THREE.Vector3();
                let neighborCount = 0;
                const separationVector = new THREE.Vector3();

                this.models.forEach(other => {
                    if (model === other) return;

                    const distance = model.position.distanceTo(other.position);
                    if (distance < perceptionRadius) {
                        // Regla de Cohesión (Atracción por color)
                        const myHue = parseInt(model.userData.originalData.color);
                        const otherHue = parseInt(other.userData.originalData.color);
                        const hueDifference = Math.min(Math.abs(myHue - otherHue), 360 - Math.abs(myHue - otherHue));

                        if (hueDifference < colorAffinityThreshold) {
                            centerOfMass.add(other.position);
                            neighborCount++;
                        }

                        // Regla de Separación (Evitar colisiones)
                        if (distance < separationDistance) {
                            const diff = new THREE.Vector3().subVectors(model.position, other.position);
                            diff.divideScalar(distance * distance); // La fuerza es inversamente proporcional al cuadrado de la distancia
                            separationVector.add(diff);
                        }
                    }
                });

                if (neighborCount > 0) {
                    centerOfMass.divideScalar(neighborCount);
                    const cohesionVector = new THREE.Vector3().subVectors(centerOfMass, model.position);
                    cohesionVector.normalize().multiplyScalar(cohesionForce);
                    model.userData.acceleration.add(cohesionVector);
                }

                separationVector.multiplyScalar(separationForce);
                model.userData.acceleration.add(separationVector);

                // Regla de Contención para mantener a las criaturas dentro del área
                const containmentForce = 0.01;
                if (model.position.x > bounds.x) model.userData.acceleration.x -= containmentForce;
                if (model.position.x < -bounds.x) model.userData.acceleration.x += containmentForce;
                if (model.position.y > bounds.y) model.userData.acceleration.y -= containmentForce;
                if (model.position.y < 0.5) model.userData.acceleration.y += containmentForce * 2; // Empujar más fuerte desde el "suelo"
                if (model.position.z > bounds.z) model.userData.acceleration.z -= containmentForce;
                if (model.position.z < -bounds.z) model.userData.acceleration.z += containmentForce;

                // Regla de "Curiosidad" (Wander) para que no se queden quietas
                const wanderStrength = 0.0002;
                const wanderForce = new THREE.Vector3(
                    (Math.random() - 0.5) * wanderStrength,
                    (Math.random() - 0.5) * wanderStrength,
                    (Math.random() - 0.5) * wanderStrength
                );
                model.userData.acceleration.add(wanderForce);
            });

            // 2. Aplicar físicas, ciclo de vida y rotaciones
            const modelsToRemove = [];
            this.models.forEach(model => {
                if (!model.userData.velocity) return;

                // -- Ciclo de Vida --
                model.userData.lifespan -= delta;
                if (model.userData.lifespan <= 0) {
                    modelsToRemove.push(model);
                }

                // Escalar según el tiempo de vida restante
                const lifeRatio = Math.max(0, model.userData.lifespan / model.userData.maxLifespan);
                const scale = model.userData.originalSize * lifeRatio;
                model.scale.setScalar(scale);


                // -- Físicas --
                // Actualizar velocidad con la aceleración
                model.userData.velocity.add(model.userData.acceleration);
                model.userData.velocity.clampLength(minSpeed, maxSpeed); // Limitar velocidad

                // Actualizar posición
                model.position.add(model.userData.velocity.clone().multiplyScalar(delta));

                // -- Rotación --
                const shape = model.userData.dominantShape || 'default';
                switch (shape) {
                    case '🪼 Medusa':
                        model.rotation.y += delta * 0.1;
                        model.rotation.x = Math.sin(elapsedTime * 0.5 + model.userData.id) * 0.2;
                        model.rotation.z = Math.cos(elapsedTime * 0.5 + model.userData.id) * 0.2;
                        break;
                    case '🪸 Coral':
                        model.rotation.y += delta * 0.05;
                        break;
                    case '🐙 Pulpo':
                        model.rotation.y += Math.sin(elapsedTime * 0.8 + model.userData.id) * 0.005;
                        model.rotation.x += Math.cos(elapsedTime * 0.6 + model.userData.id) * 0.008;
                        model.rotation.z += Math.sin(elapsedTime * 0.7 + model.userData.id) * 0.006;
                        break;
                    case '🌸 Flor':
                        model.rotation.y += delta * 0.25;
                        break;
                    case '🌵 Cactus':
                        model.rotation.y += delta * 0.1;
                        model.rotation.x = Math.sin(elapsedTime * 0.2 + model.userData.id) * 0.05;
                        break;
                    case '🌿 Helecho':
                        model.rotation.z = Math.sin(elapsedTime * 0.7 + model.userData.id) * 0.3;
                        break;
                    default:
                        model.rotation.y += 0.005;
                        model.rotation.x += Math.sin(elapsedTime + model.userData.id) * 0.002;
                        model.rotation.z += Math.cos(elapsedTime + model.userData.id) * 0.002;
                        break;
                }
            });

            // 3. Eliminar modelos "muertos"
            if (modelsToRemove.length > 0) {
                modelsToRemove.forEach(model => {
                    this.scene.remove(model);
                    this.disposeModel(model);
                    const index = this.models.indexOf(model);
                    if (index > -1) {
                        this.models.splice(index, 1);
                    }
                });
            }

            // La colisión física se maneja después de la actualización de posición
            this.handleCollisions();

            // Actualizar controles
            if (this.controls) {
                this.controls.update();
            }

            // Render
            this.renderer.render(this.scene, this.camera);
        });
    }

    handleCollisions() {
        for (let i = 0; i < this.models.length; i++) {
            for (let j = i + 1; j < this.models.length; j++) {
                const modelA = this.models[i];
                const modelB = this.models[j];

                // Usamos la escala como una aproximación del radio para la colisión
                const radiusA = modelA.scale.x * 0.9; // Aumentado de 0.7 para una colisión más "sólida"
                const radiusB = modelB.scale.x * 0.9; // Aumentado de 0.7 para una colisión más "sólida"
                const distance = modelA.position.distanceTo(modelB.position);

                if (distance < radiusA + radiusB) {
                    // --- Colisión detectada ---

                    // 1. Calcular normal y vector tangente
                    const collisionNormal = modelB.position.clone().sub(modelA.position).normalize();

                    // 2. Separar los modelos para evitar que se atasquen
                    const overlap = (radiusA + radiusB) - distance;
                    modelA.position.add(collisionNormal.clone().multiplyScalar(-overlap / 2));
                    modelB.position.add(collisionNormal.clone().multiplyScalar(overlap / 2));

                    // 3. Calcular la respuesta de la colisión (rebote elástico)
                    const vA = modelA.userData.velocity;
                    const vB = modelB.userData.velocity;

                    // Proyección de la velocidad de A sobre la normal
                    const vA_proj = collisionNormal.clone().multiplyScalar(vA.dot(collisionNormal));
                    // Proyección de la velocidad de B sobre la normal
                    const vB_proj = collisionNormal.clone().multiplyScalar(vB.dot(collisionNormal));

                    // Si las proyecciones se alejan, no hacer nada (ya se están separando)
                    const relativeVelocity = vA.clone().sub(vB);
                    const speed = relativeVelocity.dot(collisionNormal);
                    if (speed < 0) {
                        continue;
                    }

                    // Intercambiar las proyecciones de velocidad para simular el rebote
                    const new_vA = vA.clone().sub(vA_proj).add(vB_proj);
                    const new_vB = vB.clone().sub(vB_proj).add(vA_proj);

                    // Aplicar las nuevas velocidades
                    modelA.userData.velocity.copy(new_vA);
                    modelB.userData.velocity.copy(new_vB);

                    // "Alimentación": al chocar, resetean su ciclo de vida
                    if (modelA.userData.lifespan) {
                        modelA.userData.lifespan = modelA.userData.maxLifespan;
                    }
                    if (modelB.userData.lifespan) {
                        modelB.userData.lifespan = modelB.userData.maxLifespan;
                    }
                }
            }
        }
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;

        const colors = {
            success: '#4CAF50',
            error: '#f44336',
            warning: '#ff9800',
            info: '#2196F3'
        };

        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            backgroundColor: colors[type] || colors.info,
            color: 'white',
            padding: '12px 16px',
            borderRadius: '4px',
            zIndex: '1000',
            fontSize: '14px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            transform: 'translateX(100%)',
            transition: 'transform 0.3s ease'
        });

        document.body.appendChild(notification);

        // Animación de entrada
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);

        // Remover después de 3 segundos
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    // Método público para obtener estadísticas
    getStats() {
        return {
            modelsCount: this.models.length,
            cacheSize: this.modelCache.size,
            isAnimating: this.isAnimating,
            renderInfo: this.renderer.info
        };
    }
}

new ModelViewer();

// The old DOMContentLoaded listener is removed as modules are deferred by default.

// Keep console help
console.log(`
🎮 Controles del ModelViewer:
- ESPACIO: Pausar/reanudar animación
- R: Toggle auto-rotación de cámara
- C: Limpiar todos los modelos
- Mouse: Orbitar cámara
- Scroll: Zoom
`);