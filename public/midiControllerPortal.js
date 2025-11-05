/**
 * Controlador MIDI para la página del portal
 * Traduce mensajes MIDI a acciones en la interfaz de portal.html
 */
export class MIDIController {
    constructor() {
        this.midiAccess = null;
        this.morphSliders = [];
        this.sizeSlider = null;
        this.colorSlider = null;
        this.sendButton = null;
        this.toggleWireframeButton = null;
        this.toggleRotationButton = null;
        this.randomAnimationButton = null;
    }

    /**
     * Inicializa el acceso MIDI y los elementos de la UI
     */
    async init() {
        // Cache UI elements
        this.morphSliders = Array.from(document.querySelectorAll('#morphControls input[type="range"]'));
        this.sizeSlider = document.getElementById('modelSize');
        this.colorSlider = document.getElementById('modelColor');
        this.sendButton = document.getElementById('sendModel');
        this.toggleWireframeButton = document.getElementById('toggleWireframe');
        this.toggleRotationButton = document.getElementById('toggleRotation');
        this.randomAnimationButton = document.getElementById('randomAnimation');

        if (!navigator.requestMIDIAccess) {
            console.warn('MIDI no soportado en este navegador');
            return;
        }

        try {
            this.midiAccess = await navigator.requestMIDIAccess();
            this.setupMIDIInputs();
            console.log('MIDI inicializado para el portal');
        } catch (error) {
            console.warn('No se pudo acceder a MIDI:', error);
        }
    }

    /**
     * Configura los dispositivos de entrada MIDI
     */
    setupMIDIInputs() {
        for (let input of this.midiAccess.inputs.values()) {
            input.onmidimessage = (event) => this.handleMIDIMessage(event);
        }
    }

    /**
     * Maneja mensajes MIDI entrantes
     * @param {MIDIMessageEvent} event - Evento MIDI del dispositivo
     */
    handleMIDIMessage(event) {
        const [status, data1, data2] = event.data;
        const command = status & 0xF0;
        const channel = status & 0x0F;

        // Mensajes de Control Change (CC) en cualquier canal
        if (command === 0xB0) {
            this.handleControlChange(data1, data2);
        }

        // Mensajes de Note On en cualquier canal (con velocidad > 0)
        if (command === 0x90 && data2 > 0) {
            this.handleNoteOn(data1); // data1 es el número de nota
        }
    }

    /**
     * Maneja mensajes de Control Change
     * @param {number} cc - Número de control MIDI
     * @param {number} value - Valor del control (0-127)
     */
    handleControlChange(cc, value) {
        let sliderIndex = -1;

        // --- Mapeo para Morph Targets (CC 20-25) ---
        if (cc >= 20 && cc <= 25) {
            const sliderIndex = cc - 20;
            if (this.morphSliders[sliderIndex]) {
                const slider = this.morphSliders[sliderIndex];
                const normalizedValue = value / 127;
                slider.value = normalizedValue;
                slider.dispatchEvent(new Event('input', { bubbles: true }));
            }
        }
        // --- Mapeo para Size Slider (CC 70) ---
        else if (cc === 70) {
            if (this.sizeSlider) {
                const min = parseFloat(this.sizeSlider.min);
                const max = parseFloat(this.sizeSlider.max);
                const sizeValue = min + (value / 127) * (max - min);
                this.sizeSlider.value = sizeValue;
                this.sizeSlider.dispatchEvent(new Event('input', { bubbles: true }));
            }
        }
        // --- Mapeo para Color Slider (CC 71) ---
        else if (cc === 71) {
            if (this.colorSlider) {
                const colorValue = Math.round((value / 127) * 360);
                this.colorSlider.value = colorValue;
                this.colorSlider.dispatchEvent(new Event('input', { bubbles: true }));
            }
        }
    }

    /**
     * Maneja mensajes de Note On (botones)
     * @param {number} note - Número de nota MIDI
     */
    handleNoteOn(note) {
        switch (note) {
            case 60:
                if (this.sendButton) {
                    console.log(`MIDI Note ${note}: Activando Enviar a Entorno`);
                    this.sendButton.click();
                }
                break;
            case 62:
                if (this.toggleWireframeButton) {
                    console.log(`MIDI Note ${note}: Activando Wireframe`);
                    this.toggleWireframeButton.click();
                }
                break;
            case 64:
                if (this.toggleRotationButton) {
                    console.log(`MIDI Note ${note}: Activando Rotar`);
                    this.toggleRotationButton.click();
                }
                break;
            case 65:
                if (this.randomAnimationButton) {
                    console.log(`MIDI Note ${note}: Activando Animación Aleatoria`);
                    this.randomAnimationButton.click();
                }
                break;
        }
    }
}
