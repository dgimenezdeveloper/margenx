import tls from 'tls';

const host = process.env.IMAP_HOST || 'imap.gmail.com';
const port = Number(process.env.IMAP_PORT) || 993;
const user = process.env.IMAP_USER || 'margenx.saas@gmail.com';
const pass = process.env.IMAP_PASSWORD;

if (!pass) {
  console.error('❌ Error: Falta definir la variable IMAP_PASSWORD.');
  process.exit(1);
}

console.log(`🔌 Conectando a ${host}:${port} vía TLS...`);

const socket = tls.connect(port, host, { rejectUnauthorized: false }, () => {
  console.log('✅ Conexión TLS establecida con éxito.');
});

socket.setEncoding('utf8');

socket.on('data', (data) => {
  if (data.includes('* OK')) {
    console.log('📩 Servidor IMAP listo. Enviando comando de login...');
    socket.write(`A01 LOGIN ${user} ${pass}\r\n`);
  } else if (data.includes('A01 OK')) {
    console.log('🎉 ¡Autenticación IMAP exitosa! Credenciales validadas correctamente.');
    socket.write('A02 LOGOUT\r\n');
  } else if (data.includes('A01 NO') || data.includes('A01 BAD')) {
    console.error('❌ Falló la autenticación IMAP. Verificá App Password y acceso IMAP.');
    socket.end();
    process.exit(1);
  } else if (data.includes('A02 OK')) {
    console.log('👋 Sesión cerrada ordenadamente.');
    socket.end();
    process.exit(0);
  }
});

socket.on('error', (err) => {
  console.error('❌ Error de red en socket TLS:', err.message);
  process.exit(1);
});