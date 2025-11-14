Crea una **nueva página web** llamada **`infoentorno.html`** con las siguientes especificaciones:

#### Propósito general

Esta página debe servir como un **dashboard informativo** que muestre en tiempo real los datos de las criaturas que existen dentro del entorno definido en `entorno.js`.

#### Diseño y estilo

* La página debe ser **completamente responsive** y optimizada para **visualización móvil**.
* Debe **mantener el mismo estilo visual que `index.html`**, incluyendo:

  * Fondo dinámico de **Hydra** (mismo efecto visual).
  * Efectos de **glassmorphism**.
  * Paleta de colores, tipografía y estética coherente con `index.html`.
* Usa **componentes visuales ligeros** y **animaciones suaves** para mantener un look moderno y fluido.

#### Contenido principal

Diseña un **panel (dashboard)** que muestre la información de cada criatura activa en el entorno.
Cada criatura debe tener una **tarjeta informativa** con los siguientes datos:

1. **Identificador o nombre** de la criatura.
2. **Coordenadas actuales (x, y, z)**.
3. **Color actual**.
4. **Velocidad** (magnitud o vectorial, según datos disponibles).
5. **Tiempo de vida transcurrido** desde su aparición.
6. **Tiempo de vida restante** antes de desaparecer.
7. **Registro de colisiones** (con qué criaturas ha chocado y cuándo).
8. **Miniatura o vista 3D reducida del modelo** de la criatura (idealmente en un pequeño canvas o visor interactivo).
9. **Información de caracteristicas de la criatura** colores, tamaño, etcétera.

#### ⚙️ Funcionalidad técnica

* Debe actuar que entorno.html mostrando en tiempo real la información de las criaturas.
* El sistema debe poder **añadir y eliminar tarjetas** automáticamente cuando criaturas entren o salgan del entorno.
