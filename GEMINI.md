# GEMINI.md

## Project Overview

**C.R.I.A.** (Composición Regenerativa Íntegra Algorítmica) is an interactive digital art ecosystem. It is a biopunk digital art installation exhibited in Bogotá, featuring VR support and MIDI hardware control.

The project consists of two main components:

1.  **Portal** (`portal.html`): A creation interface where users design "techno-synthetic creatures" by manipulating morphTargets, size, and color.
2.  **Environment** (`entorno.html`): A shared 3D world where all created creatures coexist and interact according to behavioral rules.

The backend is a **Node.js** application using **Express.js** for serving static files and handling user authentication. **Socket.IO** is used for real-time communication between the portal, the server, and the environment. The 3D environment is built with **Three.js** and supports **WebXR** for virtual reality experiences. A **MongoDB** database is used for user management, though this feature is currently disabled in the UI. The application also integrates with custom MIDI hardware via the **Web MIDI API**.

## Building and Running

### Running the Application

To start the server, run the following command:

```bash
npm start
```

This will start the Express server on port 3000 (or the port specified by the `PORT` environment variable).

### Database

The application requires a MongoDB connection.
*   **Local Development:** `mongodb://127.0.0.1:27017/cubes-portal`
*   **Production:** Set the `MONGO_URI` environment variable.

## Development Conventions

### Client-Server Communication

1.  A user creates a creature in the **Portal** (`portal.js`).
2.  The creature data is sent to the server via a `cube-created` Socket.IO event.
3.  The server (`server.js`) receives the data and broadcasts it to all other clients via a `new-cube` event.
4.  The **Environment** (`entorno.js`) receives the `new-cube` event and spawns the new creature in the shared 3D world.

### 3D Model and Creature Behavior

*   **Model:** A single GLTF model (`/assets/modelo.glb`) is used for all creatures.
*   **MorphTargets:** The model has six morphTargets that define the creature's shape and "personality," influencing its rotation and movement style.
*   **Lifecycle:** Creatures have a 180-second lifespan. Colliding with another creature resets the lifespan of both.
*   **Flocking:** Creatures exhibit flocking behavior, grouping with others of a similar color.
*   **Physics:** A simple physics system handles collisions and movement, with speed being inversely proportional to size.

### VR Support

*   WebXR is enabled in the environment using `VRButton.js`.
*   Users can interact with creatures using VR controllers.

### MIDI Hardware Integration

*   A custom Arduino-based MIDI controller can be used in the portal to manipulate creature parameters.
*   `midiControllerPortal.js` handles the mapping from MIDI Control Change (CC) messages to the creature's morphTargets, size, and color.

## Key Files

*   `server.js`: The main Express server file, handling Socket.IO, authentication, and static file serving.
*   `public/portal.html` & `public/portal.js`: The frontend for the creature creation interface.
*   `public/entorno.html` & `public/entorno.js`: The frontend for the shared 3D environment where creatures live.
*   `public/index.html`: The project's landing page.
*   `models/User.js`: The Mongoose schema for the user model.
*   `config/database.js`: The MongoDB connection logic.
*   `public/midiControllerPortal.js`: The Web MIDI API integration logic.
*   `ArduinoControladorMidi/ArduinoControladorMidi.ino`: The code for the hardware MIDI controller.
