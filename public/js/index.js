let stream; // Ses akışı
let peer; // WebRTC bağlantısı
let dataChannel; // Veri kanalı

window.onload = () => {
    const button = document.getElementById("my-button");
    let isStreaming = false;
    //
    //
    //  if (localStorage.getItem("login") === "true") {
    //      document.getElementById('loginDiv').style.display = 'none';
    //  } else {
    //      document.getElementById('loginDiv').style.display = 'block';
    //  }
    //
    // document.getElementById('loginForm').addEventListener('submit', function(e) {
    //     e.preventDefault();  // Formun default davranışını engelle
    //
    //     // Kullanıcı adı ve şifreyi al
    //     const username = document.getElementById('username').value;
    //     const password = document.getElementById('password').value;
    //
    //     // Axios ile POST isteği gönder
    //     axios.post('/login', {
    //         username: username,
    //         password: password
    //     })
    //         .then(function(response) {
    //             // Başarılı giriş
    //             alert('Login successful: ' + response.data.message);
    //             // localStorage'a login true olarak ekle
    //             localStorage.setItem("login", "true");
    //
    //             // login_div'yi gizle
    //             document.getElementById('loginDiv').style.display = 'none';
    //         })
    //         .catch(function(error) {
    //             // Hatalı giriş
    //             alert('Error: ' + error.response.data.message);
    //         });
    // });

    button.onclick = async () => {
        if (!isStreaming) {
            await init();
            console.log("dsfdssd")
            sendStatus("Yayıncı yayında"); // Yayın başlatıldığında durum mesajı gönder
            isStreaming = true;
            updateUI();
        } else {
            stopStream();
            sendStatus("Yayıncı yayını kapattı"); // Yayın durdurulduğunda durum mesajı gönder
            isStreaming = false;
            updateUI();
        }
    };


    function updateUI() {
        if (isStreaming) {
            button.classList.toggle('active');
            document.body.style.backgroundColor = "#4ea525"
        } else {
            button.classList.toggle('active');
            document.body.style.backgroundColor = "#d63232"
        }
    }
};

async function init() {
    stream = await navigator.mediaDevices.getUserMedia({audio: true});
    peer = createPeer();

    // Veri kanalı oluştur
    dataChannel = peer.createDataChannel("statusChannel");
    setupDataChannelListeners(dataChannel);

    // Ses akışını peer'e ekle
    stream.getTracks().forEach((track) => peer.addTrack(track, stream));
}

function createPeer() {
    const peerConnection = new RTCPeerConnection({
        iceServers: [
            {
                urls: "stun:192.168.4.1:3478",
            },
        ],
    });

    peerConnection.ondatachannel = (event) => {
        // Gelen veri kanalını dinle
        const channel = event.channel;
        setupDataChannelListeners(channel);
    };

    peerConnection.onnegotiationneeded = () =>
        handleNegotiationNeededEvent(peerConnection);

    return peerConnection;
}

async function handleNegotiationNeededEvent(peer) {
    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);
    const payload = {
        sdp: peer.localDescription,
    };

    const {data} = await axios.post("/broadcast", payload);
    const desc = new RTCSessionDescription(data.sdp);
    peer.setRemoteDescription(desc).catch((e) => console.log(e));
}


function stopStream() {
    if (stream) {
        stream.getTracks().forEach((track) => track.stop());
    }

    if (peer) {
        peer.close();
        peer = null;
        dataChannel = null; // Veri kanalı sıfırlandı
    }
}

// Veri kanalını dinlemek için yardımcı işlev
function setupDataChannelListeners(channel) {
    channel.onmessage = (event) => {
        console.log("Gelen mesaj:", event.data);
    };

    channel.onopen = () => {
        console.log("Veri kanalı açıldı.");
    };

    channel.onclose = () => {
        console.log("Veri kanalı kapandı.");
    };
}

// Yayın durumu mesajı göndermek için yardımcı işlev
function sendStatus(message) {
    if (dataChannel && dataChannel.readyState === "open") {
        dataChannel.send(message);
    } else {
        console.warn("Veri kanalı açık değil, mesaj gönderilemedi.");
    }
}
