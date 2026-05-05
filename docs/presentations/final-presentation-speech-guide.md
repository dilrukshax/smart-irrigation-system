# Final Presentation Speech Guide

Project: Adaptive Smart Irrigation and Crop Optimization Platform

Presenter focus: Dilruksha, group leader and F4 Adaptive Crop and Area Optimization owner

Use this guide as a speaking script and viva preparation document. It is written to match the final presentation and viva rubrics: knowledge gap, creative solution, specialized knowledge, technology justification, implementation quality, communication, and commercialization potential.

---

## 1. One-Minute Project Summary

Our project is an integrated smart agriculture decision-support platform for canal-command irrigation schemes such as Udawalawe. The main problem is that farmers and irrigation authorities often make irrigation, crop health, water forecasting, and crop planning decisions separately. That causes water wastage, delayed stress detection, uncertain crop choices, and poor seasonal planning under limited water quotas.

We solve this by combining four functions into one platform:

1. F1 IoT Smart Water Management - captures live field and water data, then supports automatic or manual irrigation decisions.
2. F2 Crop Health and Water Stress Detection - uses satellite/zone analysis and image-based prediction to detect crop stress early.
3. F3 Forecasting and Alerting - predicts weather, water availability, and risk so the system can plan ahead.
4. F4 Adaptive Crop and Area Optimization - my function, which recommends the best crops and allocates field area under water, soil, market, and policy constraints.

As the group leader, my responsibility is to explain how these four functions connect into one complete decision flow. As the F4 owner, my technical contribution is the optimization layer that turns data from the other services into practical crop and area recommendations.

---

## 2. Knowledge Gap

### Simple version for presentation

The knowledge gap is that many existing smart irrigation systems focus only on one decision: when to irrigate. Other systems focus only on crop disease detection, weather prediction, or crop recommendation. But in real canal irrigation schemes, these decisions are connected. A farmer should not decide the crop without knowing water quota, forecasted rainfall, crop stress, soil suitability, and expected market return.

So the gap is the lack of an integrated, adaptive system that combines IoT water data, crop health monitoring, forecast risk, and optimization-based crop planning into one farmer and authority decision-support platform.

### Stronger version for viva

Our research gap is not just "smart irrigation." The deeper gap is adaptive decision-making under constraints. Existing solutions usually operate in silos:

- Sensor-based irrigation systems optimize field water use, but they do not decide the best seasonal crop mix.
- Satellite crop health systems detect stress, but they do not convert that stress into crop planning penalties.
- Forecasting systems predict rainfall or reservoir level, but they do not directly influence crop area allocation.
- Crop recommendation systems often recommend crops from static soil or climate data, but they ignore scheme-level water quotas and policy constraints.

Our system closes this gap by connecting all four streams. The final recommendation is not only "this crop is suitable." It is "this crop is suitable, profitable, feasible under water quota, acceptable under forecast risk, and aligned with policy constraints."

---

## 3. Proposed Solution

The proposed solution is a modular platform with four backend services and one integrated dashboard.

F1 collects live sensor readings such as water level and soil moisture. F2 analyzes crop health and stress from satellite zones and image prediction. F3 provides forecast and risk context such as rainfall and water availability. F4 uses all of that information to recommend crops and allocate area.

The final output is useful to two main user groups:

- Farmers get field-level recommendations, irrigation guidance, Plan B replanning, and crop options with rationale.
- Officers and authorities get scheme-level planning: how much area should be assigned to each crop, whether water quota is enough, and what supply risk exists.

This turns the prototype into functional units because each function has its own API, tests, database contracts, and frontend screens, but they still work together as one system.

---

## 4. Four Member Functions

### F1 - IoT Smart Water Management

Purpose: automate and improve irrigation decisions using real-time field data.

Inputs:

- Soil moisture
- Water level
- Temperature and humidity
- Field thresholds
- Forecast adjustment from F3
- Stress context from F2

Outputs:

- Open, close, or hold valve decision
- Irrigation logs
- Manual request if automatic action is blocked
- Field status for farmers and admins

Presentation line:

"F1 is the real-time control layer. It listens to the field, decides whether irrigation is needed, and records every action so water usage becomes measurable instead of manual guesswork."

### F2 - Crop Health and Water Stress

Purpose: detect unhealthy or stressed crop zones early.

Inputs:

- Satellite vegetation indices such as NDVI and NDWI
- Field image uploads
- Location and zone details

Outputs:

- Healthy, mild stress, or severe stress zones
- Field stress index
- Penalty factor used by F4
- Recommendations for further inspection

Presentation line:

"F2 gives the system visual intelligence. If a field repeatedly shows stress, that signal should affect irrigation priority and future crop planning."

### F3 - Forecasting and Alerting

Purpose: predict short-term water and weather conditions before decisions are made.

Inputs:

- Weather data
- Rainfall forecasts
- Historical reservoir or water data
- Submitted observations

Outputs:

- 7-day irrigation recommendation
- Risk assessment
- Forecast bands and alert levels
- Water availability context for F1 and F4

Presentation line:

"F3 helps the platform move from reactive decisions to predictive decisions. Instead of only asking what is happening now, the system asks what is likely to happen next."

### F4 - Adaptive Crop and Area Optimization

Purpose: recommend which crops to grow and how much area to allocate under real constraints.

Inputs:

- Soil and field data
- Water quota from F1 or scheme records
- Crop stress penalty from F2
- Forecasted water availability from F3
- Price and yield predictions
- Policy rules such as minimum paddy area

Outputs:

- Top crop recommendations per field
- Expected yield, profit, risk band, and rationale
- Area allocation per crop
- Water budget usage
- Plan B recommendations when water or price changes

Presentation line:

"F4 is the decision-intelligence layer. It takes the data from the other functions and converts it into an optimized crop plan that is feasible, explainable, and useful for both farmers and authorities."

---

## 5. Your F4 Deep Explanation

### F4 problem statement

Farmers cannot choose crops based only on tradition or market price. A profitable crop may fail if water is insufficient. A water-efficient crop may not be suitable for the soil. A suitable crop may become risky if forecasted water availability is low. Therefore, F4 solves a multi-factor decision problem.

The two main questions are:

1. Which crops are most suitable for each field?
2. How many hectares should be allocated to each crop while staying within water and area limits?

### F4 pipeline

Step 1: Build the field context

The FeatureBuilder collects field metadata, soil type, area, water context from F1, stress context from F2, and forecast risk from F3.

Step 2: Score crop suitability

The system uses Fuzzy-TOPSIS to rank crop-field combinations. This is useful because suitability is not a single value. It depends on soil, water, yield, water sensitivity, and crop duration.

Criteria used:

- Soil suitability: higher is better
- Water coverage ratio: higher is better
- Historical yield: higher is better
- Water sensitivity: lower is better
- Growth duration: lower is better when water risk exists

Formula idea:

Suitability score = closeness to the ideal crop profile

Then F2 stress is applied:

effective_suitability = suitability_score * (1 - stress_penalty)

Example:

If a crop has suitability 0.85 but the field has stress penalty 0.40:

effective_suitability = 0.85 * 0.60 = 0.51

This means F4 does not ignore crop health. A stressed field gets a lower suitability score, so the optimizer becomes more cautious.

Step 3: Predict yield and price

F4 estimates:

- Predicted yield in tons per hectare
- Predicted price in rupees per kilogram
- Expected profit per hectare

Profit idea:

gross_revenue_per_ha = predicted_yield_t_ha * 1000 * predicted_price_per_kg

expected_profit_per_ha = gross_revenue_per_ha - cost_per_ha

Step 4: Optimize crop area

This is your main function. The optimizer decides how much land to allocate to each crop.

Decision variable:

area_crop = hectares allocated to a crop

Objective:

Maximize total expected profit.

In simple words:

"Choose the crop areas that give the highest expected profit while staying within water, land, budget, and policy limits."

Mathematical idea:

Maximize:

sum(area_crop * expected_profit_per_ha_crop * suitability_score_crop)

Subject to:

- Total area used must be less than or equal to available field area.
- Total water used must be less than or equal to seasonal water quota.
- Each crop must stay within minimum and maximum area limits.
- Paddy area can be forced to meet policy requirements.
- Budget cost must stay within available cultivation budget.
- Crop rotation penalty can reduce profit if the same crop is repeatedly selected.

Step 5: Return explainable recommendations

The output is not only a crop name. It includes:

- Rank
- Crop name
- Suitability score
- Yield estimate
- Price estimate
- Profit estimate
- Allocated area
- Water requirement
- Risk level
- Rationale

---

## 6. Optimization Function: Viva-Level Explanation

### What is optimization in this project?

Optimization means selecting the best crop-area plan from many possible plans. If there are five crops and multiple fields, there are many possible combinations. The system must choose the combination that gives the best benefit without violating constraints.

### Why not just pick the highest profit crop?

Because agriculture has constraints. The highest-profit crop may need too much water. Another crop may be profitable but unsuitable for the soil. Another may be risky because the forecast says water availability will drop. Optimization balances all those factors together.

### What are the decision variables?

The decision variable is the area allocated to each crop.

Example:

- area_paddy = 1.2 hectares
- area_maize = 0.8 hectares
- area_tomato = 0.5 hectares

The optimizer searches for the best values for these area variables.

### What is the objective function?

The objective function is:

Maximize total expected profit.

In project language:

total_profit = sum(allocated_area * expected_profit_per_ha)

The production code also considers suitability by multiplying profit by suitability score. That prevents the optimizer from choosing a crop only because it has high price.

### What constraints are used?

1. Area constraint

The total allocated area cannot exceed the available field area.

Example:

If the field has 2 hectares:

area_paddy + area_maize + area_tomato <= 2

2. Water constraint

The total water required by all selected crops cannot exceed the quota.

Example:

area_paddy * 700 + area_maize * 400 + area_tomato * 500 <= water_quota

3. Crop bounds

Each crop can have minimum and maximum viable area.

Example:

0 <= area_paddy <= 2

4. Minimum paddy policy

Authorities may require a minimum paddy area for food security or local rules.

Example:

area_paddy >= 0.5

5. Budget constraint

Cultivation cost must be below the available budget.

Example:

sum(area_crop * cost_per_ha_crop) <= budget_lkr

6. Rotation penalty

If the same crop was grown before, the system can reduce its effective profit to encourage rotation and reduce long-term soil and disease risk.

### What solver is used?

The implementation supports a PuLP linear programming path. If PuLP is not available or the LP is infeasible, the system falls back to a greedy heuristic.

The greedy method sorts crops by profit-per-water efficiency and suitability, then allocates area until water or land is exhausted.

The LP method is better because it solves all constraints together. It creates area variables, sets the profit-maximization objective, adds water, area, paddy, and budget constraints, then uses the CBC solver through PuLP.

### Why is this suitable for the project?

Linear programming is suitable because the relationships are mostly linear:

- Profit increases with area.
- Water usage increases with area.
- Cost increases with area.
- Area limits are linear.

So LP gives a clear, explainable, and justifiable solution for agricultural planning.

### How do you explain feasibility?

Feasible means the optimizer found a plan that satisfies all constraints.

Infeasible means the constraints conflict. For example, if the water quota is too low to satisfy even the minimum required crop area, the system cannot produce a valid plan.

In that case, F4 can trigger Plan B by reducing area, changing crop mix, or using a lower water crop.

---

## 7. Full Presentation Speech

### Opening

Good morning everyone. We are presenting our research project, the Adaptive Smart Irrigation and Crop Optimization Platform.

Our project focuses on canal-command agriculture, where farmers depend on limited and scheduled irrigation water. In this environment, a wrong decision can affect water usage, crop health, yield, and income. The current problem is that irrigation, crop health monitoring, forecasting, and crop planning are often handled separately. Because of that, farmers do not always get a complete decision based on water availability, crop stress, forecast risk, and market conditions.

Our main research gap is the lack of an integrated and adaptive decision-support platform that connects all these areas into one workflow.

### Problem and gap

Many existing systems solve only part of the problem. Some systems automate irrigation using sensors. Some detect crop disease or stress using images or satellite data. Some forecast rainfall or reservoir levels. Some recommend crops using soil or climate data.

But in real farming, these decisions are connected. For example, a crop may be profitable, but if it needs high water and the forecast predicts water shortage, it is not the best recommendation. Similarly, a field may look suitable, but if crop health monitoring shows repeated stress, the system should reduce confidence in that crop plan.

This is the gap our project addresses.

### Solution overview

Our solution is an integrated smart agriculture platform with four main functions.

Function 1 is IoT Smart Water Management. It collects sensor data from the field, such as water level and soil moisture, and supports automatic or manual irrigation decisions.

Function 2 is Crop Health and Water Stress Detection. It uses satellite-based zone analysis and image prediction to detect crop stress early.

Function 3 is Forecasting and Alerting. It predicts weather and water availability so the platform can plan ahead instead of only reacting to current conditions.

Function 4 is Adaptive Crop and Area Optimization. This is my main function. It uses the data from the other services, together with soil, crop, price, yield, and policy data, to recommend what crops to grow and how much area to allocate.

As the group leader, I coordinated the four functions so that they connect through APIs, shared contracts, and the dashboard. As the F4 owner, I developed the decision layer that converts the combined data into practical crop planning recommendations.

### Architecture

At a high level, the architecture has sensor and data sources, separate backend services, a shared data layer, and a web dashboard.

The reason we used a service-based architecture is that each research function has a clear responsibility. F1 handles irrigation control. F2 handles crop health. F3 handles forecasting. F4 handles optimization. This separation makes the system easier to test, maintain, and explain, while still allowing the services to work together through REST APIs.

### Function integration

The important part of our project is not only that the four functions exist, but that they influence each other.

F1 provides water availability to F4. F2 provides stress penalties to F4. F3 provides forecast risk and expected water availability to F4. Then F4 uses those signals to generate crop recommendations and area allocation.

For example, if F3 predicts low water availability, F4 reduces the feasible water quota. If F2 reports severe crop stress, F4 lowers the suitability score for that field. If F1 reports limited water, F4 avoids recommending a high-water crop over a large area.

### F4 deep dive

Now I will explain my function, Adaptive Crop and Area Optimization.

The purpose of F4 is to answer two questions. First, which crops are suitable for a given field? Second, how many hectares should be allocated to each crop under limited water and land constraints?

The pipeline has five steps.

First, the system builds the field context. It collects soil and field data, water context from F1, stress context from F2, and forecast context from F3.

Second, it calculates crop suitability. For this, we use Fuzzy-TOPSIS. This method ranks crops based on multiple criteria such as soil suitability, water coverage, expected yield, water sensitivity, and growth duration. The output is a suitability score between 0 and 1.

Third, F4 estimates yield, price, and profit. The price model uses historical market price data and climate/temporal features. The yield and price values are used to calculate expected profit per hectare.

Fourth, the optimizer allocates area. This is the core of my contribution. The optimizer tries to maximize total expected profit while respecting constraints such as total area, total water quota, crop bounds, budget, and minimum paddy policy.

Fifth, the system returns explainable recommendations. The farmer or officer can see the crop name, rank, suitability score, expected yield, expected profit, water requirement, risk level, and rationale.

### Optimization explanation

The optimization function uses the crop area as the decision variable. For each crop, the system decides how many hectares should be allocated.

The objective function is to maximize total expected profit:

total_profit = sum(area_crop * expected_profit_per_ha_crop)

In the implementation, suitability is also included, so a crop with high profit but poor field suitability will not dominate the plan.

The main constraints are:

- Total allocated area must not exceed the field area.
- Total crop water requirement must not exceed the water quota.
- Crop area must stay within minimum and maximum limits.
- Paddy area can be kept above a policy minimum.
- Cultivation cost can be kept within a budget.
- Rotation penalty can reduce repeated crop selection.

This is suitable for linear programming because profit, water, cost, and area change linearly with hectares.

The system supports a PuLP LP optimizer using the CBC solver. If the LP solver is unavailable or infeasible, the implementation can fall back to a greedy method that ranks crops by profit-per-water efficiency and suitability.

### Implementation and technology

We used Python and FastAPI for the backend services because they are suitable for ML and API-based systems. PostgreSQL is used for persistence. For ML and analytics, we used pandas, scikit-learn, PyTorch experiments, and production-oriented tree-based modelling. For optimization, F4 uses PuLP and a greedy fallback.

The frontend dashboard is built using a modern web stack, and the services expose REST endpoints for recommendations, scenario evaluation, Plan B replanning, supply monitoring, and water budget reporting.

We also followed good implementation practices such as modular service boundaries, role-based access, API contracts, automated tests, graceful degradation when upstream data is unavailable, and clear response fields such as status, source, data availability, and rationale.

### Evaluation and limitations

For F4, the research used multiple data sources such as Hector retail price data, Sri Lanka climate data, paddy cultivation data, and rice time-series data. These datasets helped build the price and recommendation signals.

One important limitation is that the Hector dataset mainly contains market price data, not direct agronomic crop-choice labels. Because of that, the crop recommendation model alone cannot represent full agronomic suitability. We addressed this by using Fuzzy-TOPSIS with expert criteria for soil, water, yield, sensitivity, and crop duration.

Another limitation is price volatility. Agricultural prices change due to supply shocks, weather, transport, and market behavior. Therefore, price prediction is used as a ranking signal, not as an exact guarantee.

For future improvement, we can collect more field-level agronomic labels, train stronger price models with richer features, expand the crop catalogue, and use full multi-field mixed-integer optimization for larger scheme planning.

### Commercialization

This system has business potential because it can be used by farmers, irrigation officers, agriculture departments, and water management authorities.

For farmers, the value is better crop selection, water saving, and reduced risk. For authorities, the value is scheme-level planning, water quota monitoring, supply forecasting, and better coordination between fields.

The product can be commercialized as a SaaS dashboard for irrigation schemes, with mobile access for farmers and administrative dashboards for officers. It can also be offered as a government or agriculture-extension decision-support tool.

### Closing

To conclude, our project moves beyond a single smart irrigation prototype. It combines IoT, crop health analysis, forecasting, and optimization into one adaptive platform. My F4 optimization function is the final decision layer, where all the collected intelligence becomes an actionable crop and area plan.

Thank you.

---

## 8. Viva Questions and Strong Answers

### What is the main knowledge gap?

The gap is that existing systems usually solve irrigation, crop health, forecasting, or crop recommendation separately. Our project integrates these areas and uses them together for adaptive crop and area planning under water constraints.

### What is novel in your project?

The novelty is the cross-service decision flow. F4 does not recommend crops from static data only. It adapts recommendations using live water availability from F1, stress penalty from F2, forecast risk from F3, and optimization constraints.

### What is your personal contribution?

My contribution is F4 Adaptive Crop and Area Optimization. I implemented the recommendation and optimization flow, including suitability scoring, profit estimation, water/area constrained allocation, Plan B replanning, and scheme-level supply monitoring. As group leader, I also coordinated how the four functions connect.

### Why did you use Fuzzy-TOPSIS?

Crop suitability is a multi-criteria problem. A crop can be good in soil suitability but poor in water requirement, or profitable but risky. Fuzzy-TOPSIS ranks alternatives by comparing each crop to an ideal best and ideal worst solution. It is explainable and works well when criteria include both quantitative and qualitative factors.

### Why did you use optimization?

Simple ranking is not enough. If we only rank crops, we might choose a crop that exceeds the water quota or field area. Optimization ensures the final plan is feasible under area, water, policy, budget, and crop bound constraints.

### What is the objective function?

The objective is to maximize total expected profit:

total_profit = sum(area_crop * expected_profit_per_ha_crop)

In the implementation, effective profit is adjusted by suitability score and optional rotation penalty.

### What are the constraints?

The main constraints are total land area, water quota, minimum and maximum crop area, minimum paddy area policy, cultivation budget, and crop rotation penalty.

### What happens if water quota changes mid-season?

F4 supports Plan B replanning. The updated water quota or price changes are passed as a scenario, and the recommendation pipeline runs again to produce a revised crop plan.

### Why is the system explainable?

Each recommendation includes suitability score, expected yield, profit, risk band, water requirement, allocation, and rationale. The user can see why a crop was recommended instead of receiving only a black-box answer.

### What are your limitations?

The main limitations are dataset mismatch, volatile market prices, limited crop catalogue, and the need for more real field labels. Also, full scheme-level MIP optimization can be improved further for larger deployments.

### How did you apply best practices?

We used modular services, REST API contracts, role-based access, tests, database migrations, graceful fallback behavior, and clear response structures. These practices make the system maintainable and easier to extend.

---

## 9. Slide Structure

### Slide 1: Title

Say:

"Good morning. Our project is the Adaptive Smart Irrigation and Crop Optimization Platform, designed for smarter water and crop decisions in canal-command agriculture."

### Slide 2: Problem

Show:

- Manual irrigation decisions
- Fragmented crop planning
- Water scarcity
- Delayed crop stress detection
- Market uncertainty

Say:

"The problem is not only irrigation. The real problem is disconnected decision-making."

### Slide 3: Knowledge Gap

Show:

- Existing systems solve separate tasks
- Lack of integrated adaptive planning
- Need for water-aware and forecast-aware crop optimization

Say:

"Our gap is the lack of a platform that combines water, health, forecast, and market intelligence into one crop planning decision."

### Slide 4: Proposed Solution

Show:

- F1 IoT
- F2 Crop health
- F3 Forecasting
- F4 Optimization
- Dashboard

Say:

"Each function solves one part of the agriculture decision cycle, and F4 brings those signals together for final planning."

### Slide 5: System Architecture

Show:

- Sensors and external data
- Backend services
- Shared database
- APIs
- Dashboard

Say:

"We selected a service-based design so each function can be developed and tested independently while still integrating through APIs."

### Slide 6: Function Summary

Show a table:

- F1: water sensing and irrigation decision
- F2: crop stress detection
- F3: forecast and risk
- F4: crop and area optimization

Say:

"The important point is that these functions are not isolated. They exchange decision context."

### Slide 7: F4 Pipeline

Show:

Field context -> suitability -> yield/price -> optimization -> recommendation

Say:

"F4 converts data into an actionable plan. It starts with context collection and ends with explainable crop recommendations."

### Slide 8: Optimization Function

Show:

- Decision variable: area per crop
- Objective: maximize profit
- Constraints: water, area, paddy policy, budget, crop bounds

Say:

"This is the core of my function. Instead of simply ranking crops, we solve a constrained allocation problem."

### Slide 9: Implementation

Show:

- FastAPI services
- PostgreSQL
- Fuzzy-TOPSIS
- ML price/yield signals
- PuLP LP optimizer and greedy fallback
- Tests and API contracts

Say:

"The implementation is not only a notebook. It has service endpoints, tests, data contracts, and dashboard integration."

### Slide 10: Results and Limitations

Show:

- Functional recommendations
- Water-aware allocation
- Scenario and Plan B support
- Limitations: data mismatch, price volatility, crop catalogue size

Say:

"The limitations are important because they show where the research can improve. We addressed dataset mismatch by combining ML signals with Fuzzy-TOPSIS expert scoring."

### Slide 11: Commercialization

Show:

- Farmers
- Irrigation officers
- Agriculture departments
- SaaS/dashboard model
- Decision-support product

Say:

"The product can become a practical decision-support platform for irrigation schemes, improving water planning and crop risk management."

### Slide 12: Conclusion

Say:

"Our project integrates sensing, monitoring, forecasting, and optimization. My F4 function is the final decision layer that transforms those signals into a feasible crop and area plan."

---

## 10. Short Version If Time Is Limited

If you only have two or three minutes for your section, use this:

"My function is F4 Adaptive Crop and Area Optimization. The goal is to recommend the best crops and allocate field area under real constraints such as water quota, field area, soil suitability, crop stress, forecast risk, market price, and policy rules.

The pipeline starts by collecting field context. F1 provides water availability, F2 provides stress penalty, and F3 provides forecasted water risk. Then F4 calculates crop suitability using Fuzzy-TOPSIS, predicts yield and price, calculates expected profit, and runs an optimization function.

The optimizer uses crop area as the decision variable. The objective is to maximize total expected profit, but the solution must satisfy constraints: total area cannot exceed field area, water requirement cannot exceed quota, paddy can have a minimum policy area, and cultivation cost can be limited by budget.

This is better than simply recommending the highest-profit crop because it ensures the final plan is feasible and explainable. The output includes top crop recommendations, allocated area, water usage, expected profit, risk level, and rationale. So F4 becomes the decision layer that converts water, health, forecast, and market data into an actionable crop plan."

---

## 11. Presentation Delivery Tips

- Start with the problem, not the technology.
- Use "integrated decision-making" as your repeated theme.
- When explaining F4, keep returning to "best plan under constraints."
- For viva, be honest about limitations. Acknowledging limitations makes the work sound stronger.
- Do not overclaim price prediction accuracy. Say it is used as a market signal, not a guaranteed future price.
- As leader, emphasize integration, contracts, and how the functions work together.
- As F4 owner, emphasize Fuzzy-TOPSIS, optimization variables, objective function, constraints, and explainability.

