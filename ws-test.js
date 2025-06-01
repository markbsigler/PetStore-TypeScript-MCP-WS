const { io } = require('socket.io-client');

const socket = io('http://127.0.0.1:3000', {
    path: '/ws',
    reconnectionDelayMax: 10000,
    auth: {
        token: "test"
    }
});

// Connection event handlers
socket.on('connect', () => {
    console.log('Connected to WebSocket server');
    console.log('Socket ID:', socket.id);
});

socket.on('connect_error', (error) => {
    console.log('Connection error:', error.message);
});

socket.on('disconnect', (reason) => {
    console.log('Disconnected:', reason);
});

// Listen for pet events
socket.on('pet:created', (data) => {
    console.log('Pet created:', data);
});

socket.on('pet:updated', (data) => {
    console.log('Pet updated:', data);
});

socket.on('pet:deleted', (data) => {
    console.log('Pet deleted:', data);
});

// Keep the script running
process.on('SIGINT', () => {
    console.log('Closing WebSocket connection...');
    socket.close();
    process.exit();
}); 