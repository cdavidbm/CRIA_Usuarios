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
        const [status, cc, value] = event.data;

        // Mensajes de Control Change (CC)
        if ((status & 0xF0) === 0xB0) {
            this.handleControlChange(cc, value);
        }

        // Mensajes de Note On
        if ((status & 0xF0) === 0x90 && value > 0) {
            this.handleNoteOn(cc); // cc es el número de nota
        }
    }

    /**
     * Maneja mensajes de Control Change
     * @param {number} cc - Número de control MIDI
     * @param {number} value - Valor del control (0-127)
     */
    handleControlChange(cc, value) {
        // Morph targets (CC 70-75)
        if (cc >= 70 && cc <= 75) {
            const sliderIndex = cc - 70;
            if (this.morphSliders[sliderIndex]) {
                const slider = this.morphSliders[sliderIndex];
                const normalizedValue = value / 127;
                slider.value = normalizedValue;
                slider.dispatchEvent(new Event('input', { bubbles: true }));
            }
        }

        // Control de tamaño (CC 76)
        if (cc === 76) {
            if (this.sizeSlider) {
                const min = parseFloat(this.sizeSlider.min);
                const max = parseFloat(this.sizeSlider.max);
                const sizeValue = min + (value / 127) * (max - min);
                this.sizeSlider.value = sizeValue;
                this.sizeSlider.dispatchEvent(new Event('input', { bubbles: true }));
            }
        }

        // Control de color (CC 77)
        if (cc === 77) {
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
        // Botón para enviar modelo (Nota 36, C2)
        if (note === 36) {
            if (this.sendButton) {
                this.sendButton.click();
            }
        }
    }
}
