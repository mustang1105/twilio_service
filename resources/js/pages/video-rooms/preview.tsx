import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import axios from 'axios';
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
        description?: string;
    };
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: '/dashboard',
    },
    {
        title: 'ビデオルーム',
        href: '/video-rooms',
    },
    {
        title: 'プレビュー',
        href: '#',
    },
];

export default function Preview({ videoRoom }: Props) {
    const [blurStrength, setBlurStrength] = useState(0);
    const videoRef = useRef<HTMLVideoElement>(null);
    const videoTrackRef = useRef<any>(null);
    const processorRef = useRef<any>(null);

    useEffect(() => {
        initializeVideo();
        return () => {
            // クリーンアップ
            if (videoTrackRef.current) {
                videoTrackRef.current.stop();
            }
        };
    }, []);

    const initializeVideo = async () => {
        try {
            // Twilioのローカルビデオトラック作成
            videoTrackRef.current = await window.Twilio.Video.createLocalVideoTrack({
                width: 640,
                height: 480,
                frameRate: 24,
            });

            // ビデオエレメントにトラックを接続
            if (videoRef.current) {
                videoTrackRef.current.attach(videoRef.current);
            }
        } catch (error) {
            console.error('カメラへのアクセスに失敗しました:', error);
            alert('カメラへのアクセスに失敗しました。カメラの権限設定を確認してください。');
        }
    };

    const applyBackgroundBlur = async (strength: number) => {
        if (!videoTrackRef.current) return;

        try {
            if (strength > 0) {
                if (!processorRef.current) {
                    // VideoProcessorsが利用可能か確認
                    if (!window.Twilio.VideoProcessors) {
                        throw new Error('Twilio Video Processors が読み込まれていません');
                    }

                    // 新しいプロセッサーを作成
                    processorRef.current = new window.Twilio.VideoProcessors.GaussianBlurBackgroundProcessor({
                        assetsPath: 'https://cdn.jsdelivr.net/npm/@twilio/video-processors@3.1.0/dist/build',
                        blurFilterRadius: strength,
                        debounce: true,
                    });

                    // モデルを読み込み
                    await processorRef.current.loadModel();

                    // トラックを処理
                    videoTrackRef.current.addProcessor(processorRef.current, {
                        inputFrameBufferType: 'videoframe',
                        outputFrameBufferContextType: 'bitmaprenderer',
                    });
                } else {
                    // 既存のプロセッサーの強度を更新
                    processorRef.current.blurFilterRadius = strength;
                }
            } else {
                if (processorRef.current) {
                    // プロセッサーを削除
                    videoTrackRef.current.removeProcessor(processorRef.current);
                    processorRef.current = null;
                }
            }
        } catch (error) {
            console.error('背景ぼかしの適用に失敗しました:', error);
            alert('背景ぼかしの適用に失敗しました: ' + error.message);
        }
    };

    const handleBlurChange = async (strength: number) => {
        storeBlurStrength(strength);
        setBlurStrength(strength);
        await applyBackgroundBlur(strength);
    };

    const storeBlurStrength = (strength: number) => {
        // セッションにblurStrengthを保存
        axios.post('/api/video-rooms/store-blur-strength', {
            blur_strength: strength,
        }).catch((error) => {
            console.error('Failed to store blur strength:', error);
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="プレビュー" />

            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
                    {/* 左側: プレビューセクション */}
                    <div className="lg:col-span-8">
                        <div className="flex h-full flex-col gap-4 rounded-xl bg-neutral-900 p-6">
                            {/* ビデオプレビュー */}
                            <div className="flex flex-1 items-center justify-center overflow-hidden rounded-xl bg-neutral-800">
                                <video ref={videoRef} autoPlay playsInline className="h-full w-full rounded-lg object-cover" />
                            </div>

                            {/* コントロールセクション */}
                            <div className="rounded-xl bg-neutral-800/50 p-6">
                                <h6 className="mb-4 text-neutral-100">
                                    <i className="fas fa-sliders-h mr-2" />
                                    背景効果
                                </h6>
                                <div className="flex justify-center gap-3">
                                    {[
                                        { strength: 3, title: '背景を少しぼかす' },
                                        { strength: 7, title: '背景を強くぼかす' },
                                        { strength: 0, title: '背景効果なし' },
                                    ].map((option) => (
                                        <button
                                            key={option.strength}
                                            type="button"
                                            onClick={() => handleBlurChange(option.strength)}
                                            className={`flex h-15 w-15 items-center justify-center rounded-xl transition-colors duration-200 ${
                                                blurStrength === option.strength
                                                    ? 'bg-blue-500/20 text-blue-400'
                                                    : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
                                            } `}
                                            title={option.title}
                                        >
                                            <i className={`fas fa-user${option.strength > 0 ? '-shield' : ''} text-xl`} />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 右側: ルーム詳細 */}
                    <div className="lg:col-span-4">
                        <div className="rounded-xl bg-neutral-900 p-6">
                            <h2 className="mb-6 flex items-center border-b border-neutral-800 pb-4 text-xl font-semibold text-neutral-100">
                                <i className="fas fa-video mr-2 text-blue-500" />
                                {videoRoom.name}
                            </h2>

                            <div className="mb-6">
                                <label className="mb-2 block text-neutral-400">
                                    <i className="fas fa-info-circle mr-2" />
                                    ルームの説明
                                </label>
                                <p className="text-lg text-neutral-100">{videoRoom.description || '説明はありません'}</p>
                            </div>

                            <div className="flex flex-col gap-3">
                                <Link
                                    href={`/video-rooms/${videoRoom.id}`}
                                    className="flex items-center justify-center rounded-md bg-blue-500/20 px-4 py-3 text-blue-400 transition-colors duration-200 hover:bg-blue-500/30"
                                >
                                    <i className="fas fa-sign-in-alt mr-2" />
                                    ルームに参加
                                </Link>
                                <Link
                                    href={'/video-rooms'}
                                    className="flex items-center justify-center rounded-md bg-neutral-800 px-4 py-3 text-neutral-400 transition-colors duration-200 hover:bg-neutral-700"
                                >
                                    <i className="fas fa-arrow-left mr-2" />
                                    一覧に戻る
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
