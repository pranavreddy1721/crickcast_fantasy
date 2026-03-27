import { useEffect, useState } from "react";
import { supabase, Player, PlayerPoint } from "../lib/supabase";
import { Search, Plus, LogOut, LogIn, Shield, Edit2, Trash2, X, Check, Calendar } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";

export default function AdminPanel() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);
  
  // Admin panel state
  const [players, setPlayers] = useState<Player[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [pointsToAdd, setPointsToAdd] = useState("");
  const [matchNumber, setMatchNumber] = useState("");
  const [addingPoints, setAddingPoints] = useState(false);
  
  // Player points history
  const [playerPointsHistory, setPlayerPointsHistory] = useState<PlayerPoint[]>([]);
  const [editingPoint, setEditingPoint] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  // Migration check
  const [needsMigration, setNeedsMigration] = useState(false);
  const [checkingMigration, setCheckingMigration] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchPlayers();
      checkMigrationStatus();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (selectedPlayer) {
      fetchPlayerPointsHistory(selectedPlayer.id);
      suggestNextMatch(selectedPlayer.id);
    }
  }, [selectedPlayer]);

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
    } catch (error) {
      console.error('Auth check error:', error);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoggingIn(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.session) {
        setIsAuthenticated(true);
        toast.success('Successfully logged in!');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      toast.error(error.message || 'Failed to login');
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setIsAuthenticated(false);
      setEmail("");
      setPassword("");
      toast.success('Successfully logged out!');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to logout');
    }
  };

  const fetchPlayers = async () => {
    try {
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .order('name');

      if (error) throw error;
      setPlayers(data || []);
    } catch (error) {
      console.error('Error fetching players:', error);
      toast.error('Failed to fetch players');
    }
  };

  const fetchPlayerPointsHistory = async (playerId: string) => {
    try {
      const { data, error } = await supabase
        .from('players_point')
        .select('*')
        .eq('player_id', playerId);

      if (error) {
        console.error('Error fetching player points history:', error);
        setPlayerPointsHistory([]);
        return;
      }
      
      // Add match numbers to existing data without match_number
      const dataWithMatchNumbers = (data || []).map((point, index) => ({
        ...point,
        match_number: point.match_number || (index + 1)
      }));
      
      setPlayerPointsHistory(dataWithMatchNumbers);
    } catch (error) {
      console.error('Error fetching player points history:', error);
      setPlayerPointsHistory([]);
    }
  };

  const suggestNextMatch = async (playerId: string) => {
    try {
      // Try to get the highest match number
      const { data, error } = await supabase
        .from('players_point')
        .select('match_number')
        .eq('player_id', playerId)
        .order('match_number', { ascending: false })
        .limit(1);

      if (error) {
        // Column doesn't exist yet, count existing records instead
        const { data: countData, error: countError } = await supabase
          .from('players_point')
          .select('id')
          .eq('player_id', playerId);
        
        if (!countError && countData) {
          setMatchNumber((countData.length + 1).toString());
        } else {
          setMatchNumber("1");
        }
        return;
      }
      
      const nextMatch = data && data.length > 0 && data[0].match_number 
        ? data[0].match_number + 1 
        : 1;
      
      setMatchNumber(nextMatch.toString());
    } catch (error) {
      console.error('Error suggesting match number:', error);
      setMatchNumber("1");
    }
  };

  const handleAddPoints = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedPlayer) {
      toast.error('Please select a player');
      return;
    }

    const points = parseFloat(pointsToAdd);
    const match = parseInt(matchNumber);
    
    if (isNaN(points)) {
      toast.error('Please enter a valid points value');
      return;
    }

    if (isNaN(match) || match < 1) {
      toast.error('Please enter a valid match number');
      return;
    }

    setAddingPoints(true);

    try {
      const { error } = await supabase
        .from('players_point')
        .insert({
          player_id: selectedPlayer.id,
          points: points,
          match_number: match,
        });

      if (error) throw error;

      toast.success(`Added ${points} points for Match ${match}!`);
      setPointsToAdd("");
      
      // Refresh and suggest next match
      await fetchPlayerPointsHistory(selectedPlayer.id);
      await suggestNextMatch(selectedPlayer.id);
    } catch (error: any) {
      console.error('Error adding points:', error);
      toast.error(error.message || 'Failed to add points');
    } finally {
      setAddingPoints(false);
    }
  };

  const handleEditPoints = async (pointId: string) => {
    const points = parseFloat(editValue);
    
    if (isNaN(points)) {
      toast.error('Please enter a valid points value');
      return;
    }

    try {
      const { error } = await supabase
        .from('players_point')
        .update({ points })
        .eq('id', pointId);

      if (error) throw error;

      toast.success('Points updated successfully!');
      setEditingPoint(null);
      setEditValue("");
      
      if (selectedPlayer) {
        await fetchPlayerPointsHistory(selectedPlayer.id);
      }
    } catch (error: any) {
      console.error('Error updating points:', error);
      toast.error(error.message || 'Failed to update points');
    }
  };

  const handleDeletePoints = async (pointId: string, matchNum: number) => {
    if (!confirm(`Are you sure you want to delete Match ${matchNum} points?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('players_point')
        .delete()
        .eq('id', pointId);

      if (error) throw error;

      toast.success(`Match ${matchNum} points deleted!`);
      
      if (selectedPlayer) {
        await fetchPlayerPointsHistory(selectedPlayer.id);
      }
    } catch (error: any) {
      console.error('Error deleting points:', error);
      toast.error(error.message || 'Failed to delete points');
    }
  };

  const checkMigrationStatus = async () => {
    try {
      // Try to insert a test record with match_number to check if column exists
      const { error } = await supabase
        .from('players_point')
        .select('match_number')
        .limit(1);

      if (error) {
        // If error contains "column" and "does not exist", migration is needed
        if (error.message && (error.message.includes('column') || error.message.includes('match_number'))) {
          setNeedsMigration(true);
        } else {
          setNeedsMigration(false);
        }
      } else {
        // Column exists, migration not needed
        setNeedsMigration(false);
      }
    } catch (error) {
      console.error('Migration check error:', error);
      // Default to showing migration in case of error
      setNeedsMigration(true);
    } finally {
      setCheckingMigration(false);
    }
  };

  const filteredPlayers = players.filter(player => {
    const query = searchQuery.toLowerCase();
    const name = (player.name || '').toLowerCase();
    const role = (player.role || '').toLowerCase();
    const position = (player.position || '').toLowerCase();
    
    return name.includes(query) || role.includes(query) || position.includes(query);
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="relative"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-blue-600/20 blur-3xl rounded-full"></div>
            
            <div className="relative bg-slate-900/80 backdrop-blur-2xl border border-slate-700/50 rounded-2xl p-10 shadow-2xl">
              <div className="text-center mb-8">
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                  className="w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-500 via-blue-500 to-blue-600 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-cyan-500/50"
                >
                  <Shield className="w-10 h-10 text-white" />
                </motion.div>
                <h1 className="text-3xl font-bold mb-2">
                  <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-blue-500 bg-clip-text text-transparent">
                    Admin Panel
                  </span>
                </h1>
                <p className="text-slate-400">Secure access to manage player points</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-4 py-3.5 bg-slate-950/70 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                    placeholder="admin@crickcast.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2.5">
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full px-4 py-3.5 bg-slate-950/70 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                    placeholder="Enter your password"
                  />
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={loggingIn}
                  className="w-full py-4 bg-gradient-to-r from-cyan-500 via-blue-500 to-blue-600 text-white font-bold rounded-xl hover:shadow-xl hover:shadow-cyan-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-base"
                >
                  {loggingIn ? (
                    <>
                      <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Authenticating...
                    </>
                  ) : (
                    <>
                      <LogIn className="w-5 h-5" />
                      Sign In to Dashboard
                    </>
                  )}
                </motion.button>
              </form>

              <div className="mt-8 pt-6 border-t border-slate-700/50">
                <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
                  <Shield className="w-3 h-3" />
                  <span>Protected by Supabase Authentication</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Database Migration Notice */}
      {checkingMigration ? (
        <div className="mb-6 p-4 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/30 rounded-xl">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-lg bg-yellow-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-yellow-400 text-sm">⚠️</span>
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-bold text-yellow-400 mb-1">Checking Database Migration Status</h4>
              <p className="text-xs text-slate-300 mb-2">
                Please wait while we check if the database migration is required.
              </p>
            </div>
          </div>
        </div>
      ) : needsMigration ? (
        <div className="mb-6 p-4 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/30 rounded-xl">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-lg bg-yellow-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-yellow-400 text-sm">⚠️</span>
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-bold text-yellow-400 mb-1">Database Migration Required</h4>
              <p className="text-xs text-slate-300 mb-2">
                To enable match-based point tracking, run this SQL in your Supabase SQL Editor.
              </p>
              <details className="text-xs text-slate-400">
                <summary className="cursor-pointer hover:text-cyan-400 transition-colors font-semibold">
                  📋 Click here for SQL query and instructions →
                </summary>
                <div className="mt-3 space-y-3">
                  {/* Instructions */}
                  <div className="p-3 bg-slate-950/50 rounded-lg border border-slate-700">
                    <p className="font-bold text-cyan-400 mb-2">Step-by-Step Instructions:</p>
                    <ol className="list-decimal list-inside space-y-1 text-slate-300">
                      <li>Copy the SQL query below (click the code box to select all)</li>
                      <li>Go to your <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="text-cyan-400 underline hover:text-cyan-300">Supabase Dashboard</a></li>
                      <li>Click <strong className="text-white">"SQL Editor"</strong> in the left sidebar</li>
                      <li>Click <strong className="text-white">"New Query"</strong></li>
                      <li>Paste the SQL and click <strong className="text-white">"Run"</strong></li>
                      <li>Refresh this page</li>
                    </ol>
                  </div>

                  {/* SQL Query */}
                  <div className="relative">
                    <div className="absolute top-2 right-2 z-10">
                      <button
                        onClick={() => {
                          const sql = `-- Add match_number column to players_point table

ALTER TABLE players_point 
ADD COLUMN IF NOT EXISTS match_number INTEGER;

UPDATE players_point 
SET match_number = 1 
WHERE match_number IS NULL;

ALTER TABLE players_point 
ALTER COLUMN match_number SET DEFAULT 1;

ALTER TABLE players_point 
ALTER COLUMN match_number SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_players_point_match_number 
ON players_point(match_number);

CREATE INDEX IF NOT EXISTS idx_players_point_player_match 
ON players_point(player_id, match_number);`;
                          
                          // Fallback method for copying text (works without clipboard permissions)
                          const textarea = document.createElement('textarea');
                          textarea.value = sql;
                          textarea.style.position = 'fixed';
                          textarea.style.left = '-9999px';
                          textarea.style.top = '-9999px';
                          document.body.appendChild(textarea);
                          textarea.select();
                          
                          try {
                            document.execCommand('copy');
                            toast.success('SQL copied to clipboard!');
                          } catch (err) {
                            console.error('Copy failed:', err);
                            toast.error('Failed to copy. Please select and copy manually.');
                          } finally {
                            document.body.removeChild(textarea);
                          }
                        }}
                        className="px-3 py-1.5 bg-cyan-500 hover:bg-cyan-600 text-white text-xs font-semibold rounded transition-colors flex items-center gap-1"
                      >
                        📋 Copy SQL
                      </button>
                    </div>
                    <pre className="p-4 bg-slate-900 rounded-lg border border-cyan-500/30 text-xs text-slate-300 overflow-x-auto max-h-64 overflow-y-auto">
{`-- Add match_number column to players_point table

ALTER TABLE players_point 
ADD COLUMN IF NOT EXISTS match_number INTEGER;

UPDATE players_point 
SET match_number = 1 
WHERE match_number IS NULL;

ALTER TABLE players_point 
ALTER COLUMN match_number SET DEFAULT 1;

ALTER TABLE players_point 
ALTER COLUMN match_number SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_players_point_match_number 
ON players_point(match_number);

CREATE INDEX IF NOT EXISTS idx_players_point_player_match 
ON players_point(player_id, match_number);`}
                    </pre>
                  </div>

                  <div className="p-2 bg-green-500/10 border border-green-500/30 rounded text-center">
                    <p className="text-green-400 text-xs">✅ After running the SQL, refresh this page to use full match tracking!</p>
                  </div>
                </div>
              </details>
            </div>
          </div>
        </div>
      ) : null}

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent mb-2">
            Match-wise Points Manager
          </h2>
          <p className="text-slate-400">Add, edit, and manage player points for each match</p>
        </div>
        
        <button
          onClick={handleLogout}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors flex items-center gap-2"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Player Search and Selection */}
        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-xl p-6">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Search className="w-5 h-5 text-cyan-400" />
            Select Player
          </h3>

          {/* Search Input */}
          <div className="mb-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or role..."
              className="w-full px-4 py-3 bg-slate-950/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>

          {/* Players List */}
          <div className="space-y-2 max-h-[500px] overflow-y-auto custom-scrollbar">
            {filteredPlayers.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <Search className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No players found</p>
              </div>
            ) : (
              filteredPlayers.map((player) => (
                <div
                  key={player.id}
                  onClick={() => setSelectedPlayer(player)}
                  className={`
                    p-4 rounded-lg border cursor-pointer transition-all
                    ${selectedPlayer?.id === player.id
                      ? 'bg-cyan-500/20 border-cyan-500/40 shadow-lg shadow-cyan-500/20'
                      : 'bg-slate-950/50 border-slate-800 hover:border-cyan-500/30'
                    }
                  `}
                >
                  <p className="font-semibold text-white">
                    {player.name || 'Unknown Player'}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    {player.role || player.position || 'Player'}
                    {player.is_captain && ' • Captain'}
                    {player.is_vice_captain && ' • Vice Captain'}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Add Points Form */}
        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-xl p-6">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Plus className="w-5 h-5 text-cyan-400" />
            Add Points
          </h3>

          {selectedPlayer ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              {/* Selected Player Info */}
              <div className="mb-6 p-4 bg-gradient-to-r from-cyan-500/10 to-blue-600/10 border border-cyan-500/30 rounded-lg">
                <p className="text-sm text-slate-400 mb-1">Selected Player</p>
                <p className="text-xl font-bold text-white">
                  {selectedPlayer.name}
                </p>
                <p className="text-sm text-cyan-400 mt-1">
                  {selectedPlayer.role}
                  {selectedPlayer.is_captain && ' • Captain'}
                  {selectedPlayer.is_vice_captain && ' • Vice Captain'}
                </p>
              </div>

              {/* Add Points Form */}
              <form onSubmit={handleAddPoints} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Match Number
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={matchNumber}
                    onChange={(e) => setMatchNumber(e.target.value)}
                    placeholder="e.g., 1"
                    className="w-full px-4 py-3 bg-slate-950/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                  />
                  <p className="text-xs text-slate-500 mt-1">Auto-suggested based on player history</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Points
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={pointsToAdd}
                    onChange={(e) => setPointsToAdd(e.target.value)}
                    placeholder="Enter points (e.g., 50)"
                    className="w-full px-4 py-3 bg-slate-950/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                  />
                </div>

                {pointsToAdd && matchNumber && (
                  <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                    <p className="text-sm font-semibold text-green-400 mb-2">Preview</p>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Match:</span>
                        <span className="text-white font-bold">#{matchNumber}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Points:</span>
                        <span className="text-white font-bold">{pointsToAdd}</span>
                      </div>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={addingPoints}
                  className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold rounded-lg hover:shadow-lg hover:shadow-cyan-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {addingPoints ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Adding...
                    </>
                  ) : (
                    <>
                      <Plus className="w-5 h-5" />
                      Add Points
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          ) : (
            <div className="text-center py-12 text-slate-500">
              <Search className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-semibold">No Player Selected</p>
              <p className="text-sm mt-2">Select a player to add match points</p>
            </div>
          )}
        </div>

        {/* Match History */}
        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-xl p-6">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-cyan-400" />
            Match History
          </h3>

          {selectedPlayer ? (
            <div>
              {/* Total Points */}
              <div className="mb-4 p-4 bg-gradient-to-r from-yellow-500/10 to-orange-600/10 border border-yellow-500/30 rounded-lg">
                <p className="text-sm text-slate-400 mb-1">Total Points</p>
                <p className="text-3xl font-bold text-yellow-400">
                  {playerPointsHistory.reduce((sum, p) => sum + p.points, 0).toFixed(1)}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Across {playerPointsHistory.length} match{playerPointsHistory.length !== 1 ? 'es' : ''}
                </p>
              </div>

              {/* Match List */}
              <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar">
                <AnimatePresence>
                  {playerPointsHistory.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                      <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>No match data yet</p>
                      <p className="text-xs mt-1">Add points to see history</p>
                    </div>
                  ) : (
                    playerPointsHistory.map((point) => (
                      <motion.div
                        key={point.id}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="p-4 bg-slate-950/50 border border-slate-800 rounded-lg"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                              <span className="text-xs font-bold text-cyan-400">
                                M{point.match_number || '?'}
                              </span>
                            </div>
                            <div>
                              <p className="text-xs text-slate-500">Match {point.match_number || '?'}</p>
                              {editingPoint === point.id ? (
                                <input
                                  type="number"
                                  step="0.1"
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  className="w-20 px-2 py-1 text-sm bg-slate-900 border border-cyan-500 rounded text-white"
                                  autoFocus
                                />
                              ) : (
                                <p className="text-lg font-bold text-white">{point.points}</p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            {editingPoint === point.id ? (
                              <>
                                <button
                                  onClick={() => handleEditPoints(point.id)}
                                  className="p-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg transition-colors"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingPoint(null);
                                    setEditValue("");
                                  }}
                                  className="p-2 bg-slate-700/50 hover:bg-slate-700 text-slate-400 rounded-lg transition-colors"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => {
                                    setEditingPoint(point.id);
                                    setEditValue(point.points.toString());
                                  }}
                                  className="p-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-colors"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeletePoints(point.id, point.match_number || 0)}
                                  className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))
                  )}
                </AnimatePresence>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-slate-500">
              <Calendar className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-semibold">No Player Selected</p>
              <p className="text-sm mt-2">Select a player to view match history</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}