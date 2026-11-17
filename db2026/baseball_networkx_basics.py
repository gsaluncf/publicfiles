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
#
# ## Common NetworkX syntax
#
# `nx` is the short name for NetworkX. `G` names the graph.
# An undirected graph connects nodes. Its edges have no direction.
# A node identifier selects one node. These examples use player names as identifiers.
# A property is a named value stored on a node or edge. NetworkX calls properties **attributes**.
# Quotation marks enclose text values, such as `"Blair"`. Numbers such as `2020` are integers.
#
# | Operation | Example | Result or effect |
# | :--- | :--- | :--- |
# | Import NetworkX | `import networkx as nx` | NetworkX is available as `nx`. |
# | Create a graph | `G = nx.Graph()` | `G` holds an empty undirected graph. |
# | Add a node | `G.add_node("Blair")` | The graph contains a node identified by `"Blair"`. |
# | Add a node with a property | `G.add_node("Casey", position="pitcher")` | Casey's node has a `position` attribute. |
# | Add an edge | `G.add_edge("Blair", "Casey")` | An edge connects the two named nodes. |
# | Add an edge with properties | `G.add_edge("Casey", "Dana", team="Valley", season=2021)` | The edge stores a team and a season. |
# | Assign a node property | `G.nodes["Blair"]["position"] = "catcher"` | Blair's position becomes `"catcher"`. |
# | Assign an edge property | `G.edges["Blair", "Casey"]["season"] = 2020` | The edge's season becomes `2020`. |
# | Read a node property | `G.nodes["Blair"]["position"]` | Returns `"catcher"` after that assignment. |
# | Read an edge property | `G.edges["Blair", "Casey"]["season"]` | Returns `2020` after that assignment. |
# | List nodes | `list(G.nodes)` | Returns the node identifiers. |
# | List edges | `list(G.edges)` | Returns pairs of connected node identifiers. |
# | Include node properties | `list(G.nodes(data=True))` | Returns each identifier with its attributes. |
# | Include edge properties | `list(G.edges(data=True))` | Returns each pair with its attributes. |
# | Check a direct relationship | `G.has_edge("Blair", "Casey")` | Returns `True` when that edge exists, or `False` when it does not. |
# | Find direct neighbors | `list(G.neighbors("Casey"))` | Returns the nodes directly connected to Casey. |
# | Count nodes | `G.number_of_nodes()` | Returns the number of nodes. |
# | Count edges | `G.number_of_edges()` | Returns the number of edges. |
#
# Parentheses `(...)` contain the values supplied to an operation. These values are called **arguments**.
# Commas separate arguments. Square brackets `[...]` select stored items.
# A single equals sign, `=`, assigns a value. Two equals signs, `==`, compare values.
# `True` and `False` are Python's Boolean values for true and false.

# %%
import networkx as nx
import matplotlib.pyplot as plt

# %% [markdown]
# ## 1. An empty graph
#
# `G` is the name of the graph. `nx.Graph()` creates an undirected graph.
# An undirected edge connects two nodes without a direction. Blair was Casey's teammate. Casey was Blair's teammate.
#
# In `G = nx.Graph()`, the right side creates the graph. The equals sign assigns that graph to `G`.
# A graph **method** is an operation called through the graph's name, such as `G.number_of_nodes()`.
# Empty parentheses mean the method receives no explicit arguments.
# `print(...)` displays the value returned by an operation. The two counts are both `0`.

# %%
G = nx.Graph()
print(G.number_of_nodes())
print(G.number_of_edges())

# %% [markdown]
# ## 2. A player node
#
# `add_node` adds a node. The text `"Blair"` identifies this node.
# In `G.add_node("Blair")`, `G` selects the graph. `.add_node` names the method. `"Blair"` is the method's first argument.
# The quotes mark `"Blair"` as a text value. The identifier selects this same node in later commands.
# Adding the same identifier with new attributes updates that node's attributes.
#
# `G.nodes` provides access to the nodes. `list(...)` collects the identifiers into a Python list.
# `print(list(G.nodes))` displays `["Blair"]`. Python may display text with single quotes instead of double quotes.
#
# [Adding a node](https://networkx.org/documentation/stable/reference/classes/generated/networkx.Graph.add_node.html)

# %%
G.add_node("Blair")
print(list(G.nodes))

# %% [markdown]
# ## 3. Node properties
#
# Blair's `position` is `"catcher"`. Blair's `bats` value is `"R"`, meaning right-handed.
# NetworkX stores a node's attributes in a Python **dictionary**. A dictionary stores key-value pairs.
# An attribute name is a key, such as `"position"`. Its value is `"catcher"`.
# The attribute names come from the baseball example. NetworkX stores the names supplied in the code.
#
# | Part of `G.nodes["Blair"]["position"] = "catcher"` | Meaning |
# | :--- | :--- |
# | `G.nodes` | Access the graph's nodes. |
# | `["Blair"]` | Select Blair's attribute dictionary. |
# | `["position"]` | Select the attribute named `"position"`. |
# | `= "catcher"` | Store `"catcher"` as that attribute's value. |
#
# The second assignment stores `"R"` under the key `"bats"`.
# `G.nodes["Blair"]` returns the whole dictionary: `{"position": "catcher", "bats": "R"}`.
# Assigning a new value to an existing attribute replaces that attribute's value.

# %%
G.nodes["Blair"]["position"] = "catcher"
G.nodes["Blair"]["bats"] = "R"
print(G.nodes["Blair"])

# %% [markdown]
# `add_node` also accepts attributes when the node is created.
# Casey is a pitcher who bats left-handed. Dana is a shortstop who bats right-handed.
# In `G.add_node("Casey", position="pitcher", bats="L")`, the first argument identifies the node.
# `position="pitcher"` and `bats="L"` are **keyword arguments**: each supplies an attribute name and its value.
# The attribute names before `=` have no quotes in this syntax. The text values after `=` have quotes.
#
# `G.nodes(data=True)` requests each node's attributes. `list(...)` collects the results.
# Each result pairs an identifier with a dictionary, such as `("Casey", {"position": "pitcher", "bats": "L"})`.

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
# | Drawing command | Arguments and effect |
# | :--- | :--- |
# | `nx.spring_layout(G, seed=7)` | `G` is the graph to position. `seed=7` makes the layout repeatable. |
# | `plt.figure(figsize=(6, 4))` | Creates a figure six inches wide and four inches tall. |
# | `nx.draw_networkx(G, pos, node_size=2400)` | Draws `G` at the positions in `pos`, using circles of size `2400`. |
# | `plt.margins(0.2)` | Adds space around the drawing. |
# | `plt.axis("off")` | Hides the coordinate axes. |
# | `plt.show()` | Displays the figure. |
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
# In `G.add_edge("Blair", "Casey")`, the first two arguments identify the edge's endpoints: the two nodes it connects.
# The comma separates the node identifiers. Both identifiers are text values, so both have quotes.
# `add_edge` also creates any endpoint nodes that are missing from the graph.
#
# `G.edges` provides access to the edges. `list(G.edges)` returns a list containing `("Blair", "Casey")`.
# Parentheses around the two identifiers mark a **tuple**, an ordered group of values.
# This tuple identifies an undirected edge. Reversing the endpoints selects the same edge.
# A `Graph` stores one edge for each connected pair of nodes. Repeating `add_edge` for that pair with new attributes updates the edge's attributes.
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
#
# | Part of `G.edges["Blair", "Casey"]["season"] = 2020` | Meaning |
# | :--- | :--- |
# | `G.edges` | Access the graph's edges. |
# | `["Blair", "Casey"]` | Select the attribute dictionary for the edge between these two nodes. |
# | `["season"]` | Select the attribute named `"season"`. |
# | `= 2020` | Store the integer `2020` as its value. |
#
# Both endpoints go inside the same first pair of square brackets. The second pair selects one attribute.
# `"Harbor"` is text. `2020` is an integer, so the season has no quotes.
# `G.edges["Blair", "Casey"]` returns all attributes on that edge: `{"team": "Harbor", "season": 2020}`.

# %%
G.edges["Blair", "Casey"]["team"] = "Harbor"
G.edges["Blair", "Casey"]["season"] = 2020
print(G.edges["Blair", "Casey"])

# %% [markdown]
# Casey and Dana were teammates on the Valley team in 2021.
# `add_edge` also accepts attributes when the edge is created.
# In `G.add_edge("Casey", "Dana", team="Valley", season=2021)`, the first two arguments name the endpoints.
# The keyword arguments `team="Valley"` and `season=2021` store attributes on the edge.
# The names `team` and `season` have no quotes before `=`. A later lookup uses quoted keys, such as `["season"]`.
# The graph now has three players and two teammate edges.
# `G.edges(data=True)` includes the attribute dictionary after each pair of endpoint identifiers.

# %%
G.add_edge("Casey", "Dana", team="Valley", season=2021)
print(list(G.edges(data=True)))

# %% [markdown]
# `get_edge_attributes` collects the `team` value from each edge.
# `draw_networkx_edge_labels` places those values beside the edges.
# In `nx.get_edge_attributes(G, "team")`, `G` selects the graph. `"team"` names the attribute to collect.
# The assignment stores those values in `teams`.
# `edge_labels=teams` supplies them to the drawing function.

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
# `G.has_edge("Blair", "Casey")` supplies two node identifiers, separated by a comma.
# The method returns a Boolean value. `True` means the edge exists. `False` means it does not.
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
# `G.neighbors("Casey")` takes one argument: the identifier of the node whose neighbors are needed.
# The method returns an **iterator**, a Python object that supplies results one at a time.
# `list(G.neighbors("Casey"))` collects those identifiers into a list.
# `print(...)` displays `["Blair", "Dana"]`, Casey's two direct teammates.
#
# [Finding neighbors](https://networkx.org/documentation/stable/reference/classes/generated/networkx.Graph.neighbors.html)

# %%
print(list(G.neighbors("Casey")))

# %% [markdown]
# ## 9. Reading properties
#
# `G.nodes["Casey"]["position"]` returns `"pitcher"`.
# The first bracket selects Casey's attribute dictionary. The second bracket selects the `"position"` value.
# The expression has no assignment, so it reads the stored value.

# %%
print(G.nodes["Casey"]["position"])

# %% [markdown]
# The edge between Casey and Dana stores their shared team and season.
# `G.edges["Casey", "Dana"]` selects that edge's attribute dictionary.
# Adding `["team"]` reads the team. Adding `["season"]` reads the season.
# The two `print` calls display `Valley` and `2021` on separate lines.

# %%
print(G.edges["Casey", "Dana"]["team"])
print(G.edges["Casey", "Dana"]["season"])

# %% [markdown]
# ## 10. Filtering relationships
#
# Who was Casey's teammate in 2020?
#
# | Line | Syntax and effect |
# | :--- | :--- |
# | `for player in G.neighbors("Casey"):` | A `for` loop takes one neighbor at a time. The loop assigns that neighbor's identifier to the variable `player`. The colon starts the loop's indented block. |
# | `edge = G.edges["Casey", player]` | One equals sign assigns the edge's attribute dictionary to `edge`. `player` has no quotes because it is a variable containing the neighbor's identifier. |
# | `if edge["season"] == 2020:` | `edge["season"]` reads the season. Two equals signs compare that value with `2020`. The colon starts the block that runs when the comparison is true. |
# | `print(player)` | Prints the identifier when its edge has season `2020`. |
#
# The first indentation level puts the edge lookup and `if` statement inside the loop.
# The second indentation level puts `print(player)` inside the `if` block.
# `=` stores a value. `==` compares two values.

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
# The first call creates Eli's node with two attributes. The second call connects Dana and Eli with an edge that has two attributes.
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
