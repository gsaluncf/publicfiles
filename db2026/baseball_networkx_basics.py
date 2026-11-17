# %% [markdown]
# # NetworkX: nodes and edges
#
# **About 15 minutes.** A graph stores nodes and the edges that connect them.
# The nodes represent three fictional baseball players. An edge connects two players who were teammates.
#
# NetworkX creates and queries the graph in memory. Matplotlib draws the graph.
# Colab provides both libraries. Shift+Enter runs a code cell and displays its result.
#
# [NetworkX tutorial](https://networkx.org/documentation/stable/tutorial.html)

# %%
import networkx as nx
import matplotlib.pyplot as plt

# %% [markdown]
# ## 1. An empty graph
#
# `G` is the name of the graph. `nx.Graph()` creates an undirected graph.
# An undirected edge connects two nodes without a direction. Blair was Casey's teammate. Casey was Blair's teammate.
#
# An empty graph has zero nodes and zero edges.

# %%
G = nx.Graph()
print(G.number_of_nodes())
print(G.number_of_edges())

# %% [markdown]
# ## 2. A player node
#
# `add_node` adds a node. The text `"Blair"` identifies this node.
# `list(G.nodes)` displays the node identifiers.
#
# [Adding a node](https://networkx.org/documentation/stable/reference/classes/generated/networkx.Graph.add_node.html)

# %%
G.add_node("Blair")
print(list(G.nodes))

# %% [markdown]
# ## 3. Node properties
#
# A property is a named value attached to a node or an edge. NetworkX calls properties **attributes**.
# Blair's `position` is `"catcher"`. Blair's `bats` value is `"R"`, meaning right-handed.
# Square brackets select the node and then the attribute name.

# %%
G.nodes["Blair"]["position"] = "catcher"
G.nodes["Blair"]["bats"] = "R"
print(G.nodes["Blair"])

# %% [markdown]
# `add_node` also accepts attributes when the node is created.
# Casey is a pitcher who bats left-handed. Dana is a shortstop who bats right-handed.
# `data=True` includes each node's attributes in the output.

# %%
G.add_node("Casey", position="pitcher", bats="L")
G.add_node("Dana", position="shortstop", bats="R")
print(list(G.nodes(data=True)))

# %% [markdown]
# ## 4. A graph drawing
#
# The graph has three nodes and zero edges. `spring_layout` calculates positions for the drawing.
# `seed=7` makes the node positions repeatable. `draw_networkx` draws the nodes and their names.
# `node_size` sets the size of the circles. `pos` stores the node positions. The next two drawings use the same `pos` value.
#
# [Drawing a graph](https://networkx.org/documentation/stable/reference/generated/networkx.drawing.nx_pylab.draw_networkx.html)

# %%
pos = nx.spring_layout(G, seed=7)
plt.figure(figsize=(6, 4))
nx.draw_networkx(G, pos, node_size=2400)
plt.margins(0.2)
plt.axis("off")
plt.show()

# %% [markdown]
# ## 5. A teammate edge
#
# `add_edge` connects two nodes. Blair and Casey were teammates.
# `list(G.edges)` displays the pair of node identifiers.
#
# [Adding an edge](https://networkx.org/documentation/stable/reference/classes/generated/networkx.Graph.add_edge.html)

# %%
G.add_edge("Blair", "Casey")
print(list(G.edges))

# %% [markdown]
# The edge connects Blair and Casey. Dana has no edges yet.

# %%
plt.figure(figsize=(6, 4))
nx.draw_networkx(G, pos, node_size=2400)
plt.margins(0.2)
plt.axis("off")
plt.show()

# %% [markdown]
# ## 6. Edge properties
#
# Blair and Casey were teammates on the Harbor team in 2020.
# The `team` and `season` attributes describe their edge.
# `G.edges["Blair", "Casey"]` selects that edge's attributes.

# %%
G.edges["Blair", "Casey"]["team"] = "Harbor"
G.edges["Blair", "Casey"]["season"] = 2020
print(G.edges["Blair", "Casey"])

# %% [markdown]
# Casey and Dana were teammates on the Valley team in 2021.
# `add_edge` also accepts attributes when the edge is created.
# The graph now has three players and two teammate edges.

# %%
G.add_edge("Casey", "Dana", team="Valley", season=2021)
print(list(G.edges(data=True)))

# %% [markdown]
# `get_edge_attributes` collects the `team` value from each edge.
# `draw_networkx_edge_labels` places those values beside the edges.

# %%
plt.figure(figsize=(6, 4))
nx.draw_networkx(G, pos, node_size=2400)
teams = nx.get_edge_attributes(G, "team")
nx.draw_networkx_edge_labels(G, pos, edge_labels=teams)
plt.margins(0.2)
plt.axis("off")
plt.show()

# %% [markdown]
# ## 7. Direct relationships
#
# `has_edge` checks whether an edge directly connects two nodes.
# An edge connects Blair and Casey, so the result is `True`.

# %%
print(G.has_edge("Blair", "Casey"))

# %% [markdown]
# The graph has no edge between Blair and Dana. The result is `False`.
# Blair and Dana are connected through Casey.

# %%
print(G.has_edge("Blair", "Dana"))

# %% [markdown]
# ## 8. A player's neighbors
#
# A node's **neighbors** are the nodes directly connected to it.
# `G.neighbors("Casey")` finds Casey's teammates. `list` collects the results.
# Casey's neighbors are Blair and Dana.
#
# [Finding neighbors](https://networkx.org/documentation/stable/reference/classes/generated/networkx.Graph.neighbors.html)

# %%
print(list(G.neighbors("Casey")))

# %% [markdown]
# ## 9. Reading properties
#
# `G.nodes["Casey"]["position"]` returns `"pitcher"`.

# %%
print(G.nodes["Casey"]["position"])

# %% [markdown]
# The edge between Casey and Dana stores their shared team and season.

# %%
print(G.edges["Casey", "Dana"]["team"])
print(G.edges["Casey", "Dana"]["season"])

# %% [markdown]
# ## 10. Filtering relationships
#
# Who was Casey's teammate in 2020?
# The `for` loop visits each of Casey's neighbors. `player` holds one neighbor's identifier at a time.
# `edge` holds the attributes of the relationship between Casey and that player.
# The `if` statement checks whether the edge's season is 2020.
# `print` displays matching players.

# %%
for player in G.neighbors("Casey"):
    edge = G.edges["Casey", player]
    if edge["season"] == 2020:
        print(player)

# %% [markdown]
# Blair was Casey's teammate on the Harbor team in 2020. The loop prints Blair.

# %% [markdown]
# ## 11. Another player
#
# Eli is an outfielder who bats left-handed. Dana and Eli were teammates on the Valley team in 2022.
# Which two players will be Dana's neighbors after these additions?

# %%
G.add_node("Eli", position="outfielder", bats="L")
G.add_edge("Dana", "Eli", team="Valley", season=2022)

# %% [markdown]
# `G.neighbors("Dana")` returns the players directly connected to Dana.

# %%
print(list(G.neighbors("Dana")))

# %% [markdown]
# Dana's neighbors are Casey and Eli. Dana's edge to Casey stores the season 2021. Dana's edge to Eli stores the season 2022.
# The graph has four nodes and three edges.

# %%
print(G.number_of_nodes())
print(G.number_of_edges())

# %% [markdown]
# `spring_layout` calculates positions for all four players.

# %%
pos = nx.spring_layout(G, seed=7)
plt.figure(figsize=(6, 4))
nx.draw_networkx(G, pos, node_size=2400)
teams = nx.get_edge_attributes(G, "team")
nx.draw_networkx_edge_labels(G, pos, edge_labels=teams)
plt.margins(0.2)
plt.axis("off")
plt.show()
