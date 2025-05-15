import * as fs from "fs";

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

async function getRankingsIDs(token, gamemode) {
    const userIDs = [];

    for (let page = 1; page < 201; ++page) { // 1 -> 201
        console.log(`Pulling rankings page ${page}`);
        const rankingsResponse = await fetch(`https://osu.ppy.sh/api/v2/rankings/${gamemode}/performance?page=${page}`, {
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            }
        });

        const rankings = await rankingsResponse.json();
        for (const user of rankings.ranking) {
            userIDs.push(user.user.id);
        }
    }

    return userIDs;
}

async function getUsers(token, gamemode, userIDs) {
    const users = [];

    for (const userID of userIDs) {
        console.log(`Pulling user ${userID}`);
        const userResponse = await fetch(`https://osu.ppy.sh/api/v2/users/${userID}/${gamemode}?key=id`, {
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            }
        });

        const user = await userResponse.json();
        users.push(user);
    }

    return users;
}

function saveUsers(gamemode, users) {
    const filename = `./${gamemode}_users_10k.json`;
    console.log(`Saving ${users.length} users to ${filename}`);
    fs.writeFileSync(filename, JSON.stringify(users));
}

const gamemode = "osu";
const token = await getToken();
const userIDs = await getRankingsIDs(token, gamemode);
const users = await getUsers(token, gamemode, userIDs);
saveUsers(gamemode, users);
