import { formatDate } from '@/lib/utils';
import { Head } from '@inertiajs/react';
import { Link } from '@inertiajs/react';
import { useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import axios from 'axios';

interface VideoRoom {
    id: number;
    name: string;
    created_at: string;
}

interface Props {
    rooms: VideoRoom[];
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
];

export default function VideoRooms({ rooms: initialRooms }: Props) {
    const [searchQuery, setSearchQuery] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [newRoomName, setNewRoomName] = useState('');
    const [rooms, setRooms] = useState(initialRooms);

    const filteredRooms = rooms.filter((room) => room.name.toLowerCase().includes(searchQuery.toLowerCase()));

    const fetchRooms = async () => {
        try {
            const response = await axios.get('/api/video-rooms');
            setRooms(response.data.rooms);
        } catch (error) {
            console.error('Failed to fetch rooms:', error);
        }
    };

    const handleCreateRoom = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newRoomName.trim()) return;

        try {
            const response = await axios.post('/api/video-rooms', {
                name: newRoomName,
            });

            // 作成成功後、最新の一覧を取得
            await fetchRooms();

            setNewRoomName('');
            setIsCreating(false);
        } catch (error) {
            console.error('Failed to create room:', error);
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="ビデオルーム一覧" />

            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4 overflow-x-auto">
                {/* 検索ボックスと新規作成ボタン */}
                <div className="flex flex-col gap-4 md:flex-row md:items-center">
                    <div className="flex-1">
                        <div className="relative">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                                <i className="fas fa-search text-gray-400" />
                            </span>
                            <input
                                type="text"
                                className="w-full rounded-md border py-2 pr-4 pl-10 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:bg-neutral-900 dark:border-sidebar-border"
                                placeholder="ルームを検索..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                    <button
                        onClick={() => setIsCreating(!isCreating)}
                        className="flex items-center justify-center rounded-md bg-gradient-to-r from-blue-500 to-cyan-400 px-4 py-2 text-white shadow-md transition-transform duration-300 hover:scale-105"
                    >
                        <i className={`fas ${isCreating ? 'fa-minus' : 'fa-plus'} mr-2`} />
                        {isCreating ? 'キャンセル' : '新規ルーム作成'}
                    </button>
                </div>

                {/* ルーム一覧 */}
                {filteredRooms.length === 0 && !isCreating ? (
                    <div className="flex flex-1 items-center justify-center rounded-xl border border-sidebar-border/70 dark:border-sidebar-border">
                        <div className="text-center py-12">
                            <i className="fas fa-video-slash mb-4 text-4xl text-gray-400" />
                            <p className="mb-2 text-xl text-gray-600 dark:text-gray-400">アクティブなルームはありません</p>
                            <p className="text-gray-500 dark:text-gray-500">新しいルームを作成して、ビデオ会議を始めましょう！</p>
                        </div>
                    </div>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {/* 新規ルーム作成フォーム */}
                        {isCreating && (
                            <div className="transform transition-transform duration-200 hover:-translate-y-1">
                                <div className="h-full rounded-xl border border-sidebar-border/70 bg-white p-6 shadow-sm dark:bg-neutral-900 dark:border-sidebar-border">
                                    <form onSubmit={handleCreateRoom}>
                                        <div className="mb-4 flex items-start justify-between">
                                            <h5 className="flex items-center text-lg font-medium">
                                                <i className="fas fa-plus mr-2 text-blue-500" />
                                                新規ルーム
                                            </h5>
                                            <span className="flex items-center rounded-full bg-blue-500 px-2 py-1 text-xs text-white">
                                                <i className="fas fa-pen mr-1 text-[8px]" />
                                                作成中
                                            </span>
                                        </div>
                                        <div className="mb-4">
                                            <input
                                                type="text"
                                                className="w-full rounded-md border px-4 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:bg-neutral-900 dark:border-sidebar-border"
                                                placeholder="ルーム名を入力..."
                                                value={newRoomName}
                                                onChange={(e) => setNewRoomName(e.target.value)}
                                                autoFocus
                                            />
                                        </div>
                                        <button
                                            type="submit"
                                            className="block w-full rounded-md bg-blue-500 px-4 py-2 text-center text-white transition-colors duration-200 hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
                                            disabled={!newRoomName.trim()}
                                        >
                                            <i className="fas fa-plus mr-2" />
                                            ルームを作成
                                        </button>
                                    </form>
                                </div>
                            </div>
                        )}

                        {/* 既存のルーム一覧 */}
                        {filteredRooms.map((room) => (
                            <div key={room.id} className="transform transition-transform duration-200 hover:-translate-y-1">
                                <div className="h-full rounded-xl border border-sidebar-border/70 bg-white p-6 shadow-sm dark:bg-neutral-900 dark:border-sidebar-border">
                                    <div className="mb-4 flex items-start justify-between">
                                        <h5 className="flex items-center text-lg font-medium">
                                            <i className="fas fa-video mr-2 text-blue-500" />
                                            {room.name}
                                        </h5>
                                        <span className="flex items-center rounded-full bg-green-500 px-2 py-1 text-xs text-white">
                                            <i className="fas fa-circle mr-1 text-[8px]" />
                                            アクティブ
                                        </span>
                                    </div>
                                    <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
                                        <i className="far fa-clock mr-1" />
                                        作成日時: {formatDate(room.created_at, 'YYYY/MM/DD HH:mm')}
                                    </p>
                                    <Link
                                        href={`/video-rooms/${room.id}/preview`}
                                        className="block w-full rounded-md border border-blue-500 px-4 py-2 text-center text-blue-500 transition-colors duration-200 hover:bg-blue-50 dark:hover:bg-blue-500/10"
                                    >
                                        <i className="fas fa-sign-in-alt mr-2" />
                                        ルームに参加
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
