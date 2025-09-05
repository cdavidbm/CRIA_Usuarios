document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('registerUsername').value;
    const password = document.getElementById('registerPassword').value;
    const messageDiv = document.getElementById('registerMessage');

    try {
        const response = await fetch('/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (data.success) {
            messageDiv.className = 'message success';
            messageDiv.textContent = `✅ ${data.message}`;
            // Limpiar el formulario
            document.getElementById('registerForm').reset();
        } else {
            messageDiv.className = 'message error';
            messageDiv.textContent = `❌ ${data.message}`;
        }
    } catch (err) {
        messageDiv.className = 'message error';
        messageDiv.textContent = '❌ Error de conexión';
    }
});

// Verificar sesión al cargar la página
window.addEventListener('load', async () => {
    const response = await fetch('/check-session');
    const data = await response.json();
    if (data.loggedIn) {
        window.location.href = '/portal.html';
    }
});

document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;
    const messageDiv = document.getElementById('loginMessage');

    try {
        const response = await fetch('/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (data.success) {
            messageDiv.className = 'message success';
            messageDiv.textContent = `✅ ${data.message}`;
            // Redireccionar al portal después de login exitoso
            setTimeout(() => {
                window.location.href = '/portal.html';
            }, 1000);
        } else {
            messageDiv.className = 'message error';
            messageDiv.textContent = `❌ ${data.message}`;
        }
    } catch (err) {
        messageDiv.className = 'message error';
        messageDiv.textContent = '❌ Error de conexión';
    }
});
