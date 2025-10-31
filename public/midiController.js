/**
 * Controlador MIDI para interfaces de hardware
 * Traduce mensajes MIDI a acciones en la aplicación
 * Permite control físico de los parámetros del modelo 3D
 */
export class MIDIController {
    constructor(uiController, audioSystem) {
        this.uiController = uiController;
        this.audioSystem = audioSystem;
        this.midiAccess = null;
    }

    /**
     * Inicializa el acceso MIDI
     * Requiere permisos del navegador para acceder a dispositivos MIDI
     */
    async init() {
        // Verificar soporte MIDI en el navegador
        if (!navigator.requestMIDIAccess) {
            console.warn('MIDI no soportado en este navegador');
            return;
        }

        try {
            // Solicitar acceso a dispositivos MIDI
            this.midiAccess = await navigator.requestMIDIAccess();
            this.setupMIDIInputs();
            console.log('MIDI inicializado correctamente');
        } catch (error) {
            console.warn('No se pudo acceder a MIDI:', error);
        }
    }

    /**
     * Configura los dispositivos de entrada MIDI
     * Asigna event listeners a todos los dispositivos conectados
     */
    setupMIDIInputs() {
        for (let input of this.midiAccess.inputs.values()) {
            input.onmidimessage = (event) => this.handleMIDIMessage(event);
        }
    }

    /**
     * Maneja mensajes MIDI entrantes
     * Decodifica mensajes y los enruta a las funciones apropiadas
     * @param {MIDIMessageEvent} event - Evento MIDI del dispositivo
     */
    handleMIDIMessage(event) {
        const [status, cc, value] = event.data;
        console.log('MIDI recibido:', { status: status.toString(16), cc, value });

        // Mensajes de Control Change (knobs, sliders, etc.)
        if ((status & 0xF0) === 0xB0) {
            this.handleControlChange(cc, value);
        }

        // Mensajes de Note On (botones, pads, etc.)
        if ((status & 0xF0) === 0x90 && value > 0) {
            this.handleNoteOn(cc, value); // cc es el número de nota en este contexto
        }
    }

    /**
     * Maneja mensajes de Control Change
     * Mapea controles físicos a parámetros del modelo
     * @param {number} cc - Número de control MIDI
     * @param {number} value - Valor del control (0-127)
     */
    handleControlChange(cc, value) {
        // Mapeo de morph targets a controles específicos
        // Estos números corresponden a los knobs físicos del controlador
        if ([16, 17, 18, 20, 21, 22].includes(cc)) {
            const ccToIdx = { 16: 0, 17: 1, 18: 2, 20: 3, 21: 4, 22: 5 };
            const idx = ccToIdx[cc];
            const normalizedValue = value / 127; // Convertir 0-127 a 0-1

            // Actualizar UI y modelo
            this.uiController.updateMorphSlider(idx, normalizedValue);
            this.audioSystem.playKnobSound(normalizedValue, 0.03);
        }

        // Control de color (knob específico)
        if (cc === 19) {
            const colorValue = Math.round((value / 127) * 360); // Convertir a grados de hue
            this.uiController.updateColorSlider(colorValue);
        }

        // Control de tamaño (knob específico)
        if (cc === 23) {
            const sizeValue = Math.round(50 + (value / 127) * 100); // Mapear a rango 50-150
            this.uiController.updateSizeSlider(sizeValue);
        }
    }

    /**
     * Maneja mensajes de Note On (botones)
     * Ejecuta acciones específicas según el botón presionado
     * @param {number} note - Número de nota MIDI
     * @param {number} velocity - Velocidad/intensidad del botón
     */
    handleNoteOn(note, velocity) {
        console.log(`Nota MIDI: ${note}`);

        // Botones para aprobar criatura
        if (note === 3 || note === 6) {
            window.aprobarCriatura();
        }

        // Botón para girar modelo
        if (note === 1) {
            window.girarFiguraY();
            this.audioSystem.playButtonSound();
        }

        // Botón para toggle wireframe
        if (note === 4) {
            this.uiController.toggleWireframe();
        }
    }
}
