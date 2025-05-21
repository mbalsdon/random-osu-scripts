import * as fs from "fs";

let leToken = await getToken();

async function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getToken() {
    const clientCredentialsJson = fs.readFileSync("client-credentials.json", { encoding: "utf-8" });
    const clientCredentials = JSON.parse(clientCredentialsJson);

    const response = await fetch("https://osu.ppy.sh/oauth/token", {
        method: "POST",
        headers: {
            "Accept": "application/json",
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            "client_id": clientCredentials.OSU_API_CLIENT_ID,
            "client_secret": clientCredentials.OSU_API_CLIENT_SECRET,
            "grant_type": "client_credentials",
            "scope": "public"
        })
    });

    const responseJson = await response.json();

    return responseJson.access_token;
}

async function getRankingsIDs(gamemode) {
    const userIDs = [];

    for (let page = 1; page < 201; ++page) { // 1 -> 201

        let numRetries = 0;
        while (true) {
            console.log(`Pulling rankings page ${page}`);
            const rankingsResponse = await fetch(`https://osu.ppy.sh/api/v2/rankings/${gamemode}/performance?page=${page}`, {
                headers: {
                    "Accept": "application/json",
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${leToken}`
                }
            });

            if (rankingsResponse.status == 429) {
                const waitSec = Math.pow(2, numRetries) + Math.random();
                console.log(`Got response ${rankingsResponse.status} - retrying in ${waitSec}s`)
                await sleep(waitSec * 1000);
                ++numRetries;
            } else if (rankingsResponse.status == 401) {
                leToken = await getToken();
            } else if (rankingsResponse.status == 200) {
                const rankings = await rankingsResponse.json();
                for (const user of rankings.ranking) {
                    userIDs.push(user.user.id);
                }
                break;
            }
        }

    }

    return userIDs;
}

async function getUserBestScores(userIDs, gamemode) {
    console.log(`Getting ${userIDs.length} best scores, from user ${userIDs[0]} to ${userIDs[userIDs.length - 1]}`);
    const userBests = [];

    for (const userID of userIDs) {

        const userBest = { "userID": userID, "bestScores": [] };
        for (const offset of [0, 100]) { // grab 1-100, 101-200

            let numRetries = 0;
            while (true) {
                console.log(`Pulling top ${offset+1}-${offset+100} scores for ${userID}`);
                const scoresResponse = await fetch(`https://osu.ppy.sh/api/v2/users/${userID}/scores/best?mode=${gamemode}&limit=100&offset=${offset}`, {
                    headers: {
                        "Accept": "application/json",
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${leToken}`
                    }
                });

                if (scoresResponse.status == 429) {
                    const waitSec = Math.pow(2, numRetries) + Math.random();
                    console.log(`Got response ${scoresResponse.status} - retrying in ${waitSec}s`)
                    await sleep(waitSec * 1000);
                    ++numRetries;
                } else if (scoresResponse.status == 401) {
                    leToken = await getToken();
                } else if (scoresResponse.status == 200) {
                    const scores = await scoresResponse.json();
                    for (const score of scores) {
                        userBest.bestScores.push(score);
                    }
                    break;
                }
            }
        }
        userBests.push(userBest);

    }

    return userBests;
}

function saveUserBests(gamemode, userBests, begin, end) {
    const filename = `./${gamemode}_${begin}-${end}_user-bests_${userBests.length}_${new Date().toJSON().slice(0, 10)}.json`;
    console.log(`Saving ${userBests.length} users to ${filename}`);
    fs.writeFileSync(filename, JSON.stringify(userBests));
}

const gamemode = "osu";
const userIDs = await getRankingsIDs(gamemode);
for (let i = 0; i < 10; ++i) {
    const begin = (1000 * i) + 1;
    const end = 1000 * (i + 1);
    const userBests = await getUserBestScores(userIDs.slice(begin - 1, end), gamemode);
    saveUserBests(gamemode, userBests, begin, end);
}

// - what are the most common beatmaps in players' top100? mods? mappers?
// --- look at each players' top100 and increment every time you see a beatmap / mod combination / mapper / etc.

// https://osu.ppy.sh/docs/#get-user-scores