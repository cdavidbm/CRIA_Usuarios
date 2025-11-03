/*
 * Controlador MIDI con Arduino Leonardo + 74HC4067
 * - 6 potenciómetros circulares (CC 1-6)
 * - 2 sliders (CC 7-8)
 * - 4 botones (Notas 60-63)
 */

#include <MIDIUSB.h>

// ===== PINES DEL MULTIPLEXOR 74HC4067 =====
const int S0 = 8;
const int S1 = 9;
const int S2 = 10;
const int S3 = 11;
const int SIG_PIN = A0;  // Pin común del mux conectado a A0
const int EN_PIN = 7;    // Pin Enable (opcional, conectar a GND si no se usa)

// ===== PINES DE LOS BOTONES (conexión directa) =====
const int BUTTON_PINS[4] = {2, 3, 4, 5};  // Pines digitales para botones

// ===== CONFIGURACIÓN MIDI =====
const int MIDI_CHANNEL = 0;  // Canal MIDI (0-15, donde 0 = canal 1)

// Canales del multiplexor para cada control analógico
const int POT1_CHANNEL = 0;    // Potenciómetro 1 en canal 0
const int POT2_CHANNEL = 1;    // Potenciómetro 2 en canal 1
const int POT3_CHANNEL = 2;    // Potenciómetro 3 en canal 2
const int POT4_CHANNEL = 3;    // Potenciómetro 4 en canal 3
const int POT5_CHANNEL = 4;    // Potenciómetro 5 en canal 4
const int POT6_CHANNEL = 5;    // Potenciómetro 6 en canal 5
const int SLIDER1_CHANNEL = 6; // Slider 1 en canal 6
const int SLIDER2_CHANNEL = 7; // Slider 2 en canal 7

// CC numbers para cada control
const int CC_NUMBERS[8] = {1, 2, 3, 4, 5, 6, 7, 8};

// Notas MIDI para los botones
const int NOTE_NUMBERS[4] = {60, 61, 62, 63};  // C4, C#4, D4, D#4

// ===== VARIABLES PARA SUAVIZADO Y DETECCIÓN DE CAMBIOS =====
int lastAnalogValues[8] = {-1, -1, -1, -1, -1, -1, -1, -1};
bool lastButtonStates[4] = {HIGH, HIGH, HIGH, HIGH};  // HIGH = no presionado (pull-up)
const int ANALOG_THRESHOLD = 4;  // Cambio mínimo para enviar CC (reduce ruido)

// ===== SETUP =====
void setup() {
  // Configurar pines del multiplexor
  pinMode(S0, OUTPUT);
  pinMode(S1, OUTPUT);
  pinMode(S2, OUTPUT);
  pinMode(S3, OUTPUT);
  pinMode(SIG_PIN, INPUT);
  
  // Configurar pin Enable (LOW = habilitado)
  pinMode(EN_PIN, OUTPUT);
  digitalWrite(EN_PIN, LOW);
  
  // Configurar botones con resistencias pull-up internas
  for (int i = 0; i < 4; i++) {
    pinMode(BUTTON_PINS[i], INPUT_PULLUP);
  }
  
  // Inicializar comunicación serial (opcional, para debug)
  Serial.begin(115200);
  
  // Pequeño delay para estabilización
  delay(100);
}

// ===== LOOP PRINCIPAL =====
void loop() {
  // Leer todos los controles analógicos
  readAnalogControls();
  
  // Leer todos los botones
  readButtons();
  
  // Pequeño delay para estabilidad
  delay(10);
}

// ===== FUNCIÓN: SELECCIONAR CANAL DEL MULTIPLEXOR =====
void selectMuxChannel(int channel) {
  digitalWrite(S0, bitRead(channel, 0));
  digitalWrite(S1, bitRead(channel, 1));
  digitalWrite(S2, bitRead(channel, 2));
  digitalWrite(S3, bitRead(channel, 3));
  
  // Pequeño delay para que el mux se estabilice
  delayMicroseconds(100);
}

// ===== FUNCIÓN: LEER CONTROLES ANALÓGICOS =====
void readAnalogControls() {
  int channels[8] = {
    POT1_CHANNEL, POT2_CHANNEL, POT3_CHANNEL, POT4_CHANNEL,
    POT5_CHANNEL, POT6_CHANNEL, SLIDER1_CHANNEL, SLIDER2_CHANNEL
  };
  
  for (int i = 0; i < 8; i++) {
    // Seleccionar canal del multiplexor
    selectMuxChannel(channels[i]);
    
    // Leer valor analógico (0-1023)
    int rawValue = analogRead(SIG_PIN);
    
    // Convertir a rango MIDI (0-127)
    int midiValue = map(rawValue, 0, 1023, 0, 127);
    
    // Solo enviar si el cambio es significativo (reduce ruido)
    if (abs(midiValue - lastAnalogValues[i]) >= ANALOG_THRESHOLD) {
      sendControlChange(CC_NUMBERS[i], midiValue);
      lastAnalogValues[i] = midiValue;
      
      // Debug (opcional)
      Serial.print("CC");
      Serial.print(CC_NUMBERS[i]);
      Serial.print(": ");
      Serial.println(midiValue);
    }
  }
}

// ===== FUNCIÓN: LEER BOTONES =====
void readButtons() {
  for (int i = 0; i < 4; i++) {
    bool currentState = digitalRead(BUTTON_PINS[i]);
    
    // Detectar cambio de estado (con pull-up, LOW = presionado)
    if (currentState != lastButtonStates[i]) {
      delay(20);  // Debounce simple
      currentState = digitalRead(BUTTON_PINS[i]);
      
      if (currentState != lastButtonStates[i]) {
        if (currentState == LOW) {
          // Botón presionado: enviar Note On
          sendNoteOn(NOTE_NUMBERS[i], 127);  // Velocity máximo
          Serial.print("Note ON: ");
          Serial.println(NOTE_NUMBERS[i]);
        } else {
          // Botón soltado: enviar Note Off
          sendNoteOff(NOTE_NUMBERS[i]);
          Serial.print("Note OFF: ");
          Serial.println(NOTE_NUMBERS[i]);
        }
        lastButtonStates[i] = currentState;
      }
    }
  }
}

// ===== FUNCIONES MIDI USB =====
void sendControlChange(byte control, byte value) {
  midiEventPacket_t event = {0x0B, 0xB0 | MIDI_CHANNEL, control, value};
  MidiUSB.sendMIDI(event);
  MidiUSB.flush();
}

void sendNoteOn(byte note, byte velocity) {
  midiEventPacket_t event = {0x09, 0x90 | MIDI_CHANNEL, note, velocity};
  MidiUSB.sendMIDI(event);
  MidiUSB.flush();
}

void sendNoteOff(byte note) {
  midiEventPacket_t event = {0x08, 0x80 | MIDI_CHANNEL, note, 0};
  MidiUSB.sendMIDI(event);
  MidiUSB.flush();
}