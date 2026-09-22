from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import mysql.connector
from pydantic import BaseModel
import os
import joblib
import pandas as pd
import uuid


# ============================================================
# PACKAI - FOOD PACKAGING AI
# ============================================================


# ------------------------------------------------------------
# Load ML model
# ------------------------------------------------------------

MODEL_PATH = os.path.join(
    os.path.dirname(__file__),
    "ml",
    "packaging_model.pkl"
)

FEATURES_PATH = os.path.join(
    os.path.dirname(__file__),
    "ml",
    "model_features.pkl"
)

ml_model = joblib.load(MODEL_PATH)
model_features = joblib.load(FEATURES_PATH)

print("========================================")
print("PackAI ML model loaded successfully")
print("========================================")


# ------------------------------------------------------------
# FastAPI application
# ------------------------------------------------------------

app = FastAPI(
    title="Food Packaging AI",
    version="1.0"
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# DATABASE CONNECTION
# ============================================================


def get_db_connection():

    return mysql.connector.connect(
        host="localhost",
        user="root",
        password=os.getenv("MYSQL_PASSWORD"),
        database="food_packaging_ai"
    )


# ============================================================
# HOME
# ============================================================


@app.get("/")
def home():

    return {
        "message": "Food Packaging AI Backend is running!"
    }


# ============================================================
# COMMODITIES
# ============================================================


@app.get("/commodities")
def get_commodities():

    connection = get_db_connection()

    cursor = connection.cursor(
        dictionary=True
    )

    cursor.execute(
        "SELECT * FROM commodities"
    )

    commodities = cursor.fetchall()

    cursor.close()
    connection.close()

    return commodities


# ============================================================
# REQUEST MODEL
# ============================================================


class AnalysisRequest(BaseModel):

    commodity_id: int
    freshness: str
    storage: str
    transport: str
    priority: str


# ============================================================
# ANALYZE PACKAGING REQUIREMENTS
# ============================================================


@app.post("/analyze")
def analyze_packaging(
    request: AnalysisRequest
):

    requirements = {

        "oxygen_protection": "Medium",

        "moisture_protection": "Medium",

        "gas_exchange": "Low",

        "mechanical_protection": "Medium",

        "shelf_life_demand": "Medium",

    }


    # --------------------------------------------------------
    # Freshness
    # --------------------------------------------------------

    if request.freshness == "2-3 days":

        requirements[
            "shelf_life_demand"
        ] = "Low"

    elif request.freshness == "1 week":

        requirements[
            "shelf_life_demand"
        ] = "Medium"

    elif request.freshness == "2 weeks":

        requirements[
            "shelf_life_demand"
        ] = "High"

    elif request.freshness in [
        "1 month",
        "more than 1 month"
    ]:

        requirements[
            "shelf_life_demand"
        ] = "Very High"


    # --------------------------------------------------------
    # Storage
    # --------------------------------------------------------

    if request.storage == "refrigerator":

        requirements[
            "oxygen_protection"
        ] = "Medium"

        requirements[
            "moisture_protection"
        ] = "High"

    elif request.storage == "freezer":

        requirements[
            "oxygen_protection"
        ] = "High"

        requirements[
            "moisture_protection"
        ] = "Very High"


    # --------------------------------------------------------
    # Transport
    # --------------------------------------------------------

    if request.transport == "short":

        requirements[
            "mechanical_protection"
        ] = "Low"

    elif request.transport == "normal":

        requirements[
            "mechanical_protection"
        ] = "Medium"

    elif request.transport == "long":

        requirements[
            "mechanical_protection"
        ] = "High"


    # --------------------------------------------------------
    # Priority
    # --------------------------------------------------------

    if request.priority == "shelf-life":

        requirements[
            "oxygen_protection"
        ] = "High"

        requirements[
            "moisture_protection"
        ] = "High"

    elif request.priority == "cost":

        requirements[
            "cost_focus"
        ] = "High"

    elif request.priority == "eco-friendly":

        requirements[
            "sustainability_focus"
        ] = "High"

    elif request.priority == "balanced":

        requirements[
            "balanced_focus"
        ] = "High"


    return {

        "commodity_id":
            request.commodity_id,

        "user_inputs": {

            "freshness":
                request.freshness,

            "storage":
                request.storage,

            "transport":
                request.transport,

            "priority":
                request.priority,

        },

        "packaging_requirements":
            requirements

    }


# ============================================================
# GET PACKAGING MATERIALS
# ============================================================


@app.get("/packaging-materials")
def get_packaging_materials():

    connection = get_db_connection()

    cursor = connection.cursor(
        dictionary=True
    )

    cursor.execute(
        "SELECT * FROM packaging_materials"
    )

    materials = cursor.fetchall()

    cursor.close()
    connection.close()

    return materials


# ============================================================
# RECOMMENDATION ENGINE
# ============================================================


@app.post("/recommendations")
def get_recommendations(
    request: AnalysisRequest
):

    # --------------------------------------------------------
    # Unique analysis ID
    # --------------------------------------------------------

    analysis_id = str(
        uuid.uuid4()
    )


    # --------------------------------------------------------
    # Database connection
    # --------------------------------------------------------

    connection = get_db_connection()

    cursor = connection.cursor(
        dictionary=True
    )


    # --------------------------------------------------------
    # Get selected commodity
    # --------------------------------------------------------

    cursor.execute(

        """
        SELECT *
        FROM commodities
        WHERE id = %s
        """,

        (request.commodity_id,)

    )

    commodity = cursor.fetchone()


    if not commodity:

        cursor.close()
        connection.close()

        return {
            "error": "Commodity not found"
        }


    # --------------------------------------------------------
    # Get ALL packaging materials
    # --------------------------------------------------------

    cursor.execute(
        "SELECT * FROM packaging_materials"
    )

    materials = cursor.fetchall()

    cursor.close()
    connection.close()


    # ========================================================
    # FOOD TYPE DETECTION
    # ========================================================

    category = str(
        commodity.get(
            "category",
            ""
        )
    ).lower()


    food_name = str(
        commodity.get(
            "name",
            ""
        )
    ).lower()


    # --------------------------------------------------------
    # Fresh produce
    # --------------------------------------------------------

    is_fresh_produce = (

        category in [
            "fresh fruit",
            "fresh vegetable"
        ]

        or

        "fresh fruit" in category

        or

        "fresh vegetable" in category

    )


    # --------------------------------------------------------
    # Meat / poultry / seafood
    # --------------------------------------------------------

    meat_keywords = [

        "meat",
        "animal meat",
        "poultry",
        "chicken",
        "fish",
        "seafood",
        "beef",
        "mutton",
        "pork",
        "lamb"

    ]


    is_meat = (

        any(
            keyword in category
            for keyword in meat_keywords
        )

        or

        any(
            keyword in food_name
            for keyword in meat_keywords
        )

    )


    # --------------------------------------------------------
    # Frozen meat
    # --------------------------------------------------------

    is_frozen_meat = (

        is_meat

        and

        request.storage == "freezer"

    )


    # ========================================================
    # REQUIRED PROTECTION LEVELS
    # ========================================================

    oxygen_required = "Medium"

    moisture_required = "Medium"

    mechanical_required = "Medium"


    # --------------------------------------------------------
    # Oxygen sensitivity
    # --------------------------------------------------------

    if commodity[
        "oxygen_sensitivity"
    ] == "High":

        oxygen_required = "High"

    elif commodity[
        "oxygen_sensitivity"
    ] == "Low":

        oxygen_required = "Low"


    # --------------------------------------------------------
    # Moisture sensitivity
    # --------------------------------------------------------

    if commodity[
        "moisture_sensitivity"
    ] == "High":

        moisture_required = "High"

    elif commodity[
        "moisture_sensitivity"
    ] == "Low":

        moisture_required = "Low"


    # --------------------------------------------------------
    # Freshness / shelf life
    # --------------------------------------------------------

    if request.freshness == "2-3 days":

        shelf_life_required = "Low"

    elif request.freshness == "1 week":

        shelf_life_required = "Medium"

    elif request.freshness == "2 weeks":

        shelf_life_required = "High"

    else:

        shelf_life_required = "Very High"


    # --------------------------------------------------------
    # Transport
    # --------------------------------------------------------

    if request.transport == "short":

        mechanical_required = "Low"

    elif request.transport == "normal":

        mechanical_required = "Medium"

    else:

        mechanical_required = "High"


    # ========================================================
    # LEVEL SCORE
    # ========================================================

    level_score = {

        "Low": 1,

        "Medium": 2,

        "High": 3,

        "Very High": 4

    }


    def protection_match(
        material_level,
        required_level
    ):

        material_value = level_score.get(
            material_level,
            2
        )

        required_value = level_score.get(
            required_level,
            2
        )

        difference = abs(
            material_value -
            required_value
        )


        if difference == 0:

            return 100

        elif difference == 1:

            return 75

        elif difference == 2:

            return 45

        else:

            return 20


    # ========================================================
    # ML VALUE MAPPINGS
    # ========================================================

    storage_for_ml = {

        "room":
            "Room / normal conditions",

        "refrigerator":
            "Refrigerator",

        "freezer":
            "Freezer"

    }.get(

        request.storage,

        request.storage

    )


    transport_for_ml = {

        "short":
            "Short/local transport",

        "normal":
            "Normal transport",

        "long":
            "Long-distance transport"

    }.get(

        request.transport,

        request.transport

    )


    # ========================================================
    # EVALUATE ALL MATERIALS
    # ========================================================

    results = []


    for material in materials:

        material_name = str(
            material[
                "material_name"
            ]
        )


        material_name_lower = (
            material_name.lower()
        )


        # ====================================================
        # MACHINE LEARNING PREDICTION
        # ====================================================

        ml_input = pd.DataFrame([{

            "moisture_level":
                commodity[
                    "moisture_level"
                ],

            "fat_level":
                commodity[
                    "fat_level"
                ],

            "oxygen_sensitivity":
                commodity[
                    "oxygen_sensitivity"
                ],

            "moisture_sensitivity":
                commodity[
                    "moisture_sensitivity"
                ],

            "respiration_level":
                commodity[
                    "respiration_level"
                ],

            "storage":
                storage_for_ml,

            "freshness":
                request.freshness,

            "transport":
                transport_for_ml,

            "material":
                material_name

        }])


        ml_input = pd.get_dummies(
            ml_input
        )


        ml_input = ml_input.reindex(

            columns=model_features,

            fill_value=0

        )


        ml_score = float(

            ml_model.predict(
                ml_input
            )[0]

        )


        ml_score = max(
            0,
            min(
                100,
                ml_score
            )
        )


        # ====================================================
        # 1. OXYGEN PROTECTION
        # ====================================================

        oxygen_score = protection_match(

            material.get(
                "oxygen_barrier"
            ),

            oxygen_required

        )


        # ====================================================
        # 2. MOISTURE PROTECTION
        # ====================================================

        moisture_score = protection_match(

            material.get(
                "moisture_barrier"
            ),

            moisture_required

        )


        # ====================================================
        # 3. GAS / RESPIRATION
        # ====================================================

        gas_score = 50


        if is_fresh_produce:

            fresh_level = material.get(
                "fresh_produce_suitability"
            )


            if fresh_level == "Very High":

                gas_score = 100

            elif fresh_level == "High":

                gas_score = 90

            elif fresh_level == "Medium":

                gas_score = 65

            elif fresh_level == "Low":

                gas_score = 30

            else:

                gas_score = 50


        elif is_frozen_meat:

            # Frozen meat does not require
            # deliberate high gas exchange.

            if (
                "micro-perforated"
                in material_name_lower

                or

                "breathable"
                in material_name_lower
            ):

                gas_score = 15

            else:

                gas_permeability = material.get(
                    "gas_permeability"
                )


                if gas_permeability == "Low":

                    gas_score = 100

                elif gas_permeability == "Low-Medium":

                    gas_score = 90

                elif gas_permeability == "Medium":

                    gas_score = 75

                elif gas_permeability == "High":

                    gas_score = 50

                elif gas_permeability == "Very High":

                    gas_score = 30

                else:

                    gas_score = 70


        else:

            if material.get(
                "gas_permeability"
            ) == "Low":

                gas_score = 90

            elif material.get(
                "gas_permeability"
            ) == "Low-Medium":

                gas_score = 85

            elif material.get(
                "gas_permeability"
            ) == "Medium":

                gas_score = 70

            elif material.get(
                "gas_permeability"
            ) == "High":

                gas_score = 50

            else:

                gas_score = 60


        # ====================================================
        # 4. MECHANICAL PROTECTION
        # ====================================================

        mechanical_score = protection_match(

            material.get(
                "mechanical_strength"
            ),

            mechanical_required

        )


        # ====================================================
        # 5. SHELF-LIFE SUITABILITY
        # ====================================================

        shelf_score = 50


        long_storage = material.get(
            "long_storage_suitability"
        )


        if shelf_life_required in [
            "High",
            "Very High"
        ]:

            if long_storage == "Very High":

                shelf_score = 100

            elif long_storage == "High":

                shelf_score = 95

            elif long_storage == "Medium":

                shelf_score = 70

            else:

                shelf_score = 40

        else:

            if long_storage == "Very High":

                shelf_score = 100

            elif long_storage == "High":

                shelf_score = 80

            elif long_storage == "Medium":

                shelf_score = 70

            else:

                shelf_score = 50


        # ====================================================
        # 6. STORAGE SUITABILITY
        # ====================================================

        storage_score = 70


        flexibility = material.get(
            "flexibility"
        )

        mechanical_strength = material.get(
            "mechanical_strength"
        )


        if request.storage == "refrigerator":

            fresh_suitability = material.get(
                "fresh_produce_suitability"
            )


            if fresh_suitability in [
                "High",
                "Very High"
            ]:

                storage_score = 100

            elif fresh_suitability == "Medium":

                storage_score = 75


        elif request.storage == "freezer":

            if is_frozen_meat:

                # Flexible high-strength materials
                # are strongly preferred for frozen meat.

                if (
                    flexibility in [
                        "High",
                        "Very High"
                    ]

                    and

                    mechanical_strength in [
                        "High",
                        "Very High"
                    ]
                ):

                    storage_score = 100

                elif (
                    flexibility in [
                        "High",
                        "Very High"
                    ]

                    or

                    mechanical_strength in [
                        "High",
                        "Very High"
                    ]
                ):

                    storage_score = 90

                elif mechanical_strength == "Medium":

                    storage_score = 70

                else:

                    storage_score = 45

            else:

                if mechanical_strength in [
                    "Very High",
                    "High"
                ]:

                    storage_score = 100

                elif mechanical_strength == "Medium":

                    storage_score = 75

                else:

                    storage_score = 50


        # ====================================================
        # 7. SEALABILITY
        # ====================================================

        sealability_score = {

            "Very High": 100,

            "Excellent": 100,

            "High": 95,

            "Good": 85,

            "Medium": 70,

            "Low": 40

        }.get(

            material.get(
                "sealability"
            ),

            60

        )


        # ====================================================
        # 8. COST
        # ====================================================

        cost_score = 70


        if request.priority == "cost":

            cost_level = material.get(
                "cost_level"
            )


            if cost_level == "Low":

                cost_score = 100

            elif cost_level in [
                "Low-Medium",
                "Medium"
            ]:

                cost_score = 75

            elif cost_level == "High":

                cost_score = 40

            else:

                cost_score = 60


        # ====================================================
        # 9. SUSTAINABILITY
        # ====================================================

        sustainability_score = 70


        if request.priority == "eco-friendly":

            recyclability = material.get(
                "recyclability"
            )


            if recyclability in [
                "High",
                "Very High",
                "Yes"
            ]:

                sustainability_score = 100

            elif recyclability == "Medium":

                sustainability_score = 70

            else:

                sustainability_score = 40


        # ====================================================
        # 10. FRESH PRODUCE SUITABILITY
        # ====================================================

        fresh_produce_score = 70


        if is_fresh_produce:

            fresh_level = material.get(
                "fresh_produce_suitability"
            )


            if fresh_level == "Very High":

                fresh_produce_score = 100

            elif fresh_level == "High":

                fresh_produce_score = 90

            elif fresh_level == "Medium":

                fresh_produce_score = 65

            elif fresh_level == "Low":

                fresh_produce_score = 30

            else:

                fresh_produce_score = 50


        # ====================================================
        # 11. FROZEN MEAT SUITABILITY
        # ====================================================

        frozen_meat_score = 70


        if is_frozen_meat:

            # ------------------------------------------------
            # Highest suitability
            # ------------------------------------------------

            if material_name_lower == "pa/pe laminate":

                frozen_meat_score = 100


            elif material_name_lower == "pet/pe laminate":

                frozen_meat_score = 98


            elif material_name_lower == "pet/evoh/pe multilayer":

                frozen_meat_score = 96


            elif material_name_lower == "evoh multilayer":

                frozen_meat_score = 94


            elif material_name_lower == "metallized pet laminate":

                frozen_meat_score = 91


            elif material_name_lower == "aluminium foil laminate":

                frozen_meat_score = 89


            elif material_name_lower == "ldpe film":

                frozen_meat_score = 78


            elif material_name_lower == "hdpe film":

                frozen_meat_score = 76


            elif material_name_lower == "pp / bopp film":

                frozen_meat_score = 73


            elif material_name_lower == "pet film":

                frozen_meat_score = 70


            # ------------------------------------------------
            # Breathable formats are not appropriate for
            # frozen meat's long-term barrier requirement.
            # ------------------------------------------------

            elif (
                "micro-perforated"
                in material_name_lower

                or

                "breathable"
                in material_name_lower
            ):

                frozen_meat_score = 15


            # ------------------------------------------------
            # Rigid containers
            # ------------------------------------------------

            elif "glass" in material_name_lower:

                frozen_meat_score = 55


            elif (
                "aluminium can"
                in material_name_lower

                or

                "tinplate"
                in material_name_lower
            ):

                frozen_meat_score = 60


            elif "rigid container" in material_name_lower:

                frozen_meat_score = 50


            else:

                frozen_meat_score = 55


        # ====================================================
        # 12. FRESH PRODUCE PACKAGE FORMAT
        # ====================================================

        fresh_format_score = 70


        if is_fresh_produce:

            if "micro-perforated" in material_name_lower:

                fresh_format_score = 100

            elif "breathable" in material_name_lower:

                fresh_format_score = 98

            elif "wooden crate" in material_name_lower:

                fresh_format_score = 88

            elif "corrugated" in material_name_lower:

                fresh_format_score = 82

            elif "ldpe film" in material_name_lower:

                fresh_format_score = 75

            elif "hdpe film" in material_name_lower:

                fresh_format_score = 72

            elif "pla" in material_name_lower:

                fresh_format_score = 70

            else:

                fresh_format_score = 55


        # ====================================================
        # RULE SCORE
        # ====================================================

        if is_fresh_produce:

            # ------------------------------------------------
            # FRESH PRODUCE
            #
            # Oxygen                  16%
            # Moisture                16%
            # Gas                     12%
            # Mechanical               8%
            # Shelf life               8%
            # Storage                  5%
            # Sealability              5%
            # Cost                     5%
            # Sustainability          5%
            # Fresh suitability       10%
            # Fresh format            10%
            #
            # TOTAL                  100%
            # ------------------------------------------------

            rule_score = (

                oxygen_score * 0.16 +

                moisture_score * 0.16 +

                gas_score * 0.12 +

                mechanical_score * 0.08 +

                shelf_score * 0.08 +

                storage_score * 0.05 +

                sealability_score * 0.05 +

                cost_score * 0.05 +

                sustainability_score * 0.05 +

                fresh_produce_score * 0.10 +

                fresh_format_score * 0.10

            )


        elif is_frozen_meat:

            # ------------------------------------------------
            # FROZEN MEAT
            #
            # Oxygen                  16%
            # Moisture                16%
            # Gas                      6%
            # Mechanical              12%
            # Shelf life              12%
            # Storage                 10%
            # Sealability              8%
            # Cost                     4%
            # Sustainability          4%
            # Frozen format           12%
            #
            # TOTAL                  100%
            # ------------------------------------------------

            rule_score = (

                oxygen_score * 0.16 +

                moisture_score * 0.16 +

                gas_score * 0.06 +

                mechanical_score * 0.12 +

                shelf_score * 0.12 +

                storage_score * 0.10 +

                sealability_score * 0.08 +

                cost_score * 0.04 +

                sustainability_score * 0.04 +

                frozen_meat_score * 0.12

            )


        else:

            # ------------------------------------------------
            # NORMAL FOOD
            # ------------------------------------------------

            rule_score = (

                oxygen_score * 0.210526 +

                moisture_score * 0.210526 +

                gas_score * 0.157895 +

                mechanical_score * 0.105263 +

                shelf_score * 0.105263 +

                storage_score * 0.052632 +

                sealability_score * 0.052632 +

                cost_score * 0.052632 +

                sustainability_score * 0.052632

            )


        # ====================================================
        # HYBRID AI SCORE
        # ====================================================

        if is_fresh_produce:

            final_score = (

                rule_score * 0.75 +

                ml_score * 0.25

            )

            ranking_method = (
                "75% domain compatibility "
                "+ 25% Random Forest ML"
            )


        elif is_frozen_meat:

            final_score = (

                rule_score * 0.80 +

                ml_score * 0.20

            )

            ranking_method = (
                "80% frozen-meat compatibility "
                "+ 20% Random Forest ML"
            )


        else:

            final_score = (

                rule_score * 0.60 +

                ml_score * 0.40

            )

            ranking_method = (
                "60% rule-based compatibility "
                "+ 40% Random Forest ML"
            )


        # ====================================================
        # SPECIAL DOMAIN SAFETY / FORMAT CONSTRAINTS
        # ====================================================

        if is_fresh_produce:

            # Fresh produce must not be pushed down by
            # the small prototype ML dataset.

            if "micro-perforated" in material_name_lower:

                final_score = max(
                    final_score,
                    88.0
                )

            elif "breathable" in material_name_lower:

                final_score = max(
                    final_score,
                    86.0
                )


        # ----------------------------------------------------
        # Frozen meat:
        # breathable packaging cannot outrank appropriate
        # sealed high-barrier frozen-meat packaging.
        # ----------------------------------------------------

        if is_frozen_meat:

            if (
                "micro-perforated"
                in material_name_lower

                or

                "breathable"
                in material_name_lower
            ):

                final_score = min(
                    final_score,
                    45.0
                )


            # ------------------------------------------------
            # Long frozen storage + long transport:
            # prevent unsuitable rigid containers from
            # overtaking the best flexible high-barrier
            # frozen-meat formats.
            # ------------------------------------------------

            if (
                request.freshness
                in [
                    "1 month",
                    "more than 1 month"
                ]

                and

                request.transport == "long"
            ):

                if material_name_lower == "pa/pe laminate":

                    final_score = max(
                        final_score,
                        88.0
                    )

                elif material_name_lower == "pet/pe laminate":

                    final_score = max(
                        final_score,
                        86.0
                    )

                elif material_name_lower == "pet/evoh/pe multilayer":

                    final_score = max(
                        final_score,
                        84.0
                    )

                elif material_name_lower == "evoh multilayer":

                    final_score = max(
                        final_score,
                        82.0
                    )

                elif material_name_lower == "metallized pet laminate":

                    final_score = max(
                        final_score,
                        80.0
                    )

                elif material_name_lower == "aluminium foil laminate":

                    final_score = max(
                        final_score,
                        78.0
                    )


        # ====================================================
        # LIMIT FINAL SCORE
        # ====================================================

        final_score = max(
            0,
            min(
                100,
                final_score
            )
        )


        # ====================================================
        # EXPLANATION
        # ====================================================

        reason_parts = []


        # Oxygen
        if oxygen_score >= 90:

            reason_parts.append(
                "excellent oxygen protection"
            )

        elif oxygen_score >= 70:

            reason_parts.append(
                "good oxygen protection"
            )

        else:

            reason_parts.append(
                "limited oxygen protection"
            )


        # Moisture
        if moisture_score >= 90:

            reason_parts.append(
                "excellent moisture protection"
            )

        elif moisture_score >= 70:

            reason_parts.append(
                "good moisture protection"
            )

        else:

            reason_parts.append(
                "limited moisture protection"
            )


        # Gas
        if gas_score >= 90:

            reason_parts.append(
                "excellent gas/respiration suitability"
            )

        elif gas_score >= 70:

            reason_parts.append(
                "good gas/respiration suitability"
            )


        # Fresh produce
        if is_fresh_produce:

            if fresh_produce_score >= 90:

                reason_parts.append(
                    "excellent fresh-produce suitability"
                )

            elif fresh_produce_score >= 70:

                reason_parts.append(
                    "good fresh-produce suitability"
                )


            if fresh_format_score >= 90:

                reason_parts.append(
                    "suitable breathable packaging format"
                )


        # Frozen meat
        if is_frozen_meat:

            if frozen_meat_score >= 95:

                reason_parts.append(
                    "excellent frozen-meat package format"
                )

            elif frozen_meat_score >= 85:

                reason_parts.append(
                    "strong frozen-meat package suitability"
                )

            elif frozen_meat_score >= 70:

                reason_parts.append(
                    "good frozen-meat package suitability"
                )


            if (
                "micro-perforated"
                in material_name_lower

                or

                "breathable"
                in material_name_lower
            ):

                reason_parts.append(
                    "breathable format is not preferred for frozen meat"
                )


        # Mechanical
        if mechanical_score >= 90:

            reason_parts.append(
                "strong mechanical protection"
            )

        elif mechanical_score >= 70:

            reason_parts.append(
                "good mechanical protection"
            )


        # Shelf life
        if shelf_score >= 90:

            reason_parts.append(
                "strong shelf-life suitability"
            )

        elif shelf_score >= 70:

            reason_parts.append(
                "good shelf-life suitability"
            )


        if not reason_parts:

            reason_parts.append(
                "balanced packaging characteristics"
            )


        reason = (

            material_name

            + " is recommended because it offers "

            + ", ".join(
                reason_parts[:4]
            )

            + "."

        )


        # ====================================================
        # ADD RESULT
        # ====================================================

        results.append({

            "material_id":
                material[
                    "id"
                ],

            "material_name":
                material_name,

            "material_type":
                material[
                    "material_type"
                ],

            "rule_score":
                round(
                    rule_score,
                    2
                ),

            "ml_score":
                round(
                    ml_score,
                    2
                ),

            "score":
                round(
                    final_score,
                    2
                ),

            "reason":
                reason

        })


    # ========================================================
    # SORT BEST → WORST
    # ========================================================

    results.sort(

        key=lambda item:
            item["score"],

        reverse=True

    )


    # ========================================================
    # ASSIGN RANKS
    # ========================================================

    for index, item in enumerate(
        results,
        start=1
    ):

        item["rank"] = index


    # ========================================================
    # SAVE HISTORY
    # ========================================================

    connection = get_db_connection()

    cursor = connection.cursor()


    for item in results:

        cursor.execute(

            """
            INSERT INTO recommendations
            (
                analysis_id,
                commodity_id,
                packaging_id,
                compatibility_score,
                rank_position,
                reason,
                freshness,
                storage,
                transport,
                priority
            )
            VALUES
            (
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s
            )
            """,

            (

                analysis_id,

                request.commodity_id,

                item[
                    "material_id"
                ],

                item[
                    "score"
                ],

                item[
                    "rank"
                ],

                item[
                    "reason"
                ],

                request.freshness,

                request.storage,

                request.transport,

                request.priority

            )

        )


    connection.commit()

    cursor.close()
    connection.close()


    # ========================================================
    # FINAL RESPONSE
    # ========================================================

    return {

        "analysis_id":
            analysis_id,

        "commodity":
            commodity[
                "name"
            ],

        "total_materials_evaluated":
            len(results),

        "ranking_method":
            ranking_method,

        "recommendations":
            results

    }


# ============================================================
# HISTORY
# ============================================================


@app.get("/history")
def get_history():

    connection = get_db_connection()

    cursor = connection.cursor(
        dictionary=True
    )


    cursor.execute(

        """
        SELECT
            r.id,
            r.analysis_id,
            r.commodity_id,
            c.name AS commodity,
            r.freshness,
            r.storage,
            r.transport,
            r.priority,
            r.packaging_id,
            p.material_name,
            p.material_type,
            r.compatibility_score,
            r.rank_position,
            r.reason,
            r.created_at

        FROM recommendations r

        JOIN commodities c
            ON r.commodity_id = c.id

        JOIN packaging_materials p
            ON r.packaging_id = p.id

        ORDER BY
            r.created_at DESC,
            r.rank_position ASC
        """

    )


    rows = cursor.fetchall()

    cursor.close()
    connection.close()


    # ========================================================
    # GROUP BY ANALYSIS ID
    # ========================================================

    grouped = {}


    for row in rows:

        analysis_key = row[
            "analysis_id"
        ]


        if analysis_key not in grouped:

            grouped[
                analysis_key
            ] = {

                "analysis_id":
                    row[
                        "analysis_id"
                    ],

                "commodity":
                    row[
                        "commodity"
                    ],

                "freshness":
                    row[
                        "freshness"
                    ],

                "storage":
                    row[
                        "storage"
                    ],

                "transport":
                    row[
                        "transport"
                    ],

                "priority":
                    row[
                        "priority"
                    ],

                "created_at":
                    row[
                        "created_at"
                    ],

                "total_materials_evaluated":
                    0,

                "rankings":
                    []

            }


        grouped[
            analysis_key
        ][
            "rankings"
        ].append({

            "material_id":
                row[
                    "packaging_id"
                ],

            "material_name":
                row[
                    "material_name"
                ],

            "material_type":
                row[
                    "material_type"
                ],

            "score":
                float(
                    row[
                        "compatibility_score"
                    ]
                )
                if row[
                    "compatibility_score"
                ] is not None
                else 0,

            "rank":
                row[
                    "rank_position"
                ],

            "reason":
                row[
                    "reason"
                ]

        })


    # ========================================================
    # CONVERT TO LIST
    # ========================================================

    history = list(
        grouped.values()
    )


    # ========================================================
    # SORT EACH ANALYSIS
    # ========================================================

    for analysis in history:

        analysis[
            "total_materials_evaluated"
        ] = len(
            analysis[
                "rankings"
            ]
        )


        analysis[
            "rankings"
        ].sort(

            key=lambda x:
                x[
                    "rank"
                ]

        )


    # ========================================================
    # LATEST ANALYSES FIRST
    # ========================================================

    history.sort(

        key=lambda x:
            x[
                "created_at"
            ],

        reverse=True

    )


    # ========================================================
    # KEEP LATEST 20
    # ========================================================

    history = history[:20]


    return {

        "history":
            history

    }