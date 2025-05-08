import sqlite3
import plotly.express
import pandas

def get_rankings():
    db = sqlite3.connect("rankings.db")
    cursor = db.cursor()
    cursor.execute("SELECT currentRank, hoursPlayed FROM OsuRankings")
    results = cursor.fetchall()
    db.close()

    # e.g. 0.85 -> cut players in the top 15% of hours played
    hours_percentile = 1.0
    results_sorted_by_hours = sorted(results, key=lambda row: row[1])
    percentile_slice = slice(0, int(len(results_sorted_by_hours) * hours_percentile))
    results = results_sorted_by_hours[percentile_slice]

    rank_range=[1, max(results, key=lambda row: row[0])[0]]
    hours_range=[1, max(results, key=lambda row: row[1])[1]]

    return results, rank_range, hours_range


def create_plot(rankings, rank_range, hours_range):
    figure = plotly.express.scatter(
        data_frame=pandas.DataFrame(rankings, columns=["current_rank", "hours_played"]),
        x="current_rank",
        y="hours_played",
        title="Rank vs. Hours Played (06 May 2025)",
        labels={ "current_rank": "Rank", "hours_played": "Hours played" },
        color_discrete_sequence=["salmon"],
        trendline="lowess",
        trendline_color_override="lightgreen"
    )

    figure.update_layout(
        font_color="linen",
        title_font_color="linen",
        plot_bgcolor="darkslateblue",
        paper_bgcolor="darkslateblue",
        xaxis_range=rank_range,
        yaxis_range=hours_range,
        xaxis=dict(
            tickmode="linear",
            dtick=100,
            gridcolor="linen",
            tickformat="d"
        ),
        yaxis=dict(
            tickmode="linear",
            dtick=100,
            gridcolor="linen"
        )
    )

    figure.update_traces(
        marker=dict(
            size=8,
            opacity=0.8
        )
    )

    figure.write_image("results.png", width=3000, height=(3000 * (hours_range[1] / rank_range[1])))


if __name__ == "__main__":
    rankings, rank_range, hours_range = get_rankings()
    create_plot(rankings, rank_range, hours_range)