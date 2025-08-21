const fs = require('fs');
const path = require('path');
const glob = require('glob');
const yaml = require('js-yaml');

// --- CONFIGURATION ---
const RESULTS_DIR = 'results';
const OUTPUT_DIR = './public';
const STARTING_ELO = 1500;
const ELO_FLOOR = 100; // Absolute minimum Elo rating.

/**
 * This is the single most important constant for the new algorithm.
 * It controls the magnitude of Elo changes based on performance.
 * A higher value leads to more volatile ratings. 800 is a robust, stable starting point.
 */
const ELO_PERFORMANCE_SCALING_FACTOR = 400;

/**
 * Tournament competitiveness weighting factor.
 * Higher values make competitive tournaments (with high average Elo) more impactful.
 */
const TOURNAMENT_COMPETITIVENESS_FACTOR = 0.5;

/**
 * Tournament volatility scaling factors for new seasons.
 * Teams get more volatile Elo changes in their first few tournaments of a new season.
 */
const FIRST_TOURNAMENT_VOLATILITY = 2.0;  // 2x more volatile for first tournament
const SECOND_TOURNAMENT_VOLATILITY = 1.5; // 1.5x more volatile for second tournament
const NORMAL_VOLATILITY = 1.0;            // Normal volatility after that

/**
 * ELO change damping parameters for continuous damping function.
 * Uses a sigmoid-like function to smoothly damp large changes.
 */
const ELO_DAMPING_SCALE = 100;  // Scale factor for the damping curve
const ELO_DAMPING_STRENGTH = 0.3;  // Maximum damping strength (30% max reduction)

// Metadata maps for optimization
const metadata = {
    teams: new Map(), // teamName -> id
    events: new Map(), // eventName -> id
    tournaments: new Map(), // tournamentName -> id
    teamIds: [], // [teamName, ...]
    eventIds: [], // [eventName, ...]
    tournamentIds: [] // [tournamentName, ...]
};

let nextTeamId = 0;
let nextEventId = 0;
let nextTournamentId = 0;

// --- MAIN EXECUTION ---
async function main() {
    for (const division of ['B', 'C']) {
        await processDivision(division);
    }
}

async function processDivision(division) {
    const eloData = {};

    const tournamentFiles = glob.sync(`${RESULTS_DIR}/**/*_${division.toLowerCase()}.yaml`);
    tournamentFiles.sort();

    if (tournamentFiles.length === 0) {
        return;
    }

    for (const file of tournamentFiles) {
        // console.log(`Processing ${path.basename(file)}...`);
        try {
            const fileContents = fs.readFileSync(file, 'utf8');
            const tournamentData = yaml.load(fileContents);
            if (tournamentData) {
                processTournament(tournamentData, eloData, file);
            }
        } catch (e) {
            if (e.message.includes('missing state code')) {
                process.exit(1);
            }
        }
    }

    // Create optimized output structure
    const optimizedData = {
        meta: {
            teams: metadata.teamIds,
            events: metadata.eventIds,
            tournaments: metadata.tournamentIds
        },
        data: eloData
    };

    const outputFile = path.join(OUTPUT_DIR, `elo${division}.json`);
    fs.writeFileSync(outputFile, JSON.stringify(optimizedData));
}

function processTournament(data, eloData, filePath) {
    const filename = path.basename(filePath, '.yaml');
    const tournamentInfo = {
        name: data.Tournament.name || (() => {
            const parts = filename.split('_');
            return parts.slice(1, -1).join(' ');
        })(),
        date: data.Tournament['start date'] ? new Date(data.Tournament['start date']).toISOString().split('T')[0] : filename.split('_')[0],
        season: data.Tournament.year ? data.Tournament.year.toString() : new Date(data.Tournament['start date']).getFullYear().toString(),
        filename: filename
    };
    
    // Add tournament to metadata
    if (!metadata.tournaments.has(tournamentInfo.name)) {
        metadata.tournaments.set(tournamentInfo.name, nextTournamentId);
        metadata.tournamentIds[nextTournamentId] = tournamentInfo.name;
        nextTournamentId++;
    }
    
    const { canonicalTeamMap, overallRankings, eventRankingsMap, teamStateMap } = analyzeAndRankTeams(data);
    
    // Update Elo ratings for overall rankings
    updateEloForRanking(overallRankings, eloData, tournamentInfo, '__OVERALL__', teamStateMap);
    
    // Update Elo ratings for individual events
    for (const [eventName, eventRankings] of eventRankingsMap.entries()) {
        updateEloForRanking(eventRankings, eloData, tournamentInfo, eventName, teamStateMap);
    }
}

function analyzeAndRankTeams(data) {
    // Validate that all teams have state codes
    for (const team of data.Teams) {
        if (!team.state) {
            throw new Error(`Team ${team.number} (${team.school}) in tournament data is missing state code`);
        }
    }

    const placingsByTeam = new Map();
    data.Placings.forEach(p => {
        if (!placingsByTeam.has(p.team)) placingsByTeam.set(p.team, []);
        placingsByTeam.get(p.team).push(p);
    });

    // Detect no-show teams (teams that don't have a place in any event)
    const noShowTeams = new Set();
    for (const team of data.Teams) {
        const teamPlacings = placingsByTeam.get(team.number) || [];
        const hasAnyPlace = teamPlacings.some(p => p.place !== null && p.place !== undefined);
        if (!hasAnyPlace) {
            noShowTeams.add(team.number);
            // console.log(`No-show detected: Team ${team.number} (${team.school}) - no places in any events`);
        }
    }

    const eventCompetitorCounts = new Map();
    data.Events.forEach(event => {
        // Only count teams that actually participated (have a place)
        const competitors = new Set(data.Placings.filter(p => p.event === event.name && p.place && !noShowTeams.has(p.team)).map(p => p.team));
        eventCompetitorCounts.set(event.name, competitors.size);
    });

    const teamScores = new Map();
    for (const team of data.Teams) {
        // Skip no-show teams entirely
        if (noShowTeams.has(team.number)) {
            continue;
        }

        let totalNormalizedRank = 0;
        const teamPlacings = placingsByTeam.get(team.number) || [];
        for (const event of data.Events) {
            const placing = teamPlacings.find(p => p.event === event.name);
            const competitorCount = eventCompetitorCounts.get(event.name) || 1;
            if (placing && placing.place) {
                totalNormalizedRank += placing.place / competitorCount;
            } else {
                totalNormalizedRank += 1.0;
            }
        }
        teamScores.set(team.number, { teamData: team, score: totalNormalizedRank });
    }

    const canonicalTeamMap = {};
    const teamStateMap = {};
    const teamsBySchool = data.Teams.reduce((acc, team) => {
        if (!acc[team.school]) acc[team.school] = [];
        acc[team.school].push(team);
        return acc;
    }, {});
    for (const school in teamsBySchool) {
        const schoolTeams = teamsBySchool[school].map(t => teamScores.get(t.number)).filter(Boolean).sort((a, b) => a.score - b.score);
        if (schoolTeams[0]) {
            const teamName = `${school} Varsity`;
            canonicalTeamMap[schoolTeams[0].teamData.number] = teamName;
            teamStateMap[teamName] = schoolTeams[0].teamData.state;
            
            // Add team to metadata
            if (!metadata.teams.has(teamName)) {
                metadata.teams.set(teamName, nextTeamId);
                metadata.teamIds[nextTeamId] = teamName;
                nextTeamId++;
            }
        }
        if (schoolTeams[1]) {
            const teamName = `${school} JV`;
            canonicalTeamMap[schoolTeams[1].teamData.number] = teamName;
            teamStateMap[teamName] = schoolTeams[1].teamData.state;
            
            // Add team to metadata
            if (!metadata.teams.has(teamName)) {
                metadata.teams.set(teamName, nextTeamId);
                metadata.teamIds[nextTeamId] = teamName;
                nextTeamId++;
            }
        }
    }

    const createRankedList = (scoreMap) => {
        return [...scoreMap.values()]
            .filter(t => canonicalTeamMap[t.teamData.number])
            .map(t => ({ name: canonicalTeamMap[t.teamData.number], score: t.score }))
            .sort((a, b) => a.score - b.score)
            .map((team, index, arr) => {
                const place = (index > 0 && team.score === arr[index - 1].score) ? arr[index - 1].place : index + 1;
                return { ...team, place };
            });
    };

    const overallRankings = createRankedList(teamScores);
    const eventRankingsMap = new Map();
    for (const event of data.Events) {
        // Add event to metadata
        if (!metadata.events.has(event.name)) {
            metadata.events.set(event.name, nextEventId);
            metadata.eventIds[nextEventId] = event.name;
            nextEventId++;
        }
        
        const eventScoreMap = new Map();
        const competitorCount = eventCompetitorCounts.get(event.name);
        if (!competitorCount) continue;
        for (const team of data.Teams) {
            // Skip no-show teams in event rankings
            if (noShowTeams.has(team.number)) {
                continue;
            }
            const teamPlacing = (placingsByTeam.get(team.number) || []).find(p => p.event === event.name);
            const place = (teamPlacing && teamPlacing.place) ? teamPlacing.place : competitorCount + 1;
            eventScoreMap.set(team.number, { teamData: team, score: place });
        }
        eventRankingsMap.set(event.name, createRankedList(eventScoreMap));
    }

    return { canonicalTeamMap, overallRankings, eventRankingsMap, teamStateMap };
}

function updateEloForRanking(rankedTeams, eloData, tournamentInfo, category, teamStateMap) {
    if (rankedTeams.length < 2) return;

    // Ensure we only process teams that actually participated
    const participatingTeams = rankedTeams.filter(team => team.place !== null && team.place !== undefined);
    if (participatingTeams.length < 2) return;

    const initialRatings = {};
    const volatilityFactors = {};
    
    for (const team of participatingTeams) {
        const stateCode = teamStateMap[team.name];
        const teamData = getOrInitializeTeam(eloData, team.name, tournamentInfo.season, category, stateCode);
        initialRatings[team.name] = teamData.rating;
        
        // Calculate volatility factor based on number of tournaments played this season
        const tournamentCount = teamData.history.length;
        if (tournamentCount === 0) {
            volatilityFactors[team.name] = FIRST_TOURNAMENT_VOLATILITY;
        } else if (tournamentCount === 1) {
            volatilityFactors[team.name] = SECOND_TOURNAMENT_VOLATILITY;
        } else {
            volatilityFactors[team.name] = NORMAL_VOLATILITY;
        }
    }
    
    // Calculate tournament competitiveness (average Elo of participating teams, excluding bottom performers)
    const sortedRatings = Object.values(initialRatings).sort((a, b) => b - a);
    const topTeamsCount = Math.max(1, Math.floor(participatingTeams.length * 0.7)); // Use top 70% of teams
    const topTeamRatings = sortedRatings.slice(0, topTeamsCount);
    const averageElo = topTeamRatings.reduce((sum, rating) => sum + rating, 0) / topTeamRatings.length;
    const competitivenessMultiplier = 1 + (TOURNAMENT_COMPETITIVENESS_FACTOR * (averageElo - 1500) / 1500);
    
    const eloChanges = {};
    const numOpponents = participatingTeams.length - 1;

    for (const teamA of participatingTeams) {
        let expectedScoreRaw = 0;
        let actualScoreRaw = 0;

        for (const teamB of participatingTeams) {
            if (teamA.name === teamB.name) continue;
            
            const ratingA = initialRatings[teamA.name];
            const ratingB = initialRatings[teamB.name];

            expectedScoreRaw += 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
            if (teamA.place < teamB.place) actualScoreRaw += 1.0;
            else if (teamA.place === teamB.place) actualScoreRaw += 0.5;
        }
        
        const actualPerformance = actualScoreRaw / numOpponents;
        const expectedPerformance = expectedScoreRaw / numOpponents;
        
        // Apply volatility scaling and tournament competitiveness
        const baseEloChange = ELO_PERFORMANCE_SCALING_FACTOR * (actualPerformance - expectedPerformance);
        const scaledEloChange = baseEloChange * volatilityFactors[teamA.name] * competitivenessMultiplier;
        
        // Apply damping factor to make large changes more resistant
        const dampingFactor = calculateEloDampingFactor(scaledEloChange);
        eloChanges[teamA.name] = scaledEloChange * dampingFactor;
    }
    
    // Ensure zero-sum property by normalizing ELO changes
    const totalEloChange = Object.values(eloChanges).reduce((sum, change) => sum + change, 0);
    const averageChange = totalEloChange / Object.keys(eloChanges).length;
    
    // Subtract the average from each team's change to make it zero-sum
    for (const teamName in eloChanges) {
        eloChanges[teamName] -= averageChange;
    }
    
    // Check for large ELO drops in varsity teams with 2000+ ELO
    const teamsToConvertToJV = [];
    for (const team of participatingTeams) {
        if (team.name.includes(' Varsity') && initialRatings[team.name] >= 2000 && eloChanges[team.name] <= -90) {
            teamsToConvertToJV.push(team.name);
        }
    }
    
    // If we found teams to convert, recalculate the tournament
    if (teamsToConvertToJV.length > 0) {
        
        // Remove JV teams from the tournament
        const filteredTeams = participatingTeams.filter(team => !team.name.includes(' JV'));
        
        // Convert varsity teams to JV
        const convertedTeams = filteredTeams.map(team => {
            if (teamsToConvertToJV.includes(team.name)) {
                return {
                    ...team,
                    name: team.name.replace(' Varsity', ' JV')
                };
            }
            return team;
        });
        
        // Recalculate tournament competitiveness with the new team composition
        const recalculatedInitialRatings = {};
        for (const team of convertedTeams) {
            const originalName = team.name.replace(' JV', ' Varsity');
            recalculatedInitialRatings[team.name] = initialRatings[originalName] || initialRatings[team.name];
        }
        
        const recalculatedSortedRatings = Object.values(recalculatedInitialRatings).sort((a, b) => b - a);
        const recalculatedTopTeamsCount = Math.max(1, Math.floor(convertedTeams.length * 0.7));
        const recalculatedTopTeamRatings = recalculatedSortedRatings.slice(0, recalculatedTopTeamsCount);
        const recalculatedAverageElo = recalculatedTopTeamRatings.reduce((sum, rating) => sum + rating, 0) / recalculatedTopTeamRatings.length;
        const recalculatedCompetitivenessMultiplier = 1 + (TOURNAMENT_COMPETITIVENESS_FACTOR * (recalculatedAverageElo - 1500) / 1500);
        
        // Recalculate ELO changes with the new team composition
        const recalculatedEloChanges = {};
        const recalculatedNumOpponents = convertedTeams.length - 1;
        
        for (const teamA of convertedTeams) {
            let expectedScoreRaw = 0;
            let actualScoreRaw = 0;

            for (const teamB of convertedTeams) {
                if (teamA.name === teamB.name) continue;
                
                const ratingA = recalculatedInitialRatings[teamA.name];
                const ratingB = recalculatedInitialRatings[teamB.name];

                expectedScoreRaw += 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
                if (teamA.place < teamB.place) actualScoreRaw += 1.0;
                else if (teamA.place === teamB.place) actualScoreRaw += 0.5;
            }
            
            const actualPerformance = actualScoreRaw / recalculatedNumOpponents;
            const expectedPerformance = expectedScoreRaw / recalculatedNumOpponents;
            
            const baseEloChange = ELO_PERFORMANCE_SCALING_FACTOR * (actualPerformance - expectedPerformance);
            const volatilityFactor = volatilityFactors[teamA.name.replace(' JV', ' Varsity')] || volatilityFactors[teamA.name];
            const scaledEloChange = baseEloChange * volatilityFactor * recalculatedCompetitivenessMultiplier;
            
            // Apply damping factor to make large changes more resistant
            const dampingFactor = calculateEloDampingFactor(scaledEloChange);
            recalculatedEloChanges[teamA.name] = scaledEloChange * dampingFactor;
        }
        
        // Ensure zero-sum property for recalculated changes
        const recalculatedTotalEloChange = Object.values(recalculatedEloChanges).reduce((sum, change) => sum + change, 0);
        const recalculatedAverageChange = recalculatedTotalEloChange / Object.keys(recalculatedEloChanges).length;
        
        for (const teamName in recalculatedEloChanges) {
            recalculatedEloChanges[teamName] -= recalculatedAverageChange;
        }
        
        // Apply the recalculated ELO changes
        for (const team of convertedTeams) {
            const stateCode = teamStateMap[team.name.replace(' JV', ' Varsity')] || teamStateMap[team.name];
            const teamData = getOrInitializeTeam(eloData, team.name, tournamentInfo.season, category, stateCode);
            let newElo = initialRatings[team.name.replace(' JV', ' Varsity')] + recalculatedEloChanges[team.name];
            
            // Enforce the hard floor as a final safety measure.
            newElo = Math.max(ELO_FLOOR, newElo);
            
            teamData.rating = newElo;
            teamData.history.push({
                d: tournamentInfo.date,
                t: metadata.tournaments.get(tournamentInfo.name),
                p: team.place,
                e: parseFloat(newElo.toFixed(2)),
                l: `https://www.duosmium.org/results/${tournamentInfo.filename}`,
                n: teamsToConvertToJV.includes(team.name.replace(' JV', ' Varsity')) ? 'Converted from Varsity due to large ELO drop' : undefined
            });
            
            eloData[stateCode][team.name].meta.games += recalculatedNumOpponents;
            if (category !== '__OVERALL__') {
                const eventsSet = new Set(Object.keys(eloData[stateCode][team.name].seasons[tournamentInfo.season].events));
                eventsSet.delete('__OVERALL__');
                eloData[stateCode][team.name].meta.events = eventsSet.size;
            }
        }
    } else {
        // Apply the original ELO changes
        for (const team of participatingTeams) {
            const stateCode = teamStateMap[team.name];
            const teamData = getOrInitializeTeam(eloData, team.name, tournamentInfo.season, category, stateCode);
            let newElo = initialRatings[team.name] + eloChanges[team.name];
            
            // Enforce the hard floor as a final safety measure.
            newElo = Math.max(ELO_FLOOR, newElo);
            
            teamData.rating = newElo;
            teamData.history.push({
                d: tournamentInfo.date,
                t: metadata.tournaments.get(tournamentInfo.name),
                p: team.place,
                e: parseFloat(newElo.toFixed(2)),
                l: `https://www.duosmium.org/results/${tournamentInfo.filename}`
            });
            
            eloData[stateCode][team.name].meta.games += numOpponents;
            if (category !== '__OVERALL__') {
                const eventsSet = new Set(Object.keys(eloData[stateCode][team.name].seasons[tournamentInfo.season].events));
                eventsSet.delete('__OVERALL__');
                eloData[stateCode][team.name].meta.events = eventsSet.size;
            }
        }
    }
}

/**
 * Calculate damping factor for ELO changes using a continuous function.
 * Uses a smooth curve that applies more damping to larger changes.
 */
function calculateEloDampingFactor(eloChange) {
    const absChange = Math.abs(eloChange);
    
    // Use a smooth function: 1 - (strength * sigmoid-like curve)
    // This gives minimal damping for small changes and gradually increases for larger changes
    const normalizedChange = absChange / ELO_DAMPING_SCALE;
    const dampingAmount = ELO_DAMPING_STRENGTH * (normalizedChange / (1 + normalizedChange));
    
    return 1 - dampingAmount;
}

function getOrInitializeTeam(eloData, teamName, season, category, stateCode) {
    // Initialize state if it doesn't exist
    if (!eloData[stateCode]) {
        eloData[stateCode] = {};
    }
    
    if (!eloData[stateCode][teamName]) {
        eloData[stateCode][teamName] = { seasons: {}, meta: { games: 0, events: 0 } };
    }
    if (!eloData[stateCode][teamName].seasons[season]) {
        eloData[stateCode][teamName].seasons[season] = { events: {} };
    }

    if (!eloData[stateCode][teamName].seasons[season].events[category]) {
        let initialRating = STARTING_ELO;
        const previousSeason = (parseInt(season, 10) - 1).toString();

        // If team has previous season data, carry over their final rating
        if (eloData[stateCode][teamName].seasons[previousSeason] && eloData[stateCode][teamName].seasons[previousSeason].events[category]) {
            initialRating = eloData[stateCode][teamName].seasons[previousSeason].events[category].rating;
        }
        
        eloData[stateCode][teamName].seasons[season].events[category] = {
            rating: initialRating,
            history: [],
        };
    }
    
    return eloData[stateCode][teamName].seasons[season].events[category];
}

main().catch(console.error);