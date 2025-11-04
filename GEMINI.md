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
