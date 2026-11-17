# %% [markdown]
# # Baseball graphs with NetworkX
#
# The examples use the fictional baseball records from the four graph videos.
# Blair played with Casey. Casey later played with Dana. Alex managed Blair. Blair later managed Casey. Casey played for Harbor when Harbor won a championship.
#
# Each code cell uses results from the earlier cells. In Colab, Shift+Enter runs a cell.
#
# ## Python libraries
#
# NetworkX provides graph structures and algorithms in Python. NetworkX 3.6.1 is the version used to check these examples.
# [NetworkX installation](https://networkx.org/documentation/stable/install.html)

# %%
import subprocess
import sys
subprocess.check_call([sys.executable, "-m", "pip", "install", "-q", "networkx==3.6.1"])

# %% [markdown]
# pandas displays records as tables. SQLite runs SQL in memory. Matplotlib draws
# the NetworkX graphs. Python's `date` type supports date comparisons.

# %%
import sqlite3
from datetime import date
import networkx as nx
import pandas as pd
import matplotlib.pyplot as plt
from IPython.display import display

# %% [markdown]
# ## 1. Relationships in relational tables
#
# A person identifier stays the same when a person's team or role changes.
# `p2` identifies Blair throughout the examples.

# %%
people = pd.DataFrame([
    ("p1", "Alex"),
    ("p2", "Blair"),
    ("p3", "Casey"),
    ("p4", "Dana"),
], columns=["person", "name"])
names = dict(zip(people["person"], people["name"]))
display(people)

# %% [markdown]
# A roster record connects a person to a team for part of a season.
# The start and end dates both count as roster dates. The dates use `YYYY-MM-DD`.

# %%
roster_rows = [
    ("p2", "harbor", 2020, "2020-04-01", "2020-09-30"),
    ("p3", "harbor", 2020, "2020-04-01", "2020-09-30"),
    ("p3", "valley", 2021, "2021-04-01", "2021-09-30"),
    ("p4", "valley", 2021, "2021-04-01", "2021-09-30"),
    ("p3", "valley", 2022, "2022-04-01", "2022-09-30"),
    ("p3", "harbor", 2023, "2023-04-01", "2023-10-31"),
]

# %% [markdown]
# The column names identify the person, team, season, and roster dates.

# %%
roster = pd.DataFrame(roster_rows, columns=[
    "person", "team", "season", "start_date", "end_date",
])
display(roster)

# %% [markdown]
# SQLite stores a copy of the roster in a table named `Roster`.

# %%
db = sqlite3.connect(":memory:")
roster.to_sql("Roster", db, index=False, if_exists="replace")

# %% [markdown]
# ### Teammate pairs
#
# A self-join compares two roster records. `a` and `b` name the two copies.
# The records must have the same team and season, and different people.
#
# The date conditions require overlap. Each record must start on or before
# the other record ends. Sorting these `YYYY-MM-DD` dates as text also sorts them by date.

# %%
teammate_sql = """
SELECT DISTINCT a.person AS source, b.person AS target
FROM Roster AS a JOIN Roster AS b
  ON a.team = b.team AND a.season = b.season
 AND a.person <> b.person
 AND a.start_date <= b.end_date
 AND b.start_date <= a.end_date
"""

# %% [markdown]
# The query returns both orders of each teammate pair. `p2` and `p3` appear
# together, and `p3` and `p4` appear together.

# %%
teammate_pairs = pd.read_sql_query(teammate_sql, db)
display(teammate_pairs)
teammate_pairs.to_sql("Teammate", db, index=False, if_exists="replace")

# %% [markdown]
# ### Teammates of teammates
#
# The second join matches the first pair's target to the second pair's source.
# The query starts with Blair (`p2`). The last condition removes Blair from the
# result. `DISTINCT` removes repeated people.

# %%
two_hop_sql = """
SELECT DISTINCT second.target AS person
FROM Teammate AS first JOIN Teammate AS second
  ON first.target = second.source
WHERE first.source = 'p2'
  AND second.target <> first.source
"""

# %% [markdown]
# Dana is the result. Casey is a teammate of Blair and a teammate of Dana.

# %%
sql_two_hops = pd.read_sql_query(two_hop_sql, db)
display(sql_two_hops.assign(name=sql_two_hops["person"].map(names)))

# %% [markdown]
# ## 2. Triples and graphs
#
# A triple has a subject, predicate, and object. The subjects and objects in these records identify people. The predicate names the relationship between them.

# %%
triples = pd.DataFrame([
    ("p2", "TEAMMATE_OF", "p3"),
    ("p3", "TEAMMATE_OF", "p4"),
    ("p1", "MANAGED", "p2"),
], columns=["subject", "predicate", "object"])
display(triples)

# %% [markdown]
# ### An undirected graph
#
# A graph represents people as nodes and teammate connections as edges.
# `nx.Graph()` stores undirected edges. An edge from Blair to Casey also
# connects Casey to Blair because the teammate relationship is symmetric.
#
# [NetworkX Graph](https://networkx.org/documentation/stable/reference/classes/graph.html)

# %%
teammate_triples = triples[triples["predicate"] == "TEAMMATE_OF"]
teammates = nx.Graph()
for row in teammate_triples.itertuples(index=False):
    teammates.add_edge(row.subject, row.object, kind=row.predicate)

# %% [markdown]
# Both triples use `p3` for Casey. NetworkX keeps one Casey node
# connected to Blair and Dana.

# %%
print("People:", [names[node] for node in teammates.nodes])
print("Nodes:", teammates.number_of_nodes())
print("Edges:", teammates.number_of_edges())

# %% [markdown]
# The position dictionary sets each node's location in the drawing. Blair, Casey, and Dana appear in that order.
# The labels display names. The graph retains the person identifiers.

# %%
teammate_positions = {"p2": (0, 0), "p3": (1, 0), "p4": (2, 0)}
teammate_labels = {node: names[node] for node in teammates}
plt.figure(figsize=(9, 3))
nx.draw_networkx(teammates, teammate_positions, labels=teammate_labels,
                 node_color=["#cde3f6", "#cde8d8", "#f1dfb2"],
                 node_size=3200, font_size=17, width=3)
plt.axis("off")
plt.show()

# %% [markdown]
# ### A directed relationship
#
# A directed graph records the direction from one node to another.
# Alex managed Blair. Reversing the edge from Alex to Blair would describe Blair managing Alex.
#
# [NetworkX DiGraph](https://networkx.org/documentation/stable/reference/classes/digraph.html)

# %%
managed_example = nx.DiGraph()
managed_example.add_edge("p1", "p2", kind="MANAGED")
print("Alex managed Blair:", managed_example.has_edge("p1", "p2"))
print("Blair managed Alex:", managed_example.has_edge("p2", "p1"))

# %% [markdown]
# ## 3. A baseball ontology
#
# An ontology defines entity types and relationship meanings. A Person is an
# individual. A Team is a club. A TeamSeason is one team during one season.
# A Championship is a title awarded on a particular date.
#
# Each relationship type connects defined kinds of nodes.

# %%
relationship_types = pd.DataFrame([
    ("PLAYED_FOR", "Person", "TeamSeason"),
    ("MANAGED_TEAM", "Person", "TeamSeason"),
    ("PART_OF", "TeamSeason", "Team"),
    ("WON", "TeamSeason", "Championship"),
], columns=["relationship", "source type", "target type"])
display(relationship_types)

# %% [markdown]
# ### Person nodes
#
# A player and a manager can be the same person. A `MultiDiGraph` stores
# directed edges and supports multiple edges between the same two nodes.
# Multiple roster periods or roles can therefore have separate edges.
# Node attributes store each person's type and name.
#
# [NetworkX MultiDiGraph](https://networkx.org/documentation/stable/reference/classes/multidigraph.html)

# %%
baseball = nx.MultiDiGraph()
for row in people.itertuples(index=False):
    baseball.add_node(row.person, kind="Person", name=row.name)

# %% [markdown]
# ### TeamSeason nodes
#
# `harbor-2020` and `harbor-2023` identify different TeamSeason nodes.
# A `PLAYED_FOR` edge stores the dates of a person's roster period.

# %%
for row in roster.itertuples(index=False):
    team_season = f"{row.team}-{row.season}"
    baseball.add_node(team_season, kind="TeamSeason", season=row.season,
                      name=f"{row.team.title()}\n{row.season}")
    baseball.add_edge(row.person, team_season, kind="PLAYED_FOR",
                      start=row.start_date, end=row.end_date)

# %% [markdown]
# ### Team nodes
#
# A `PART_OF` edge connects each TeamSeason to its Team.

# %%
for team in roster["team"].unique():
    baseball.add_node(team, kind="Team", name=team.title())
for row in roster[["team", "season"]].drop_duplicates().itertuples(index=False):
    baseball.add_edge(f"{row.team}-{row.season}", row.team, kind="PART_OF")

# %% [markdown]
# ### Manager records
#
# Alex managed Harbor in 2020. Blair managed Valley in 2022.
# Both manager records use the same person identifiers as the roster records.

# %%
managers = pd.DataFrame([
    ("p1", "harbor", 2020, "2020-04-01", "2020-09-30"),
    ("p2", "valley", 2022, "2022-04-01", "2022-09-30"),
], columns=["manager", "team", "season", "start_date", "end_date"])
display(managers)

# %% [markdown]
# A `MANAGED_TEAM` edge connects a person to the TeamSeason that person managed.
# Blair's identifier remains `p2` in both roles.

# %%
for row in managers.itertuples(index=False):
    baseball.add_edge(row.manager, f"{row.team}-{row.season}",
                      kind="MANAGED_TEAM", start=row.start_date, end=row.end_date)
display(pd.DataFrame(baseball.out_edges("p2", data=True),
                     columns=["person", "team-season", "properties"]))

# %% [markdown]
# The drawing contains one Blair node. The node's edges record Blair playing for Harbor in 2020 and Blair managing Valley in 2022.
#
# [NetworkX drawing](https://networkx.org/documentation/stable/reference/generated/networkx.drawing.nx_pylab.draw_networkx.html)

# %%
blair_roles = baseball.subgraph(["p2", "harbor-2020", "valley-2022"])
role_positions = {"p2": (0, 0), "harbor-2020": (1, 1), "valley-2022": (1, -1)}
role_labels = nx.get_node_attributes(blair_roles, "name")
plt.figure(figsize=(9, 5))
nx.draw_networkx(blair_roles, role_positions, labels=role_labels,
                 node_color="#d9e9dc", node_size=4200, font_size=16, arrowsize=25)
nx.draw_networkx_edge_labels(blair_roles, role_positions,
                             edge_labels=nx.get_edge_attributes(blair_roles, "kind"))
plt.axis("off")
plt.show()

# %% [markdown]
# ### Championship records
#
# Harbor won the 2023 league title on October 31. The `WON` edge connects
# Harbor's 2023 TeamSeason to that Championship.

# %%
championship = {"id": "league-title-2023", "team": "harbor", "season": 2023,
                "date": "2023-10-31", "name": "League title 2023"}
baseball.add_node(championship["id"], kind="Championship",
                   name=championship["name"], date=championship["date"])
baseball.add_edge("harbor-2023", championship["id"], kind="WON")

# %% [markdown]
# ### Date rules
#
# An application's checks can enforce the ontology's rules. A roster period must
# end on or after it starts. `valid_roster_dates` checks every `PLAYED_FOR` edge.
# Python's `date.fromisoformat` converts each stored date to a date value.

# %%
def valid_roster_dates(graph):
    return all(
        date.fromisoformat(data["start"]) <= date.fromisoformat(data["end"])
        for _, _, data in graph.edges(data=True)
        if data["kind"] == "PLAYED_FOR"
    )
valid_dates = valid_roster_dates(baseball)
print("Valid roster dates:", valid_dates)

# %% [markdown]
# A copy of the graph receives a roster period that ends before it starts.
# NetworkX stores the edge. The application's date check rejects the period.

# %%
invalid_example = baseball.copy()
invalid_example.add_edge("p2", "harbor-2020", kind="PLAYED_FOR",
                          start="2020-10-01", end="2020-09-30")
invalid_dates = valid_roster_dates(invalid_example)
print("Valid roster dates:", invalid_dates)

# %% [markdown]
# ## 4. Traversals and graph queries
#
# A traversal follows connections through a graph.
# A node's neighbors are directly connected nodes. Blair's teammate neighbor is Casey.
# Casey's teammate neighbors are Blair and Dana.
#
# [Graph.neighbors](https://networkx.org/documentation/stable/reference/classes/generated/networkx.Graph.neighbors.html)

# %%
blair_neighbors = list(teammates.neighbors("p2"))
casey_neighbors = list(teammates.neighbors("p3"))
print("Blair's neighbors:", [names[node] for node in blair_neighbors])
print("Casey's neighbors:", [names[node] for node in casey_neighbors])

# %% [markdown]
# ### Two-hop results
#
# A two-hop traversal from Blair can return to Blair.
# A Python set stores each returned person once.

# %%
two_hop_people = set()
for neighbor in teammates.neighbors("p2"):
    two_hop_people.update(teammates.neighbors(neighbor))
print([names[node] for node in sorted(two_hop_people)])

# %% [markdown]
# Dana remains after Blair is removed from the set. The graph traversal and the SQL join
# now return the same person.

# %%
two_hop_people.discard("p2")
print([names[node] for node in sorted(two_hop_people)])
assert two_hop_people == set(sql_two_hops["person"])

# %% [markdown]
# ### Shortest paths
#
# A path lists the consecutive nodes along a route. Each teammate edge counts as one hop. A shortest path has the fewest hops. Blair's shortest path to Dana passes through Casey.
#
# [shortest_path](https://networkx.org/documentation/stable/reference/algorithms/generated/networkx.algorithms.shortest_paths.generic.shortest_path.html)

# %%
shortest_path = nx.shortest_path(teammates, source="p2", target="p4")
print([names[node] for node in shortest_path])

# %% [markdown]
# Blair's path to Dana contains three nodes and two edges. The shortest-path distance counts the edges. Blair and Dana are two hops apart.
#
# [shortest_path_length](https://networkx.org/documentation/stable/reference/algorithms/generated/networkx.algorithms.shortest_paths.generic.shortest_path_length.html)

# %%
distance = nx.shortest_path_length(teammates, source="p2", target="p4")
print("Blair to Dana:", distance, "hops")

# %% [markdown]
# ### Managed players
#
# A `MANAGED` relationship connects a manager to a person who played under that
# manager. Matching team, season, and overlapping dates derives those relationships.
# The manager table is added to the same SQLite database as the roster.

# %%
managers.to_sql("ManagerStint", db, index=False, if_exists="replace")

# %% [markdown]
# The join uses both date conditions, as the teammate join did.

# %%
managed_sql = """
SELECT DISTINCT m.manager, r.person AS player, m.season
FROM ManagerStint AS m JOIN Roster AS r
  ON m.team = r.team AND m.season = r.season
 AND m.start_date <= r.end_date
 AND r.start_date <= m.end_date
"""
managed_rows = pd.read_sql_query(managed_sql, db)
display(managed_rows)

# %% [markdown]
# Each directed edge runs from manager to player. Its season attribute records
# when that person played under that manager.

# %%
manager_graph = nx.DiGraph()
for row in managed_rows.itertuples(index=False):
    manager_graph.add_edge(row.manager, row.player, season=row.season)

# %% [markdown]
# The graph includes Alex managing Casey directly in 2020. It also includes
# Alex managing Blair in 2020 and Blair managing Casey in 2022.

# %%
manager_positions = {"p1": (0, 0), "p2": (1, 1), "p3": (2, 0)}
manager_labels = {node: names[node] for node in manager_graph}
plt.figure(figsize=(9, 5))
nx.draw_networkx(manager_graph, manager_positions, labels=manager_labels,
                 node_color="#d9e9dc", node_size=3200, font_size=17, arrowsize=25)
nx.draw_networkx_edge_labels(manager_graph, manager_positions,
                             edge_labels=nx.get_edge_attributes(manager_graph, "season"))
plt.axis("off")
plt.show()

# %% [markdown]
# ### A later manager
#
# In a directed graph, successors are nodes reached by outgoing edges.
# Alex's successors are Alex's players.
#
# [DiGraph.successors](https://networkx.org/documentation/stable/reference/classes/generated/networkx.DiGraph.successors.html)

# %%
first_manager = "p1"
later_managers = list(manager_graph.successors(first_manager))
print([names[node] for node in later_managers])

# %% [markdown]
# A second outgoing edge reaches a player managed by one of Alex's players.
# Blair connects Alex to Casey through two `MANAGED` relationships.

# %%
candidate_chains = []
for later_manager in later_managers:
    for player in manager_graph.successors(later_manager):
        candidate_chains.append((first_manager, later_manager, player))
display(pd.DataFrame(candidate_chains, columns=["manager", "later manager", "player"]))

# %% [markdown]
# Blair's season as Alex's player must precede Blair's season as Casey's manager. The season comparison keeps chains with that ordering.

# %%
ordered_chains = []
for first, later, player in candidate_chains:
    first_year = manager_graph[first][later]["season"]
    later_year = manager_graph[later][player]["season"]
    if first_year < later_year:
        ordered_chains.append((first, later, player, later_year))
print(ordered_chains)

# %% [markdown]
# ### A championship player
#
# The single remaining chain is Alex, Blair, and Casey. Casey's championship
# season must follow Blair's managing season.

# %%
first, later, player, later_year = ordered_chains[0]
later_roster = roster[
    (roster["person"] == player) & (roster["season"] > later_year)
]
display(later_roster)

# %% [markdown]
# The roster must match the championship's team and season.

# %%
winning_roster = later_roster[
    (later_roster["team"] == championship["team"])
    & (later_roster["season"] == championship["season"])
].copy()
display(winning_roster)

# %% [markdown]
# The start and end columns are converted to date values. The championship date must be on or between the roster start and end dates.

# %%
title_date = date.fromisoformat(championship["date"])
starts = pd.to_datetime(winning_roster["start_date"]).dt.date
ends = pd.to_datetime(winning_roster["end_date"]).dt.date
championship_players = winning_roster[(starts <= title_date) & (title_date <= ends)]
display(championship_players.assign(name=championship_players["person"].map(names)))

# %% [markdown]
# The qualifying roster record supplies the final two connections. Casey played for Harbor in 2023. Harbor's 2023 TeamSeason won the championship.
# The first two connections retain their seasons from the manager graph.

# %%
eligible = championship_players.iloc[0]
winning_team_season = f"{eligible.team}-{eligible.season}"
first_year = manager_graph[first][later]["season"]
championship_path = nx.DiGraph()
championship_path.add_edge(first, later, label=f"MANAGED\n{first_year}")
championship_path.add_edge(later, player, label=f"MANAGED\n{later_year}")
championship_path.add_edge(player, winning_team_season, label=f"PLAYED_FOR\n{eligible.season}")
championship_path.add_edge(winning_team_season, championship["id"], label=f"WON\n{championship['date']}")

# %% [markdown]
# The completed path preserves people, relationship meanings, and dates.
# Casey qualifies because Casey's roster period includes the championship date.

# %%
path_positions = {node: (index, 0) for index, node in enumerate(championship_path)}
path_labels = {node: baseball.nodes[node]["name"] for node in championship_path}
path_labels[championship["id"]] = "\n".join(championship["name"].rsplit(" ", 1))
plt.figure(figsize=(15, 4))
nx.draw_networkx(championship_path, path_positions, labels=path_labels,
                 node_color="#d9e9dc", node_size=4200, font_size=13, arrowsize=22)
nx.draw_networkx_edge_labels(championship_path, path_positions,
                             edge_labels=nx.get_edge_attributes(championship_path, "label"), font_size=10)
plt.axis("off")
plt.show()

# %% [markdown]
# NetworkX stores these graphs in memory. A graph database provides
# persistent storage and queries over nodes and relationships. The relationship types, directions, and date conditions determine the returned path.
#
# [NetworkX tutorial](https://networkx.org/documentation/stable/tutorial.html)
