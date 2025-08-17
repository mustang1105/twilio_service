import { Head, router } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';

declare global {
    interface Window {
        Twilio: any;
    }
}

interface Props {
    videoRoom: {
        id: number;
        name: string;
    };
    token: string;
    blur_strength: number;
}

export default function VideoRoom({ videoRoom, token, blur_strength }: Props) {
    const [connectionStatus, setConnectionStatus] = useState('connecting');
    const [localTracks, setLocalTracks] = useState(new Map());
    const [screenTrack, setScreenTrack] = useState<any>(null);
    const [room, setRoom] = useState<any>(null);
    const [participants, setParticipants] = useState<any[]>([]);
    const [notifications, setNotifications] = useState<string[]>([]);

    const localVideoRef = useRef<HTMLDivElement>(null);
    const remoteParticipantsRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        connectToRoom();
        return () => {
            if (room) {
                room.disconnect();
            }
        };
    }, []);

    const updateConnectionStatus = (status: string) => {
        setConnectionStatus(status);
    };

    const showNotification = (message: string) => {
        setNotifications((prev) => [...prev, message]);
        setTimeout(() => {
            setNotifications((prev) => prev.filter((n) => n !== message));
        }, 3000);
    };

    const initializeLocalTracks = async () => {
        try {
            updateConnectionStatus('connecting');
            const tracks = await window.Twilio.Video.createLocalTracks({
                audio: true,
                video: {
                    width: 1280,
                    height: 720,
                    frameRate: 24,
                },
            });

            const tracksMap = new Map();
            tracks.forEach((track: any) => {
                tracksMap.set(track.kind, track);
                if (track.kind === 'video') {
                    if (localVideoRef.current) {
                        if (blur_strength > 0) {
                            // 背景をぼかす
                            const processor = new window.Twilio.VideoProcessors.GaussianBlurBackgroundProcessor({
                                assetsPath: 'https://cdn.jsdelivr.net/npm/@twilio/video-processors@3.1.0/dist/build',
                                blurFilterRadius: blur_strength,
                                debounce: true,
                            });

                            processor.loadModel();
                            track.addProcessor(processor, {
                                inputFrameBufferType: 'videoframe',
                                outputFrameBufferContextType: 'bitmaprenderer',
                            });
                        }

                        const videoElement = track.attach();
                        videoElement.style.width = '100%';
                        videoElement.style.height = '100%';
                        videoElement.style.objectFit = 'cover';
                        localVideoRef.current.appendChild(videoElement);
                    }
                }
            });

            setLocalTracks(tracksMap);
            return tracks;
        } catch (error) {
            console.error('Failed to initialize local tracks:', error);
            alert('カメラまたはマイクへのアクセスに失敗しました。デバイスの設定を確認してください。');
            return [];
        }
    };

    const connectToRoom = async () => {
        try {
            console.log('Connecting to room...');
            const tracks = await initializeLocalTracks();

            const newRoom = await window.Twilio.Video.connect(token, {
                name: videoRoom.name,
                tracks: tracks,
                video: { width: 1280, height: 720 },
                preferredVideoCodecs: ['H264', 'VP8'],
                maxAudioBitrate: 16000,
                dominantSpeaker: true,
            });

            console.log(tracks);

            setRoom(newRoom);
            updateConnectionStatus('connected');
            console.log('Connected to room:', newRoom.name);

            console.log(newRoom.participants);
            // 既存の参加者を処理
            newRoom.participants.forEach(participantConnected);

            // イベントリスナーの設定
            newRoom.on('participantConnected', (participant: any) => {
                participantConnected(participant);
                showNotification(`${participant.identity} が参加しました`);
            });

            newRoom.on('participantDisconnected', (participant: any) => {
                participantDisconnected(participant);
                showNotification(`${participant.identity} が退出しました`);
            });

            newRoom.on('dominantSpeakerChanged', (participant: any) => {
                highlightDominantSpeaker(participant);
            });

            newRoom.on('reconnecting', () => {
                updateConnectionStatus('reconnecting');
                showNotification('接続が不安定です。再接続を試みています...');
            });

            newRoom.on('reconnected', () => {
                updateConnectionStatus('connected');
                showNotification('接続が回復しました');
            });

            newRoom.on('disconnected', (room: any, error: any) => {
                updateConnectionStatus('disconnected');
                if (error !== undefined) {
                    console.log('Disconnect error:', error);
                }
            });
        } catch (error) {
            console.error('Failed to connect to room:', error);
            showNotification('ルームへの接続に失敗しました');
            updateConnectionStatus('disconnected');
        }
    };

    const participantConnected = (participant: any) => {
        console.log('Participant connected:', participant.identity);
        setParticipants((prev) => [...prev, participant]);

        // DOM要素を作成
        const container = document.getElementById('remote-participants');
        if (container) {
            const participantDiv = document.createElement('div');
            participantDiv.id = participant.sid;
            participantDiv.className = 'remote-participant animate__animated animate__fadeIn';

            // 参加者情報の追加
            const infoDiv = document.createElement('div');
            infoDiv.className = 'participant-info';
            infoDiv.textContent = participant.identity;
            participantDiv.appendChild(infoDiv);

            // 参加者のステータス表示
            const statusDiv = document.createElement('div');
            statusDiv.className = 'participant-status';
            statusDiv.innerHTML = `
                <span class="status-icon" data-kind="video">
                    <i class="fas fa-video"></i>
                </span>
                <span class="status-icon" data-kind="audio">
                    <i class="fas fa-microphone"></i>
                </span>
            `;
            participantDiv.appendChild(statusDiv);

            container.appendChild(participantDiv);

            // トラックの処理
            participant.tracks.forEach((publication: any) => {
                if (publication.isSubscribed) {
                    trackSubscribed(participantDiv, publication.track);
                }
            });

            // イベントリスナーの設定
            participant.on('trackSubscribed', (track: any) => trackSubscribed(participantDiv, track));
            participant.on('trackUnsubscribed', trackUnsubscribed);
            participant.on('trackEnabled', (track: any) => updateTrackStatus(participant, track, true));
            participant.on('trackDisabled', (track: any) => updateTrackStatus(participant, track, false));
        }
    };

    const participantDisconnected = (participant: any) => {
        setParticipants((prev) => prev.filter((p) => p.sid !== participant.sid));

        // DOM要素を削除
        const participantDiv = document.getElementById(participant.sid);
        if (participantDiv) {
            participantDiv.classList.add('animate__fadeOut');
            setTimeout(() => participantDiv.remove(), 500);
        }
    };

    const trackSubscribed = (div: HTMLElement, track: any) => {
        const element = track.attach();
        if (track.kind === 'video') {
            element.style.width = '100%';
            element.style.height = '100%';
            element.style.objectFit = 'cover';
        }
        div.appendChild(element);
        updateTrackStatus(track.participant, track, track.isEnabled);
    };

    const trackUnsubscribed = (track: any) => {
        track.detach().forEach((element: HTMLElement) => {
            element.classList.add('animate__fadeOut');
            setTimeout(() => element.remove(), 500);
        });
    };

    const updateTrackStatus = (participant: any, track: any, enabled: boolean) => {
        const participantDiv = document.getElementById(participant.sid);
        if (!participantDiv) return;

        const statusIcon = participantDiv.querySelector(`[data-kind="${track.kind}"]`);
        if (statusIcon) {
            const icon = statusIcon.querySelector('i');
            if (track.kind === 'video') {
                icon.className = enabled ? 'fas fa-video' : 'fas fa-video-slash';

                // ビデオ要素とプレースホルダーの処理
                const videoElement = participantDiv.querySelector('video');
                let placeholderDiv = participantDiv.querySelector('.video-placeholder');

                if (!enabled) {
                    if (videoElement) {
                        videoElement.style.display = 'none';
                    }

                    if (!placeholderDiv) {
                        placeholderDiv = document.createElement('div');
                        placeholderDiv.className = 'video-placeholder';
                        placeholderDiv.innerHTML = `
                            <div class="placeholder-content">
                                <i class="fas fa-user-circle"></i>
                                <div class="participant-name">${participant.identity}</div>
                            </div>
                        `;
                        participantDiv.appendChild(placeholderDiv);
                    }
                    placeholderDiv.style.display = 'flex';
                } else {
                    if (videoElement) {
                        videoElement.style.display = 'block';
                    }
                    if (placeholderDiv) {
                        placeholderDiv.style.display = 'none';
                    }
                }
            } else if (track.kind === 'audio') {
                icon.className = enabled ? 'fas fa-microphone' : 'fas fa-microphone-slash';
            }
            statusIcon.className = `status-icon ${enabled ? '' : 'muted'}`;
        }
    };

    const highlightDominantSpeaker = (participant: any) => {
        // DOM操作でハイライト処理
        const elements = document.querySelectorAll('.remote-participant');
        elements.forEach((el: any) => {
            el.style.border = 'none';
        });

        if (participant) {
            const participantElement = document.getElementById(participant.sid);
            if (participantElement) {
                participantElement.style.border = '3px solid #2196F3';
            }
        }
    };

    const toggleVideo = () => {
        const videoTrack = localTracks.get('video');
        if (videoTrack) {
            if (videoTrack.isEnabled) {
                videoTrack.disable();
            } else {
                videoTrack.enable();
            }
        }
    };

    const toggleAudio = () => {
        const audioTrack = localTracks.get('audio');
        if (audioTrack) {
            if (audioTrack.isEnabled) {
                audioTrack.disable();
            } else {
                audioTrack.enable();
            }
        }
    };

    const startScreenSharing = async () => {
        if (screenTrack) {
            stopScreenSharing();
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getDisplayMedia();
            const newScreenTrack = new window.Twilio.Video.LocalVideoTrack(stream.getTracks()[0]);

            room.localParticipant.publishTrack(newScreenTrack);
            setScreenTrack(newScreenTrack);

            newScreenTrack.mediaStreamTrack.onended = () => {
                stopScreenSharing();
            };
        } catch (error) {
            console.error('Screen sharing failed:', error);
            alert('画面共有の開始に失敗しました。');
        }
    };

    const stopScreenSharing = () => {
        if (screenTrack) {
            room.localParticipant.unpublishTrack(screenTrack);
            screenTrack.stop();
            setScreenTrack(null);
        }
    };

    const leaveRoom = () => {
        if (screenTrack) {
            stopScreenSharing();
        }
        if (room) {
            room.disconnect();
        }
        router.visit('/video-rooms');
    };

    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (room && room.state === 'connected') {
                e.preventDefault();
                e.returnValue = '';
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [room]);

    return (
        <>
            <Head title={`ビデオルーム - ${videoRoom.name}`} />

            <div className="container-fluid p-0">
                <div id="video-container" className="relative h-screen w-screen overflow-hidden bg-gradient-to-br from-gray-900 to-blue-900">
                    {/* ルーム情報 */}
                    <div className="room-info animate__animated animate__fadeInDown">
                        <div className="room-name">{videoRoom.name}</div>
                        <div className="connection-status">
                            <div className={`status-dot ${connectionStatus}`}></div>
                            <span className="status-text">
                                {connectionStatus === 'connecting' && '接続中...'}
                                {connectionStatus === 'connected' && '接続済み'}
                                {connectionStatus === 'reconnecting' && '再接続中...'}
                                {connectionStatus === 'disconnected' && '切断'}
                            </span>
                        </div>
                    </div>

                    {/* ビデオグリッドコンテナ */}
                    <div className="video-grid-container">
                        {/* ローカル参加者 */}
                        <div id="local-participant" ref={localVideoRef} className="animate__animated animate__fadeInUp"></div>

                        {/* リモート参加者のグリッド */}
                        <div id="remote-participants" ref={remoteParticipantsRef}></div>
                    </div>

                    {/* コントロールパネル */}
                    <div className="participant-controls">
                        <div className="controls-inner animate__animated animate__fadeInUp">
                            <button id="toggle-video" className="control-button active" onClick={toggleVideo} title="カメラ ON/OFF">
                                <i className="fas fa-video"></i>
                            </button>
                            <button id="toggle-audio" className="control-button active" onClick={toggleAudio} title="マイク ON/OFF">
                                <i className="fas fa-microphone"></i>
                            </button>
                            <button id="share-screen" className="control-button" onClick={startScreenSharing} title="画面共有">
                                <i className="fas fa-desktop"></i>
                            </button>
                            <button id="toggle-chat" className="control-button" title="チャット">
                                <i className="fas fa-comments"></i>
                            </button>
                            <button id="leave-room" className="control-button danger" onClick={leaveRoom} title="退出">
                                <i className="fas fa-phone-slash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* 通知 */}
            {notifications.map((notification, index) => (
                <div key={index} className="room-notification animate__animated animate__fadeIn">
                    {notification}
                </div>
            ))}

            <style jsx>{`
                :root {
                    --primary-color: #2196f3;
                    --danger-color: #f44336;
                    --success-color: #4caf50;
                    --background-dark: #1a1a1a;
                    --text-dark: #ffffff;
                    --control-bg-dark: rgba(0, 0, 0, 0.7);
                }

                html {
                    height: 100%;
                    width: 100%;
                    position: fixed;
                    overflow: hidden;
                }

                body {
                    margin: 0;
                    padding: 0;
                    min-height: 100vh;
                    min-height: -webkit-fill-available;
                    background: linear-gradient(135deg, #1a1a1a 0%, #2c3e50 100%);
                    color: var(--text-dark);
                    position: fixed;
                    width: 100%;
                    height: 100%;
                    overflow: hidden;
                }

                .container-fluid {
                    padding: 0;
                }

                #video-container {
                    position: relative;
                    height: 100vh;
                    width: 100vw;
                    background: var(--background-dark);
                    overflow: hidden;
                }

                @supports (-webkit-touch-callout: none) {
                    #video-container {
                        height: -webkit-fill-available;
                    }
                }

                @media (max-width: 768px) and (orientation: portrait) {
                    #video-container {
                        height: 100%;
                        min-height: -webkit-fill-available;
                        padding-bottom: env(safe-area-inset-bottom);
                    }
                }

                #local-participant {
                    position: absolute;
                    bottom: 80px;
                    right: 20px;
                    width: 25vw;
                    max-width: 300px;
                    aspect-ratio: 4/3;
                    border: 3px solid var(--primary-color);
                    border-radius: 12px;
                    z-index: 10;
                    overflow: hidden;
                    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
                    transition: all 0.3s ease;
                }

                @media (max-width: 768px) {
                    #local-participant {
                        width: 35vw;
                        bottom: 100px;
                    }
                }

                @media (max-width: 768px) and (orientation: portrait) {
                    #local-participant {
                        bottom: 120px;
                        right: 10px;
                        width: 40vw;
                    }
                }

                @media (max-width: 380px) {
                    #local-participant {
                        bottom: 140px;
                        width: 45vw;
                    }
                }

                #local-participant video {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    transform: scaleX(-1);
                }

                .video-grid-container {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 80px;
                    overflow: hidden;
                    padding: 20px;
                }

                #remote-participants {
                    width: 100%;
                    height: 100%;
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                    grid-auto-rows: 1fr;
                    gap: 20px;
                }

                @media (max-width: 768px) {
                    .video-grid-container {
                        padding: 10px;
                    }

                    #remote-participants {
                        grid-template-columns: 1fr;
                        gap: 10px;
                    }
                }

                @media (orientation: landscape) {
                    #remote-participants {
                        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    }
                }

                .remote-participant {
                    position: relative;
                    width: 100%;
                    height: 100%;
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 12px;
                    overflow: hidden;
                    aspect-ratio: 16/9;
                }

                .remote-participant video {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }

                @media (max-width: 768px) {
                    .remote-participant {
                        aspect-ratio: 4/3;
                    }
                }

                .participant-info {
                    position: absolute;
                    top: 10px;
                    left: 10px;
                    background: var(--control-bg-dark);
                    padding: 5px 10px;
                    border-radius: 20px;
                    font-size: 0.9em;
                    z-index: 2;
                }

                .participant-status {
                    position: absolute;
                    top: 10px;
                    right: 10px;
                    display: flex;
                    gap: 10px;
                    background: var(--control-bg-dark);
                    padding: 5px 10px;
                    border-radius: 20px;
                    z-index: 2;
                }

                .status-icon {
                    font-size: 1.2em;
                }

                .status-icon.muted {
                    color: var(--danger-color);
                }

                .participant-controls {
                    position: absolute;
                    width: 100%;
                    bottom: 0;
                    right: 0;
                    height: 80px;
                    z-index: 20;
                    background: var(--background-dark);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.4);
                }

                .controls-inner {
                    display: flex;
                    gap: 20px;
                    padding: 0 20px;
                }

                @media (max-width: 768px) {
                    .participant-controls {
                        height: calc(80px + env(safe-area-inset-bottom));
                        padding-bottom: env(safe-area-inset-bottom);
                    }

                    .controls-inner {
                        gap: 15px;
                        padding: 0 15px;
                    }
                }

                @media (max-width: 380px) {
                    .controls-inner {
                        gap: 12px;
                        padding: 0 10px;
                    }
                }

                .control-button {
                    width: 50px;
                    height: 50px;
                    border-radius: 50%;
                    border: none;
                    color: white;
                    background: rgba(255, 255, 255, 0.2);
                    transition: all 0.3s ease;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 1.2em;
                    padding: 0;
                }

                @media (max-width: 768px) {
                    .control-button {
                        width: 48px;
                        height: 48px;
                        font-size: 1.1em;
                    }
                }

                @media (max-width: 768px) and (orientation: portrait) {
                    .control-button {
                        width: 46px;
                        height: 46px;
                    }
                }

                @media (max-width: 380px) {
                    .control-button {
                        width: 42px;
                        height: 42px;
                        font-size: 1em;
                    }
                }

                .control-button:hover {
                    transform: scale(1.1);
                    background: rgba(255, 255, 255, 0.3);
                }

                .control-button.active {
                    background: var(--primary-color);
                }

                .control-button.danger {
                    background: var(--danger-color);
                }

                .control-button.danger:hover {
                    background: #d32f2f;
                }

                .room-info {
                    position: fixed;
                    bottom: 20px;
                    left: 20px;
                    background: var(--control-bg-dark);
                    padding: 10px 20px;
                    border-radius: 25px;
                    backdrop-filter: blur(10px);
                    z-index: 30;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }

                @media (max-width: 768px) {
                    .room-info {
                        display: none;
                    }
                }

                .room-name {
                    font-weight: 600;
                    margin: 0;
                }

                .connection-status {
                    display: flex;
                    align-items: center;
                    gap: 5px;
                    font-size: 0.9em;
                }

                .status-dot {
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    background: var(--success-color);
                }

                .status-dot.connecting {
                    background: #ffc107;
                    animation: pulse 1s infinite;
                }

                @keyframes pulse {
                    0% {
                        transform: scale(1);
                        opacity: 1;
                    }
                    50% {
                        transform: scale(1.2);
                        opacity: 0.7;
                    }
                    100% {
                        transform: scale(1);
                        opacity: 1;
                    }
                }

                .animate__animated {
                    animation-duration: 0.5s;
                }

                .video-placeholder {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.8);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    border-radius: 12px;
                }

                .placeholder-content {
                    text-align: center;
                    color: white;
                }

                .placeholder-content i {
                    font-size: 4em;
                    margin-bottom: 10px;
                    color: rgba(255, 255, 255, 0.7);
                }

                .placeholder-content .participant-name {
                    font-size: 1.2em;
                    font-weight: 500;
                }

                @media (max-width: 768px) {
                    .placeholder-content i {
                        font-size: 3em;
                    }

                    .placeholder-content .participant-name {
                        font-size: 1em;
                    }
                }

                .room-notification {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: var(--control-bg-dark);
                    color: white;
                    padding: 12px 20px;
                    border-radius: 8px;
                    z-index: 1000;
                    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
                    backdrop-filter: blur(10px);
                    max-width: 300px;
                    word-wrap: break-word;
                }

                @media (max-width: 768px) {
                    .room-notification {
                        top: auto;
                        bottom: 80px;
                        right: 50%;
                        transform: translateX(50%);
                        width: 90%;
                        max-width: none;
                        text-align: center;
                    }
                }
            `}</style>
        </>
    );
}
