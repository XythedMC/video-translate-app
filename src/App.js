// --- ALL IMPORTS MUST BE AT THE TOP ---
import { Buffer } from 'buffer';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import io from 'socket.io-client';
import Peer from 'simple-peer';
// --- END ALL IMPORTS ---

// --- Polyfills (after all imports) ---
window.Buffer = Buffer;
window.process = {
    ...window.process,
    nextTick: setTimeout,
    env: { ...window.process?.env, DEBUG: undefined }
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
        declineButton: 'Decline',
        callButton: 'Call',
        translateToLabel: 'Translate Subtitles To:',
        subtitlesTitle: 'Live Subtitles:',
        subtitleYou: 'You',
        switchCameraButton: 'Switch Camera',
        onlineUsersTitle: 'Online Users',
        noUsersOnline: 'No other users are online.',
        inCallWith: 'In a call with:',
        alertPeerDisconnected: 'The other user has disconnected.',
        alertEnterUserToCall: 'Please enter a username to call.',
        alertWebRTCError: 'WebRTC connection failed. This could be due to a network issue or firewall configuration. Please check the console for details.',
        alertMediaError: 'Could not start your camera or microphone. Please ensure you have granted camera and microphone permissions to this site in your browser settings.',
        alertUserNotOnline: (user) => `The user "${user}" is not online or could not be found.`,
        alertCameraSwitchFailed: 'Could not switch camera. Please ensure the new camera is not in use by another application and that browser permissions are granted.',
        // New translations for recording and UI
        startRecording: 'Start Recording',
        stopRecording: 'Stop Recording',
        recording: 'Recording...',
        downloadRecording: 'Download Recording',
        themeToggle: 'Toggle Theme',
        layoutGrid: 'Grid Layout',
        layoutSpotlight: 'Spotlight Layout',
        layoutSideBySide: 'Side by Side',
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
        declineButton: 'דחה',
        callButton: 'חייג',
        translateToLabel: 'תרגם כתוביות ל:',
        subtitlesTitle: 'כתוביות חיות:',
        subtitleYou: 'אתה',
        switchCameraButton: 'החלף מצלמה',
        onlineUsersTitle: 'משתמשים מחוברים',
        noUsersOnline: 'אין משתמשים אחרים מחוברים.',
        inCallWith: 'בשיחה עם:',
        alertPeerDisconnected: 'המשתמש השני התנתק.',
        alertEnterUserToCall: 'אנא הזן שם משתמש לחיוג.',
        alertWebRTCError: 'חיבור WebRTC נכשל. ייתכן שמדובר בבעיית רשת או חומת אש. אנא בדוק את הקונסול לפרטים.',
        alertMediaError: 'לא ניתן להפעיל את המצלמה או המיקרופון. אנא ודא שהענקת הרשאות מצלמה ומיקרופון לאתר זה בהגדרות הדפדפן שלך.',
        alertUserNotOnline: (user) => `המשתמש "${user}" אינו מחובר או שלא ניתן למצוא אותו.`,
        alertCameraSwitchFailed: 'לא ניתן היה להחליף מצלמה. אנא ודא שהמצלמה החדשה אינה בשימוש על ידי יישום אחר ושהרשאות הדפדפן ניתנו.',
        startRecording: 'התחל הקלטה',
        stopRecording: 'עצור הקלטה',
        recording: 'מקליט...',
        downloadRecording: 'הורד הקלטה',
        themeToggle: 'החלף ערכת נושא',
        layoutGrid: 'פריסת רשת',
        layoutSpotlight: 'פריסת זרקור',
        layoutSideBySide: 'צד לצד',
        virtualBackground: 'רקע וירטואלי',
        blurBackground: 'טשטש רקע',
        noBackground: 'ללא רקע',
        customBackground: 'רקע מותאם אישית',
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
        declineButton: 'Отклонить',
        callButton: 'Позвонить',
        translateToLabel: 'Перевести субтитры на:',
        subtitlesTitle: 'Живые субтитры:',
        subtitleYou: 'Вы',
        switchCameraButton: 'Переключить камеру',
        onlineUsersTitle: 'Пользователи онлайн',
        noUsersOnline: 'Нет других пользователей в сети.',
        inCallWith: 'В разговоре с:',
        alertPeerDisconnected: 'Другой пользователь отключился.',
        alertEnterUserToCall: 'Пожалуйста, введите имя пользователя для звонка.',
        alertWebRTCError: 'Сбой подключения WebRTC. Это может быть связано с проблемой в сети или конфигурацией брандмауэра. Пожалуйста, проверьте консоль для получения подробной информации.',
        alertMediaError: 'Не удалось запустить камеру или микрофон. Убедитесь, что вы предоставили разрешения на доступ к камере и микрофону для этого сайта в настройках вашего браузера.',
        alertUserNotOnline: (user) => `Пользователь "${user}" не в сети или не может быть найден.`,
        alertCameraSwitchFailed: 'Не удалось переключить камеру. Убедитесь, что новая камера не используется другим приложением и что предоставлены разрешения браузера.',
        startRecording: 'Начать запись',
        stopRecording: 'Остановить запись',
        recording: 'Запись...',
        downloadRecording: 'Скачать запись',
        themeToggle: 'Переключить тему',
        layoutGrid: 'Сетка',
        layoutSpotlight: 'Прожектор',
        layoutSideBySide: 'Рядом',
        virtualBackground: 'Виртуальный фон',
        blurBackground: 'Размыть фон',
        noBackground: 'Без фона',
        customBackground: 'Пользовательский фон',
    },
};
// --- END UI Text Translations ---

const SIGNALING_SERVER_URL = process.env.NODE_ENV === 'production'
    ? 'https://video-translate-api-6owl.onrender.com'
    : 'http://localhost:5000';

const ICE_SERVERS = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
];

const STT_SOURCE_LANGUAGES = ['en-US', 'he-IL', 'ru-RU'];


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
    const [targetLanguage, setTargetLanguage] = useState('es');
    const [videoDevices, setVideoDevices] = useState([]);
    const [currentCameraIndex, setCurrentCameraIndex] = useState(0);
    const [onlineUsers, setOnlineUsers] = useState([]);
    // --- Connection Quality State ---
    const [connectionQuality, setConnectionQuality] = useState('unknown'); // 'good', 'fair', 'poor', 'unknown'
    const qualityIntervalRef = useRef();

    // --- Connection State Management ---
    const [reconnectAttempts, setReconnectAttempts] = useState(0);
    const maxReconnectAttempts = 3;
    const reconnectTimeoutRef = useRef();
    const connectionStateRef = useRef('new');

    // --- Connection Recovery Logic ---
    const attemptReconnection = useCallback(async () => {
        if (reconnectAttempts >= maxReconnectAttempts || callStatus === 'idle') {
            console.log('Max reconnection attempts reached or call ended');
            connectionStateRef.current = 'failed';
            return;
        }

        console.log(`Attempting reconnection ${reconnectAttempts + 1}/${maxReconnectAttempts}`);
        connectionStateRef.current = 'reconnecting';
        setReconnectAttempts(prev => prev + 1);

        try {
            // Wait a bit before attempting reconnection
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            if (callStatus !== 'active' && callStatus !== 'connecting') {
                console.log('Call no longer active, stopping reconnection');
                return;
            }

            // Try to re-establish the peer connection
            if (peerRef.current && peerRef.current._pc) {
                const pc = peerRef.current._pc;
                
                // Check if connection is actually broken
                if (pc.connectionState === 'connected' || pc.connectionState === 'connecting') {
                    console.log('Connection is actually fine, no need to reconnect');
                    connectionStateRef.current = 'connected';
                    setReconnectAttempts(0);
                    return;
                }

                // Force renegotiation
                console.log('Forcing renegotiation...');
                if (peerRef.current.signal) {
                    // Send a new offer/answer to trigger renegotiation
                    const offer = await pc.createOffer();
                    await pc.setLocalDescription(offer);
                    peerRef.current.signal(offer);
                }
            }
        } catch (error) {
            console.error('Reconnection attempt failed:', error);
            // Schedule next attempt
            reconnectTimeoutRef.current = setTimeout(attemptReconnection, 5000);
        }
    }, [reconnectAttempts, callStatus]);

    const resetConnectionState = useCallback(() => {
        connectionStateRef.current = 'new';
        setReconnectAttempts(0);
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }
    }, []);

    // --- Connection State Monitoring ---
    useEffect(() => {
        if (!peerRef.current || !peerRef.current._pc) return;

        const pc = peerRef.current._pc;
        
        const handleConnectionStateChange = () => {
            const state = pc.connectionState;
            console.log('WebRTC connection state changed:', state);
            
            switch (state) {
                case 'new':
                    connectionStateRef.current = 'new';
                    break;
                case 'connecting':
                    connectionStateRef.current = 'connecting';
                    break;
                case 'connected':
                    connectionStateRef.current = 'connected';
                    setReconnectAttempts(0); // Reset attempts on successful connection
                    break;
                case 'disconnected':
                    connectionStateRef.current = 'disconnected';
                    // Start reconnection process
                    if (callStatus === 'active') {
                        attemptReconnection();
                    }
                    break;
                case 'failed':
                    connectionStateRef.current = 'failed';
                    // Try reconnection if we haven't exceeded attempts
                    if (callStatus === 'active' && reconnectAttempts < maxReconnectAttempts) {
                        attemptReconnection();
                    }
                    break;
                case 'closed':
                    connectionStateRef.current = 'disconnected';
                    break;
                default:
                    break;
            }
        };

        const handleIceConnectionStateChange = () => {
            const iceState = pc.iceConnectionState;
            console.log('ICE connection state:', iceState);
            
            if (iceState === 'failed' && callStatus === 'active') {
                console.log('ICE connection failed, attempting recovery...');
                // Try to restart ICE
                try {
                    pc.restartIce();
                } catch (error) {
                    console.error('Failed to restart ICE:', error);
                }
            }
        };

        pc.addEventListener('connectionstatechange', handleConnectionStateChange);
        pc.addEventListener('iceconnectionstatechange', handleIceConnectionStateChange);

        // Initial state
        handleConnectionStateChange();

        return () => {
            pc.removeEventListener('connectionstatechange', handleConnectionStateChange);
            pc.removeEventListener('iceconnectionstatechange', handleIceConnectionStateChange);
        };
    }, [callStatus, attemptReconnection, reconnectAttempts]);

    // --- Cleanup on call end ---
    useEffect(() => {
        if (callStatus === 'idle') {
            resetConnectionState();
        }
    }, [callStatus, resetConnectionState]);

    // --- Enhanced Audio Constraints ---
    const getAudioConstraints = useCallback(() => {
        return {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 48000,
            channelCount: 1, // Mono for better processing
            latency: 0.01, // Low latency
            googEchoCancellation: true,
            googNoiseSuppression: true,
            googAutoGainControl: true,
            googHighpassFilter: true,
            googTypingNoiseDetection: true,
            googAudioMirroring: false
        };
    }, []);

    // --- Updated Video Constraints with Audio ---
    const getVideoConstraints = useCallback((quality = 'high') => {
        const baseConstraints = videoDevices.length > 0 ? { deviceId: { exact: videoDevices[currentCameraIndex].deviceId } } : {};
        
        switch (quality) {
            case 'high':
                return {
                    ...baseConstraints,
                    width: { ideal: 1920, max: 1920 },
                    height: { ideal: 1080, max: 1080 },
                    frameRate: { ideal: 30, max: 30 }
                };
            case 'medium':
                return {
                    ...baseConstraints,
                    width: { ideal: 1280, max: 1280 },
                    height: { ideal: 720, max: 720 },
                    frameRate: { ideal: 25, max: 25 }
                };
            case 'low':
                return {
                    ...baseConstraints,
                    width: { ideal: 640, max: 640 },
                    height: { ideal: 480, max: 480 },
                    frameRate: { ideal: 15, max: 15 }
                };
            default:
                return baseConstraints;
        }
    }, [videoDevices, currentCameraIndex]);

    // --- Enhanced Media Stream Creation ---
    const createMediaStream = useCallback(async (videoConstraints) => {
        try {
            const audioConstraints = getAudioConstraints();
            console.log('Creating media stream with audio constraints:', audioConstraints);
            
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: videoConstraints, 
                audio: audioConstraints 
            });
            
            // Log audio track settings for debugging
            const audioTrack = stream.getAudioTracks()[0];
            if (audioTrack) {
                const settings = audioTrack.getSettings();
                console.log('Audio track settings:', settings);
            }
            
            return stream;
        } catch (error) {
            console.error('Failed to create media stream with audio processing:', error);
            // Fallback to basic audio if advanced features fail
            try {
                const fallbackStream = await navigator.mediaDevices.getUserMedia({ 
                    video: videoConstraints, 
                    audio: true 
                });
                console.log('Using fallback audio settings');
                return fallbackStream;
            } catch (fallbackError) {
                console.error('Fallback audio also failed:', fallbackError);
                throw fallbackError;
            }
        }
    }, [getAudioConstraints]);

    const adjustVideoQuality = useCallback(async (newQuality) => {
        if (newQuality === 'high' || !localStreamRef.current) return;
        
        try {
            console.log(`Adjusting video quality from high to ${newQuality}`);
            const newConstraints = getVideoConstraints(newQuality);
            const newStream = await createMediaStream(newConstraints);
            
            // Replace video track
            const oldVideoTrack = localStreamRef.current.getVideoTracks()[0];
            const newVideoTrack = newStream.getVideoTracks()[0];
            
            if (oldVideoTrack && newVideoTrack) {
                // Update local video display
                if (localVideoRef.current) {
                    const displayStream = new MediaStream([newVideoTrack, ...localStreamRef.current.getAudioTracks()]);
                    localVideoRef.current.srcObject = displayStream;
                }
                
                // Update peer connection
                if (peerRef.current?.streams) {
                    peerRef.current.replaceTrack(oldVideoTrack, newVideoTrack, localStreamRef.current);
                }
                
                // Update local stream
                oldVideoTrack.stop();
                localStreamRef.current.removeTrack(oldVideoTrack);
                localStreamRef.current.addTrack(newVideoTrack);
                
                console.log(`Video quality adjusted to ${newQuality}`);
            }
            
            // Stop the new stream (we only needed the track)
            newStream.getTracks().forEach(track => {
                if (track !== newVideoTrack) track.stop();
            });
            
        } catch (error) {
            console.error('Failed to adjust video quality:', error);
        }
    }, [getVideoConstraints, createMediaStream]);

    // --- Video Quality Settings ---
    const [selectedQuality, setSelectedQuality] = useState('high');

    const handleQualityChange = useCallback(async (newQuality) => {
        if (newQuality === selectedQuality) return;
        
        setSelectedQuality(newQuality);
        
        // If in manual mode, apply the quality change immediately
        if (callStatus === 'active') {
            await adjustVideoQuality(newQuality);
        }
    }, [selectedQuality, callStatus, adjustVideoQuality]);

    const languages = [
        { code: 'en-US', name: 'English (US)' }, { code: 'es', name: 'Spanish' },
        { code: 'fr', name: 'French' }, { code: 'de', name: 'German' },
        { code: 'he-IL', name: 'Hebrew (Israel)' }, { code: 'ja', name: 'Japanese' },
        { code: 'zh-CN', name: 'Chinese (Mandarin)' }, { code: 'ar', name: 'Arabic' },
        { code: 'ru-RU', 'name': 'Russian' },
    ];

    const t = uiTexts[uiLanguage];

    const cleanupCall = useCallback(() => {
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

    const handleDeclineCall = useCallback(() => {
        console.log('Declining incoming call');
        setIncomingCall(null);
        setCallStatus('idle');
        // Optionally emit a decline event to the server
        // socketRef.current?.emit('declineCall', { to: incomingCall?.from });
    }, []);

    useEffect(() => {
        if (!isLoggedIn) return;
        const getDevices = async () => {
            try {
                await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                const devices = await navigator.mediaDevices.enumerateDevices();
                const cameras = devices.filter(device => device.kind === 'videoinput');
                setVideoDevices(cameras);
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

        socket.on('connect', () => {
            console.log('Successfully connected to signaling server!');
            socket.emit('registerUsername', username);
        });
        
        socket.on('registrationSuccess', (registeredUsername) => {
            console.log('Registration successful for:', registeredUsername);
        });
        
        socket.on('connect_error', (err) => {
            console.error('Connection to signaling server failed:', err.message);
            setLoginError(`Failed to connect to the server. Please check your connection and try again.`);
            setIsLoggedIn(false);
        });
        
        socket.on('registrationFailed', (error) => {
            setLoginError(error);
            setIsLoggedIn(false);
            socket.disconnect();
        });
        
        socket.on('updateOnlineUsers', (users) => {
            setOnlineUsers(users.filter(u => u !== username));
        });
        
        // FIXED: Simplified incoming call handling
        socket.on('incomingCall', ({ from, signalData }) => {
            console.log('Received incoming call from:', from, 'Signal type:', signalData?.type);
            
            // Prevent new call offers if already in a call
            if (callStatus !== 'idle') {
                console.log("Ignoring incoming call, already in a call. Current status:", callStatus);
                return;
            }
            
            // Check if this is an offer (initial call signal)
            if (signalData && (signalData.type === 'offer' || signalData.sdp)) {
                console.log('Setting up incoming call UI for user:', from);
                console.log('Current call status before setting:', callStatus);
                setIncomingCall({ from, signalData });
                setCallStatus('receiving');
                console.log('Call status set to receiving for incoming call from:', from);
            } else if (signalData && signalData.type === 'candidate') {
                // Handle ICE candidates
                if (peerRef.current && peerRef.current.signal) {
                    console.log('Adding ICE candidate to existing peer');
                    peerRef.current.signal(signalData);
                } else {
                    console.log('Storing ICE candidate for later');
                    setPendingCandidates(prev => [...prev, signalData]);
                }
            }
        });
        
        socket.on('callAccepted', ({ signal, from }) => {
            console.log('Call accepted by:', from);
            if (peerRef.current) {
                peerRef.current.signal(signal);
                setCallStatus('active');
                setRemoteUser(from);
            } else {
                console.error('No peer reference when call was accepted');
            }
        });
        
        socket.on('callFailed', ({ user }) => {
            console.log('Call failed for user:', user);
            alert(t.alertUserNotOnline(user));
            setCallStatus('idle');
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
            console.log('Peer disconnected');
            alert(t.alertPeerDisconnected);
            cleanupCall();
        });
        
        socket.on('disconnect', () => {
            console.log('Socket disconnected');
            setIsLoggedIn(false);
            cleanupCall();
        });

        return () => {
            socket.disconnect();
            cleanupCall();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isLoggedIn, username, cleanupCall, t]);

    useEffect(() => {
        if (isLoggedIn && socketRef.current?.connected) {
            socketRef.current.emit('updateLanguageSettings', { targetLanguage, sttSourceLanguages: STT_SOURCE_LANGUAGES });
        }
    }, [targetLanguage, isLoggedIn]);

    // Handle call status changes without recreating socket
    useEffect(() => {
        if (socketRef.current?.connected) {
            console.log('Call status changed to:', callStatus);
        }
    }, [callStatus]);

    // --- Connection Quality Monitoring with Bandwidth Adaptation ---
    // --- Updated Bandwidth Adaptation (respects manual mode) ---
    useEffect(() => {
        if (callStatus !== 'active' || !peerRef.current || !peerRef.current._pc) {
            setConnectionQuality('unknown');
            if (qualityIntervalRef.current) {
                clearInterval(qualityIntervalRef.current);
                qualityIntervalRef.current = null;
            }
            return;
        }
        const pc = peerRef.current._pc;
        async function checkQuality() {
            try {
                const stats = await pc.getStats();
                let outbound, inbound;
                stats.forEach(report => {
                    if (report.type === 'outbound-rtp' && report.kind === 'video') outbound = report;
                    if (report.type === 'inbound-rtp' && report.kind === 'video') inbound = report;
                });
                // Use outbound for sender, inbound for receiver
                const packetsLost = (inbound?.packetsLost || outbound?.packetsLost || 0);
                const packetsSent = (outbound?.packetsSent || 1);
                const bitrate = outbound?.bitrateMean || outbound?.bytesSent ? ((outbound.bytesSent * 8) / ((outbound.timestamp - (outbound._lastTimestamp || outbound.timestamp - 2000)) / 1000)) : 0;
                // Save last timestamp for next calculation
                if (outbound) outbound._lastTimestamp = outbound.timestamp;
                // Heuristic: <2% loss = good, <8% = fair, else poor
                const lossPercent = packetsLost && packetsSent ? (packetsLost / packetsSent) * 100 : 0;
                let quality = 'good';
                if (lossPercent > 8 || bitrate < 200_000) quality = 'poor';
                else if (lossPercent > 2 || bitrate < 500_000) quality = 'fair';
                setConnectionQuality(quality);
                
                // Bandwidth adaptation logic (only if not in manual mode)
                if (callStatus === 'active') {
                    const currentQuality = selectedQuality;
                    let targetQuality = currentQuality;
                    
                    if (quality === 'poor' && currentQuality !== 'low') {
                        targetQuality = 'low';
                    } else if (quality === 'fair' && currentQuality === 'high') {
                        targetQuality = 'medium';
                    } else if (quality === 'good' && currentQuality === 'low') {
                        targetQuality = 'medium';
                    } else if (quality === 'good' && currentQuality === 'medium' && lossPercent < 1 && bitrate > 1_000_000) {
                        targetQuality = 'high';
                    }
                    
                    if (targetQuality !== currentQuality) {
                        handleQualityChange(targetQuality);
                    }
                }
            } catch (e) {
                setConnectionQuality('unknown');
            }
        }
        qualityIntervalRef.current = setInterval(checkQuality, 2000);
        return () => {
            if (qualityIntervalRef.current) clearInterval(qualityIntervalRef.current);
            qualityIntervalRef.current = null;
        };
    }, [callStatus, handleQualityChange, selectedQuality]);

    // --- ScriptProcessor Fallback (for older browsers) ---
    const createScriptProcessorFallback = useCallback(async (stream, socket) => {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Resume audio context if it's suspended
            if (audioContext.state === 'suspended') {
                await audioContext.resume();
            }
            
            const sampleRate = audioContext.sampleRate;
            const source = audioContext.createMediaStreamSource(stream);
            const processor = audioContext.createScriptProcessor(4096, 1, 1);
            
            let isProcessing = false;
            
            processor.onaudioprocess = (event) => {
                if (isProcessing) return; // Prevent overlapping processing
                isProcessing = true;
                
                try {
                    const inputData = event.inputBuffer.getChannelData(0);
                    const buffer = new ArrayBuffer(inputData.length * 2);
                    const view = new DataView(buffer);
                    for (let i = 0; i < inputData.length; i++) {
                        view.setInt16(i * 2, inputData[i] * 0x7FFF, true);
                    }
                    
                    // Check if socket is still connected before sending
                    if (socket && socket.connected && socket.connected === true) {
                        socket.emit('audioChunk', { chunk: buffer, sampleRate });
                    }
                } catch (error) {
                    console.error('Audio processing error:', error);
                } finally {
                    isProcessing = false;
                }
            };
            
            source.connect(processor);
            processor.connect(audioContext.destination);
            
            return {
                stop: () => {
                    try {
                        source.disconnect();
                        processor.disconnect();
                        if (audioContext.state !== 'closed') {
                            audioContext.close();
                        }
                    } catch (error) {
                        console.error('Error stopping audio processor:', error);
                    }
                }
            };
        } catch (error) {
            console.error('Error creating audio processor:', error);
            return {
                stop: () => {}
            };
        }
    }, []);

    // --- AudioWorklet Processor (Modern Audio Processing) ---
    const createAudioWorkletProcessor = useCallback(async (stream, socket) => {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Resume audio context if it's suspended
            if (audioContext.state === 'suspended') {
                await audioContext.resume();
            }

            // Create audio worklet processor
            const workletCode = `
                class AudioProcessor extends AudioWorkletProcessor {
                    constructor() {
                        super();
                        this.isProcessing = false;
                    }
                    
                    process(inputs, outputs, parameters) {
                        if (this.isProcessing) return true;
                        this.isProcessing = true;
                        
                        try {
                            const input = inputs[0];
                            if (input && input.length > 0) {
                                const inputData = input[0];
                                if (inputData && inputData.length > 0) {
                                    // Convert to 16-bit PCM
                                    const buffer = new ArrayBuffer(inputData.length * 2);
                                    const view = new DataView(buffer);
                                    for (let i = 0; i < inputData.length; i++) {
                                        view.setInt16(i * 2, inputData[i] * 0x7FFF, true);
                                    }
                                    
                                    // Send to main thread
                                    this.port.postMessage({
                                        type: 'audioData',
                                        buffer: buffer,
                                        sampleRate: sampleRate
                                    });
                                }
                            }
                        } catch (error) {
                            console.error('AudioWorklet processing error:', error);
                        } finally {
                            this.isProcessing = false;
                        }
                        
                        return true;
                    }
                }
                
                registerProcessor('audio-processor', AudioProcessor);
            `;

            // Create blob URL for worklet
            const blob = new Blob([workletCode], { type: 'application/javascript' });
            const workletUrl = URL.createObjectURL(blob);
            
            // Load the worklet
            await audioContext.audioWorklet.addModule(workletUrl);
            
            const source = audioContext.createMediaStreamSource(stream);
            const processor = new AudioWorkletNode(audioContext, 'audio-processor');
            
            // Handle audio data from worklet
            processor.port.onmessage = (event) => {
                if (event.data.type === 'audioData') {
                    const { buffer, sampleRate } = event.data;
                    
                    // Check if socket is still connected before sending
                    if (socket && socket.connected && socket.connected === true) {
                        socket.emit('audioChunk', { chunk: buffer, sampleRate });
                    }
                }
            };
            
            source.connect(processor);
            processor.connect(audioContext.destination);
            
            return {
                stop: () => {
                    try {
                        source.disconnect();
                        processor.disconnect();
                        if (audioContext.state !== 'closed') {
                            audioContext.close();
                        }
                        URL.revokeObjectURL(workletUrl);
                    } catch (error) {
                        console.error('Error stopping audio worklet processor:', error);
                    }
                }
            };
        } catch (error) {
            console.error('Error creating audio worklet processor:', error);
            // Fallback to ScriptProcessor if AudioWorklet is not supported
            return createScriptProcessorFallback(stream, socket);
        }
    }, [createScriptProcessorFallback]);

    

    // --- Updated Audio Processor Creation ---
    const createAudioProcessor = useCallback(async (stream, socket) => {
        // Try AudioWorklet first, fallback to ScriptProcessor
        return await createAudioWorkletProcessor(stream, socket);
    }, [createAudioWorkletProcessor]);

    const setupCall = async (isInitiator, initialSignal = null, userToCall = null) => {
        console.log('Setting up call - Initiator:', isInitiator, 'User to call:', userToCall);
        try {
            const videoConstraint = getVideoConstraints();
            const stream = await createMediaStream(videoConstraint);
            localStreamRef.current = stream;
            if (localVideoRef.current) localVideoRef.current.srcObject = stream;
            
            // Only start audio processing after peer connection is established
            // audioProcessorRef.current = await createAudioProcessor(stream, socketRef.current);
            
            const peer = new Peer({ 
                initiator: isInitiator, 
                trickle: true, 
                stream: stream, 
                config: { iceServers: ICE_SERVERS } 
            });
            peerRef.current = peer;

            peer.on('signal', (data) => {
                // Only log important signals, not every ICE candidate
                if (data.type === 'offer' || data.type === 'answer') {
                    console.log('Peer signal event:', data.type, 'Initiator:', isInitiator);
                }
                const target = isInitiator ? userToCall : incomingCall.from;
                const event = isInitiator ? 'outgoingCall' : 'answerCall';
                const payload = isInitiator ? { userToCall: target, signalData: data } : { signal: data, to: target };
                socketRef.current.emit(event, payload);
            });

            peer.on('stream', (stream) => {
                console.log('Received remote stream');
                if (remoteVideoRef.current) {
                    remoteVideoRef.current.srcObject = stream;
                }
            });

            peer.on('connect', async () => {
                console.log('Peer connected successfully');
                setCallStatus('active');
                connectionStateRef.current = 'connected';
                setReconnectAttempts(0);
                
                // Start audio processing only after peer connection is established
                try {
                    audioProcessorRef.current = await createAudioProcessor(localStreamRef.current, socketRef.current);
                    console.log('Audio processor started successfully');
                } catch (error) {
                    console.error('Failed to start audio processor:', error);
                }
            });
            
            peer.on('close', () => {
                console.log('Peer connection closed');
                connectionStateRef.current = 'disconnected';
                cleanupCall();
            });
            
            peer.on('error', (err) => {
                console.error(`Peer error:`, err);
                connectionStateRef.current = 'failed';
                
                // Try to recover from certain errors
                if (callStatus === 'active' && reconnectAttempts < maxReconnectAttempts) {
                    console.log('Attempting to recover from peer error...');
                    attemptReconnection();
                } else {
                    alert(t.alertWebRTCError);
                    cleanupCall();
                }
            });
            
            if (!isInitiator && initialSignal) {
                console.log('Signaling with initial signal for incoming call');
                peer.signal(initialSignal);
                // Process any pending ICE candidates
                pendingCandidates.forEach(candidate => {
                    console.log('Processing pending ICE candidate');
                    peer.signal(candidate);
                });
                setPendingCandidates([]);
            }
        } catch (err) {
            console.error(`Failed to get media stream:`, err);
            alert(t.alertMediaError);
            cleanupCall();
        }
    };
    
    const handleSwitchCamera = useCallback(async () => {
        if (videoDevices.length < 2 || !localStreamRef.current) return;
        const nextIndex = (currentCameraIndex + 1) % videoDevices.length;
        const newDeviceId = videoDevices[nextIndex].deviceId;
        const oldTrack = localStreamRef.current.getVideoTracks()[0];
        if (!oldTrack) return;
        try {
            const newStream = await navigator.mediaDevices.getUserMedia({ video: { deviceId: { exact: newDeviceId } } });
            const newVideoTrack = newStream.getVideoTracks()[0];
            if (!newVideoTrack) return;
            if (localVideoRef.current) {
                const displayStream = new MediaStream([newVideoTrack, ...localStreamRef.current.getAudioTracks()]);
                localVideoRef.current.srcObject = displayStream;
            }
            if (peerRef.current?.streams) {
                 peerRef.current.replaceTrack(oldTrack, newVideoTrack, localStreamRef.current);
            }
            oldTrack.stop();
            localStreamRef.current.removeTrack(oldTrack);
            localStreamRef.current.addTrack(newVideoTrack);
            setCurrentCameraIndex(nextIndex);
        } catch (err) {
            console.error('Error switching camera:', err);
            alert(t.alertCameraSwitchFailed);
        }
    }, [videoDevices, currentCameraIndex, t.alertCameraSwitchFailed]);

    const handleCallUser = (userToCall) => {
        console.log('Initiating call to:', userToCall);
        if (!userToCall) return;
        setRemoteUser(userToCall);
        setCallStatus('calling');
        setupCall(true, null, userToCall);
    };

    const handleAcceptCall = () => {
        console.log('Accepting call from:', incomingCall?.from);
        if (!incomingCall?.from || !incomingCall?.signalData) {
            console.error('Missing incoming call data:', incomingCall);
            return;
        }
        setCallStatus('connecting'); 
        setRemoteUser(incomingCall.from);
        setupCall(false, incomingCall.signalData, null); 
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

    // --- Media and Feature Toggles ---
    const [isRecording, setIsRecording] = useState(false);
    const [recordingBlob, setRecordingBlob] = useState(null);
    const [recordingTime, setRecordingTime] = useState(0);
    const mediaRecorderRef = useRef(null);
    const recordingIntervalRef = useRef(null);

    // --- UI/UX State ---
    const [theme, setTheme] = useState('light'); // 'light' or 'dark'

    // --- Recording Functions ---
    const startRecording = useCallback(async () => {
        if (!localStreamRef.current || !remoteVideoRef.current) return;
        
        try {
            // Create a combined stream for recording
            const localVideo = localStreamRef.current.getVideoTracks()[0];
            const localAudio = localStreamRef.current.getAudioTracks()[0];
            const remoteVideo = remoteVideoRef.current.srcObject?.getVideoTracks()[0];
            const remoteAudio = remoteVideoRef.current.srcObject?.getAudioTracks()[0];
            
            const tracks = [];
            if (localVideo) tracks.push(localVideo);
            if (localAudio) tracks.push(localAudio);
            if (remoteVideo) tracks.push(remoteVideo);
            if (remoteAudio) tracks.push(remoteAudio);
            
            const combinedStream = new MediaStream(tracks);
            
            const options = {
                mimeType: 'video/webm;codecs=vp9,opus',
                videoBitsPerSecond: 2500000,
                audioBitsPerSecond: 128000
            };
            
            mediaRecorderRef.current = new MediaRecorder(combinedStream, options);
            const chunks = [];
            
            mediaRecorderRef.current.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    chunks.push(event.data);
                }
            };
            
            mediaRecorderRef.current.onstop = () => {
                const blob = new Blob(chunks, { type: 'video/webm' });
                setRecordingBlob(blob);
                setIsRecording(false);
                setRecordingTime(0);
                if (recordingIntervalRef.current) {
                    clearInterval(recordingIntervalRef.current);
                }
            };
            
            mediaRecorderRef.current.start();
            setIsRecording(true);
            setRecordingTime(0);
            
            // Update recording time every second
            recordingIntervalRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);
            
        } catch (error) {
            console.error('Failed to start recording:', error);
        }
    }, []);

    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
        }
    }, [isRecording]);

    const downloadRecording = useCallback(() => {
        if (recordingBlob) {
            const url = URL.createObjectURL(recordingBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `video-call-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.webm`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
    }, [recordingBlob]);

    // --- Theme and Layout Functions ---
    const toggleTheme = useCallback(() => {
        setTheme(prev => prev === 'light' ? 'dark' : 'light');
    }, []);


    // Cleanup recording on unmount
    useEffect(() => {
        return () => {
            if (recordingIntervalRef.current) {
                clearInterval(recordingIntervalRef.current);
            }
            if (mediaRecorderRef.current && isRecording) {
                mediaRecorderRef.current.stop();
            }
        };
    }, [isRecording]);

    // Add disconnectCall function
    const disconnectCall = useCallback(() => {
        // End the call and reset state
        if (socketRef.current) {
            socketRef.current.emit('disconnectCall');
        }
        if (peerRef.current) {
            peerRef.current.destroy();
            peerRef.current = null;
        }
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => track.stop());
            localStreamRef.current = null;
        }
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
        setCallStatus('idle');
        setRemoteUser('');
        setIncomingCall(null);
        setPendingCandidates([]);
        setSubtitles([]);
    }, []);

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

    // Centralized call controls logic
    const renderCallControls = () => {
        console.log('renderCallControls - callStatus:', callStatus, 'incomingCall:', incomingCall);
        
        if (callStatus === 'receiving') {
            console.log('Rendering incoming call UI for:', incomingCall?.from);
            return (
                <div className="incoming-call">
                    <p>{t.incomingCallFrom} <strong>{incomingCall.from}</strong>!</p>
                    <div className="call-actions">
                        <button onClick={handleAcceptCall} className="accept-btn">{t.acceptButton}</button>
                        <button onClick={handleDeclineCall} className="decline-btn">{t.declineButton}</button>
                    </div>
                </div>
            );
        }

        if (callStatus !== 'idle') {
            return (
                <div className="active-call-controls">
                    <p>{t.inCallWith} <strong>{remoteUser}</strong></p>
                </div>
            );
        }

        return null;
    };

    return (
        <div className={`App ${theme}-theme`} dir={uiLanguage === 'he' ? 'rtl' : 'ltr'}>
            <style>{`
                .App { 
                    display: grid; 
                    grid-template-areas: "header" "user-info" "videos" "online-users" "controls" "subtitles"; 
                    grid-template-rows: auto auto 1fr auto auto auto; 
                    gap: 20px; 
                    text-align: center; 
                    font-family: sans-serif; 
                    padding: 20px; 
                    min-height: 100vh; 
                    transition: all 0.3s ease;
                }
                
                .light-theme {
                    background-color: #f0f2f5;
                    color: #333;
                }
                
                .dark-theme {
                    background-color: #1a1a1a;
                    color: #ffffff;
                }
                
                .header { grid-area: header; position: relative; }
                .user-info { grid-area: user-info; }
                .video-container { 
                    grid-area: videos; 
                    display: flex; 
                    flex-wrap: wrap; 
                    justify-content: center; 
                    gap: 20px; 
                    position: relative;
                }
                
                .video-container.grid-layout {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
                    gap: 20px;
                }
                
                .video-container.spotlight-layout {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                }
                
                .video-container.side-by-side-layout {
                    display: flex;
                    justify-content: center;
                    gap: 20px;
                }
                
                .online-users-container { 
                    grid-area: online-users; 
                    margin: 0 auto; 
                    padding: 20px; 
                    border-radius: 8px; 
                    max-width: 800px; 
                    width: 100%; 
                    box-shadow: 0 4px 8px rgba(0,0,0,0.05); 
                    transition: all 0.3s ease;
                }
                
                .light-theme .online-users-container {
                    background: #fff;
                }
                
                .dark-theme .online-users-container {
                    background: #2d2d2d;
                    box-shadow: 0 4px 8px rgba(0,0,0,0.3);
                }
                
                .online-users-list { display: flex; flex-direction: column; gap: 10px; list-style: none; padding: 0; }
                .online-user-item { 
                    display: flex; 
                    justify-content: space-between; 
                    align-items: center; 
                    padding: 12px; 
                    border-radius: 8px; 
                    transition: all 0.3s ease;
                }
                
                .light-theme .online-user-item {
                    background-color: #f8f9fa;
                }
                
                .dark-theme .online-user-item {
                    background-color: #3d3d3d;
                }
                
                .online-user-item span { font-weight: 500; }
                .controls-container { grid-area: controls; margin: 0 auto; padding: 0 20px; max-width: 800px; width: 100%; }
                .language-selection { 
                    padding: 20px; 
                    border-radius: 8px; 
                    transition: all 0.3s ease;
                }
                
                .light-theme .language-selection {
                    background: #fff;
                }
                
                .dark-theme .language-selection {
                    background: #2d2d2d;
                }
                
                .subtitle-container { 
                    grid-area: subtitles; 
                    margin: 0 auto; 
                    padding: 20px; 
                    border-radius: 8px; 
                    max-width: 800px; 
                    min-height: 100px; 
                    text-align: start; 
                    width: 100%;
                    transition: all 0.3s ease;
                }
                
                .light-theme .subtitle-container {
                    background: #fff;
                }
                
                .dark-theme .subtitle-container {
                    background: #2d2d2d;
                }
                
                .ui-language-selection { position: absolute; top: 0; right: 0; }
                .App[dir="rtl"] .ui-language-selection { right: auto; left: 0; }
                .ui-language-selection select { 
                    padding: 8px; 
                    border-radius: 4px; 
                    border: 1px solid #ccc; 
                    background: #fff;
                    color: #333;
                }
                
                .dark-theme .ui-language-selection select {
                    background: #3d3d3d;
                    color: #fff;
                    border-color: #555;
                }
                
                .video-box { 
                    background: #fff; 
                    padding: 10px; 
                    border-radius: 8px; 
                    box-shadow: 0 4px 8px rgba(0,0,0,0.1); 
                    width: 100%; 
                    max-width: 500px; 
                    transition: all 0.3s ease;
                }
                
                .dark-theme .video-box {
                    background: #2d2d2d;
                    box-shadow: 0 4px 8px rgba(0,0,0,0.3);
                }
                
                .video-box button { background-color: #6c757d; margin-top: 10px; }
                video { 
                    width: 100%; 
                    background: #000; 
                    border-radius: 4px; 
                    aspect-ratio: 4 / 3; 
                    object-fit: cover; 
                }
                .language-selection select { 
                    padding: 8px; 
                    margin-left: 10px; 
                    border-radius: 4px; 
                    border: 1px solid #ccc; 
                    background: #fff;
                    color: #333;
                }
                
                .dark-theme .language-selection select {
                    background: #3d3d3d;
                    color: #fff;
                    border-color: #555;
                }
                
                button { 
                    padding: 10px 20px; 
                    border: none; 
                    border-radius: 4px; 
                    color: white; 
                    cursor: pointer; 
                    font-size: 1em; 
                    transition: background-color 0.2s; 
                }
                button:disabled { background-color: #a0a0a0; cursor: not-allowed; }
                .call-btn { background-color: #28a745; }
                .call-btn:hover:not(:disabled) { background-color: #218838; }
                .disconnect-btn { background-color: #dc3545; }
                .disconnect-btn:hover { background-color: #c82333; }
                .incoming-call, .active-call-controls { 
                    text-align: center; 
                    padding: 15px; 
                    border-radius: 8px; 
                    transition: all 0.3s ease;
                }
                
                .light-theme .incoming-call {
                    background-color: #fff3cd;
                    border: 1px solid #ffeeba;
                }
                
                .light-theme .active-call-controls {
                    background-color: #e2e3e5;
                    border-color: #d6d8db;
                }
                
                .dark-theme .incoming-call {
                    background-color: #3d3d3d;
                    border: 1px solid #555;
                }
                
                .dark-theme .active-call-controls {
                    background-color: #3d3d3d;
                    border-color: #555;
                }
                
                .incoming-call p, .active-call-controls p { margin: 0 0 10px 0; }
                .accept-btn { background-color: #007bff; }
                .accept-btn:hover { background-color: #0069d9; }
                
                /* Recording indicator */
                .recording-indicator {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: #dc3545;
                    color: white;
                    padding: 8px 12px;
                    border-radius: 20px;
                    font-size: 14px;
                    z-index: 1000;
                    animation: pulse 2s infinite;
                }
                
                @keyframes pulse {
                    0% { opacity: 1; }
                    50% { opacity: 0.7; }
                    100% { opacity: 1; }
                }
                
                /* Simple Controls */
                .simple-controls {
                    position: fixed;
                    top: 20px;
                    left: 20px;
                    display: flex;
                    gap: 10px;
                    z-index: 1000;
                }
                
                .control-btn {
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    border: none;
                    background: rgba(0,0,0,0.7);
                    color: white;
                    font-size: 16px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s ease;
                }
                
                .control-btn:hover {
                    background: rgba(0,0,0,0.9);
                    transform: scale(1.1);
                }
                
                .record-btn {
                    background: rgba(220, 53, 69, 0.8);
                }
                
                .record-btn:hover {
                    background: rgba(220, 53, 69, 1);
                }
                
                .stop-btn {
                    background: rgba(108, 117, 125, 0.8);
                }
                
                .stop-btn:hover {
                    background: rgba(108, 117, 125, 1);
                }
                
                .download-btn {
                    background: rgba(0, 123, 255, 0.8);
                }
                
                .download-btn:hover {
                    background: rgba(0, 123, 255, 1);
                }
            `}</style>
            <div className="header">
                <h1>{t.mainTitle}</h1>
                <div className="ui-language-selection">
                    <select value={uiLanguage} onChange={(e) => setUiLanguage(e.target.value)}>
                        <option value="en">English</option>
                        <option value="he">עברית</option>
                        <option value="ru">Русский</option>
                    </select>
                    <button 
                        onClick={toggleTheme}
                        style={{
                            marginLeft: '10px',
                            padding: '8px 12px',
                            background: theme === 'light' ? '#333' : '#fff',
                            color: theme === 'light' ? '#fff' : '#333',
                            border: '1px solid #ccc',
                            borderRadius: '4px',
                            cursor: 'pointer'
                        }}
                        title={t.themeToggle}
                    >
                        {theme === 'light' ? '🌙' : '☀️'}
                    </button>
                </div>
            </div>

            {/* Recording Indicator */}
            {isRecording && (
                <div className="recording-indicator">
                    🔴 {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
                </div>
            )}

            {/* Simple Control Panel */}
            {callStatus === 'active' && (
                <div className="simple-controls">
                    <button 
                        onClick={toggleTheme}
                        className="control-btn"
                        title={t.themeToggle}
                    >
                        {theme === 'light' ? '🌙' : '☀️'}
                    </button>
                    
                    {!isRecording ? (
                        <button onClick={startRecording} className="control-btn record-btn" title={t.startRecording}>
                            🔴
                        </button>
                    ) : (
                        <button onClick={stopRecording} className="control-btn stop-btn" title={t.stopRecording}>
                            ⏹️
                        </button>
                    )}
                    
                    {recordingBlob && (
                        <button onClick={downloadRecording} className="control-btn download-btn" title={t.downloadRecording}>
                            💾
                        </button>
                    )}
                </div>
            )}

            <div className="user-info">
                <p>{t.loggedInAs} <strong>{username}</strong></p>
                {callStatus === 'receiving' && (
                    <div style={{background: '#fff3cd', padding: '10px', margin: '10px 0', border: '1px solid #ffeeba', borderRadius: '4px'}}>
                        <strong>{t.incomingCallFrom} {incomingCall?.from}</strong><br/>
                        <button onClick={handleAcceptCall} style={{background: '#28a745', color: 'white', padding: '8px 16px', margin: '5px', border: 'none', borderRadius: '4px'}}>{t.acceptButton}</button>
                        <button onClick={handleDeclineCall} style={{background: '#dc3545', color: 'white', padding: '8px 16px', margin: '5px', border: 'none', borderRadius: '4px'}}>{t.declineButton}</button>
                    </div>
                )}
            </div>

            <div className={`video-container sideBySide-layout`}>
                <div style={{ position: 'absolute', left: 0, right: 0, top: '-30px', margin: 'auto', width: 'fit-content', zIndex: 10 }}>
                    <span style={{
                        display: 'inline-block',
                        width: 12, height: 12, borderRadius: '50%',
                        background: connectionQuality === 'good' ? '#28a745' : connectionQuality === 'fair' ? '#ffc107' : connectionQuality === 'poor' ? '#dc3545' : '#6c757d',
                        marginRight: 8,
                        verticalAlign: 'middle',
                        border: '2px solid #fff',
                        boxShadow: '0 0 4px #0002'
                    }}></span>
                    <span style={{ fontWeight: 500, color: '#333', fontSize: '12px' }}>
                        {connectionQuality === 'good' && 'Good'}
                        {connectionQuality === 'fair' && 'Fair'}
                        {connectionQuality === 'poor' && 'Poor'}
                        {connectionQuality === 'unknown' && 'Unknown'}
                    </span>
                </div>
                
                {/* Video Quality Settings */}
                {/* Removed for simplicity */}
                
                {/* Audio Processing Settings */}
                {/* Removed for simplicity */}
                
                {/* Local Video as PiP Overlay */}
                
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

            <div className="online-users-container">
                <h3>{t.onlineUsersTitle}</h3>
                {onlineUsers.length > 0 ? (
                    <ul className="online-users-list">
                        {onlineUsers.map(user => (
                            <li key={user} className="online-user-item">
                                <span>{user}</span>
                                {callStatus === 'active' && remoteUser === user ? (
                                    <button 
                                        onClick={disconnectCall}
                                        className="disconnect-btn"
                                    >
                                        Disconnect
                                    </button>
                                ) : (
                                    <button 
                                        onClick={() => handleCallUser(user)} 
                                        className="call-btn"
                                        disabled={callStatus !== 'idle'}
                                    >
                                        {t.callButton}
                                    </button>
                                )}
                            </li>
                        ))}
                    </ul>
                ) : <p>{t.noUsersOnline}</p>}
            </div>

            <div className="controls-container">
                {renderCallControls()}
            </div>
            
            <div className="controls-container language-selection">
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
