const socket = io('https://sonicordv2dev-nzbjl1p3c-sonicreallys-projects.vercel.app/');


const startCallButton = document.getElementById('startCall');
const endCallButton = document.getElementById('endCall');
const messageInput = document.getElementById('messageInput');
const sendMessageButton = document.getElementById('sendMessage');
const messagesDiv = document.getElementById('messages');
const audioOutputSelect = document.getElementById('audioOutputSelect');
const audioInputSelect = document.getElementById('audioInputSelect');

let localStream;
let remoteStream;
let peerConnection;
let socket;

const configuration = {
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
};

const peerConnectionConstraints = {
    optional: [{ DtlsSrtpKeyAgreement: true }]
};

socket = io();

startCallButton.addEventListener('click', async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    localStream = stream;
    await gotDevices(stream);
    await startCall();
});

endCallButton.addEventListener('click', () => {
    endCall();
});

sendMessageButton.addEventListener('click', () => {
    const message = messageInput.value;
    if (message) {
        sendMessage(message);
        messageInput.value = '';
    }
});

async function gotDevices(stream) {
    const devices = await navigator.mediaDevices.enumerateDevices();
    devices.forEach(device => {
        if (device.kind === 'audiooutput') {
            const option = document.createElement('option');
            option.value = device.deviceId;
            option.text = device.label || `Speaker ${audioOutputSelect.length + 1}`;
            audioOutputSelect.appendChild(option);
        } else if (device.kind === 'audioinput') {
            const option = document.createElement('option');
            option.value = device.deviceId;
            option.text = device.label || `Microphone ${audioInputSelect.length + 1}`;
            audioInputSelect.appendChild(option);
        }
    });
}

async function startCall() {
    peerConnection = new RTCPeerConnection(configuration, peerConnectionConstraints);
    peerConnection.onicecandidate = event => {
        if (event.candidate) {
            socket.emit('candidate', event.candidate);
        }
    };
    peerConnection.ontrack = event => {
        remoteStream = event.streams[0];
        const audioElement = document.createElement('audio');
        audioElement.srcObject = remoteStream;
        audioElement.autoplay = true;
        document.body.appendChild(audioElement);
    };

    localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
    });

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    socket.emit('offer', offer);
}

function endCall() {
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        localStream = null;
    }
    if (remoteStream) {
        remoteStream.getTracks().forEach(track => track.stop());
        remoteStream = null;
    }
}

function sendMessage(message) {
    const messageElement = document.createElement('div');
    messageElement.textContent = message;
    messagesDiv.appendChild(messageElement);
    socket.emit('message', message);
}

socket.on('offer', async offer => {
    peerConnection = new RTCPeerConnection(configuration, peerConnectionConstraints);
    peerConnection.onicecandidate = event => {
        if (event.candidate) {
            socket.emit('candidate', event.candidate);
        }
    };
    peerConnection.ontrack = event => {
        remoteStream = event.streams[0];
        const audioElement = document.createElement('audio');
        audioElement.srcObject = remoteStream;
        audioElement.autoplay = true;
        document.body.appendChild(audioElement);
    };

    await peerConnection.setRemoteDescription(offer);
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    socket.emit('answer', answer);
});

socket.on('answer', async answer => {
    await peerConnection.setRemoteDescription(answer);
});

socket.on('candidate', async candidate => {
    await peerConnection.addIceCandidate(candidate);
});

socket.on('message', message => {
    const messageElement = document.createElement('div');
    messageElement.textContent = message;
    messagesDiv.appendChild(messageElement);
});
