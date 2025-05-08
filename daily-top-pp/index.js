import * as fs from "fs";
import { exit } from "process";
import { Canvas } from "skia-canvas";
import Chart from "chart.js/auto";
import "chartjs-adapter-date-fns";
import chartTrendline from "chartjs-plugin-trendline";

/**
 * YYYY-MM-DD
 */
function incrementDate(dateString) {
    const [year, month, day] = dateString.split("-").map(num => parseInt(num, 10));
    const date = new Date(year, month - 1, day);
    date.setDate(date.getDate() + 1);

    const newYear = date.getFullYear();
    const newMonth = String(date.getMonth() + 1).padStart(2, "0");
    const newDay = String(date.getDate()).padStart(2, "0");

    return `${newYear}-${newMonth}-${newDay}`;
}

/**
 * YYYY-MM-DD
 */
function todayDate() {
    const date = new Date();

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * mode; 0=osu!, 1=taiko, 2=ctb, 3=mania
 */
async function getDailyBestPlay(mode, date) {
    let responseBody;
    while (true) {
        try {
            // Certain requests hang when I add limit parameter (&limit=X)
            const response = await fetch(`https://osutrack-api.ameo.dev/bestplays?mode=${mode}&from=${date}&to=${incrementDate(date)}`);
            responseBody = await response.json();
            break;
        } catch (error) {
            await sleep(60000);
            continue;
        }
    }

    return responseBody[0];
}

function findRecordPlays(allPlays) {
    const result = [allPlays[0]];
    for (const play of allPlays) {
        if (play.pp > result[result.length - 1].pp) {
            result.push(play);
        }
    }

    fs.writeFileSync("records.json", JSON.stringify(result), "utf8");
    return result;
}

//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\
//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\

async function scrapeData() {
    const start = "2007-10-05";
    const today = todayDate();

    const result = [];
    for (let date = start; date != today; date = incrementDate(date)) {
        console.log(date);
        const score = await getDailyBestPlay(0, date);
        result.push(score);
        await sleep(500);
    }

    fs.writeFileSync("allplays.json", JSON.stringify(result), "utf8");
}

function generateChart() {
    Chart.register(chartTrendline);

    const data = fs.readFileSync("allplays.json", "utf8");
    const allPlays = JSON.parse(data);
    const recordPlays = findRecordPlays(allPlays);

    const canvas = new Canvas(3200, 1800);
    const chart = new Chart(canvas, {
        type: "scatter",
        data: {
            datasets: [{
                label: "PP Record",
                data: recordPlays.map((score) => { return { x: new Date(score.score_time), y: score.pp }; }),
                backgroundColor: "rgba(255, 0, 100, 0.7)",
                pointRadius: 3,
            }, {
                label: "Top score of the day",
                data: allPlays.map((score) => { return { x: new Date(score.score_time), y: score.pp }; }),
                backgroundColor: "rgba(0, 100, 255, 0.7)",
                pointRadius: 2,
                trendlineLinear: {
                    colorMin: "rgba(0, 0, 255, 1)",
                    colorMax: "rgba(0, 0, 255, 1)",
                    lineStyle: "dashdot",
                    width: 2
                }
            }]
        },
        options: {
            scales: {
                x: {
                    type: "time",
                    time: {
                        unit: "day",
                        displayFormats: {
                            day: "yyyy-MM-dd"
                        },
                    },
                    title: {
                        display: true,
                        text: "date"
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: "PP"
                    },
                    ticks: {
                        stepSize: 100,
                        precision: 0
                    }
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: "Highest scoring plays, per day (based on the latest PP updates as of 2025-05-05)"
                }
            }
        }
    });

    const imgBuffer = canvas.toBufferSync("png", { matte: "white" });
    fs.writeFileSync("results.png", imgBuffer);
    chart.destroy();
}

//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\
//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\

const args = process.argv.slice(2);
const scriptType = args[0];

if (scriptType === undefined) {
    console.error("Usage: node index.js <scrape|chart>");
    exit(1);
} else if ((scriptType !== "scrape") && (scriptType !== "chart")) {
    console.error("Usage: node index.js <scrape|chart>");
    exit(1);
}

if (scriptType === "scrape") {
    await scrapeData();
} else if (scriptType === "chart") {
    generateChart();
}

exit(0);
