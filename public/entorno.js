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
        this.camera.position.set(8, 6, 8);
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
        // Grid helper mejorado
        // const gridHelper = new THREE.GridHelper(20, 20, 0x444444, 0x444444);
        // gridHelper.material.opacity = 0.5;
        // gridHelper.material.transparent = true;
        // this.scene.add(gridHelper);

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
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.screenSpacePanning = false;
        this.controls.minDistance = 3;
        this.controls.maxDistance = 30;
        this.controls.maxPolarAngle = Math.PI / 2;
        this.controls.autoRotate = false;
        this.controls.autoRotateSpeed = 0.5;
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

            const loader = new THREE.GLTFLoader();

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

        // Aplicar escala si se especifica
        if (modelData.size) {
            model.scale.setScalar(parseFloat(modelData.size));
        }

        // Aplicar rotación si se especifica
        if (modelData.rotation) {
            model.rotation.set(
                modelData.rotation.x || 0,
                modelData.rotation.y || 0,
                modelData.rotation.z || 0
            );
        }

        // Agregar identificador único y datos de animación
        model.userData = {
            id: Date.now() + Math.random(),
            createdAt: Date.now(),
            originalData: modelData,
            velocity: new THREE.Vector3(
                (Math.random() - 0.5) * 0.8, // Velocidad X
                (Math.random() - 0.5) * 0.3, // Velocidad Y
                (Math.random() - 0.5) * 0.8  // Velocidad Z
            )
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
        }
        this.showNotification(
            this.isAnimating ? 'Animación reanudada' : 'Animación pausada',
            'info'
        );
    }

    animate() {
        if (!this.isAnimating) return;

        requestAnimationFrame(() => this.animate());

        const delta = this.clock.getDelta();
        const elapsedTime = this.clock.getElapsedTime();

        // Límites del área de movimiento
        const bounds = { x: 10, y: 6, z: 10 };

        // Manejar colisiones entre modelos
        this.handleCollisions();

        // Animar modelos
        this.models.forEach((model) => {
            if (model && model.userData.velocity) {
                // 1. Actualizar posición con la velocidad
                model.position.add(model.userData.velocity.clone().multiplyScalar(delta * 2)); // Aumentamos un poco la velocidad general

                // 2. Rotación suave y continua
                model.rotation.y += 0.005;
                model.rotation.x += Math.sin(elapsedTime + model.userData.id) * 0.002;
                model.rotation.z += Math.cos(elapsedTime + model.userData.id) * 0.002;

                // 3. Rebotar en los límites del escenario
                if (Math.abs(model.position.x) > bounds.x) model.userData.velocity.x *= -1;
                if (model.position.y > bounds.y || model.position.y < 0) model.userData.velocity.y *= -1;
                if (Math.abs(model.position.z) > bounds.z) model.userData.velocity.z *= -1;
            }
        });

        // Actualizar controles
        if (this.controls) {
            this.controls.update();
        }

        // Render
        this.renderer.render(this.scene, this.camera);
    }

    handleCollisions() {
        for (let i = 0; i < this.models.length; i++) {
            for (let j = i + 1; j < this.models.length; j++) {
                const modelA = this.models[i];
                const modelB = this.models[j];

                // Usamos la escala como una aproximación del radio para la colisión
                const radiusA = modelA.scale.x * 0.7;
                const radiusB = modelB.scale.x * 0.7;
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

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    window.modelViewer = new ModelViewer();
});

// Mostrar ayuda en consola
console.log(`
🎮 Controles del ModelViewer:
- ESPACIO: Pausar/reanudar animación
- R: Toggle auto-rotación de cámara
- C: Limpiar todos los modelos
- Mouse: Orbitar cámara
- Scroll: Zoom
`);
