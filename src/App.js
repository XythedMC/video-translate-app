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


const SIGNALING_SERVER_URL = 'https://video-translate-api-6owl.onrender.com'; // Placeholder - UPDATE THIS AFTER BACKEND DEPLOYMENT

// WebRTC ICE Server Configuration (STUN Servers)
const ICE_SERVERS = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
];

// --- ESLint Fix: sttSourceLanguages is now a constant as it's not dynamically changed ---
const STT_SOURCE_LANGUAGES = ['en-US', 'he-IL'];


function App() {
    // Refs for DOM elements and external objects
    const localVideoRef = useRef();
    const remoteVideoRef = useRef();
    const socketRef = useRef();
    const peerRef = useRef();
    const localStreamRef = useRef();
    const audioProcessorRef = useRef();

    // State variables for UI and call management
    const [username, setUsername] = useState('');
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [loginError, setLoginError] = useState('');
    const [usernameToRegister, setUsernameToRegister] = useState('');
    const [remoteUser, setRemoteUser] = useState('');
    const [callStatus, setCallStatus] = useState('idle');
    const [incomingCall, setIncomingCall] = useState(null);
    const [pendingCandidates, setPendingCandidates] = useState([]);
    const [subtitles, setSubtitles] = useState([]);

    // Language selection states and options
    const [sourceLanguage, setSourceLanguage] = useState('en-US');
    const [targetLanguage, setTargetLanguage] = useState('es');
    // Removed setSttSourceLanguages from here as it's now a constant:
    // const [sttSourceLanguages, setSttSourceLanguages] = useState(['en-US', 'he-IL']);


    // List of supported languages for selection dropdowns
    const languages = [
        { code: 'en-US', name: 'English (US)' },
        { code: 'es', name: 'Spanish' },
        { code: 'fr', name: 'French' },
        { code: 'de', name: 'German' },
        { code: 'he-IL', name: 'Hebrew (Israel)' },
        { code: 'ja', name: 'Japanese' },
        { code: 'zh-CN', name: 'Chinese (Mandarin)' },
        { code: 'ar', name: 'Arabic' },
        { code: 'ru', 'name': 'Russian' },
    ];

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
            console.log(`[${username}] Received 'callUser' event from backend. Caller: ${from}. SignalData type: ${signalData ? signalData.type : 'N/A'}.`);
            if (signalData.type === 'offer') {
                setIncomingCall({ from, signalData });
                setCallStatus('receiving');
            } else if (signalData.type === 'candidate') {
                if (peerRef.current && peerRef.current.signal) {
                    console.log(`[${username}] Applying candidate immediately:`, signalData);
                    peerRef.current.signal(signalData);
                } else {
                    console.log(`[${username}] Storing candidate for later:`, signalData);
                    setPendingCandidates(prev => [...prev, signalData]);
                }
            }
        });
        socket.on('callAccepted', ({ signal, from }) => {
            console.log(`[${username}] Received 'callAccepted' from backend. Signal type: ${signal ? signal.type : 'N/A'}.`);
            if (peerRef.current) {
                peerRef.current.signal(signal);
                setCallStatus('active');
                setRemoteUser(from);
                console.log(`[${username}] Call accepted! Remote user set to: ${from}. Peer signaled.`);
            } else {
                console.warn(`[${username}] 'callAccepted' received but peerRef.current is null. Signal not applied.`);
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
            alert('The other user has disconnected.');
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
    }, [isLoggedIn, username, cleanupCall]);

    useEffect(() => {
        if (isLoggedIn && socketRef.current?.connected) {
            // --- ESLint Fix: Using the constant STT_SOURCE_LANGUAGES ---
            socketRef.current.emit('updateLanguageSettings', { sourceLanguage, targetLanguage, sttSourceLanguages: STT_SOURCE_LANGUAGES });
        }
    }, [sourceLanguage, targetLanguage, isLoggedIn]); // Removed sttSourceLanguages as it's a constant

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
            console.log(`[${username}] setupCall: Attempting to get media stream. isInitiator: ${isInitiator}`);
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            localStreamRef.current = stream;
            if (localVideoRef.current) localVideoRef.current.srcObject = stream;
            console.log(`[${username}] setupCall: Local media stream obtained. Video tracks: ${stream.getVideoTracks().length}, Audio tracks: ${stream.getAudioTracks().length}`);

            audioProcessorRef.current = createAudioProcessor(stream, socketRef.current);
            
            console.log(`[${username}] setupCall: Creating new Peer instance. Initiator: ${isInitiator}`);
            const peer = new Peer({
                initiator: isInitiator,
                trickle: true,
                stream: stream,
                config: {
                    iceServers: ICE_SERVERS
                }
            });
            peerRef.current = peer;
            console.log(`[${username}] setupCall: Peer instance created. peerRef.current is:`, peerRef.current);


            peer.on('signal', (data) => {
                console.log(`[${username}] Peer 'signal' event triggered. Type: ${data.type || 'candidate'}.`);
                if (isInitiator) {
                    socketRef.current.emit('callUser', { userToCall: remoteUser, signalData: data });
                    console.log(`[${username}] Emitting 'callUser' to ${remoteUser} with signal type: ${data.type || 'candidate'}`);
                } else {
                    socketRef.current.emit('answerCall', { signal: data, to: incomingCall.from });
                    console.log(`[${username}] Emitting 'answerCall' to ${incomingCall.from} with signal type: ${data.type || 'candidate'}`);
                }
            });

            peer.on('track', (track, stream) => {
                console.log(`[${username}] Received remote track: kind=${track.kind}, id=${track.id}, enabled=${track.enabled}`);
                console.log(`[${username}] Stream associated with track: id=${stream.id}, active=${stream.active}, has video tracks=${stream.getVideoTracks().length > 0}, has audio tracks=${stream.getAudioTracks().length > 0}`);
                if (remoteVideoRef.current) {
                    if (!remoteVideoRef.current.srcObject || remoteVideoRef.current.srcObject.id !== stream.id) {
                        remoteVideoRef.current.srcObject = stream;
                        console.log(`[${username}] remoteVideoRef.current.srcObject set to new stream. Value:`, remoteVideoRef.current.srcObject);
                    } else {
                        console.log(`[${username}] remoteVideoRef.current.srcObject already set to this stream.`);
                    }
                } else {
                    console.warn(`[${username}] remoteVideoRef.current is null when 'track' event fired.`);
                }
            });

            peer.on('stream', (remoteStream) => {
                console.log(`[${username}] DEPRECATED 'stream' event fired. Remote stream received: id=${remoteStream.id}, active=${remoteStream.active}, has video tracks=${remoteStream.getVideoTracks().length > 0}, has audio tracks=${remoteStream.getAudioTracks().length > 0}`);
                if (remoteVideoRef.current) {
                    remoteVideoRef.current.srcObject = remoteStream;
                    console.log(`[${username}] remoteVideoRef.current.srcObject set from 'stream' event. Value:`, remoteVideoRef.current.srcObject);
                }
            });

            peer.on('connect', () => {
                console.log(`[${username}] Peer connection established!`);
                setCallStatus('active');
            });

            peer.on('close', () => {
                console.log(`[${username}] Peer 'close' event fired.`);
                cleanupCall();
            });
            peer.on('error', (err) => {
                console.error(`[${username}] Peer 'error' event:`, err);
                alert('WebRTC connection error. See console for details.');
                cleanupCall();
            });

            if (!isInitiator && initialSignal) {
                console.log(`[${username}] setupCall: Applying initial signal (type: ${initialSignal.type}) to peer.`);
                peer.signal(initialSignal);

                if (pendingCandidates.length > 0) {
                    console.log(`[${username}] setupCall: Applying ${pendingCandidates.length} pending candidates.`);
                    pendingCandidates.forEach(candidate => {
                        peer.signal(candidate);
                    });
                    setPendingCandidates([]);
                }
            }
        } catch (err) {
            console.error(`[${username}] Failed to get media stream in setupCall:`, err);
            alert('Could not start call. Please ensure camera and microphone permissions are enabled.');
            cleanupCall();
        }
    };

    const handleCallUser = () => {
        if (!remoteUser) return alert('Please enter a user to call.');
        setCallStatus('calling');
        setupCall(true);
    };

    const handleAcceptCall = () => {
        console.log(`[${username}] handleAcceptCall: Accepting call from ${incomingCall.from}.`);
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
        const remoteStream = videoElement ? videoElement.srcObject : null;

        console.log(`[${username}] useEffect [remoteVideoRef.current, username] triggered. videoElement:`, videoElement, `remoteStream:`, remoteStream);

        if (videoElement && remoteStream) {
            console.log(`[${username}] useEffect: remoteVideoRef.current.srcObject changed and is valid. Attempting playback.`);

            const attemptPlay = () => {
                console.log(`[${username}] Attempting play. Video readyState: ${videoElement.readyState}, paused: ${videoElement.paused}`);
                if (videoElement.readyState >= 2) {
                    videoElement.play()
                        .then(() => {
                            console.log(`[${username}] Remote video playback started successfully.`);
                        })
                        .catch(e => {
                            console.error(`[${username}] Error playing remote video:`, e);
                            if (e.name === "NotAllowedError" && !videoElement.muted) {
                                console.warn(`[${username}] Autoplay blocked. Trying muted playback.`);
                                videoElement.muted = true;
                                videoElement.play().catch(e2 => console.error(`[${username}] Error playing muted video:`, e2));
                            }
                        });
                } else {
                    console.log(`[${username}] Video not ready yet (readyState: ${videoElement.readyState}). Retrying in 100ms.`);
                    setTimeout(attemptPlay, 100);
                }
            };

            const onLoadedMetadata = () => {
                console.log(`[${username}] remoteVideoRef.current loadedmetadata event fired. Video readyState: ${videoElement.readyState}`);
                attemptPlay();
            };

            videoElement.addEventListener('loadedmetadata', onLoadedMetadata);

            if (videoElement.readyState >= 2) {
                console.log(`[${username}] Video already has metadata. Proceeding to immediate play attempt.`);
                attemptPlay();
            }

            return () => {
                console.log(`[${username}] Cleaning up loadedmetadata listener.`);
                if (videoElement) {
                    videoElement.removeEventListener('loadedmetadata', onLoadedMetadata);
                }
            };
        } else {
            console.log(`[${username}] useEffect: remoteVideoRef.current or srcObject is null. No playback attempt.`);
        }
    }, [username]); // --- ESLint Fix: Removed remoteVideoRef.current from dependencies ---


    if (!isLoggedIn) {
        return (
            <div className="login-container">
                <style>{`
                    .login-container { display: flex; justify-content: center; align-items: center; height: 100vh; background-color: #f0f2f5; }
                    form { background: white; padding: 40px; border-radius: 12px; box-shadow: 0 8px 16px rgba(0,0,0,0.1); text-align: center; }
                    h1 { margin-bottom: 10px; } p { margin-bottom: 20px; color: #666; }
                    input { font-size: 1em; padding: 10px; width: 250px; margin-bottom: 20px; border: 1px solid #ccc; border-radius: 8px; }
                    button { font-size: 1.1em; padding: 10px 20px; border: none; border-radius: 8px; background-color: #007bff; color: white; cursor: pointer; }
                    .error { color: red; margin-top: 15px; }
                `}</style>
                <form onSubmit={handleLogin}>
                    <h1>Video Call & Translate</h1>
                    <p>Choose a username to begin.</p>
                    <input type="text" placeholder="Enter your username" value={usernameToRegister} onChange={(e) => setUsernameToRegister(e.target.value)} autoFocus />
                    <button type="submit">Join</button>
                    {loginError && <p className="error">{loginError}</p>}
                </form>
            </div>
        );
    }

    const renderCallControls = () => {
        switch (callStatus) {
            case 'active':
            case 'calling':
            case 'connecting':
                return <button onClick={() => disconnectCall(true)} className="disconnect-btn">Disconnect Call</button>;
            case 'receiving':
                return (
                    <div className="incoming-call">
                        <p>Incoming call from <strong>{incomingCall.from}</strong>!</p>
                        <button onClick={handleAcceptCall} className="accept-btn">Accept</button>
                    </div>
                );
            case 'idle':
            default:
                return (
                    <div className="call-controls">
                        <input type="text" placeholder="Username to call" value={remoteUser} onChange={(e) => setRemoteUser(e.target.value)} />
                        <button onClick={handleCallUser} className="call-btn">Call</button>
                    </div>
                );
        }
    };

    return (
        <div className="App">
            <style>{`
                .App { text-align: center; font-family: sans-serif; padding: 20px; background-color: #f0f2f5; }
                .video-container { display: flex; flex-wrap: wrap; justify-content: center; gap: 20px; margin: 20px 0; }
                .video-box { background: #fff; padding: 10px; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1); width: 100%; max-width: 500px; }
                video { width: 100%; background: #000; border-radius: 4px; aspect-ratio: 4 / 3; object-fit: cover; }
                .controls-container { margin: 20px auto; padding: 20px; background: #fff; border-radius: 8px; max-width: 800px; }
                .call-controls input, .language-selection select { padding: 8px; margin: 5px; border-radius: 4px; border: 1px solid #ccc; }
                button { padding: 10px 20px; border: none; border-radius: 4px; color: white; cursor: pointer; font-size: 1em; }
                .call-btn { background-color: #28a745; }
                .disconnect-btn { background-color: #dc3545; }
                .incoming-call { margin-top: 15px; padding: 10px; background-color: #fff3cd; border: 1px solid #ffeeba; border-radius: 4px; }
                .accept-btn { background-color: #007bff; }
                .subtitle-container { margin: 20px auto; padding: 20px; background: #fff; border-radius: 8px; max-width: 800px; min-height: 100px; text-align: left; }
                .final-subtitle { color: #333; }
                .interim-subtitle { color: #888; font-style: italic; }
            `}</style>
            <h1>Video Call & Live Translate</h1>
            <p>Logged in as: <strong>{username}</strong></p>

            <div className="video-container">
                <div className="video-box">
                    <h2>My Video</h2>
                    <video ref={localVideoRef} autoPlay muted playsInline />
                </div>
                <div className="video-box">
                    <h2>Remote Video ({remoteUser || '...'})</h2>
                    <video ref={remoteVideoRef} autoPlay playsInline />
                </div>
            </div>

            <div className="controls-container">
                {renderCallControls()}
            </div>
            
            <div className="controls-container language-selection">
                <label>My Language:</label>
                <select value={sourceLanguage} onChange={(e) => setSourceLanguage(e.target.value)}>
                    {languages.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
                </select>
                <label>Translate To:</label>
                <select value={targetLanguage} onChange={(e) => setTargetLanguage(e.target.value)}>
                    {languages.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
                </select>
            </div>

            <div className="subtitle-container">
                <h3>Live Subtitles:</h3>
                {subtitles.map((sub, index) => (
                    <p key={index} className={sub.isFinal ? 'final-subtitle' : 'interim-subtitle'}>
                        <strong>{sub.speakerId === username ? 'You' : sub.speakerId}:</strong> {sub.text}
                    </p>
                ))}
            </div>
        </div>
    );
}

export default App;
