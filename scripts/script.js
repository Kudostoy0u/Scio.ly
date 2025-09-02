const fs = require('fs');
const path = require('path');
const glob = require('glob');
const yaml = require('js-yaml');

// --- configuration ---
const RESULTS_DIR = 'results';
const OUTPUT_DIR = './public';
const STARTING_ELO = 1500;
const ELO_FLOOR = 100;

/**
 * This is the single most important constant for the new algorithm.
 * It controls the magnitude of Elo changes based on performance.
 * A higher value leads to more volatile ratings. 800 is a robust, stable starting point.
 */
const ELO_PERFORMANCE_SCALING_FACTOR = 140;

/**
 * Tournament competitiveness weighting factor.
 * Higher values make competitive tournaments (with high average Elo) more impactful.
 */
const TOURNAMENT_COMPETITIVENESS_FACTOR = 0.5;

/**
 * Tournament volatility scaling factors for new seasons.
 * Teams get more volatile Elo changes in their first few tournaments of a new season.
 */
const FIRST_TOURNAMENT_VOLATILITY = 1.5;  // 2x more volatile for first tournament
const SECOND_TOURNAMENT_VOLATILITY = 1.1; // 1.5x more volatile for second tournament
const NORMAL_VOLATILITY = 1.0;

/**
 * Tournament importance multipliers for state and national tournaments.
 */
const STATE_TOURNAMENT_MULTIPLIER = 4.0;   // 4x multiplier for state tournaments
const NATIONAL_TOURNAMENT_MULTIPLIER = 7.0; // 7x multiplier for national tournaments

/**
 * ELO change damping parameters for continuous damping function.
 * Uses a sigmoid-like function to smoothly damp large changes.
 */
const ELO_DAMPING_SCALE = 100;
const ELO_DAMPING_STRENGTH = 0.3;


const metadata = {
    teams: new Map(), // teamname -> id
    events: new Map(), // eventname -> id
    tournaments: new Map(), // tournamentname -> id
    teamIds: [], // [teamname, ...]
    eventIds: [], // [eventname, ...]
    tournamentIds: [] // [tournamentname, ...]
};

let nextTeamId = 0;
let nextEventId = 0;
let nextTournamentId = 0;



// --- main execution ---
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
        // console.log(`processing ${path.basename(file)}...`);
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


    const optimizedData = {
        meta: {
            teams: metadata.teamIds,
            events: metadata.eventIds,
            tournaments: metadata.tournamentIds
        },
        data: eloData
    };


    generateStateFiles(eloData, division, metadata);
}

/**
 * Process tournament name to replace state codes and "nationals" with proper tournament names
 * @param {string} tournamentName - The original tournament name
 * @returns {string} The processed tournament name
 */
function processTournamentName(tournamentName) {
    if (!tournamentName) return tournamentName;
    
    let processedName = tournamentName;
    

    processedName = processedName.replace(/\bnationals\b/gi, 'Science Olympiad National Tournament');
    

    const stateCodePattern = /\[([^,]+),\s*([A-Z]{2})\]/g;
    processedName = processedName.replace(stateCodePattern, (match, prefix, stateCode) => {
        const stateName = getStateName(stateCode);
        return `${stateName} Science Olympiad State Tournament`;
    });
    

    const stateStatesPattern = /\b([a-z]?)([A-Z]{2})\s+states\b/gi;
    processedName = processedName.replace(stateStatesPattern, (match, prefix, stateCode) => {
        let stateName = getStateName(stateCode);
        

        if (stateCode.toUpperCase() === 'CA') {
            if (prefix.toLowerCase() === 's') {
                stateName = 'Southern California';
            } else if (prefix.toLowerCase() === 'n') {
                stateName = 'Northern California';
            }
        }
        
        return `${stateName} Science Olympiad State Tournament`;
    });
    
    return processedName;
}

function processTournament(data, eloData, filePath) {
    const filename = path.basename(filePath, '.yaml');
    const rawTournamentName = data.Tournament.name || (() => {
        const parts = filename.split('_');
        return parts.slice(1, -1).join(' ');
    })();
    
    const tournamentInfo = {
        name: processTournamentName(rawTournamentName),
        date: data.Tournament['start date'] ? (() => {

            const originalDate = new Date(data.Tournament['start date']);
            originalDate.setDate(originalDate.getDate() + 1);
            return originalDate.toISOString().split('T')[0];
        })() : (() => {

            const originalDate = new Date(filename.split('_')[0]);
            originalDate.setDate(originalDate.getDate() + 1);
            return originalDate.toISOString().split('T')[0];
        })(),
        season: data.Tournament.year ? data.Tournament.year.toString() : new Date(data.Tournament['start date']).getFullYear().toString(),
        filename: filename
    };
    

    if (!metadata.tournaments.has(tournamentInfo.name)) {
        metadata.tournaments.set(tournamentInfo.name, nextTournamentId);
        metadata.tournamentIds[nextTournamentId] = tournamentInfo.name;
        nextTournamentId++;
    }
    
    const { canonicalTeamMap, overallRankings, eventRankingsMap, teamStateMap } = analyzeAndRankTeams(data);
    

    updateEloForRanking(overallRankings, eloData, tournamentInfo, '__OVERALL__', teamStateMap, filePath);
    

    for (const [eventName, eventRankings] of eventRankingsMap.entries()) {
        updateEloForRanking(eventRankings, eloData, tournamentInfo, eventName, teamStateMap, filePath);
    }
}

function analyzeAndRankTeams(data) {

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


    const noShowTeams = new Set();
    for (const team of data.Teams) {
        const teamPlacings = placingsByTeam.get(team.number) || [];
        const hasAnyPlace = teamPlacings.some(p => p.place !== null && p.place !== undefined);
        if (!hasAnyPlace) {
            noShowTeams.add(team.number);
            // console.log(`no-show detected: team ${team.number} (${team.school}) - no places in any events`);
        }
    }

    const eventCompetitorCounts = new Map();
    data.Events.forEach(event => {

        const competitors = new Set(data.Placings.filter(p => p.event === event.name && p.place && !noShowTeams.has(p.team)).map(p => p.team));
        eventCompetitorCounts.set(event.name, competitors.size);
    });

    const teamScores = new Map();
    for (const team of data.Teams) {

        if (noShowTeams.has(team.number)) {
            continue;
        }

        let totalScore = 0;
        const teamPlacings = placingsByTeam.get(team.number) || [];
        for (const event of data.Events) {
            const placing = teamPlacings.find(p => p.event === event.name);
            if (placing && placing.place) {

                totalScore += placing.place;
            } else {

                const competitorCount = eventCompetitorCounts.get(event.name) || 1;
                totalScore += competitorCount;
            }
        }
        teamScores.set(team.number, { teamData: team, score: totalScore });
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

        if (!metadata.events.has(event.name)) {
            metadata.events.set(event.name, nextEventId);
            metadata.eventIds[nextEventId] = event.name;
            nextEventId++;
        }
        
        const eventScoreMap = new Map();
        const competitorCount = eventCompetitorCounts.get(event.name);
        if (!competitorCount) continue;
        for (const team of data.Teams) {

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

function updateEloForRanking(rankedTeams, eloData, tournamentInfo, category, teamStateMap, filePath) {
    if (rankedTeams.length < 2) return;


    const participatingTeams = rankedTeams.filter(team => team.place !== null && team.place !== undefined);
    if (participatingTeams.length < 2) return;

    const initialRatings = {};
    const volatilityFactors = {};
    
    for (const team of participatingTeams) {
        const stateCode = teamStateMap[team.name];
        const teamData = getOrInitializeTeam(eloData, team.name, tournamentInfo.season, category, stateCode);
        initialRatings[team.name] = teamData.rating;
        

        const tournamentCount = teamData.history.length;
        if (tournamentCount === 0) {
            volatilityFactors[team.name] = FIRST_TOURNAMENT_VOLATILITY;
        } else if (tournamentCount === 1) {
            volatilityFactors[team.name] = SECOND_TOURNAMENT_VOLATILITY;
        } else {
            volatilityFactors[team.name] = NORMAL_VOLATILITY;
        }
    }
    

    const sortedRatings = Object.values(initialRatings).sort((a, b) => b - a);
    const topTeamsCount = Math.max(1, Math.floor(participatingTeams.length * 0.7));
    const topTeamRatings = sortedRatings.slice(0, topTeamsCount);
    const averageElo = topTeamRatings.reduce((sum, rating) => sum + rating, 0) / topTeamRatings.length;
    const competitivenessMultiplier = 1 + (TOURNAMENT_COMPETITIVENESS_FACTOR * (averageElo - 1500) / 1500);
    

    const importanceMultiplier = getTournamentImportanceMultiplier(tournamentInfo, filePath);
    

    
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
            else if (teamA.place === teamB.place) actualScoreRaw += 1.0;
        }
        
        const actualPerformance = actualScoreRaw / numOpponents;
        const expectedPerformance = expectedScoreRaw / numOpponents;
        

        

        const baseEloChange = ELO_PERFORMANCE_SCALING_FACTOR * (actualPerformance - expectedPerformance);
        const scaledEloChange = baseEloChange * volatilityFactors[teamA.name] * competitivenessMultiplier * importanceMultiplier;
        

        const dampingFactor = calculateEloDampingFactor(scaledEloChange);
        eloChanges[teamA.name] = scaledEloChange * dampingFactor;
        

    }
    

    const totalEloChange = Object.values(eloChanges).reduce((sum, change) => sum + change, 0);
    const averageChange = totalEloChange / Object.keys(eloChanges).length;
    

    for (const teamName in eloChanges) {
        eloChanges[teamName] -= averageChange;
    }
    

    const teamsToConvertToJV = [];
    const MAX_ELO_LOSS = 200;
    
    for (const team of participatingTeams) {

        

        if (eloChanges[team.name] < -MAX_ELO_LOSS) {
            // console.log(`capping elo loss for ${team.name} from ${elochanges[team.name]} to -${max_elo_loss}`);
            eloChanges[team.name] = -MAX_ELO_LOSS;
        }
        

        if (team.name.includes(' Varsity') && initialRatings[team.name] >= 2000 && eloChanges[team.name] <= -90 && !isStateOrNationalTournament(tournamentInfo, filePath)) {
            teamsToConvertToJV.push(team.name);
        }
    }
    

    if (teamsToConvertToJV.length > 0) {
        

        const filteredTeams = participatingTeams.filter(team => !team.name.includes(' JV'));
        

        const convertedTeams = filteredTeams.map(team => {
            if (teamsToConvertToJV.includes(team.name)) {
                return {
                    ...team,
                    name: team.name.replace(' Varsity', ' JV')
                };
            }
            return team;
        });
        

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
            const scaledEloChange = baseEloChange * volatilityFactor * recalculatedCompetitivenessMultiplier * importanceMultiplier;
            

            const dampingFactor = calculateEloDampingFactor(scaledEloChange);
            let finalEloChange = scaledEloChange * dampingFactor;
            

            if (finalEloChange < -MAX_ELO_LOSS) {
                // console.log(`capping recalculated elo loss for ${teama.name} from ${finalelochange} to -${max_elo_loss}`);
                finalEloChange = -MAX_ELO_LOSS;
            }
            
            recalculatedEloChanges[teamA.name] = finalEloChange;
        }
        

        const recalculatedTotalEloChange = Object.values(recalculatedEloChanges).reduce((sum, change) => sum + change, 0);
        const recalculatedAverageChange = recalculatedTotalEloChange / Object.keys(recalculatedEloChanges).length;
        
        for (const teamName in recalculatedEloChanges) {
            recalculatedEloChanges[teamName] -= recalculatedAverageChange;
        }
        

        for (const team of convertedTeams) {
            const stateCode = teamStateMap[team.name.replace(' JV', ' Varsity')] || teamStateMap[team.name];
            const teamData = getOrInitializeTeam(eloData, team.name, tournamentInfo.season, category, stateCode);
            let newElo = initialRatings[team.name.replace(' JV', ' Varsity')] + recalculatedEloChanges[team.name];
            

            

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

        for (const team of participatingTeams) {
            const stateCode = teamStateMap[team.name];
            const teamData = getOrInitializeTeam(eloData, team.name, tournamentInfo.season, category, stateCode);
            let newElo = initialRatings[team.name] + eloChanges[team.name];
            

            

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
    


    const normalizedChange = absChange / ELO_DAMPING_SCALE;
    const dampingAmount = ELO_DAMPING_STRENGTH * (normalizedChange / (1 + normalizedChange));
    
    return 1 - dampingAmount;
}

/**
 * Detect if a tournament is a state or national tournament based on name, filename, and content.
 * Returns the appropriate multiplier (1.0 for regular tournaments).
 */
function getTournamentImportanceMultiplier(tournamentInfo, filePath) {
    const searchTerms = [
        tournamentInfo.name,
        tournamentInfo.filename,
        path.basename(filePath, '.yaml')
    ];
    

    try {
        const fileContents = fs.readFileSync(filePath, 'utf8').toLowerCase();
        searchTerms.push(fileContents);
    } catch (e) {

    }
    
    const combinedText = searchTerms.join(' ').toLowerCase();
    

    if (combinedText.includes('national tournament') || 
        combinedText.includes('nationals') ||
        combinedText.includes('national championship')) {
        return NATIONAL_TOURNAMENT_MULTIPLIER;
    }
    

    if (combinedText.includes('state tournament') || 
        combinedText.includes('states') ||
        combinedText.includes('state championship')) {
        return STATE_TOURNAMENT_MULTIPLIER;
    }
    
    return 1.0;
}

/**
 * Check if a tournament is a state or national tournament.
 * Returns true if it's a state or national tournament, false otherwise.
 */
function isStateOrNationalTournament(tournamentInfo, filePath) {
    const searchTerms = [
        tournamentInfo.name,
        tournamentInfo.filename,
        path.basename(filePath, '.yaml')
    ];
    

    try {
        const fileContents = fs.readFileSync(filePath, 'utf8').toLowerCase();
        searchTerms.push(fileContents);
    } catch (e) {

    }
    
    const combinedText = searchTerms.join(' ').toLowerCase();
    

    if (combinedText.includes('national tournament') || 
        combinedText.includes('nationals') ||
        combinedText.includes('national championship')) {
        return true;
    }
    

    if (combinedText.includes('state tournament') || 
        combinedText.includes('states') ||
        combinedText.includes('state championship')) {
        return true;
    }
    
    return false;
}

function getOrInitializeTeam(eloData, teamName, season, category, stateCode) {

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
        const currentSeasonInt = parseInt(season, 10);


        const availableSeasons = Object.keys(eloData[stateCode][teamName].seasons)
            .map(s => parseInt(s, 10))
            .filter(s => s < currentSeasonInt)
            .sort((a, b) => b - a);

        if (availableSeasons.length > 0) {

            for (const prevSeason of availableSeasons) {
                const prevSeasonStr = prevSeason.toString();
                if (eloData[stateCode][teamName].seasons[prevSeasonStr] && 
                    eloData[stateCode][teamName].seasons[prevSeasonStr].events[category]) {
                    initialRating = eloData[stateCode][teamName].seasons[prevSeasonStr].events[category].rating;
                    break;
                }
            }
        }
        
        eloData[stateCode][teamName].seasons[season].events[category] = {
            rating: initialRating,
            history: [],
        };
    }
    
    return eloData[stateCode][teamName].seasons[season].events[category];
}

/**
 * Generate state-based JSON files
 * Creates individual state files and metadata for better performance
 * 
 * @param {Object} eloData - The complete Elo data object
 * @param {string} division - The division ('B' or 'C')
 * @param {Object} metadata - The metadata object with mappings
 */
function generateStateFiles(eloData, division, metadata) {
    const statesDir = path.join(OUTPUT_DIR, `states${division}`);
    

    if (!fs.existsSync(statesDir)) {
        fs.mkdirSync(statesDir, { recursive: true });
    }
    

    const tournamentTimeline = precalculateTournamentTimeline(eloData, metadata);
    

    const metadataFile = {
        teams: metadata.teamIds,
        events: metadata.eventIds,
        tournaments: metadata.tournamentIds,
        states: {},
        tournamentTimeline: tournamentTimeline
    };
    

    for (const stateCode in eloData) {
        const stateData = eloData[stateCode];
        const stateFile = path.join(statesDir, `${stateCode}.json`);
        

        fs.writeFileSync(stateFile, JSON.stringify(stateData));
        

        metadataFile.states[stateCode] = getStateName(stateCode);
        
        console.log(`Generated ${stateCode}.json for Division ${division}`);
    }
    

    const metaFile = path.join(statesDir, 'meta.json');
    fs.writeFileSync(metaFile, JSON.stringify(metadataFile, null, 2));
    
    console.log(`Generated meta.json for Division ${division}`);
    console.log(`State-based files created in: ${statesDir}`);
}

/**
 * Precalculate tournament timeline data for all seasons
 * This creates a comprehensive list of all tournaments with their dates and links
 * 
 * @param {Object} eloData - The complete Elo data object
 * @param {Object} metadata - The metadata object with mappings
 * @returns {Object} Tournament timeline data organized by season
 */
function precalculateTournamentTimeline(eloData, metadata) {
    const timeline = {};
    const seenTournaments = new Set();
    

    for (const stateCode in eloData) {
        for (const schoolName in eloData[stateCode]) {
            const school = eloData[stateCode][schoolName];
            
            Object.entries(school.seasons).forEach(([season, seasonData]) => {

                if (!timeline[season]) {
                    timeline[season] = [];
                }
                

                const overallEvent = seasonData.events['__OVERALL__'];
                if (overallEvent && overallEvent.history) {
                    overallEvent.history.forEach(entry => {
                        if (entry.d && entry.t !== undefined && entry.l) {

                            const tournamentKey = `${entry.d}-${entry.t}`;
                            
                            if (!seenTournaments.has(tournamentKey)) {
                                seenTournaments.add(tournamentKey);
                                

                                const timelineEntry = {
                                    date: entry.d,
                                    tournamentId: entry.t,
                                    tournamentName: processTournamentName(metadata.tournamentIds[entry.t]) || `Tournament ${entry.t}`,
                                    link: entry.l,
                                    season: season
                                };
                                

                                timeline[season].push(timelineEntry);
                            }
                        }
                    });
                }
            });
        }
    }
    

    for (const season in timeline) {
        timeline[season].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }
    
    return timeline;
}

/**
 * Get state name from state code
 * @param {string} stateCode - Two-letter state code
 * @returns {string} Full state name
 */
function getStateName(stateCode) {
    const stateNames = {
        'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas',
        'CA': 'California', 'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware',
        'FL': 'Florida', 'GA': 'Georgia', 'HI': 'Hawaii', 'ID': 'Idaho',
        'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa', 'KS': 'Kansas',
        'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland',
        'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi',
        'MO': 'Missouri', 'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada',
        'NH': 'New Hampshire', 'NJ': 'New Jersey', 'NM': 'New Mexico', 'NY': 'New York',
        'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio', 'OK': 'Oklahoma',
        'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina',
        'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah',
        'VT': 'Vermont', 'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia',
        'WI': 'Wisconsin', 'WY': 'Wyoming', 'DC': 'District of Columbia'
    };
    
    return stateNames[stateCode] || stateCode;
}

main().catch(console.error);