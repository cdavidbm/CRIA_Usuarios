import time

import pygame
import pygame.midi


# Imprimir todos los dispositivos MIDI disponibles
def print_devices():
    for i in range(pygame.midi.get_count()):
        device_info = pygame.midi.get_device_info(i)
        nombre = device_info[1].decode("utf-8")
        entrada = device_info[2]
        salida = device_info[3]
        print(f"ID: {i}")
        print(f"Nombre: {nombre}")
        print(f"Entrada: {entrada}")
        print(f"Salida: {salida}")
        print("-------------------------")


def main():
    pygame.init()
    pygame.midi.init()

    print("Dispositivos MIDI disponibles:")
    dispositivos = []  # Lista de tuplas (id, objeto Input)
    info_dispositivos = []  # Lista de diccionarios con info relevante

    # Recorre todos los dispositivos MIDI detectados
    for i in range(pygame.midi.get_count()):
        device_info = pygame.midi.get_device_info(i)
        nombre = device_info[1].decode("utf-8")
        fabricante = device_info[0].decode("utf-8")
        entrada = device_info[2]
        salida = device_info[3]
        # Determina el tipo de dispositivo
        tipo = []
        if entrada:
            tipo.append("Entrada")
        if salida:
            tipo.append("Salida")
        tipo_str = "/".join(tipo) if tipo else "Desconocido"
        # Solo abre dispositivos de entrada
        if entrada:
            try:
                dispositivo = pygame.midi.Input(i)
                dispositivos.append((i, dispositivo))
                info_dispositivos.append(
                    {
                        "id": i,
                        "nombre": nombre,
                        "fabricante": fabricante,
                        "tipo": tipo_str,
                    }
                )
                print(
                    f"ID: {i} - {nombre} (abierto) | Fabricante: {fabricante} | Tipo: {tipo_str}"
                )
            except Exception as e:
                print(f"ID: {i} - {nombre} (no se pudo abrir: {e})")
        else:
            print(f"ID: {i} - {nombre} (no es entrada)")

    if not dispositivos:
        print("No hay dispositivos de entrada MIDI disponibles.")
        return

    print(
        "\nMonitoreando todos los dispositivos MIDI de entrada. Presione Ctrl+C para salir.\n"
    )
    try:
        while True:
            # Recorre todos los dispositivos abiertos y revisa si hay mensajes
            for idx, (device_id, input_device) in enumerate(dispositivos):
                if input_device.poll():  # ¿Hay datos disponibles?
                    eventos = input_device.read(1)  # Lee un evento MIDI
                    for evento in eventos:
                        mensaje = evento[0]  # Datos MIDI (status, data1, data2, ...)
                        status = mensaje[0]
                        data1 = mensaje[1] if len(mensaje) > 1 else None
                        data2 = mensaje[2] if len(mensaje) > 2 else None
                        info = info_dispositivos[idx]
                        # Construye string informativo del dispositivo
                        info_str = f"[ID:{info['id']} | {info['nombre']} | {info['fabricante']} | {info['tipo']}]"
                        # Decodifica el tipo de mensaje MIDI
                        if 176 <= status <= 191:  # Control Change
                            canal = status - 176
                            cc_num = data1
                            valor = data2
                            print(
                                f"{info_str} Canal MIDI: {canal+1}, CC: {cc_num}, Valor: {valor}"
                            )
                        elif 144 <= status <= 159:  # Note On
                            canal = status - 144
                            nota = data1
                            velocidad = data2
                            print(
                                f"{info_str} Canal MIDI: {canal+1}, Note ON, Nota: {nota}, Velocidad: {velocidad}"
                            )
                        elif 128 <= status <= 143:  # Note Off
                            canal = status - 128
                            nota = data1
                            velocidad = data2
                            print(
                                f"{info_str} Canal MIDI: {canal+1}, Note OFF, Nota: {nota}, Velocidad: {velocidad}"
                            )
                        elif 192 <= status <= 207:  # Program Change
                            canal = status - 192
                            programa = data1
                            print(
                                f"{info_str} Canal MIDI: {canal+1}, Program Change: {programa}"
                            )
                        elif 224 <= status <= 239:  # Pitch Bend
                            canal = status - 224
                            lsb = data1
                            msb = data2
                            print(
                                f"{info_str} Canal MIDI: {canal+1}, Pitch Bend, LSB: {lsb}, MSB: {msb}"
                            )
                        else:
                            print(f"{info_str} Mensaje MIDI desconocido: {mensaje}")
            time.sleep(0.001)  # Pausa breve para evitar uso excesivo de CPU
    except KeyboardInterrupt:
        print("\nPrograma terminado por el usuario")
    except Exception as e:
        print(f"Error: {str(e)}")
    finally:
        # Cierra todos los dispositivos abiertos y libera recursos
        for _, input_device in dispositivos:
            input_device.close()
        pygame.midi.quit()
        pygame.quit()


if __name__ == "__main__":
    main()

# -----------------------------
# Notas para integración externa:
# Para identificar y asignar acciones a un dispositivo MIDI en otro programa,
# utiliza principalmente el 'id' (ID de puerto en la sesión actual), junto con
# 'nombre' y 'fabricante' para mayor robustez si el ID cambia entre sesiones.
# -----------------------------
