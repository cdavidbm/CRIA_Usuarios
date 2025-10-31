#include <MIDIUSB.h> // Incluye la librería para comunicación MIDI vía USB

// --- Definiciones de Pines para Potenciómetros ---
const int PIN_POT_1 = A0;
const int PIN_POT_2 = A1;
const int PIN_POT_3 = A2;
const int PIN_POT_4 = A3;
const int PIN_POT_5 = A4;

// --- Variables para los Valores Anteriores de los Potenciómetros (para detectar cambios) ---
int valorAnteriorPot1 = -1; // Inicializado a -1 para forzar la primera lectura
int valorAnteriorPot2 = -1;
int valorAnteriorPot3 = -1;
int valorAnteriorPot4 = -1;
int valorAnteriorPot5 = -1;

// --- Configuración MIDI (Canal y Control Change (CC) numbers) ---
const int CANAL_MIDI  = 1;   // Canal MIDI a usar (del 1 al 16)
const int CC_POT_1    = 70;
const int CC_POT_2    = 71;
const int CC_POT_3    = 72;
const int CC_POT_4    = 73;
const int CC_POT_5    = 74;

// --- Umbral de Sensibilidad para Potenciómetros (cuánto debe cambiar para enviar un mensaje MIDI) ---
const int UMBRAL_CAMBIO = 2; // El valor analógico debe cambiar al menos este valor para enviar MIDI

void setup() {
  // Inicializa la comunicación serial para depuración (opcional)
  Serial.begin(9600);
}

void loop() {
  // --- Procesamiento de Potenciómetros ---

  // Leer y enviar MIDI para Potenciómetro 1
  procesarPotenciometro(PIN_POT_1, &valorAnteriorPot1, CC_POT_1);

  // Leer y enviar MIDI para Potenciómetro 2
  procesarPotenciometro(PIN_POT_2, &valorAnteriorPot2, CC_POT_2);

  // Leer y enviar MIDI para Potenciómetro 3
  procesarPotenciometro(PIN_POT_3, &valorAnteriorPot3, CC_POT_3);

  // Leer y enviar MIDI para Potenciómetro 4
  procesarPotenciometro(PIN_POT_4, &valorAnteriorPot4, CC_POT_4);

  // Leer y enviar MIDI para Potenciómetro 5
  procesarPotenciometro(PIN_POT_5, &valorAnteriorPot5, CC_POT_5);


  // Esperar un poco para evitar sobrecargar la comunicación MIDI
  // Un valor muy bajo puede causar inestabilidad. Un valor muy alto puede causar latencia.
  delay(5);
}

/**
 * @brief Función para enviar un mensaje MIDI Control Change (CC).
 * @param canalMIDI El canal MIDI (0-15, que se mapea a 1-16).
 * @param numeroCC El número de Control Change (0-127).
 * @param valorCC El valor del Control Change (0-127).
 */
void enviarControlChange(int canalMIDI, int numeroCC, int valorCC) {
  midiEventPacket_t event = {0x0B, 0xB0 | canalMIDI, (byte)numeroCC, (byte)valorCC};
  MidiUSB.sendMIDI(event);
  MidiUSB.flush(); // Asegura que el mensaje se envíe inmediatamente
  //Serial.print("CC: "); Serial.print(numeroCC); Serial.print(", Val: "); Serial.println(valorCC); // Para depuración
}

/**
 * @brief Lee un potenciómetro, mapea su valor a 0-127 y envía un mensaje MIDI CC si el valor ha cambiado.
 * @param pinPotenciometro El pin analógico donde está conectado el potenciómetro.
 * @param valorAnterior Puntero a la variable que almacena el valor anterior del potenciómetro.
 * @param numeroCC El número de Control Change MIDI a enviar.
 */
void procesarPotenciometro(int pinPotenciometro, int *valorAnterior, int numeroCC) {
  int valorAnalogico = analogRead(pinPotenciometro);
  // Mapea el valor de 0-1023 (lectura analógica) a 0-127 (valor MIDI CC)
  int valorMIDI = map(valorAnalogico, 0, 1023, 0, 127);

  // Comprueba si el valor ha cambiado significativamente para evitar enviar muchos mensajes
  if (abs(valorMIDI - *valorAnterior) > UMBRAL_CAMBIO) {
    enviarControlChange(CANAL_MIDI - 1, numeroCC, valorMIDI); // Resta 1 al canal MIDI (0-15)
    *valorAnterior = valorMIDI; // Actualiza el valor anterior
  }
}