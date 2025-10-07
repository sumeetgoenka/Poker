'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/Button';
import { ToastContainer, ToastMessage } from '@/components/Toast';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { createTable, joinTable } from '@/lib/firebase-api';

export default function Home() {
  const router = useRouter();
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  // Create table form
  const [nickname, setNickname] = useState('');
  const [smallBlind, setSmallBlind] = useState(10);
  const [bigBlind, setBigBlind] = useState(20);
  const [defaultStack, setDefaultStack] = useState(1000);
  const [maxPlayers, setMaxPlayers] = useState(6);

  // Join table form
  const [joinTableId, setJoinTableId] = useState('');
  const [joinNickname, setJoinNickname] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        signInAnonymously(auth).catch((err) => {
          addToast('Authentication failed', 'error');
        });
      }
    });
    return () => unsubscribe();
  }, []);

  const addToast = (message: string, type: ToastMessage['type']) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const handleCreateTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim()) {
      addToast('Please enter a nickname', 'error');
      return;
    }

    setIsCreating(true);
    try {
      const user = auth.currentUser;
      if (!user) {
        addToast('Please sign in first', 'error');
        return;
      }

      const result = await createTable({
        smallBlind: smallBlind,
        bigBlind: bigBlind,
        defaultStack: defaultStack,
        maxPlayers: maxPlayers,
        nickname: nickname.trim(),
      }, user.uid);

      if (result?.tableId) {
        addToast('Table created successfully!', 'success');
        router.push(`/table/${result.tableId}`);
      }
    } catch (err: any) {
      addToast(err.message || 'Failed to create table', 'error');
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinNickname.trim() || !joinTableId.trim()) {
      addToast('Please enter both table ID and nickname', 'error');
      return;
    }

    setIsJoining(true);
    try {
      const user = auth.currentUser;
      if (!user) {
        addToast('Please sign in first', 'error');
        return;
      }

      const result = await joinTable({
        tableId: joinTableId.trim(),
        nickname: joinNickname.trim(),
      }, user.uid);

      if (result?.seat !== undefined) {
        addToast('Joined table successfully!', 'success');
        router.push(`/table/${joinTableId}`);
      }
    } catch (err: any) {
      addToast(err.message || 'Failed to join table', 'error');
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="min-h-screen felt-gradient flex items-center justify-center p-4">
      <ToastContainer toasts={toasts} onDismiss={removeToast} />

      <div className="max-w-4xl w-full">
        <h1 className="text-4xl font-bold text-center mb-2 text-white">
          Poker Table
        </h1>
        <p className="text-center text-white/70 mb-8">Play chips only - No real money</p>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Create Table */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
            <h2 className="text-2xl font-semibold mb-4">Create Table</h2>
            <form onSubmit={handleCreateTable} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Your Nickname</label>
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-emerald-500"
                  placeholder="Enter your name"
                  maxLength={20}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Small Blind</label>
                  <input
                    type="number"
                    value={smallBlind}
                    onChange={(e) => setSmallBlind(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                    min={1}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Big Blind</label>
                  <input
                    type="number"
                    value={bigBlind}
                    onChange={(e) => setBigBlind(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                    min={2}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Starting Stack</label>
                  <input
                    type="number"
                    value={defaultStack}
                    onChange={(e) => setDefaultStack(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                    min={100}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Max Players</label>
                  <select
                    value={maxPlayers}
                    onChange={(e) => setMaxPlayers(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value={2}>2</option>
                    <option value={6}>6</option>
                    <option value={9}>9</option>
                  </select>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isCreating}
                size="lg"
              >
                {isCreating ? 'Creating...' : 'Create Table'}
              </Button>
            </form>
          </div>

          {/* Join Table */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
            <h2 className="text-2xl font-semibold mb-4">Join Table</h2>
            <form onSubmit={handleJoinTable} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Table ID</label>
                <input
                  type="text"
                  value={joinTableId}
                  onChange={(e) => setJoinTableId(e.target.value)}
                  className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-emerald-500"
                  placeholder="Enter table ID"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Your Nickname</label>
                <input
                  type="text"
                  value={joinNickname}
                  onChange={(e) => setJoinNickname(e.target.value)}
                  className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-emerald-500"
                  placeholder="Enter your name"
                  maxLength={20}
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                variant="secondary"
                disabled={isJoining}
                size="lg"
              >
                {isJoining ? 'Joining...' : 'Join Table'}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
