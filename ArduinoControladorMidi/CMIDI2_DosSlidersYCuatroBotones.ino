#include <MIDIUSB.h> // Librería para comunicación MIDI por USB

// ============================================================================
// CONFIGURACIÓN DE PINES Y PARÁMETROS MIDI
// ============================================================================

// --- Pines Analógicos para los 2 Potenciómetros ---
const int PIN_POT_1 = A0; // Potenciómetro 1 conectado al pin A0
const int PIN_POT_2 = A1; // Potenciómetro 2 conectado al pin A1

// --- Pines Digitales para los 4 Pulsadores ---
const int PIN_BOTON_1 = 2; // Pulsador 1 conectado al pin digital 2
const int PIN_BOTON_2 = 3; // Pulsador 2 conectado al pin digital 3
const int PIN_BOTON_3 = 4; // Pulsador 3 conectado al pin digital 4
const int PIN_BOTON_4 = 5; // Pulsador 4 conectado al pin digital 5

// --- Números de Control Change (CC) para cada potenciómetro ---
// Estos números identifican cada control en el software DAW o sintetizador
const int CC_POT_1 = 20; // CC número 20 para potenciómetro 1 (ej: volumen)
const int CC_POT_2 = 21; // CC número 21 para potenciómetro 2 (ej: filtro)

// --- Notas MIDI para los 4 Pulsadores ---
// Cada botón envía una nota diferente cuando se presiona
const int NOTA_BOTON_1 = 60; // C4 (Do central)
const int NOTA_BOTON_2 = 62; // D4 (Re)
const int NOTA_BOTON_3 = 64; // E4 (Mi)
const int NOTA_BOTON_4 = 65; // F4 (Fa)

// --- Configuración General MIDI ---
const int CANAL_MIDI = 1;        // Canal MIDI (1-16). La mayoría de software usa canal 1
const int VELOCIDAD_NOTA = 100;  // Velocidad de las notas (0-127). 100 es un valor medio-alto
const int UMBRAL_CAMBIO = 2;     // Sensibilidad de potenciómetros: cuánto debe cambiar
                                  // el valor para enviar MIDI (evita ruido)

// --- Variables para almacenar valores anteriores de POTENCIÓMETROS ---
// Permiten detectar cuándo un potenciómetro ha cambiado de valor
int valorAnteriorPot1 = -1;  // Inicializado en -1 para forzar el primer envío
int valorAnteriorPot2 = -1;

// --- Variables para almacenar estados anteriores de PULSADORES ---
// Permiten detectar cuándo un botón ha sido presionado o liberado
int estadoAnteriorBoton1 = HIGH; // HIGH porque usamos INPUT_PULLUP (no presionado)
int estadoAnteriorBoton2 = HIGH;
int estadoAnteriorBoton3 = HIGH;
int estadoAnteriorBoton4 = HIGH;

// ============================================================================
// CONFIGURACIÓN INICIAL (se ejecuta una sola vez al encender)
// ============================================================================

void setup() {
  // Inicializa comunicación serial para depuración (opcional)
  // Puedes abrir el Monitor Serial en Arduino IDE para ver mensajes de diagnóstico
  Serial.begin(9600);
  Serial.println("Controlador MIDI: 2 Potenciómetros + 4 Botones - Iniciado");

  // Configurar los pines de los pulsadores como entradas con resistencia pull-up interna
  // INPUT_PULLUP hace que el pin esté en HIGH cuando el botón NO está presionado
  // y cambie a LOW cuando el botón SÍ está presionado (al conectar a GND)
  pinMode(PIN_BOTON_1, INPUT_PULLUP);
  pinMode(PIN_BOTON_2, INPUT_PULLUP);
  pinMode(PIN_BOTON_3, INPUT_PULLUP);
  pinMode(PIN_BOTON_4, INPUT_PULLUP);

  // Los pines analógicos (A0, A1) no necesitan configuración
  // El Arduino los detecta automáticamente al usar analogRead()
}

// ============================================================================
// BUCLE PRINCIPAL (se ejecuta continuamente)
// ============================================================================

void loop() {
  // --- PROCESAR POTENCIÓMETROS (Control Change) ---
  // Cada función lee el potenciómetro, detecta cambios y envía CC si es necesario

  procesarPotenciometro(PIN_POT_1, &valorAnteriorPot1, CC_POT_1);
  procesarPotenciometro(PIN_POT_2, &valorAnteriorPot2, CC_POT_2);

  // --- PROCESAR PULSADORES (Note On/Off) ---
  // Cada función lee el botón, detecta cambios y envía Note On/Off según el estado

  procesarPulsador(PIN_BOTON_1, &estadoAnteriorBoton1, NOTA_BOTON_1);
  procesarPulsador(PIN_BOTON_2, &estadoAnteriorBoton2, NOTA_BOTON_2);
  procesarPulsador(PIN_BOTON_3, &estadoAnteriorBoton3, NOTA_BOTON_3);
  procesarPulsador(PIN_BOTON_4, &estadoAnteriorBoton4, NOTA_BOTON_4);

  // Pequeña pausa para estabilizar las lecturas y no sobrecargar el bus MIDI
  // 5ms es un buen equilibrio entre velocidad de respuesta y estabilidad
  delay(5);
}

// ============================================================================
// FUNCIONES PARA POTENCIÓMETROS (Control Change)
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
  // Esto evita enviar muchos mensajes por pequeñas variaciones o ruido
  if (abs(valorMIDI - *valorAnterior) >= UMBRAL_CAMBIO) {
    // El valor cambió lo suficiente, enviar mensaje MIDI Control Change
    enviarControlChange(CANAL_MIDI - 1, numeroCC, valorMIDI);

    // Actualizar el valor anterior para la próxima comparación
    *valorAnterior = valorMIDI;

    // Mensaje de depuración (opcional - puedes comentarlo si no lo necesitas)
    Serial.print("CC ");
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
 * filtros, efectos, paneo, etc. en sintetizadores y DAWs.
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

// ============================================================================
// FUNCIONES PARA PULSADORES (Note On/Off)
// ============================================================================

/**
 * @brief Procesa un pulsador: lee su estado, detecta cambios y envía Note On/Off
 *
 * @param pinPulsador    Pin digital donde está conectado el pulsador
 * @param estadoAnterior Puntero a la variable que guarda el estado previo del botón
 * @param notaMIDI       Nota MIDI a enviar cuando se presiona el botón (0-127)
 *
 * Funcionamiento (asumiendo INPUT_PULLUP):
 * - Botón NO presionado: pin en HIGH
 * - Botón SÍ presionado: pin en LOW (conecta a GND)
 *
 * Cuando detecta un cambio:
 * - Si cambia a LOW (presionado): envía Note On
 * - Si cambia a HIGH (liberado): envía Note Off
 *
 * Incluye debouncing para evitar lecturas falsas por rebotes mecánicos del botón
 */
void procesarPulsador(int pinPulsador, int *estadoAnterior, int notaMIDI) {
  // Leer el estado actual del botón (HIGH = no presionado, LOW = presionado)
  int estadoActual = digitalRead(pinPulsador);

  // Detectar si el estado cambió (el botón fue presionado o liberado)
  if (estadoActual != *estadoAnterior) {
    // DEBOUNCING: esperar 50ms para confirmar que el cambio es real
    // Los botones mecánicos "rebotan" al presionarlos, causando múltiples señales
    // Este delay elimina esos rebotes
    delay(50);

    // Volver a leer el estado para confirmar que el cambio persiste
    estadoActual = digitalRead(pinPulsador);

    // Si después del debouncing el estado sigue siendo diferente, es un cambio real
    if (estadoActual != *estadoAnterior) {

      if (estadoActual == LOW) {
        // El botón fue PRESIONADO (cambió de HIGH a LOW)
        // Enviar Note On con la velocidad configurada
        enviarNoteOn(CANAL_MIDI - 1, notaMIDI, VELOCIDAD_NOTA);

        // Mensaje de depuración
        Serial.print("Botón presionado - Note ON: ");
        Serial.println(notaMIDI);

      } else {
        // El botón fue LIBERADO (cambió de LOW a HIGH)
        // Enviar Note Off con velocidad 0
        enviarNoteOff(CANAL_MIDI - 1, notaMIDI, 0);

        // Mensaje de depuración
        Serial.print("Botón liberado - Note OFF: ");
        Serial.println(notaMIDI);
      }

      // Actualizar el estado anterior para la próxima comparación
      *estadoAnterior = estadoActual;
    }
  }
}

/**
 * @brief Envía un mensaje MIDI Note On (nota activada)
 *
 * @param canalMIDI  Canal MIDI (0-15, donde 0 = canal 1)
 * @param nota       Nota MIDI a tocar (0-127, donde 60 = C4 / Do central)
 * @param velocidad  Velocidad de la nota (0-127). Indica qué tan fuerte se toca
 *
 * Note On se usa para iniciar una nota. En sintetizadores activa un sonido,
 * en samplers dispara una muestra, en DAWs puede disparar clips, etc.
 */
void enviarNoteOn(int canalMIDI, int nota, int velocidad) {
  // Crear el paquete MIDI según el estándar USB-MIDI
  // 0x09 = Cable Number 0, Code Index Number 9 (Note On)
  // 0x90 = Note On en el canal especificado
  midiEventPacket_t evento = {
    0x09,                    // Tipo de mensaje (Note On)
    0x90 | canalMIDI,        // Status byte: 0x90 + canal MIDI
    (byte)nota,              // Número de nota (0-127)
    (byte)velocidad          // Velocidad de la nota (0-127)
  };

  // Enviar el mensaje MIDI
  MidiUSB.sendMIDI(evento);
  MidiUSB.flush();
}

/**
 * @brief Envía un mensaje MIDI Note Off (nota desactivada)
 *
 * @param canalMIDI  Canal MIDI (0-15, donde 0 = canal 1)
 * @param nota       Nota MIDI a detener (0-127)
 * @param velocidad  Velocidad de liberación (0-127). Generalmente se usa 0
 *
 * Note Off se usa para detener una nota que está sonando.
 * Es importante enviar Note Off para que las notas no queden "colgadas" sonando.
 */
void enviarNoteOff(int canalMIDI, int nota, int velocidad) {
  // Crear el paquete MIDI según el estándar USB-MIDI
  // 0x08 = Cable Number 0, Code Index Number 8 (Note Off)
  // 0x80 = Note Off en el canal especificado
  midiEventPacket_t evento = {
    0x08,                    // Tipo de mensaje (Note Off)
    0x80 | canalMIDI,        // Status byte: 0x80 + canal MIDI
    (byte)nota,              // Número de nota (0-127)
    (byte)velocidad          // Velocidad de liberación (generalmente 0)
  };

  // Enviar el mensaje MIDI
  MidiUSB.sendMIDI(evento);
  MidiUSB.flush();
}
