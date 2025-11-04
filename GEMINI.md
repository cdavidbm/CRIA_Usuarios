<<<<<<< HEAD
# Project: C.R.I.A. - Composición Regenerativa Íntegra Algorítmica

## Project Overview

This is a full-stack JavaScript web application that allows users to create and interact with 3D creatures in a shared virtual environment. The project is named C.R.I.A., which stands for "Composición Regenerativa Íntegra Algorítmica," and is described as a "digital biopunk art laboratory."

The application consists of a main informational page (`index.html`) and a shared 3D environment (`entorno.html`). Users can register and log in to the application. Once in the 3D environment, they can create their own "technosynthetic creature" and release it into a world where it coexists with the creations of other users. The creatures have their own behaviors, such as moving in groups with others of similar colors and having a limited life cycle that requires them to interact with other creatures to survive.

## Technologies Used

*   **Backend:** Node.js, Express.js, MongoDB, Mongoose, Socket.IO, bcrypt
*   **Frontend:** HTML, CSS, JavaScript, Three.js
*   **Database:** MongoDB

## Building and Running the Project

### Prerequisites

*   Node.js and npm installed
*   MongoDB installed and running

### Installation

1.  Clone the repository.
2.  Install the dependencies:
    ```bash
    npm install
    ```

### Running the Application

1.  **Start the MongoDB server.** The `config/database.js` file provides instructions for starting the MongoDB service if it is not running.
2.  **Start the Node.js server:**
    ```bash
    npm start
    ```
3.  Open a web browser and navigate to `http://localhost:3000`.

## Development Conventions

*   The backend code is located in the root directory (`server.js`), with database configuration in `config/database.js` and data models in `models/User.js`.
*   The frontend code is in the `public` directory.
*   The main page is `public/index.html`.
*   The 3D environment is `public/entorno.html` and its logic is in `public/entorno.js`.
*   The application uses Socket.IO for real-time communication between the server and clients.
*   User authentication is handled by the server using Express sessions and bcrypt for password hashing.
*   The code and comments are primarily written in Spanish.
=======
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
>>>>>>> 6c9fd5f46d37e72cbf835df1462214348e22c134
