# F4 Optimization Model Q&A Guide

Project: Adaptive Smart Irrigation and Crop Optimization Platform

Presenter focus: Dilruksha, F4 Adaptive Crop and Area Optimization owner

Use this guide to explain what kind of model is used in the optimization function, how the data is used, what the accuracy means, and how to answer common viva questions.

---

## 1. Short Explanation

My F4 function is not a single machine learning model. It is a hybrid decision pipeline.

The pipeline has four main parts:

1. Fuzzy-TOPSIS model for crop suitability ranking.
2. ML models for crop, price, and yield signals.
3. Linear Programming optimization model using PuLP for area allocation.
4. Greedy fallback optimizer if the LP solver is unavailable or infeasible.

The best short answer is:

"My F4 model is a hybrid decision pipeline. Fuzzy-TOPSIS ranks crop suitability using soil, water, yield, water sensitivity, and crop duration. ML models provide price and yield signals, which are converted into expected profit. Then a PuLP Linear Programming optimizer decides how many hectares to allocate to each crop by maximizing profit under water, land, budget, crop bound, and paddy policy constraints. If the LP solver is unavailable or infeasible, a greedy fallback ranks crops by profit-per-water efficiency and suitability to produce a practical backup plan."

---

## 2. System Flow

The F4 optimization function works in layers:

```text
Field + crop data
      ↓
1. Fuzzy-TOPSIS
   Is this crop suitable for this field?
      ↓
2. ML models
   What yield, price, and profit can we expect?
      ↓
3. Linear Programming optimizer
   How much area should be allocated to each crop?
      ↓
4. Greedy fallback
   What if the LP solver cannot run?
```

Each layer answers a different question. Fuzzy-TOPSIS answers suitability. ML models answer expected outcome. Linear Programming answers best area allocation. Greedy fallback protects the system from solver failure.

---

## 3. Fuzzy-TOPSIS Model

### Purpose

Fuzzy-TOPSIS is used for crop suitability ranking.

It answers:

"For this field, which crop is agronomically suitable?"

It is not mainly a prediction model like a neural network. It is a multi-criteria decision-making model.

### Why It Is Needed

Crop suitability cannot be decided by one factor only. A crop may be profitable but need too much water. Another crop may match the soil but take too long to grow. Another crop may have good yield but high water sensitivity.

Fuzzy-TOPSIS helps combine all these criteria and rank crops fairly.

### Criteria Used

Positive criteria:

- Soil suitability: higher is better.
- Water coverage ratio: higher is better.
- Historical yield: higher is better.

Negative criteria:

- Water sensitivity: lower is better.
- Growth duration: lower is better when water is limited.

### Simple Explanation

TOPSIS means Technique for Order Preference by Similarity to Ideal Solution.

The model compares each crop to:

- The ideal best crop.
- The ideal worst crop.

The best crop is the one closest to the ideal best crop and farthest from the ideal worst crop.

Example ideal crop:

- High soil suitability.
- Low water requirement.
- High expected yield.
- Low water sensitivity.
- Shorter growth duration.

### Output

Fuzzy-TOPSIS outputs a suitability score between 0 and 1.

Example:

```text
Paddy: 0.82
Maize: 0.76
Tomato: 0.68
Long Beans: 0.61
```

### F2 Stress Integration

F4 also uses crop stress from F2.

Formula:

```text
effective_suitability = suitability_score * (1 - stress_penalty)
```

Example:

```text
suitability_score = 0.85
stress_penalty = 0.40
effective_suitability = 0.85 * 0.60 = 0.51
```

This means a stressed field becomes less attractive for risky crop planning.

### Viva Answer

"I used Fuzzy-TOPSIS because crop suitability is a multi-criteria problem. It depends on soil, water availability, expected yield, water sensitivity, and crop duration. Fuzzy-TOPSIS ranks crops based on how close they are to an ideal crop profile, and the output suitability score is later used by the optimizer."

---

## 4. ML Models For Crop, Price, And Yield Signals

### Purpose

The ML models provide data-driven signals for the optimizer.

They answer:

"If we grow this crop, what market and production outcome can we expect?"

The ML layer supports:

- Crop recommendation signal.
- Price prediction.
- Yield prediction.

### Crop Recommendation Model

The research used a Random Forest Classifier as a crop recommendation model.

Possible inputs:

- Temperature.
- Rainfall.
- Humidity.
- Month.
- Location.
- Price z-score.
- Climate score.

Output:

- Recommended crop class.

Example:

```text
Input: location, season, rainfall, temperature, price score
Output: Tomato, Carrot, Green Beans, Long Beans, or Leeks
```

Important point:

This is not the final recommendation by itself. It gives a market and climate signal. The final decision also uses Fuzzy-TOPSIS and optimization constraints.

### Price Prediction Model

The price prediction model estimates expected crop price.

Possible inputs:

- Crop type.
- Location.
- Month and season.
- Climate features.
- Previous price values.
- Rolling average price.

Output:

```text
predicted price per kg
```

Example:

```text
Tomato predicted price = Rs. 320/kg
Carrot predicted price = Rs. 280/kg
```

### Yield Prediction Model

The yield prediction model estimates production per hectare.

Possible inputs:

- Crop type.
- Field condition.
- Soil condition.
- Water availability.
- Season.
- Climate.

Output:

```text
predicted yield in tons per hectare
```

Example:

```text
Paddy = 4.2 t/ha
Tomato = 12.0 t/ha
```

### Profit Calculation

The predicted yield and price are converted into expected profit.

Formula:

```text
gross_revenue_per_ha = predicted_yield_t_ha * 1000 * predicted_price_per_kg
expected_profit_per_ha = gross_revenue_per_ha - cost_per_ha
```

### Viva Answer

"The ML models provide prediction signals such as crop class, expected price, and expected yield. These are not used blindly. They are combined with Fuzzy-TOPSIS suitability and then passed to the optimizer, so the final recommendation is both data-driven and constraint-aware."

---

## 5. Linear Programming Optimization Using PuLP

### Purpose

Linear Programming is used for area allocation.

It answers:

"Given suitable and profitable crops, how much land should be allocated to each crop?"

This is the core optimization function.

### Decision Variables

The decision variable is the area allocated to each crop.

Example:

```text
x_paddy = hectares allocated to paddy
x_tomato = hectares allocated to tomato
x_maize = hectares allocated to maize
```

The optimizer decides the values of these variables.

### Objective Function

The objective is to maximize total expected profit.

Formula:

```text
Maximize:
Σ area_crop * expected_profit_per_ha_crop
```

In the implementation, suitability is also considered:

```text
effective_profit = expected_profit_per_ha * suitability_score
```

So a crop with high profit but poor suitability will not dominate the plan.

### Main Constraints

#### Area Constraint

```text
Σ area_crop <= total_field_area
```

Meaning:

"Do not allocate more land than available."

#### Water Constraint

```text
Σ area_crop * water_requirement_crop <= water_quota
```

Meaning:

"Do not choose a crop mix that needs more water than available."

#### Crop Bounds

```text
min_area_crop <= area_crop <= max_area_crop
```

Meaning:

"Each crop must stay within allowed minimum and maximum area limits."

#### Minimum Paddy Policy

```text
area_paddy >= minimum_paddy_area
```

Meaning:

"If the authority requires minimum paddy cultivation, the optimizer enforces it."

#### Budget Constraint

```text
Σ area_crop * cost_per_ha_crop <= available_budget
```

Meaning:

"The cultivation plan must be affordable."

#### Rotation Penalty

If the same crop was grown before, its effective profit can be reduced.

Formula:

```text
effective_profit = profit * (1 - rotation_penalty)
```

Example:

```text
profit = 100,000
rotation_penalty = 0.15
effective_profit = 85,000
```

This discourages repeated crop selection and supports better long-term soil and disease management.

### Why Linear Programming Is Suitable

Linear Programming is suitable because:

- Profit increases linearly with area.
- Water usage increases linearly with area.
- Cost increases linearly with area.
- Area limits are linear.

This makes the model explainable and easy to justify in a viva.

### Viva Answer

"I used Linear Programming because crop area allocation can be represented using linear equations. Profit, water use, cost, and area all scale with hectares. PuLP helps define the objective and constraints clearly, and the CBC solver finds the best feasible allocation."

---

## 6. Greedy Fallback Optimizer

### Purpose

The greedy fallback is used when the LP solver is unavailable or when the LP solution is infeasible.

It answers:

"Can we still produce a reasonable recommendation if the exact optimizer cannot run?"

### How It Works

The greedy method ranks crops by profit-per-water efficiency and suitability.

Formula idea:

```text
efficiency = expected_profit_per_ha / water_requirement
score = efficiency * suitability_score
```

Then it allocates area to the highest ranked crop first, then the next crop, until water or area runs out.

### Example

```text
Crop A: Rs. 500 profit per mm water
Crop B: Rs. 300 profit per mm water
Crop C: Rs. 250 profit per mm water
```

The greedy method chooses Crop A first.

### Why It Is Useful

The fallback improves reliability. It may not always find the global optimum like Linear Programming, but it gives a fast, explainable, and practical result.

### Viva Answer

"The greedy fallback improves system reliability. It may not always find the global optimum like LP, but it gives a fast and explainable approximate solution by prioritizing crops with high profit-per-water efficiency and suitability."

---

## 7. Datasets Used

### Hector Government Retail Price Dataset

Use:

- Price modelling.
- Market signal for crop recommendation.

Details:

- Sri Lankan crop retail price data.
- Time range: 2015-2024.
- Around 71,737 price observations.
- Includes crops such as tomatoes, carrot, green beans, long beans, and leeks.

### Sri Lanka Climate Dataset

Use:

- Climate feature engineering.
- Suitability and price-risk context.

Details:

- Around 314,000 daily records.
- Includes temperature, rainfall, wind speed, and evapotranspiration features.

### Paddy Cultivation Dataset

Use:

- Seasonal agricultural context.
- Maha/Yala context.

Details:

- Around 1,039 seasonal records.
- Includes district, season, year, and average price context.

### Rice Time-Series Dataset

Use:

- Price time-series baseline.
- Rice/paddy market trend reference.

Details:

- Around 324 monthly records.
- Useful as a baseline, but limited for deep learning because of small data size.

### Dataset Selection Viva Answer

"We selected datasets based on relevance to Sri Lankan agriculture, availability of historical records, and usefulness for crop planning. Price data supports market prediction, climate data supports suitability and risk analysis, and paddy data supports seasonal agricultural context."

---

## 8. Model Accuracy And Evaluation

### Crop Recommendation Accuracy

The Random Forest crop recommendation model achieved about:

```text
Test accuracy = 34.07%
```

This is above a random 5-class baseline of about 20%, but it is still moderate.

### Price Prediction Results

The neural price prediction model achieved approximately:

```text
R² = 0.167
MAE = Rs. 115.66/kg
RMSE = Rs. 175.81/kg
```

The Random Forest price baseline performed better on log-scale features:

```text
R² = 0.486
```

### How To Explain The Accuracy

Do not overclaim the accuracy.

Use this answer:

"The accuracy is moderate because agricultural prices are highly volatile and the dataset mainly contains market prices, not true agronomic crop-choice labels. Therefore, we use ML predictions as decision signals, not as exact guarantees. To improve reliability, we combine ML outputs with Fuzzy-TOPSIS and optimization constraints."

### Why Accuracy Is Not The Only Evaluation

For the optimization function, accuracy is not measured like a classifier only. The optimizer is evaluated by:

- Feasibility: does the plan satisfy constraints?
- Water constraint: does water usage stay within quota?
- Area constraint: does allocated area stay within available land?
- Profit objective: does it improve expected profit?
- Explainability: can the user understand why the plan was selected?

---

## 9. Best Viva Questions And Answers

### What model are you using in F4?

I use a hybrid decision model. Fuzzy-TOPSIS ranks crop suitability, ML models estimate crop/price/yield signals, and a PuLP Linear Programming optimizer allocates crop area under water, land, budget, and policy constraints.

### Is your optimization model a machine learning model?

Not exactly. The optimizer itself is a mathematical optimization model, not a traditional ML model. But it uses ML predictions such as price and yield as input signals.

### Why did you not use only ML?

Only ML can predict signals, but it cannot guarantee that water, area, and policy constraints are satisfied. Optimization is needed to produce a feasible plan.

### Why did you use Fuzzy-TOPSIS?

Because crop suitability is multi-criteria. It depends on soil, water, yield, sensitivity, and crop duration. Fuzzy-TOPSIS combines these criteria and gives an explainable suitability ranking.

### What is the decision variable?

The decision variable is the area allocated to each crop, measured in hectares.

### What is the objective function?

The objective function is to maximize total expected profit:

```text
total_profit = sum(area_crop * expected_profit_per_ha_crop)
```

### What constraints did you use?

The constraints are field area, water quota, crop minimum and maximum area, minimum paddy area policy, budget, and crop rotation penalty.

### What happens if water quota changes?

The system can run Plan B replanning. It updates the water quota or price scenario and runs the recommendation and optimization pipeline again.

### What happens if the optimizer is infeasible?

If constraints conflict, the system can return infeasible and trigger Plan B. For example, it may reduce area, choose lower-water crops, or change the crop mix.

### What are your limitations?

The main limitations are dataset mismatch, price volatility, limited crop catalogue, and the need for more real field-level soil, yield, and crop-choice data.

### What is your main contribution?

My main contribution is the F4 Adaptive Crop and Area Optimization pipeline. It combines suitability scoring, price/yield prediction, and constrained optimization to generate feasible and explainable crop plans.

---

## 10. Easy Example To Explain

Suppose one field has:

```text
Total area = 2 hectares
Water quota = 1000 mm
```

Candidate crops:

```text
Crop      Suitability   Profit/ha   Water/ha
Paddy     0.85          100,000     700
Tomato    0.75          150,000     500
Maize     0.70           90,000     350
```

If we only choose the highest-profit crop, we may choose tomato only. But optimization checks whether the crop mix satisfies water quota, area limit, suitability, and paddy policy.

Possible output:

```text
Paddy: 0.7 ha
Tomato: 1.0 ha
Maize: 0.3 ha
Total area <= 2 ha
Total water <= 1000 mm
```

This is why optimization is better than simple crop ranking.

---

## 11. Final Memorization Answer

"My F4 function uses a hybrid optimization pipeline. First, Fuzzy-TOPSIS ranks crop suitability using soil, water, yield, water sensitivity, and growth duration. Then ML models provide crop, price, and yield signals. These are converted into expected profit. Finally, a PuLP Linear Programming optimizer allocates crop area by maximizing total expected profit under water, land, budget, crop bound, rotation, and minimum paddy constraints. If the LP solver is unavailable or infeasible, a greedy fallback ranks crops by profit-per-water efficiency and suitability to produce a practical backup plan. The ML accuracy is moderate because agriculture prices are volatile and the data is mainly market-price data, so we use ML outputs as decision signals and combine them with Fuzzy-TOPSIS and optimization constraints."

