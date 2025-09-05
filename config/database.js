const mongoose = require('mongoose');

const connectDB = async () => {
    // La URL de conexión ahora se leerá de una variable de entorno
    const dbURI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/cubes-portal';
    try {
        const conn = await mongoose.connect(dbURI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 5000,
        });

        console.log(`MongoDB conectado: ${conn.connection.host}`);
    } catch (err) {
        console.error('\n❌ Error de conexión MongoDB:');

        if (err.name === 'MongoNetworkError' || err.code === 'ECONNREFUSED') {
            console.error('\nParece que MongoDB no está corriendo. Sigue estos pasos:');
            console.error('\n1. Abre PowerShell como administrador:');
            console.error('   - Click derecho en el menú Inicio');
            console.error('   - Selecciona "Windows PowerShell (Admin)"');
            console.error('\n2. Ejecuta estos comandos:');
            console.error('   sc.exe stop MongoDB');
            console.error('   sc.exe start MongoDB');
            console.error('\nSi continúa el error:');
            console.error('1. Abre "Servicios" (services.msc)');
            console.error('2. Busca "MongoDB"');
            console.error('3. Click derecho -> Propiedades');
            console.error('4. En "Tipo de inicio" selecciona "Automático"');
            console.error('5. En "Iniciar sesión como" selecciona "Sistema local"');
            console.error('6. Click en Aplicar y Aceptar');
            console.error('\nSi aún no funciona, reinstala MongoDB:');
            console.error('https://www.mongodb.com/try/download/community');
        }

        process.exit(1);
    }
};

// Manejo de desconexiones
mongoose.connection.on('disconnected', () => {
    console.log('❌ MongoDB desconectado');
});

mongoose.connection.on('connected', () => {
    console.log('✅ MongoDB reconectado');
});

module.exports = connectDB;
