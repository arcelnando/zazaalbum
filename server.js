// Server Chat Minimalis untuk Album Khirza - V3.2 Final
// Nama file: server.js
// -----------------------------------------------------

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path'); // <<< BARU: Diperlukan untuk res.sendFile

const app = express();
const server = http.createServer(app);

// Konfigurasi CORS: Penting untuk mengizinkan koneksi dari file HTML lokal
const io = socketIo(server, {
    cors: {
        origin: "*", 
        methods: ["GET", "POST"]
    }
});

// Data Akun Statis LENGKAP
const USER_ACCOUNTS = {
    'zaza': { 
        id: 'zaza', 
        password: 'zaza', 
        name: 'Zaza', 
        isVerified: true,
        avatar: 'ZA' 
    },
    'khirza': { 
        id: 'khirza', 
        password: 'cantik', 
        name: 'Khirza', 
        isVerified: false, 
        avatar: 'KH'
    }
};

const onlineUsers = {};

// --- PERBAIKAN UTAMA: SAJIKAN FILE HTML DARI ROOT PATH ---
app.get('/', (req, res) => {
    // res.sendFile akan mengirimkan file 'index.html' yang berada di direktori saat ini
    res.sendFile(path.join(__dirname, 'index.html')); 
});
// ---------------------------------------------------------

io.on('connection', (socket) => {
    console.log(`[CONN] Pengguna terhubung: ${socket.id}`);
    
    // --- 1. IDENTIFIKASI & RIWAYAT ---
    socket.on('user_login', (userId) => {
        // Hapus koneksi lama jika ada
        for (const id in onlineUsers) {
            if (onlineUsers[id] === socket.id) {
                delete onlineUsers[id];
            }
        }

        onlineUsers[userId] = socket.id;
        socket.userId = userId;
        console.log(`[ONLINE] ${userId} sekarang online. Socket: ${socket.id}`);
        
        socket.emit('load_users', USER_ACCOUNTS); 
        io.emit('user_status_update', Object.keys(onlineUsers));
    });

    // --- 2. LOGIKA CHAT ---
    socket.on('send_message', (data) => {
        const { senderId } = data;
        const opponentId = senderId === 'zaza' ? 'khirza' : 'zaza';
        
        const messageData = {
            ...data, 
            status: 'sent',
            senderName: USER_ACCOUNTS[senderId].name,
        };
        
        io.to(onlineUsers[senderId]).emit('receive_message', messageData); 
        
        const receiverSocketId = onlineUsers[opponentId];
        if (receiverSocketId) {
            io.to(receiverSocketId).emit('receive_message', messageData);
            
            setTimeout(() => {
                const readStatusData = {...messageData, status: 'read'};
                io.to(onlineUsers[senderId]).emit('update_status', readStatusData);
            }, 1500); 
            
        } else {
            const sentStatusData = {...messageData, status: 'sent'};
            io.to(onlineUsers[senderId]).emit('update_status', sentStatusData);
        }
    });
    
    // --- HANDLER HAPUS UNTUK SEMUA ORANG ---
    socket.on('delete_message_for_everyone', (data) => {
        const { id, senderId } = data;
        const opponentId = senderId === 'zaza' ? 'khirza' : 'zaza';
        
        const receiverSocketId = onlineUsers[opponentId];
        if (receiverSocketId) {
            io.to(receiverSocketId).emit('message_deleted_for_everyone', { id: id });
        }
    });
    // ----------------------------------------

    // --- 3. DISCONNECT ---
    socket.on('disconnect', () => {
        if (socket.userId) {
            delete onlineUsers[socket.userId];
            console.log(`[OFFLINE] ${socket.userId} terputus.`);
            io.emit('user_status_update', Object.keys(onlineUsers));
        }
    });
});

// Jalankan server di port 3000
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server Album & Chat Berjalan di http://localhost:${PORT}`);
});
