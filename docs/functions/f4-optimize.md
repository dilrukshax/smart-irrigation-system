# F4 Optimize Function - Functional Flow and Use Cases

## Scope
This document defines the Optimize Service (F4) flow for:
- Farmer crop recommendation and re-planning actions
- Admin optimization, scenario planning, and supply monitoring actions
- End-to-end optimization pipeline behavior with upstream dependencies

## Core Functions and Endpoints
| Area | Main Function/Endpoint | Purpose |
|---|---|---|
| Field recommendation | `POST /f4/recommendations` | Generate crop recommendations for one field |
| Batch recommendation | `POST /f4/recommendations/batch` | Generate recommendations for multiple fields |
| Latest recommendations | `GET /f4/recommendations` | List latest saved per-field recommendations |
| Cross-field optimize | `POST /f4/recommendations/optimize` | Optimize allocation with water/area constraints |
| Scenario evaluation | `POST /f4/recommendations/scenario-evaluate` | Run backend what-if optimization over selected fields |
| Mid-season Plan B | `POST /f4/planb` | Recompute recommendations with updated quota/prices |
| Adaptive what-if | `POST /f4/adaptive` | Parameter-driven recommendation and ranking analysis |
| National/regional supply | `GET /f4/supply` | Aggregate expected supply across fields |
| Water budget summary | `GET /f4/supply/water-budget` | Aggregate crop-wise water usage summary |

## Use Cases - Farmer
1. Login and request crop recommendations for a selected field and season.
2. Request recommendations for multiple fields in a single action.
3. Run Plan B when quota or market price changes mid-season.
4. Run adaptive what-if analysis by adjusting field/weather/water/market parameters.
5. View latest recommendations and track whether data is available.

## Use Cases - Admin
1. Refresh and monitor latest recommendation availability across fields.
2. Run cross-field optimization with water quota and risk constraints.
3. Run scenario evaluation for custom what-if planning across selected fields.
4. Review failures and unavailable contexts when strict live data blocks results.
5. Monitor national/regional supply and crop-level water budget outputs.

## Activity Diagram - Farmer Optimize Flow
```mermaid
flowchart TD
    A["Start"] --> B["Farmer logs in to platform"]
    B --> C["Select field_id and season"]
    C --> D{"Choose optimize action"}

    D -->|Recommend field| E["POST /f4/recommendations"]
    D -->|Batch recommendations| E2["POST /f4/recommendations/batch"]
    D -->|Plan B replan| P["POST /f4/planb"]
    D -->|Adaptive what-if| W["POST /f4/adaptive"]

    E --> F["FeatureBuilder collects DB + F1 + F2 + F3 context"]
    E2 --> F
    F --> G{"Context valid and models available?"}
    G -->|No| H["Return data_unavailable or source_unavailable"]
    H --> C
    G -->|Yes| I["Run suitability + yield + price inference"]
    I --> J["Build optimization inputs"]
    J --> K["Run optimizer with water and area constraints"]
    K --> L["Build top crop options and rationale"]
    L --> M["Persist recommendation and emit optimization event"]
    M --> N["Farmer views recommendations"]
    N --> C

    P --> P1["Apply updated quota and or updated prices"]
    P1 --> P2["Re-run recommendation pipeline with scenario"]
    P2 --> P3["Return adjusted plan"]
    P3 --> C

    W --> W1["Apply adjustable parameters and filters"]
    W1 --> W2["Evaluate and rank candidates"]
    W2 --> W3["Return adaptive recommendations"]
    W3 --> C
```

## Activity Diagram - Admin Optimize Flow
```mermaid
flowchart TD
    A["Start"] --> B["Admin logs in to platform"]
    B --> C["Select season and optional scheme_id"]
    C --> D{"Choose admin optimize action"}

    D -->|Refresh and view latest| E["GET /f4/recommendations?refresh=true"]
    D -->|Cross-field optimize| F["POST /f4/recommendations/optimize"]
    D -->|Scenario evaluate| G["POST /f4/recommendations/scenario-evaluate"]
    D -->|Monitor supply| H["GET /f4/supply and GET /f4/supply/water-budget"]

    E --> E1["Load latest per-field recommendations"]
    E1 --> Z{"Data available?"}

    F --> F1["Merge latest rows and apply minPaddyArea and maxRiskLevel"]
    F1 --> F2["Run constrained allocation optimizer"]
    F2 --> Z

    G --> G1["Generate per-field recommendations under scenario"]
    G1 --> G2["Aggregate rows and failures then optimize"]
    G2 --> Z

    H --> H1["Aggregate national or regional supply and water usage"]
    H1 --> Z

    Z -->|No| X["Return data_unavailable and missing source details"]
    X --> Y["Admin coordinates fixes on DB F1 F2 F3 or models"]
    Y --> C

    Z -->|Yes| R["Publish planning decision and monitor KPIs"]
    R --> C
```

## Use Case Diagram - Farmer and Admin
```mermaid
flowchart LR
    Farmer["Farmer"] --> U1(("Generate field recommendation"))
    Farmer --> U2(("Run Plan B replan"))
    Farmer --> U3(("Run adaptive what-if"))
    Farmer --> U4(("View field recommendations"))

    Admin["Admin"] --> U5(("Refresh recommendations"))
    Admin --> U6(("Optimize across fields"))
    Admin --> U7(("Evaluate scenario"))
    Admin --> U8(("View supply summary"))
    Admin --> U9(("View water budget"))

    U1 --> S["F4 recommendation pipeline"]
    U2 --> S
    U5 --> S
    U6 --> S2["F4 constrained optimizer"]
    U7 --> S2
    U8 --> S3["F4 supply aggregation"]
    U9 --> S3
```

## Main Function Connections
1. `routes_recommendations.py` handles recommendation generation, optimization, and scenario evaluation APIs.
2. `recommendation_service.py` orchestrates feature building, scoring, ML predictions, optimization, persistence, and event emit.
3. `feature_builder.py` integrates field DB data with F1 irrigation, F2 stress, and F3 forecasting contexts.
4. `optimizer.py` and `constraints.py` execute constrained allocation using greedy by default and optional LP path.
5. `planb_service.py` performs mid-season re-planning by forwarding scenario changes into the recommendation pipeline.
6. `supply_service.py` aggregates recommendation outputs for national/regional supply and water-budget reporting.

## Where to Modify Logic
- Recommendation API flow: `services/optimize_service/app/api/routes_recommendations.py`
- Core optimization pipeline: `services/optimize_service/app/services/recommendation_service.py`
- Upstream context integration: `services/optimize_service/app/features/feature_builder.py`
- Allocation logic and constraints: `services/optimize_service/app/optimization/optimizer.py`
- Constraint model and validation: `services/optimize_service/app/optimization/constraints.py`
- Plan B flow: `services/optimize_service/app/services/planb_service.py`
- Supply and water-budget aggregation: `services/optimize_service/app/services/supply_service.py`
