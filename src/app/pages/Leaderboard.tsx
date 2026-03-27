import { useEffect, useState } from "react";
import { supabase, Team, Player, PlayerPoint, TeamWithPoints, PlayerWithPoints } from "../lib/supabase";
import { ChevronDown, ChevronUp, Trophy, TrendingUp, Users, Crown, Star } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function Leaderboard() {
  const [teams, setTeams] = useState<TeamWithPoints[]>([]);
  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null);
  const [teamPlayers, setTeamPlayers] = useState<Record<string, PlayerWithPoints[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
    
    // Subscribe to real-time updates on players_point table
    const subscription = supabase
      .channel('players_point_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'players_point' }, 
        () => {
          fetchLeaderboard();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      
      // Fetch all teams - using SELECT * to get all columns
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select('*');

      if (teamsError) {
        console.error('Error fetching teams:', teamsError);
        throw teamsError;
      }

      // Fetch all players
      const { data: playersData, error: playersError } = await supabase
        .from('players')
        .select('*');

      if (playersError) {
        console.error('Error fetching players:', playersError);
        throw playersError;
      }

      // Fetch all points
      const { data: pointsData, error: pointsError } = await supabase
        .from('players_point')
        .select('*');

      if (pointsError) {
        console.error('Error fetching points:', pointsError);
        throw pointsError;
      }

      // Calculate team points
      const teamsWithPoints = (teamsData || []).map((team: Team) => {
        const teamPlayersList = (playersData || []).filter((p: Player) => p.team_id === team.id);
        
        let totalPoints = 0;
        teamPlayersList.forEach((player: Player) => {
          const playerPoints = (pointsData || [])
            .filter((p: PlayerPoint) => p.player_id === player.id)
            .reduce((sum, p) => sum + (p.points || 0), 0);
          
          let effectivePoints = playerPoints;
          if (player.is_captain) {
            effectivePoints = playerPoints * 2;
          } else if (player.is_vice_captain) {
            effectivePoints = playerPoints * 1.5;
          }
          
          totalPoints += effectivePoints;
        });

        // Handle different column name possibilities
        const displayName = team.team_name || team.name || `Team ${team.id}`;

        return {
          ...team,
          totalPoints,
          displayName
        };
      });

      // Sort by total points descending
      teamsWithPoints.sort((a, b) => b.totalPoints - a.totalPoints);
      setTeams(teamsWithPoints);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeamPlayers = async (teamId: string) => {
    if (teamPlayers[teamId]) {
      // Already fetched
      return;
    }

    try {
      // Fetch players for this team
      const { data: playersData, error: playersError } = await supabase
        .from('players')
        .select('*')
        .eq('team_id', teamId)
        .order('name');

      if (playersError) throw playersError;

      // Fetch points for all players
      const { data: pointsData, error: pointsError } = await supabase
        .from('players_point')
        .select('*');

      if (pointsError) throw pointsError;

      // Calculate player points
      const playersWithPoints = (playersData || []).map((player: Player) => {
        const totalPoints = (pointsData || [])
          .filter((p: PlayerPoint) => p.player_id === player.id)
          .reduce((sum, p) => sum + (p.points || 0), 0);
        
        let effectivePoints = totalPoints;
        if (player.is_captain) {
          effectivePoints = totalPoints * 2;
        } else if (player.is_vice_captain) {
          effectivePoints = totalPoints * 1.5;
        }

        return {
          ...player,
          totalPoints,
          effectivePoints
        };
      });

      setTeamPlayers(prev => ({
        ...prev,
        [teamId]: playersWithPoints
      }));
    } catch (error) {
      console.error('Error fetching team players:', error);
    }
  };

  const toggleTeam = async (teamId: string) => {
    if (expandedTeamId === teamId) {
      setExpandedTeamId(null);
    } else {
      setExpandedTeamId(teamId);
      await fetchTeamPlayers(teamId);
    }
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="w-5 h-5 text-yellow-400" />;
    if (rank === 2) return <Trophy className="w-5 h-5 text-slate-300" />;
    if (rank === 3) return <Trophy className="w-5 h-5 text-orange-400" />;
    return null;
  };

  const getRankBadgeColor = (rank: number) => {
    if (rank === 1) return "from-yellow-500/20 to-yellow-600/20 border-yellow-500/40 text-yellow-400";
    if (rank === 2) return "from-slate-400/20 to-slate-500/20 border-slate-400/40 text-slate-300";
    if (rank === 3) return "from-orange-500/20 to-orange-600/20 border-orange-500/40 text-orange-400";
    return "from-slate-700/20 to-slate-800/20 border-slate-700/40 text-slate-400";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">Loading leaderboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-gradient-to-br from-cyan-500/10 to-blue-600/10 backdrop-blur-xl border border-cyan-500/20 rounded-xl p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-cyan-500/20 flex items-center justify-center">
              <Users className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <p className="text-slate-400 text-sm">Total Teams</p>
              <p className="text-2xl font-bold text-cyan-400">{teams.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-yellow-500/10 to-orange-600/10 backdrop-blur-xl border border-yellow-500/20 rounded-xl p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-yellow-500/20 flex items-center justify-center">
              <Trophy className="w-6 h-6 text-yellow-400" />
            </div>
            <div>
              <p className="text-slate-400 text-sm">Leading Team</p>
              <p className="text-lg font-bold text-yellow-400 truncate">
                {teams[0]?.displayName || 'N/A'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500/10 to-emerald-600/10 backdrop-blur-xl border border-green-500/20 rounded-xl p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-green-500/20 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <p className="text-slate-400 text-sm">Top Points</p>
              <p className="text-2xl font-bold text-green-400">
                {teams[0]?.totalPoints.toFixed(1) || '0'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Leaderboard Title */}
      <div className="mb-6">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent mb-2">
          Live Leaderboard
        </h2>
        <p className="text-slate-400">Click on any team to view player details</p>
      </div>

      {/* Teams List */}
      <div className="space-y-3">
        {teams.length === 0 ? (
          <div className="text-center py-12 bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-xl">
            <Trophy className="w-16 h-16 text-slate-700 mx-auto mb-4" />
            <p className="text-slate-400 text-lg">No teams found</p>
            <p className="text-slate-500 text-sm mt-2">Teams will appear here once created</p>
          </div>
        ) : (
          teams.map((team, index) => (
            <motion.div
              key={team.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="overflow-hidden"
            >
              {/* Team Card */}
              <div
                onClick={() => toggleTeam(team.id)}
                className={`
                  relative cursor-pointer transition-all duration-300
                  bg-slate-900/50 backdrop-blur-xl border rounded-xl
                  hover:scale-[1.02] hover:shadow-xl hover:shadow-cyan-500/10
                  ${expandedTeamId === team.id 
                    ? 'border-cyan-500/40 shadow-lg shadow-cyan-500/20' 
                    : 'border-slate-800 hover:border-cyan-500/30'
                  }
                `}
              >
                <div className="p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      {/* Rank Badge */}
                      <div className={`
                        w-12 h-12 rounded-lg bg-gradient-to-br border flex items-center justify-center
                        ${getRankBadgeColor(index + 1)}
                      `}>
                        {getRankIcon(index + 1) || (
                          <span className="text-lg font-bold">#{index + 1}</span>
                        )}
                      </div>

                      {/* Team Info */}
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-white mb-1">
                          {team.displayName}
                        </h3>
                        {(team.owner_name || team.owner) && (
                          <p className="text-sm text-slate-400">
                            Owner: {team.owner_name || team.owner}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Points and Expand Icon */}
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                          {team.totalPoints.toFixed(1)}
                        </p>
                        <p className="text-xs text-slate-500">points</p>
                      </div>
                      
                      <div className={`
                        w-10 h-10 rounded-lg bg-slate-800/50 flex items-center justify-center
                        transition-transform duration-300
                        ${expandedTeamId === team.id ? 'rotate-180' : ''}
                      `}>
                        {expandedTeamId === team.id ? (
                          <ChevronUp className="w-5 h-5 text-cyan-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-slate-400" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Expanded Players View */}
              <AnimatePresence>
                {expandedTeamId === team.id && teamPlayers[team.id] && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-3 bg-slate-950/50 backdrop-blur-xl border border-slate-800 rounded-xl p-5">
                      <h4 className="text-sm font-semibold text-cyan-400 mb-4 uppercase tracking-wider">
                        Team Players
                      </h4>
                      
                      <div className="space-y-2">
                        {teamPlayers[team.id].map((player) => (
                          <div
                            key={player.id}
                            className={`
                              p-4 rounded-lg border transition-all
                              ${player.is_captain 
                                ? 'bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-yellow-500/30' 
                                : player.is_vice_captain
                                ? 'bg-gradient-to-r from-slate-400/10 to-slate-500/10 border-slate-400/30'
                                : 'bg-slate-900/50 border-slate-800'
                              }
                            `}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3 flex-1">
                                {/* Role Badge */}
                                {(player.is_captain || player.is_vice_captain) && (
                                  <div className="flex-shrink-0">
                                    {player.is_captain ? (
                                      <div className="flex items-center gap-1 px-2 py-1 rounded bg-yellow-500/20 border border-yellow-500/40">
                                        <Crown className="w-3 h-3 text-yellow-400" />
                                        <span className="text-xs font-bold text-yellow-400">C</span>
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-1 px-2 py-1 rounded bg-slate-400/20 border border-slate-400/40">
                                        <Star className="w-3 h-3 text-slate-300" />
                                        <span className="text-xs font-bold text-slate-300">VC</span>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* Player Info */}
                                <div className="flex-1">
                                  <p className="font-semibold text-white">
                                    {player.name}
                                  </p>
                                  <p className="text-xs text-slate-400">
                                    {player.role}
                                  </p>
                                </div>
                              </div>

                              {/* Points */}
                              <div className="text-right">
                                <p className="text-lg font-bold text-cyan-400">
                                  {player.effectivePoints.toFixed(1)}
                                </p>
                                <p className="text-xs text-slate-500">
                                  Base: {player.totalPoints.toFixed(1)}
                                  {player.is_captain && ' × 2'}
                                  {player.is_vice_captain && ' × 1.5'}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}

                        {teamPlayers[team.id].length === 0 && (
                          <div className="text-center py-8 text-slate-500">
                            No players in this team
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}