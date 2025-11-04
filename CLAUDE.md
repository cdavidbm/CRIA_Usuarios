# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**C.R.I.A.** (Composición Regenerativa Íntegra Algorítmica) is an interactive digital art ecosystem consisting of two main components:

1. **Portal** (`portal.html`) - A creation interface where users design "techno-synthetic creatures" by manipulating morphTargets, size, and color
2. **Environment** (`entorno.html`) - A shared 3D world where all created creatures coexist and interact according to behavioral rules

The project is a biopunk digital art installation exhibited in Bogotá, featuring VR support and MIDI hardware control.

## Development Commands

### Running the Application
```bash
npm start
```
Starts the Express server on port 3000 (or PORT environment variable). The server handles:
- Static file serving from `/public`
- WebSocket communication via Socket.IO
- MongoDB user authentication (optional, currently disabled in UI)
- Real-time creature synchronization between portal and environment

### MongoDB Setup
- Local: `mongodb://127.0.0.1:27017/cubes-portal`
- Production: Set `MONGO_URI` environment variable
- Authentication system is implemented but UI is currently commented out

## Architecture

### Client-Server Communication Flow

**Portal → Server → Environment:**
1. User creates creature in `portal.js` by adjusting morphTargets/size/color
2. On button click, creature data emitted via Socket.IO: `socket.emit('cube-created', modelData)`
3. Server (`server.js:25`) receives and broadcasts to all other clients: `socket.broadcast.emit('new-cube', cubeData)`
4. Environment (`entorno.js:234`) receives and spawns creature: `socket.on('new-cube', handleNewModel)`

### 3D Model System

**Model Path:** `/assets/modelo.glb`

**MorphTargets** represent six creature forms, each with specific behaviors:
- `🪼 Medusa` (Chrysaora plocamia) - Smooth, undulating rotation
- `🪸 Coral` (Agaricia fragilis) - Slow rotation
- `🐙 Pulpo` (Octopus briareus) - Complex multi-axis rotation
- `🌸 Flor` (Epidendrum secundum) - Fast rotation
- `🌵 Cactus` (Miconia squamulosa) - Slow with slight wobble
- `🌿 Helecho` (Bidens rubifolia) - Swaying motion

The dominant morphTarget (highest influence value) determines the creature's "personality" and rotation behavior.

### Creature Lifecycle and Behavior (`entorno.js`)

**Birth Animation (lines 569-622):**
- Creatures spawn as "eggs" (small spheres) with vibration animation
- 1.5-second hatching sequence: vibration phase → transition → full creature
- Stored in `hatchingEggs` array until birth completes

**Flocking Behavior (lines 660-739):**
- **Color Affinity:** Creatures group with similar hue values (±45° on color wheel)
- **Separation:** Avoid collisions within 1.5 units
- **Cohesion:** Move toward center of mass of color-similar neighbors
- **Containment:** Soft boundaries keep creatures in viewing area (±10x, ±6y, ±10z)
- **Wander:** Random exploration force prevents stasis

**Lifespan System (lines 746-810):**
- Each creature has 180-second (3 min) lifespan
- Scale shrinks proportionally as lifespan decreases
- Collision with another creature resets both lifespans to maximum ("feeding")
- Dead creatures removed and disposed to prevent memory leaks

**Physics (lines 825-881):**
- Elastic collision response with velocity exchange
- Speed inversely proportional to size: `speedFactor = 1 / Math.sqrt(size)`
- Velocity clamped between 0.2 and 1.5 units/second

### VR Support

**Setup (`entorno.js:149-184`):**
- WebXR enabled with `VRButton.js`
- Two controller inputs with raycast selection
- Controller interaction: "tickle" creatures by pointing and triggering
- In-VR exit button rendered on camera (`entorno.js:624-653`)

**VR Interactions:**
- `onSelectStart`: Raycasts from controller to detect creature hits
- Hit creatures receive `isTickled` flag causing jitter animation
- Exit button displayed at `(0, -0.5, -2)` relative to camera in VR mode

### MIDI Hardware Integration

**Arduino Controller (`ArduinoControladorMidi.ino`):**
- 6 circular potentiometers via 74HC4067 multiplexer → morphTarget sliders (CC 70-75)
- 2 linear sliders → size (CC 76) and color (CC 77)
- 4 buttons → send creature (Note 36/C2)

**Web MIDI API (`midiControllerPortal.js`):**
- Maps CC 70-75 to morphTarget sliders
- Maps CC 76 to size (normalized to slider range)
- Maps CC 77 to color (0-127 → 0-360° hue)
- Note 36 triggers creature send button

### Material System

**MatCap Shader:** All creatures use `/assets/matcap_iridescent.png` for consistent visual style
- Each creature gets cloned material to allow individual color tinting
- Color applied as HSL: `material.color.setHSL(hue, 0.7, 0.5)`
- Shadows enabled for depth perception

### Authentication System

**Current State:** Implemented but UI disabled (commented out in `index.html:174-196`)

**Backend (`server.js`):**
- `/register` - Creates user with bcrypt hashed password
- `/login` - Validates credentials, creates session
- `/check-session` - Returns current login state

**User Model (`models/User.js`):**
- Mongoose schema with pre-save hook for password hashing
- Username must be unique

## Key Files

- `server.js` - Express server with Socket.IO and MongoDB
- `public/portal.html` & `portal.js` - Creature creation interface
- `public/entorno.html` & `entorno.js` - Shared 3D ecosystem with Three.js
- `public/index.html` - Landing page with project information
- `models/User.js` - Mongoose user schema
- `config/database.js` - MongoDB connection with detailed error handling
- `public/midiControllerPortal.js` - Web MIDI API integration
- `ArduinoControladorMidi/ArduinoControladorMidi.ino` - Hardware MIDI controller

## Important Considerations

### Performance
- Model caching (`modelCache` Map) prevents redundant GLTF loads
- Maximum 20 creatures in environment at once
- Geometry/material disposal on removal prevents memory leaks
- `frustumCulling` enabled for off-screen optimization

### Coordinate Systems
- Environment bounds: X[-10,10], Y[0,6], Z[-10,10]
- Creatures spawn with random velocity based on size
- Ground plane at Y=0 with shadow receiver

### Debugging
- Portal: Check browser console for morphTarget names and influences
- Server: Logs creature data on emission/receipt
- Environment: Press C to clear all creatures, SPACE to pause, R to toggle auto-rotate

### Known Architecture Patterns
- Socket.IO broadcasts exclude sender (`socket.broadcast.emit`)
- Three.js model cloning preserves morphTarget state
- User data stored in `model.userData` for behavior tracking
- Animation loop uses `renderer.setAnimationLoop` for VR compatibility (not `requestAnimationFrame`)
