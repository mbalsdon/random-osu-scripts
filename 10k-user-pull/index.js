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

async function getUsers(gamemode, userIDs) {
    const users = [];

    for (const userID of userIDs) {
        let numRetries = 0;
        while (true) {
            console.log(`Pulling user ${userID}`);
            const userResponse = await fetch(`https://osu.ppy.sh/api/v2/users/${userID}/${gamemode}?key=id`, {
                headers: {
                    "Accept": "application/json",
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${leToken}`
                }
            });

            if (userResponse.status == 429) {
                const waitSec = Math.pow(2, numRetries) + Math.random();
                console.log(`Got response ${usersResponse.status} - retrying in ${waitSec}s`)
                await sleep(waitSec * 1000);
                ++numRetries;
            } else if (userResponse.status == 401) {
                leToken = await getToken();
            } else if (userResponse.status == 200) {
                const user = await userResponse.json();
                users.push(user);
                break;
            }
        }
    }

    return users;
}

function saveUsers(gamemode, users) {
    const filename = `./${gamemode}_users_${users.length}_${new Date().toJSON().slice(0, 10)}.json`;
    console.log(`Saving ${users.length} users to ${filename}`);
    fs.writeFileSync(filename, JSON.stringify(users));
}

const gamemode = "osu";
const userIDs = await getRankingsIDs(gamemode);
const users = await getUsers(gamemode, userIDs);
saveUsers(gamemode, users);
