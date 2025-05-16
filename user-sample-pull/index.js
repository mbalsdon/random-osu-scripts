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

async function getUsersBatch(userIDs) {
    const url = new URL("https://osu.ppy.sh/api/v2/users");
    for (const userID of userIDs) {
        url.searchParams.append("ids[]", userID);
    }

    let numRetries = 0;
    while (true) {
        console.log(`Pulling users [${userIDs[0]}, ${userIDs[1]}, ${userIDs[2]}, ..., ${userIDs[49]}]`);

        const usersResponse = await fetch(url, {
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
                "Authorization": `Bearer ${leToken}`
            }
        });

        if (usersResponse.status == 429) {
            const waitSec = Math.pow(2, numRetries) + Math.random();
            console.log(`Got response ${usersResponse.status} - retrying in ${waitSec}s`)
            await sleep(waitSec * 1000);
            ++numRetries;
        } else if (usersResponse.status == 401) {
            leToken = await getToken();
        } else if (usersResponse.status == 200) {
            const users = await usersResponse.json();
            return users.users;
        }
    }
}

function saveUsers(users) {
    const filename = `./users_${users.length}.json`;
    console.log(`Saving users to ${filename}`);
    fs.writeFileSync(filename, JSON.stringify(users));
}

const users = [];

const numUsersPerRequest = 50;
const usersFraction = 4; // 25% of all user IDs
const maxUserID = 37900000; // highest i found as of 15may2025
const numUserIDs = maxUserID / usersFraction;
const numRequests = numUserIDs / numUsersPerRequest;

// every 4th user (usersFraction) in groups of 50 (numUsersPerRequest)
for (let i = 0; i < numRequests; ++i) {
    const userIDsChunk = [];

    const start = numUsersPerRequest*usersFraction*i;
    for (let j = 0; j < numUsersPerRequest; ++j) {
        userIDsChunk.push(start + (usersFraction*j));
    }

    const usersChunk = await getUsersBatch(userIDsChunk);

    if (usersChunk === undefined) continue;
    for (const user of usersChunk) {
        users.push(user);
    }
}

saveUsers(users);