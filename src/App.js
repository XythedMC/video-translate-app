// --- ALL IMPORTS MUST BE AT THE TOP ---
import { Buffer } from 'buffer';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import io from 'socket.io-client';
import Peer from 'simple-peer';
// --- END ALL IMPORTS ---

// --- Polyfills (after all imports) ---
// Provide a global Buffer object, which some dependencies might expect.
window.Buffer = Buffer;

// Provide a global process object with a nextTick implementation.
// This is required by libraries like 'simple-peer'.
window.process = {
    ...window.process, // Preserve any existing properties
    nextTick: setTimeout, // A common and effective polyfill for process.nextTick
    env: {
        ...window.process?.env,
        DEBUG: undefined // simple-peer and its dependencies might check this
    }
};
// --- END POLYFILLS ---

// --- UI Text Translations ---
const uiTexts = {
    en: {
        loginTitle: 'Video Call & Translate',
        loginSubtitle: 'Choose a username to begin.',
        usernamePlaceholder: 'Enter your username',
        joinButton: 'Join',
        mainTitle: 'Video Call & Live Translate',
        loggedInAs: 'Logged in as:',
        myVideoTitle: 'My Video',
        remoteVideoTitle: 'Remote Video',
        disconnectButton: 'Disconnect Call',
        incomingCallFrom: 'Incoming call from',
        acceptButton: 'Accept',
        callUserPlaceholder: 'Username to call',
        callButton: 'Call',
        myLanguageLabel: 'My Language:',
        translateToLabel: 'Translate To:',
        subtitlesTitle: 'Live Subtitles:',
        subtitleYou: 'You',
        switchCameraButton: 'Switch Camera',
        alertPeerDisconnected: 'The other user has disconnected.',
        alertEnterUserToCall: 'Please enter a user to call.',
        alertWebRTCError: 'WebRTC connection error. See console for details.',
        alertMediaError: 'Could not start call. Please ensure camera and microphone permissions are enabled.',
    },
    he: {
        loginTitle: 'שיחת וידאו ותרגום',
        loginSubtitle: 'בחר שם משתמש כדי להתחיל.',
        usernamePlaceholder: 'הזן את שם המשתמש שלך',
        joinButton: 'הצטרף',
        mainTitle: 'שיחת וידאו ותרגום חי',
        loggedInAs: 'מחובר/ת בתור:',
        myVideoTitle: 'הווידאו שלי',
        remoteVideoTitle: 'וידאו מרוחק',
        disconnectButton: 'נתק שיחה',
        incomingCallFrom: 'שיחה נכנסת מ',
        acceptButton: 'קבל',
        callUserPlaceholder: 'שם משתמש לחיוג',
        callButton: 'חייג',
        myLanguageLabel: 'השפה שלי:',
        translateToLabel: 'תרגם ל:',
        subtitlesTitle: 'כתוביות חיות:',
        subtitleYou: 'אתה',
        switchCameraButton: 'החלף מצלמה',
        alertPeerDisconnected: 'המשתמש השני התנתק.',
        alertEnterUserToCall: 'אנא הזן שם משתמש לחיוג.',
        alertWebRTCError: 'שגיאת חיבור WebRTC. בדוק את הקונסול לפרטים.',
        alertMediaError: 'לא ניתן להתחיל שיחה. אנא ודא שהרשאות המצלמה והמיקרופון מאופשרות.',
    },
    ru: {
        loginTitle: 'Видеозвонок и перевод',
        loginSubtitle: 'Выберите имя пользователя, чтобы начать.',
        usernamePlaceholder: 'Введите ваше имя пользователя',
        joinButton: 'Присоединиться',
        mainTitle: 'Видеозвонок и живой перевод',
        loggedInAs: 'Вы вошли как:',
        myVideoTitle: 'Мое видео',
        remoteVideoTitle: 'Удаленное видео',
        disconnectButton: 'Завершить звонок',
        incomingCallFrom: 'Входящий звонок от',
        acceptButton: 'Принять',
        callUserPlaceholder: 'Имя пользователя для звонка',
        callButton: 'Позвонить',
        myLanguageLabel: 'Мой язык:',
        translateToLabel: 'Перевести на:',
        subtitlesTitle: 'Живые субтитры:',
        subtitleYou: 'Вы',
        switchCameraButton: 'Переключить камеру',
        alertPeerDisconnected: 'Другой пользователь отключился.',
        alertEnterUserToCall: 'Пожалуйста, введите имя пользователя для звонка.',
        alertWebRTCError: 'Ошибка подключения WebRTC. Подробности в консоли.',
        alertMediaError: 'Не удалось начать звонок. Убедитесь, что разрешения для камеры и микрофона предоставлены.',
    },
};
// --- END UI Text Translations ---


const SIGNALING_SERVER_URL = 'https://video-translate-api-6owl.onrender.com';

// WebRTC ICE Server Configuration (STUN Servers)
const ICE_SERVERS = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
];

const STT_SOURCE_LANGUAGES = ['en-US', 'he-IL'];


function App() {
    // Refs
    const localVideoRef = useRef();
    const remoteVideoRef = useRef();
    const socketRef = useRef();
    const peerRef = useRef();
    const localStreamRef = useRef();
    const audioProcessorRef = useRef();

    // State
    const [username, setUsername] = useState('');
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [loginError, setLoginError] = useState('');
    const [usernameToRegister, setUsernameToRegister] = useState('');
    const [remoteUser, setRemoteUser] = useState('');
    const [callStatus, setCallStatus] = useState('idle');
    const [incomingCall, setIncomingCall] = useState(null);
    const [pendingCandidates, setPendingCandidates] = useState([]);
    const [subtitles, setSubtitles] = useState([]);
    const [uiLanguage, setUiLanguage] = useState('en');
    const [sourceLanguage, setSourceLanguage] = useState('en-US');
    const [targetLanguage, setTargetLanguage] = useState('es');
    const [videoDevices, setVideoDevices] = useState([]);
    const [currentCameraIndex, setCurrentCameraIndex] = useState(0);

    const languages = [
        { code: 'en-US', name: 'English (US)' }, { code: 'es', name: 'Spanish' },
        { code: 'fr', name: 'French' }, { code: 'de', name: 'German' },
        { code: 'he-IL', name: 'Hebrew (Israel)' }, { code: 'ja', name: 'Japanese' },
        { code: 'zh-CN', name: 'Chinese (Mandarin)' }, { code: 'ar', name: 'Arabic' },
        { code: 'ru', 'name': 'Russian' },
    ];

    const t = uiTexts[uiLanguage];

    const cleanupCall = useCallback(() => {
        console.log("Cleaning up call resources...");
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => track.stop());
            localStreamRef.current = null;
        }
        if (localVideoRef.current) localVideoRef.current.srcObject = null;
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
        if (peerRef.current) {
            peerRef.current.destroy();
            peerRef.current = null;
        }
        if (audioProcessorRef.current) {
            audioProcessorRef.current.stop();
            audioProcessorRef.current = null;
        }
        setCallStatus('idle');
        setRemoteUser('');
        setIncomingCall(null);
        setPendingCandidates([]);
        setSubtitles([]);
    }, []);

    const disconnectCall = useCallback((emitToServer = true) => {
        if (emitToServer && socketRef.current) {
            socketRef.current.emit('disconnectCall');
        }
        cleanupCall();
    }, [cleanupCall]);

    // Effect for enumerating video devices once logged in
    useEffect(() => {
        if (!isLoggedIn) return;

        const getDevices = async () => {
            try {
                // We need to request permission first to get the device labels
                await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                const devices = await navigator.mediaDevices.enumerateDevices();
                const cameras = devices.filter(device => device.kind === 'videoinput');
                setVideoDevices(cameras);
                console.log('Available video devices:', cameras);
            } catch (err) {
                console.error("Error enumerating devices:", err);
            }
        };

        getDevices();
    }, [isLoggedIn]);

    useEffect(() => {
        if (!isLoggedIn) return;

        const socket = io(SIGNALING_SERVER_URL);
        socketRef.current = socket;

        socket.on('connect', () => socket.emit('registerUsername', username));
        socket.on('registrationFailed', (error) => {
            setLoginError(error);
            setIsLoggedIn(false);
            socket.disconnect();
        });
        socket.on('callUser', ({ from, signalData }) => {
            if (signalData.type === 'offer') {
                setIncomingCall({ from, signalData });
                setCallStatus('receiving');
            } else if (signalData.type === 'candidate') {
                if (peerRef.current && peerRef.current.signal) {
                    peerRef.current.signal(signalData);
                } else {
                    setPendingCandidates(prev => [...prev, signalData]);
                }
            }
        });
        socket.on('callAccepted', ({ signal, from }) => {
            if (peerRef.current) {
                peerRef.current.signal(signal);
                setCallStatus('active');
                setRemoteUser(from);
            }
        });
        socket.on('liveSubtitle', (data) => {
            setSubtitles(prev => {
                const newSubs = [...prev];
                const subIndex = newSubs.findIndex(s => s.speakerId === data.speakerId && !s.isFinal);
                if (subIndex > -1) newSubs[subIndex] = { ...data, timestamp: Date.now() };
                else newSubs.push({ ...data, timestamp: Date.now() });
                return newSubs.filter(s => Date.now() - s.timestamp < 10000).slice(-5);
            });
        });
        socket.on('peerDisconnected', () => {
            alert(t.alertPeerDisconnected);
            cleanupCall();
        });
        socket.on('disconnect', () => {
            setIsLoggedIn(false);
            cleanupCall();
        });

        return () => {
            socket.disconnect();
            cleanupCall();
        };
    }, [isLoggedIn, username, cleanupCall, t]);

    useEffect(() => {
        if (isLoggedIn && socketRef.current?.connected) {
            socketRef.current.emit('updateLanguageSettings', { sourceLanguage, targetLanguage, sttSourceLanguages: STT_SOURCE_LANGUAGES });
        }
    }, [sourceLanguage, targetLanguage, isLoggedIn]);

    const createAudioProcessor = useCallback((stream, socket) => {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const sampleRate = audioContext.sampleRate;
        const source = audioContext.createMediaStreamSource(stream);
        const processor = audioContext.createScriptProcessor(4096, 1, 1);
        processor.onaudioprocess = (event) => {
            const inputData = event.inputBuffer.getChannelData(0);
            const buffer = new ArrayBuffer(inputData.length * 2);
            const view = new DataView(buffer);
            for (let i = 0; i < inputData.length; i++) {
                view.setInt16(i * 2, inputData[i] * 0x7FFF, true);
            }
            if (socket.connected) {
                socket.emit('audioChunk', { chunk: buffer, sampleRate });
            }
        };
        source.connect(processor);
        processor.connect(audioContext.destination);
        return {
            stop: () => {
                source.disconnect();
                processor.disconnect();
                if (audioContext.state !== 'closed') audioContext.close();
            }
        };
    }, []);

    const setupCall = async (isInitiator, initialSignal = null) => {
        try {
            const videoConstraint = videoDevices.length > 0
                ? { deviceId: { exact: videoDevices[currentCameraIndex].deviceId } }
                : true;

            const stream = await navigator.mediaDevices.getUserMedia({ video: videoConstraint, audio: true });
            localStreamRef.current = stream;
            if (localVideoRef.current) localVideoRef.current.srcObject = stream;

            audioProcessorRef.current = createAudioProcessor(stream, socketRef.current);
            
            const peer = new Peer({
                initiator: isInitiator,
                trickle: true,
                stream: stream,
                config: { iceServers: ICE_SERVERS }
            });
            peerRef.current = peer;

            peer.on('signal', (data) => {
                const target = isInitiator ? remoteUser : incomingCall.from;
                const event = isInitiator ? 'callUser' : 'answerCall';
                const payload = isInitiator ? { userToCall: target, signalData: data } : { signal: data, to: target };
                socketRef.current.emit(event, payload);
            });

            peer.on('track', (track, stream) => {
                if (remoteVideoRef.current && (!remoteVideoRef.current.srcObject || remoteVideoRef.current.srcObject.id !== stream.id)) {
                    remoteVideoRef.current.srcObject = stream;
                }
            });

            peer.on('connect', () => setCallStatus('active'));
            peer.on('close', () => cleanupCall());
            peer.on('error', (err) => {
                console.error(`Peer error:`, err);
                alert(t.alertWebRTCError);
                cleanupCall();
            });

            if (!isInitiator && initialSignal) {
                peer.signal(initialSignal);
                pendingCandidates.forEach(candidate => peer.signal(candidate));
                setPendingCandidates([]);
            }
        } catch (err) {
            console.error(`Failed to get media stream:`, err);
            alert(t.alertMediaError);
            cleanupCall();
        }
    };
    
    // Handler to switch cameras
    const handleSwitchCamera = useCallback(async () => {
        if (videoDevices.length < 2) return;

        const nextIndex = (currentCameraIndex + 1) % videoDevices.length;
        const newDeviceId = videoDevices[nextIndex].deviceId;

        try {
            // Get new video stream from the next camera
            const newStream = await navigator.mediaDevices.getUserMedia({
                video: { deviceId: { exact: newDeviceId } },
            });
            const newVideoTrack = newStream.getVideoTracks()[0];

            // If a call is active, replace the track in the peer connection
            if (peerRef.current && localStreamRef.current) {
                const oldTrack = localStreamRef.current.getVideoTracks()[0];
                peerRef.current.replaceTrack(oldTrack, newVideoTrack, localStreamRef.current);
                oldTrack.stop(); // Stop the old camera track
            }

            // Update the local stream reference
            if (localStreamRef.current) {
                 localStreamRef.current.removeTrack(localStreamRef.current.getVideoTracks()[0]);
                 localStreamRef.current.addTrack(newVideoTrack);
            } else {
                 localStreamRef.current = newStream;
            }

            // Update the local video element to show the new camera feed
            if (localVideoRef.current) {
                localVideoRef.current.srcObject = localStreamRef.current;
            }
            
            setCurrentCameraIndex(nextIndex);
        } catch (err) {
            console.error('Error switching camera:', err);
            alert('Could not switch camera.');
        }
    }, [videoDevices, currentCameraIndex]);

    const handleCallUser = () => {
        if (!remoteUser) return alert(t.alertEnterUserToCall);
        setCallStatus('calling');
        setupCall(true);
    };

    const handleAcceptCall = () => {
        setCallStatus('connecting'); 
        setRemoteUser(incomingCall.from);
        setupCall(false, incomingCall.signalData); 
        setIncomingCall(null);
    };

    const handleLogin = (e) => {
        e.preventDefault();
        if (usernameToRegister.trim()) {
            setUsername(usernameToRegister.trim());
            setIsLoggedIn(true);
            setLoginError('');
        }
    };

    useEffect(() => {
        const videoElement = remoteVideoRef.current;
        if (videoElement && videoElement.srcObject) {
            videoElement.play().catch(error => {
                console.error("Autoplay was prevented:", error);
                videoElement.muted = true;
                videoElement.play().catch(e2 => console.error("Muted autoplay also failed:", e2));
            });
        }
    }, [remoteVideoRef.current?.srcObject]);


    if (!isLoggedIn) {
        return (
            <div className="login-container" dir={uiLanguage === 'he' ? 'rtl' : 'ltr'}>
                <style>{`
                    .login-container { display: flex; flex-direction: column; justify-content: center; align-items: center; height: 100vh; background-color: #f0f2f5; }
                    .ui-language-selection { position: absolute; top: 20px; right: 20px; }
                    .ui-language-selection[dir="rtl"] { right: auto; left: 20px; }
                    .ui-language-selection select { padding: 8px; border-radius: 4px; border: 1px solid #ccc; }
                    form { background: white; padding: 40px; border-radius: 12px; box-shadow: 0 8px 16px rgba(0,0,0,0.1); text-align: center; }
                    h1 { margin-bottom: 10px; } p { margin-bottom: 20px; color: #666; }
                    input { font-size: 1em; padding: 10px; width: 250px; margin-bottom: 20px; border: 1px solid #ccc; border-radius: 8px; }
                    button { font-size: 1.1em; padding: 10px 20px; border: none; border-radius: 8px; background-color: #007bff; color: white; cursor: pointer; }
                    .error { color: red; margin-top: 15px; }
                `}</style>
                 <div className="ui-language-selection" dir={uiLanguage === 'he' ? 'rtl' : 'ltr'}>
                    <select value={uiLanguage} onChange={(e) => setUiLanguage(e.target.value)}>
                        <option value="en">English</option>
                        <option value="he">עברית</option>
                        <option value="ru">Русский</option>
                    </select>
                </div>
                <form onSubmit={handleLogin}>
                    <h1>{t.loginTitle}</h1>
                    <p>{t.loginSubtitle}</p>
                    <input type="text" placeholder={t.usernamePlaceholder} value={usernameToRegister} onChange={(e) => setUsernameToRegister(e.target.value)} autoFocus />
                    <button type="submit">{t.joinButton}</button>
                    {loginError && <p className="error">{loginError}</p>}
                </form>
            </div>
        );
    }

    const renderCallControls = () => {
        switch (callStatus) {
            case 'active': case 'calling': case 'connecting':
                return <button onClick={() => disconnectCall(true)} className="disconnect-btn">{t.disconnectButton}</button>;
            case 'receiving':
                return (
                    <div className="incoming-call">
                        <p>{t.incomingCallFrom} <strong>{incomingCall.from}</strong>!</p>
                        <button onClick={handleAcceptCall} className="accept-btn">{t.acceptButton}</button>
                    </div>
                );
            case 'idle': default:
                return (
                    <div className="call-controls">
                        <input type="text" placeholder={t.callUserPlaceholder} value={remoteUser} onChange={(e) => setRemoteUser(e.target.value)} />
                        <button onClick={handleCallUser} className="call-btn">{t.callButton}</button>
                    </div>
                );
        }
    };

    return (
        <div className="App" dir={uiLanguage === 'he' ? 'rtl' : 'ltr'}>
            <style>{`
                .App { text-align: center; font-family: sans-serif; padding: 20px; background-color: #f0f2f5; }
                .header { position: relative; }
                .ui-language-selection { position: absolute; top: 0; right: 0; }
                .App[dir="rtl"] .ui-language-selection { right: auto; left: 0; }
                .ui-language-selection select { padding: 8px; border-radius: 4px; border: 1px solid #ccc; }
                .video-container { display: flex; flex-wrap: wrap; justify-content: center; gap: 20px; margin: 20px 0; }
                .video-box { background: #fff; padding: 10px; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1); width: 100%; max-width: 500px; }
                .video-box button { background-color: #6c757d; margin-top: 10px; }
                video { width: 100%; background: #000; border-radius: 4px; aspect-ratio: 4 / 3; object-fit: cover; }
                .controls-container { margin: 20px auto; padding: 20px; background: #fff; border-radius: 8px; max-width: 800px; }
                .call-controls input, .language-selection select { padding: 8px; margin: 5px; border-radius: 4px; border: 1px solid #ccc; }
                button { padding: 10px 20px; border: none; border-radius: 4px; color: white; cursor: pointer; font-size: 1em; }
                .call-btn { background-color: #28a745; }
                .disconnect-btn { background-color: #dc3545; }
                .incoming-call { margin-top: 15px; padding: 10px; background-color: #fff3cd; border: 1px solid #ffeeba; border-radius: 4px; }
                .accept-btn { background-color: #007bff; }
                .subtitle-container { margin: 20px auto; padding: 20px; background: #fff; border-radius: 8px; max-width: 800px; min-height: 100px; text-align: start; }
            `}</style>
            <div className="header">
                <h1>{t.mainTitle}</h1>
                <div className="ui-language-selection">
                    <select value={uiLanguage} onChange={(e) => setUiLanguage(e.target.value)}>
                        <option value="en">English</option>
                        <option value="he">עברית</option>
                        <option value="ru">Русский</option>
                    </select>
                </div>
            </div>
            <p>{t.loggedInAs} <strong>{username}</strong></p>

            <div className="video-container">
                <div className="video-box">
                    <h2>{t.myVideoTitle}</h2>
                    <video ref={localVideoRef} autoPlay muted playsInline />
                    {videoDevices.length > 1 && callStatus !== 'idle' && (
                        <button onClick={handleSwitchCamera}>{t.switchCameraButton}</button>
                    )}
                </div>
                <div className="video-box">
                    <h2>{t.remoteVideoTitle} ({remoteUser || '...'})</h2>
                    <video ref={remoteVideoRef} autoPlay playsInline />
                </div>
            </div>

            <div className="controls-container">
                {renderCallControls()}
            </div>
            
            <div className="controls-container language-selection">
                <label>{t.myLanguageLabel}</label>
                <select value={sourceLanguage} onChange={(e) => setSourceLanguage(e.target.value)}>
                    {languages.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
                </select>
                <label>{t.translateToLabel}</label>
                <select value={targetLanguage} onChange={(e) => setTargetLanguage(e.target.value)}>
                    {languages.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
                </select>
            </div>

            <div className="subtitle-container">
                <h3>{t.subtitlesTitle}</h3>
                {subtitles.map((sub, index) => (
                    <p key={index} className={sub.isFinal ? 'final-subtitle' : 'interim-subtitle'}>
                        <strong>{sub.speakerId === username ? t.subtitleYou : sub.speakerId}:</strong> {sub.text}
                    </p>
                ))}
            </div>
        </div>
    );
}

export default App;