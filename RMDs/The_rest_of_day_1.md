Session 3: Intro to Stochastic Modeling (60 min)
Goal: Students understand why we can't just use averages and need probabilistic thinking.
Part 1: The Problem with Averages (15 min)

"The market returns 7% per year on average" - so what?
Show two scenarios: steady 7% vs. volatile path with same average
One person dies at 75, another at 95 - which strategy wins?
Key insight: Uncertainty matters more than averages in financial decisions

Part 2: Modeling Market Returns (20 min)

What is Geometric Brownian Motion? (conceptually, not mathematically)
Two parameters: drift (μ) = expected return, volatility (σ) = how much it bounces around
Demo: Show 10 different market paths starting at $100
All have same μ and σ, but wildly different outcomes after 30 years
Students see: This is why we need thousands of simulations, not one calculation

Part 3: Modeling Lifespan (20 min)

How do actuaries model "when will someone die?"
Not a fixed number - it's a probability distribution
Show SSA life table: 65-year-old male has X% chance of dying at each age
We sample from this distribution randomly for each simulation path
Key insight: Each simulation combines random market path + random lifespan

Part 4: What We're Building (5 min)

Put it together: 10,000 paths = 10,000 different (market, lifespan) pairs
For each path, we apply tax rules and see final wealth
Then we aggregate: what's the average outcome? What's the worst case? When does Strategy A beat Strategy B?

Transition: "Now let's build this."

Day 1 Afternoon Sessions
Session 4: Monte Carlo Architecture (90 min)
Goal: Students understand the simulation pipeline and implement the basic structure.
Part 1: The Big Picture (15 min)

Draw the workflow on board:

Generate market paths (NumPy)
Sample lifespans (SciPy)
Apply tax logic (Python)
Store results (write to database)
Aggregate (SQL queries)


Key question: Why store in database instead of keeping in Python memory?

Part 2: Code Walkthrough (30 min)

Show pre-written simulation scaffold (Polars/DuckDB version)
Explain each function's role:

simulate_market_paths() - generates GBM
sample_lifespans() - pulls from actuarial table
apply_strategy() - this is where tax logic goes
store_results() - batch insert to database


Students don't write this from scratch - they fill in the tax logic

Part 3: Hands-On Implementation (30 min)

Students work in pairs
Start small: Run 100 simulations (not 10,000)
Implement simple "hold to death" strategy first
Check: Did results land in database? Do the numbers make sense?

Part 4: Debug & Discuss (15 min)

Common issues: Why are some terminal wealth values negative? (Bad logic)
Why do some simulations crash? (Division by zero, edge cases)
Key learning: Simulation code needs defensive programming


Session 5: SQL Aggregation & Decision Metrics (90 min)
Goal: Extract insights from simulation results using SQL.
Part 1: What Did We Just Generate? (15 min)

Look at raw simulation_results table
100 rows = 100 different futures
Each has: path_id, lifespan, terminal_wealth, taxes_paid
Question for students: How do we turn this into a decision?

Part 2: Basic Aggregations (20 min)

Write queries together:

Average terminal wealth
Min/max outcomes (best/worst case)
Standard deviation (how risky is this strategy?)


Students realize: We need to compare TWO strategies, not just one

Part 3: Comparative Analysis (30 min)

Run simulations for second strategy (aggressive RMD)
Now we have 200 rows in database (100 per strategy)
Write query to compare:

sqlSELECT 
    strategy,
    AVG(terminal_wealth) as avg_wealth,
    PERCENTILE_CONT(0.05) as worst_5_percent,
    AVG(terminal_wealth) - (SELECT AVG(terminal_wealth) 
                            FROM simulation_results 
                            WHERE strategy = 'baseline') as alpha
FROM simulation_results
GROUP BY strategy

Key insight: Tax Alpha = difference in expected outcomes

Part 4: The Decision Boundary (25 min)

Introduce the core question: "When does Strategy A beat Strategy B?"
Not a single answer - depends on volatility and lifespan
Set up the grid: Run simulations at different σ values
Students query: At what σ does hold-to-death stop winning?
This becomes their visualization for Day 2

Wrap-up for Day 1:
What did we build today? A simulation engine that models uncertainty. Tomorrow we analyze what it tells us and present findings to Dean.