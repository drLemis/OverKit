document.getElementById('teamForm').addEventListener('submit', function (event) {
    event.preventDefault(); // Prevent form submission

    // Get form inputs
    var csvInput = document.getElementById('csvInput').files[0];
    var teamCount = parseInt(document.getElementById('teamCount').value);
    var playersPerTeam = parseInt(document.getElementById('playersPerTeam').value);

    // Read CSV file
    var reader = new FileReader();
    reader.onload = function (event) {
        var csvData = event.target.result;
        var players = parseCsvData(csvData);

        // Balance teams
        var balancedTeams = balanceTeamsByPicking(players, teamCount, playersPerTeam);
        // balancedTeams = balanceTeamBySwapping(balancedTeams)
        balancedTeams = balanceTeamByMidDelta(balancedTeams)

        // Display balanced teams
        displayTeams(balancedTeams);
    };
    reader.readAsText(csvInput);
});

function parseCsvData(csvData) {
    var lines = csvData.split('\n');
    var players = [];

    for (var i = 0; i < lines.length; i++) {
        var line = lines[i].trim();
        if (line) {
            var parts = line.split(',');
            var player = {
                name: parts[0].trim(),
                power: parseInt(parts[1].trim())
            };
            players.push(player);
        }
    }

    return players;
}

function balanceTeamByMidDelta(teams) {
    var swap = true;
    var counter = 0;
    var cache = [];

    // let's make a copy
    teams.forEach(team => {
        var index = teams.indexOf(team);
        cache[index] = [];
        team.forEach(player => {
            cache[index].push(player);
        });
    });

    while (swap) {
        counter++;
        if (counter > 10000)
            break;

        swap = false;

        var deltaDataOld = getMaxDelta(cache, teams.length - 1);
        var currentMaxDeltaIndexOld = deltaDataOld[0];
        var currentMaxDeltaValueOld = deltaDataOld[1];

        cache.forEach(teamA => {
            if (!swap) {
                teamA.forEach(playerA => {
                    if (!swap) {
                        cache.forEach(teamB => {
                            if (!swap) {
                                teamB.forEach(playerB => {
                                    if (!swap) {
                                        if (teamA != teamB) {
                                            swapPlayers(teamA, teamB, playerA, playerB);
                                            var deltaData = getMaxDelta(cache, cache.length - 1);
                                            swap = true;
                                            // not getting better? revert!
                                            if (deltaData[1] >= currentMaxDeltaValueOld) {
                                                swapPlayers(teamB, teamA, playerA, playerB);
                                                swap = false;
                                            }
                                            else {
                                                console.log("Swapped " + cache.indexOf(teamA) + ":" + playerA.name + " and " + cache.indexOf(teamB) + ":" + playerB.name);
                                            }
                                        }
                                    }
                                })
                            }
                        });
                    }
                });
            }
        });
    }

    return cache;
}

function swapPlayers(teamA, teamB, playerA, playerB) {
    var indexA = teamA.indexOf(playerA);
    var indexB = teamB.indexOf(playerB);
    if (indexA > -1 && indexB > -1) {
        teamA[indexA] = playerB;
        teamB[indexB] = playerA;
    }
}

function getMaxDelta(teams, maxIndex) {
    var currentPower = getTeamsPower(teams, teams.length - 1) / (teams.length - 1);
    var currentMaxDeltaValue = 0;
    var currentMaxDeltaIndex = -1;
    teams.forEach(team => {
        var index = teams.indexOf(team);
        if (index < maxIndex) {
            var teamDeltaValue = Math.abs(getTeamPower(team) - currentPower);
            if (index < teams.length - 1 && teamDeltaValue > currentMaxDeltaValue) {
                currentMaxDeltaValue = teamDeltaValue;
                currentMaxDeltaIndex = index;
            }
        }
    });

    return [currentMaxDeltaIndex, currentMaxDeltaValue];
}

function balanceTeamsByPicking(players, teamCount, playersPerTeam) {
    // Sort players by power in descending order
    players.sort(function (a, b) {
        return b.power - a.power;
    });

    var balancedTeams = [];

    // Initialize teams
    for (var i = 0; i < teamCount; i++) {
        balancedTeams[i] = [];
    }
    var usedPlayers = [];

    // Assign players to teams in a greedy manner
    for (var j = 0; j < players.length; j++) {
        var player = players[j];
        var minTeamIndex = 0;
        var minTeamPower = getTeamPower(balancedTeams[0]);

        for (var k = 1; k < teamCount; k++) {
            var teamPower = getTeamPower(balancedTeams[k]);
            if (teamPower < minTeamPower && playersPerTeam > balancedTeams[k].length) {
                minTeamIndex = k;
                minTeamPower = teamPower;
            }
        }

        if (balancedTeams[minTeamIndex].length < playersPerTeam) {
            balancedTeams[minTeamIndex].push(player);
            usedPlayers.push(player);
        }
    }

    // Sort teams by total power in ascending order
    balancedTeams.sort(function (a, b) {
        var totalPowerA = getTeamPower(a);
        var totalPowerB = getTeamPower(b);
        return totalPowerA - totalPowerB;
    });

    // Get excess players by checking every player that is not in usedPlayers
    var excessPlayers = players.filter(function (player) {
        return !usedPlayers.includes(player);
    });

    // Create "Not Assigned" team
    var notAssignedTeam = excessPlayers.slice();

    balancedTeams.push(notAssignedTeam);

    return balancedTeams;
}

function getTeamPower(team) {
    return team.reduce(function (sum, player) {
        return sum + player.power;
    }, 0);
}

function getTeamsPower(teams, maxIndex) {
    var sum = 0
    for (var i = 0; i < maxIndex; i++) {
        sum += getTeamPower(teams[i]);
    }
    return sum;
}

function displayTeams(teams) {
    var output = document.getElementById('output');
    output.innerHTML = '';

    var table = document.createElement('table');
    var headerRow = document.createElement('tr');
    var headerCell = document.createElement('th');
    headerCell.innerHTML = 'Team';
    headerRow.appendChild(headerCell);
    headerCell = document.createElement('th');
    headerCell.innerHTML = 'Players';
    headerRow.appendChild(headerCell);
    headerCell = document.createElement('th');
    headerCell.innerHTML = 'Total Power';
    headerRow.appendChild(headerCell);
    table.appendChild(headerRow);

    // Iterate through all teams except the last one
    for (var i = 0; i < teams.length - 1; i++) {
        var team = teams[i];
        var teamRow = document.createElement('tr');

        var teamCell = document.createElement('td');
        teamCell.innerHTML = 'Team ' + (i + 1);
        teamRow.appendChild(teamCell);

        var playersCell = document.createElement('td');
        var playersList = document.createElement('ul');

        var totalPower = 0;
        
        // Sort players by power in descending order
        team.sort(function (a, b) {
            return b.power - a.power;
        });

        for (var j = 0; j < team.length; j++) {
            var player = team[j];
            var playerItem = document.createElement('li');
            playerItem.innerHTML = player.name + ' (' + player.power + ' power)';
            playersList.appendChild(playerItem);
            totalPower += player.power;
        }

        playersCell.appendChild(playersList);
        teamRow.appendChild(playersCell);

        var totalPowerCell = document.createElement('td');
        totalPowerCell.innerHTML = totalPower;
        teamRow.appendChild(totalPowerCell);

        table.appendChild(teamRow);
    }

    // Handle the "Not Assigned" team separately
    var notAssignedTeam = teams[teams.length - 1];
    var notAssignedRow = document.createElement('tr');

    var notAssignedCell = document.createElement('td');
    notAssignedCell.innerHTML = 'Not Assigned';
    notAssignedRow.appendChild(notAssignedCell);

    var notAssignedPlayersCell = document.createElement('td');
    var notAssignedPlayersList = document.createElement('ul');

    for (var k = 0; k < notAssignedTeam.length; k++) {
        var notAssignedPlayer = notAssignedTeam[k];
        var notAssignedPlayerItem = document.createElement('li');
        notAssignedPlayerItem.innerHTML = notAssignedPlayer.name + ' (' + notAssignedPlayer.power + ' power)';
        notAssignedPlayersList.appendChild(notAssignedPlayerItem);
    }

    notAssignedPlayersCell.appendChild(notAssignedPlayersList);
    notAssignedRow.appendChild(notAssignedPlayersCell);

    var notAssignedTotalPowerCell = document.createElement('td');
    notAssignedTotalPowerCell.innerHTML = '';
    notAssignedRow.appendChild(notAssignedTotalPowerCell);

    table.appendChild(notAssignedRow);

    output.appendChild(table);
}