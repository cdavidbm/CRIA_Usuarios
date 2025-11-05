#include <MIDIUSB.h> // Librería para comunicación MIDI por USB

// ============================================================================
// CONFIGURACIÓN DE PINES Y PARÁMETROS MIDI
// ============================================================================

// --- Pines Analógicos para los 6 Potenciómetros ---
const int PIN_POT_1 = A0; // Potenciómetro 1 conectado al pin A0
const int PIN_POT_2 = A1; // Potenciómetro 2 conectado al pin A1
const int PIN_POT_3 = A2; // Potenciómetro 3 conectado al pin A2
const int PIN_POT_4 = A3; // Potenciómetro 4 conectado al pin A3
const int PIN_POT_5 = A4; // Potenciómetro 5 conectado al pin A4
const int PIN_POT_6 = A5; // Potenciómetro 6 conectado al pin A5

// --- Números de Control Change (CC) para cada potenciómetro ---
// Estos números identifican cada control en el software DAW o sintetizador
const int CC_POT_1 = 20; // CC número 20 para potenciómetro 1
const int CC_POT_2 = 21; // CC número 21 para potenciómetro 2
const int CC_POT_3 = 22; // CC número 22 para potenciómetro 3
const int CC_POT_4 = 23; // CC número 23 para potenciómetro 4
const int CC_POT_5 = 24; // CC número 24 para potenciómetro 5
const int CC_POT_6 = 25; // CC número 25 para potenciómetro 6

// --- Configuración General MIDI ---
const int CANAL_MIDI = 1;        // Canal MIDI (1-16). La mayoría de software usa canal 1
const int UMBRAL_CAMBIO = 2;     // Sensibilidad: cuánto debe cambiar el valor para enviar MIDI
                                  // Valores más altos = menos mensajes MIDI (menos "ruido")

// --- Variables para almacenar valores anteriores ---
// Estas variables nos permiten detectar cuándo un potenciómetro ha cambiado de valor
int valorAnteriorPot1 = -1;  // Inicializado en -1 para forzar el primer envío
int valorAnteriorPot2 = -1;
int valorAnteriorPot3 = -1;
int valorAnteriorPot4 = -1;
int valorAnteriorPot5 = -1;
int valorAnteriorPot6 = -1;

// ============================================================================
// CONFIGURACIÓN INICIAL (se ejecuta una sola vez al encender)
// ============================================================================

void setup() {
  // Inicializa comunicación serial para depuración (opcional)
  // Puedes abrir el Monitor Serial en Arduino IDE para ver mensajes de diagnóstico
  Serial.begin(9600);
  Serial.println("Controlador MIDI con 6 Potenciómetros - Iniciado");

  // Los pines analógicos no necesitan configuración especial
  // El Arduino los detecta automáticamente al usar analogRead()
}

// ============================================================================
// BUCLE PRINCIPAL (se ejecuta continuamente)
// ============================================================================

void loop() {
  // Procesar cada potenciómetro de forma individual
  // Cada función lee el potenciómetro, detecta cambios y envía MIDI si es necesario

  procesarPotenciometro(PIN_POT_1, &valorAnteriorPot1, CC_POT_1);
  procesarPotenciometro(PIN_POT_2, &valorAnteriorPot2, CC_POT_2);
  procesarPotenciometro(PIN_POT_3, &valorAnteriorPot3, CC_POT_3);
  procesarPotenciometro(PIN_POT_4, &valorAnteriorPot4, CC_POT_4);
  procesarPotenciometro(PIN_POT_5, &valorAnteriorPot5, CC_POT_5);
  procesarPotenciometro(PIN_POT_6, &valorAnteriorPot6, CC_POT_6);

  // Pequeña pausa para estabilizar las lecturas y no sobrecargar el bus MIDI
  // 5ms es un buen equilibrio entre velocidad de respuesta y estabilidad
  delay(5);
}

// ============================================================================
// FUNCIONES AUXILIARES
// ============================================================================

/**
 * @brief Procesa un potenciómetro: lee su valor, detecta cambios y envía MIDI CC
 *
 * @param pinPotenciometro  Pin analógico donde está conectado el potenciómetro
 * @param valorAnterior     Puntero a la variable que guarda el valor previo
 * @param numeroCC          Número de Control Change MIDI a enviar (0-127)
 *
 * Funcionamiento:
 * 1. Lee el valor analógico del pin (0-1023)
 * 2. Lo convierte a valor MIDI (0-127)
 * 3. Compara con el valor anterior
 * 4. Si cambió lo suficiente, envía mensaje MIDI y actualiza el valor anterior
 */
void procesarPotenciometro(int pinPotenciometro, int *valorAnterior, int numeroCC) {
  // Leer el valor analógico del potenciómetro (entre 0 y 1023)
  int valorAnalogico = analogRead(pinPotenciometro);

  // Convertir el valor de 0-1023 a 0-127 (rango estándar MIDI)
  // La función map() hace una conversión proporcional entre rangos
  int valorMIDI = map(valorAnalogico, 0, 1023, 0, 127);

  // Detectar si el valor cambió significativamente
  // abs() calcula el valor absoluto (diferencia sin signo)
  if (abs(valorMIDI - *valorAnterior) >= UMBRAL_CAMBIO) {
    // El valor cambió lo suficiente, enviar mensaje MIDI
    enviarControlChange(CANAL_MIDI - 1, numeroCC, valorMIDI);

    // Actualizar el valor anterior para la próxima comparación
    *valorAnterior = valorMIDI;

    // Mensaje de depuración (opcional - puedes comentarlo si no lo necesitas)
    Serial.print("Pot ");
    Serial.print(numeroCC);
    Serial.print(": ");
    Serial.println(valorMIDI);
  }
}

/**
 * @brief Envía un mensaje MIDI Control Change (CC)
 *
 * @param canalMIDI  Canal MIDI (0-15, donde 0 = canal 1, 15 = canal 16)
 * @param numeroCC   Número de Control Change (0-127)
 * @param valorCC    Valor del control (0-127)
 *
 * Los mensajes CC se usan para controlar parámetros continuos como volumen,
 * filtros, efectos, etc. en sintetizadores y DAWs.
 */
void enviarControlChange(int canalMIDI, int numeroCC, int valorCC) {
  // Crear el paquete MIDI según el estándar USB-MIDI
  // 0x0B = Cable Number 0, Code Index Number 11 (Control Change)
  // 0xB0 = Control Change en el canal especificado
  midiEventPacket_t evento = {
    0x0B,                    // Tipo de mensaje (Control Change)
    0xB0 | canalMIDI,        // Status byte: 0xB0 + canal MIDI
    (byte)numeroCC,          // Número de CC (0-127)
    (byte)valorCC            // Valor del CC (0-127)
  };

  // Enviar el mensaje MIDI
  MidiUSB.sendMIDI(evento);

  // flush() asegura que el mensaje se envíe inmediatamente
  // sin esperar a que se llene el buffer
  MidiUSB.flush();
}
