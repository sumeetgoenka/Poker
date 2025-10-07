"use client";
import { useState } from "react";
import { signInAnonymously } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { createTable, joinTable } from "@/lib/firebase-api";

export default function FirebaseTest() {
  const [user, setUser] = useState<any>(null);
  const [tableId, setTableId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const signIn = async () => {
    try {
      const result = await signInAnonymously(auth);
      setUser(result.user);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const testCreateTable = async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await createTable({
        smallBlind: 10,
        bigBlind: 20,
        maxPlayers: 6,
        defaultStack: 1000,
        nickname: "Host"
      }, user.uid);
      
      setTableId(result.tableId);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const testJoinTable = async () => {
    if (!user || !tableId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await joinTable({
        tableId: tableId,
        nickname: "Player"
      }, user.uid);
      
      console.log("Joined table, seat:", result.seat);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-green-900 text-green-100 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Firebase Test</h1>
        
        <div className="space-y-4">
          <div className="p-4 bg-green-800 rounded">
            <h2 className="text-xl font-semibold mb-2">Authentication</h2>
            {user ? (
              <p className="text-green-200">✅ Signed in as: {user.uid}</p>
            ) : (
              <button 
                onClick={signIn}
                className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded"
              >
                Sign In Anonymously
              </button>
            )}
          </div>

          <div className="p-4 bg-green-800 rounded">
            <h2 className="text-xl font-semibold mb-2">Create Table</h2>
            {user ? (
              <button 
                onClick={testCreateTable}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-4 py-2 rounded"
              >
                {loading ? "Creating..." : "Create Test Table"}
              </button>
            ) : (
              <p className="text-gray-400">Please sign in first</p>
            )}
          </div>

          <div className="p-4 bg-green-800 rounded">
            <h2 className="text-xl font-semibold mb-2">Join Table</h2>
            {tableId ? (
              <div>
                <p className="text-green-200 mb-2">Table ID: {tableId}</p>
                <button 
                  onClick={testJoinTable}
                  disabled={loading}
                  className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 px-4 py-2 rounded"
                >
                  {loading ? "Joining..." : "Join Table"}
                </button>
              </div>
            ) : (
              <p className="text-gray-400">Create a table first</p>
            )}
          </div>

          {error && (
            <div className="p-4 bg-red-800 rounded">
              <h3 className="text-red-200 font-semibold">Error:</h3>
              <p className="text-red-100">{error}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
