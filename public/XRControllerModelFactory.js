import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Constants as MotionControllerConstants, fetchProfile, MotionController } from '@webxr-input-profiles/motion-controllers';

const DEFAULT_PROFILES_PATH = 'https://cdn.jsdelivr.net/npm/@webxr-input-profiles/assets@1.0/dist/profiles';
const DEFAULT_PROFILE = 'generic-trigger';

class XRControllerModel extends THREE.Object3D {

	constructor() {

		super();

		this.motionController = null;
		this.envMap = null;

	}

	setEnvironmentMap( envMap ) {

		if ( this.envMap == envMap ) {

			return this;

		}

		this.envMap = envMap;
		this.traverse( ( child ) => {

			if ( child.isMesh ) {

				child.material.envMap = this.envMap;
				child.material.needsUpdate = true;

			}

		} );

		return this;

	}

	updateMatrixWorld( force ) {

		super.updateMatrixWorld( force );

		if ( ! this.motionController ) return;

		this.motionController.updateFromGamepad();

		Object.values( this.motionController.components ).forEach( ( component ) => {

			Object.values( component.visualResponses ).forEach( ( visualResponse ) => {

				const { valueNode, minNode, maxNode, value, valueNodeProperty } = visualResponse;

				if ( ! valueNode ) return;

				if ( valueNodeProperty === MotionControllerConstants.VisualResponseProperty.VISIBILITY ) {

					valueNode.visible = value;

				} else if ( valueNodeProperty === MotionControllerConstants.VisualResponseProperty.TRANSFORM ) {

					valueNode.quaternion.slerpQuaternions(
						minNode.quaternion,
						maxNode.quaternion,
						value
					);

					valueNode.position.lerpVectors(
						minNode.position,
						maxNode.position,
						value
					);

				}

			} );

		} );

	}

}

function findNodes( motionController, scene ) {

	Object.values( motionController.components ).forEach( ( component ) => {

		const { type, touchPointNodeName, visualResponses } = component;

		if ( type === MotionControllerConstants.ComponentType.TOUCHPAD ) {

			component.touchPointNode = scene.getObjectByName( touchPointNodeName );
			if ( component.touchPointNode ) {

				const sphereGeometry = new THREE.SphereGeometry( 0.001 );
				const material = new THREE.MeshBasicMaterial( { color: 0x0000FF } );
				const sphere = new THREE.Mesh( sphereGeometry, material );
				component.touchPointNode.add( sphere );

			} else {

				console.warn( `Could not find touch dot, ${component.touchPointNodeName}, in touchpad component ${component.id}` );

			}

		}

		Object.values( visualResponses ).forEach( ( visualResponse ) => {

			const { valueNodeName, minNodeName, maxNodeName, valueNodeProperty } = visualResponse;

			if ( valueNodeProperty === MotionControllerConstants.VisualResponseProperty.TRANSFORM ) {

				visualResponse.minNode = scene.getObjectByName( minNodeName );
				visualResponse.maxNode = scene.getObjectByName( maxNodeName );

				if ( ! visualResponse.minNode ) {

					console.warn( `Could not find ${minNodeName} in the model` );
					return;

				}

				if ( ! visualResponse.maxNode ) {

					console.warn( `Could not find ${maxNodeName} in the model` );
					return;

				}

			}

			visualResponse.valueNode = scene.getObjectByName( valueNodeName );
			if ( ! visualResponse.valueNode ) {

				console.warn( `Could not find ${valueNodeName} in the model` );

			}

		} );

	} );

}

function addAssetSceneToControllerModel( controllerModel, scene ) {

	findNodes( controllerModel.motionController, scene );

	if ( controllerModel.envMap ) {

		scene.traverse( ( child ) => {

			if ( child.isMesh ) {

				child.material.envMap = controllerModel.envMap;
				child.material.needsUpdate = true;

			}

		} );

	}

	controllerModel.add( scene );

}

class XRControllerModelFactory {

	constructor( gltfLoader = null, onLoad = null ) {

		this.gltfLoader = gltfLoader;
		this.path = DEFAULT_PROFILES_PATH;
		this._assetCache = {};

		this.onLoad = onLoad;

		if ( ! this.gltfLoader ) {

			this.gltfLoader = new GLTFLoader();

		}

	}

	setPath( path ) {

		this.path = path;

		return this;

	}

	createControllerModel( controller ) {

		const controllerModel = new XRControllerModel();
		let scene = null;

		controller.addEventListener( 'connected', ( event ) => {

			const xrInputSource = event.data;

			if ( xrInputSource.targetRayMode !== 'tracked-pointer' || ! xrInputSource.gamepad || xrInputSource.hand ) return;

			fetchProfile( xrInputSource, this.path, DEFAULT_PROFILE ).then( ( { profile, assetPath } ) => {

				controllerModel.motionController = new MotionController(
					xrInputSource,
					profile,
					assetPath
				);

				const cachedAsset = this._assetCache[ controllerModel.motionController.assetUrl ];
				if ( cachedAsset ) {

					scene = cachedAsset.scene.clone();

					addAssetSceneToControllerModel( controllerModel, scene );

					if ( this.onLoad ) this.onLoad( scene );

				} else {

					if ( ! this.gltfLoader ) {

						throw new Error( 'GLTFLoader not set.' );

					}

					this.gltfLoader.setPath( '' );
					this.gltfLoader.load( controllerModel.motionController.assetUrl, ( asset ) => {

						this._assetCache[ controllerModel.motionController.assetUrl ] = asset;

						scene = asset.scene.clone();

						addAssetSceneToControllerModel( controllerModel, scene );

						if ( this.onLoad ) this.onLoad( scene );

					},
					null,
					() => {

						throw new Error( `Asset ${controllerModel.motionController.assetUrl} missing or malformed.` );

					} );

				}

			} ).catch( ( err ) => {

				console.warn( err );

			} );

		} );

		controller.addEventListener( 'disconnected', () => {

			controllerModel.motionController = null;
			controllerModel.remove( scene );
			scene = null;

		} );

		return controllerModel;

	}

}

export { XRControllerModelFactory };
