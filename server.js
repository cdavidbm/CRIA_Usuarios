const express = require('express');
const session = require('express-session');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const connectDB = require('./config/database');
const User = require('./models/User');
const bcrypt = require('bcrypt');

// Conectar a MongoDB
connectDB();

app.use(express.static('public'));
app.use('/assets', express.static('assets')); // Añadir esta línea
app.use(express.json());
app.use(session({
    secret: 'cubesecret',
    resave: false,
    saveUninitialized: false
}));

io.on('connection', (socket) => {
    console.log('Cliente conectado');

    socket.on('cube-created', (cubeData) => {
        console.log('Modelo recibido:', cubeData);
        socket.broadcast.emit('new-cube', cubeData);
        console.log('Modelo enviado a otros clientes');
    });

    socket.on('disconnect', () => {
        console.log('Cliente desconectado');
    });
});

app.post('/register', async (req, res) => {
    try {
        const { username, password } = req.body;

        let user = await User.findOne({ username });
        if (user) {
            return res.status(400).json({
                success: false,
                message: 'El usuario ya existe en la base de datos'
            });
        }

        user = new User({ username, password });
        await user.save();

        res.json({
            success: true,
            message: 'Usuario registrado exitosamente',
            username: username
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: 'Error en el servidor: ' + err.message
        });
    }
});

// Añadir después de las configuraciones de middleware
app.get('/check-session', (req, res) => {
    if (req.session.user) {
        res.json({
            loggedIn: true,
            username: req.session.user
        });
    } else {
        res.json({ loggedIn: false });
    }
});

// Modificar la ruta de login
app.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        const user = await User.findOne({ username });
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Contraseña incorrecta'
            });
        }

        req.session.user = username;
        res.json({
            success: true,
            username: username,
            message: 'Inicio de sesión exitoso'
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: 'Error en el servidor: ' + err.message
        });
    }
});

// El servidor escuchará en el puerto que le asigne Render, o en el 3000 si es local.
const PORT = process.env.PORT || 3000;

http.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
});
