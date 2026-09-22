import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, r2_score
import joblib
import os


# =========================================================
# PACKAI ML MODEL TRAINING
# AI-Based Intelligent Food Packaging Material
# Recommendation System
# =========================================================


# =========================================================
# MATERIAL SUITABILITY PROFILES
# =========================================================
#
# These are prototype expert-labelled suitability profiles.
# They are used to create a broader training dataset.
#
# Scale:
# 1   = Poor
# 2   = Fair
# 3   = Good
# 4   = Very Good
# 5   = Excellent
#
# =========================================================

material_profiles = {

    "LDPE Film": {
        "dry": 4,
        "fresh": 3,
        "fat": 3,
        "liquid": 2,
        "frozen": 4
    },

    "HDPE Film": {
        "dry": 4,
        "fresh": 3,
        "fat": 3,
        "liquid": 3,
        "frozen": 4
    },

    "PP / BOPP Film": {
        "dry": 4,
        "fresh": 3,
        "fat": 4,
        "liquid": 2,
        "frozen": 4
    },

    "PET Film": {
        "dry": 5,
        "fresh": 3,
        "fat": 4,
        "liquid": 2,
        "frozen": 4
    },

    "PET/PE Laminate": {
        "dry": 5,
        "fresh": 3,
        "fat": 5,
        "liquid": 4,
        "frozen": 5
    },

    "PA/PE Laminate": {
        "dry": 4,
        "fresh": 3,
        "fat": 5,
        "liquid": 4,
        "frozen": 5
    },

    "EVOH Multilayer": {
        "dry": 5,
        "fresh": 2,
        "fat": 5,
        "liquid": 4,
        "frozen": 5
    },

    "PET/EVOH/PE Multilayer": {
        "dry": 5,
        "fresh": 2,
        "fat": 5,
        "liquid": 5,
        "frozen": 5
    },

    "Metallized PET Laminate": {
        "dry": 5,
        "fresh": 1,
        "fat": 5,
        "liquid": 3,
        "frozen": 4
    },

    "Aluminium Foil Laminate": {
        "dry": 5,
        "fresh": 1,
        "fat": 5,
        "liquid": 4,
        "frozen": 5
    },

    "Micro-perforated Film": {
        "dry": 1,
        "fresh": 5,
        "fat": 1,
        "liquid": 1,
        "frozen": 1
    },

    "Breathable Film": {
        "dry": 1,
        "fresh": 5,
        "fat": 1,
        "liquid": 1,
        "frozen": 1
    },

    "PLA / Biodegradable Film": {
        "dry": 3,
        "fresh": 4,
        "fat": 3,
        "liquid": 2,
        "frozen": 2
    },

    "Paper Bag": {
        "dry": 3,
        "fresh": 2,
        "fat": 1,
        "liquid": 1,
        "frozen": 1
    },

    "Kraft Paper Bag": {
        "dry": 3,
        "fresh": 2,
        "fat": 1,
        "liquid": 1,
        "frozen": 1
    },

    "Paper/PE Laminated Bag": {
        "dry": 5,
        "fresh": 2,
        "fat": 4,
        "liquid": 2,
        "frozen": 3
    },

    "Corrugated Cardboard Box": {
        "dry": 3,
        "fresh": 4,
        "fat": 1,
        "liquid": 1,
        "frozen": 4
    },

    "Paperboard/Folding Carton": {
        "dry": 4,
        "fresh": 2,
        "fat": 2,
        "liquid": 1,
        "frozen": 2
    },

    "Bagasse/Fibre Container": {
        "dry": 2,
        "fresh": 3,
        "fat": 2,
        "liquid": 2,
        "frozen": 2
    },

    "HDPE Rigid Container": {
        "dry": 4,
        "fresh": 3,
        "fat": 4,
        "liquid": 5,
        "frozen": 4
    },

    "PP Rigid Container": {
        "dry": 4,
        "fresh": 3,
        "fat": 4,
        "liquid": 5,
        "frozen": 5
    },

    "PET Bottle/Container": {
        "dry": 4,
        "fresh": 2,
        "fat": 4,
        "liquid": 5,
        "frozen": 2
    },

    "Glass Bottle": {
        "dry": 3,
        "fresh": 2,
        "fat": 5,
        "liquid": 5,
        "frozen": 1
    },

    "Glass Jar": {
        "dry": 4,
        "fresh": 2,
        "fat": 5,
        "liquid": 5,
        "frozen": 1
    },

    "Aluminium Can/Container": {
        "dry": 5,
        "fresh": 1,
        "fat": 5,
        "liquid": 5,
        "frozen": 1
    },

    "Tinplate Steel Can": {
        "dry": 5,
        "fresh": 1,
        "fat": 5,
        "liquid": 5,
        "frozen": 1
    },

    "Aluminium Tray": {
        "dry": 3,
        "fresh": 3,
        "fat": 4,
        "liquid": 2,
        "frozen": 4
    },

    "Wooden Crate": {
        "dry": 2,
        "fresh": 5,
        "fat": 1,
        "liquid": 1,
        "frozen": 3
    }
}


# =========================================================
# SCENARIO DEFINITIONS
# =========================================================
#
# These represent different food categories and storage
# requirements that the system may encounter.
#
# =========================================================

scenarios = [

    # -----------------------------------------------------
    # Fresh produce
    # -----------------------------------------------------

    {
        "moisture": "High",
        "fat": "Low",
        "oxygen": "Medium",
        "moisture_sens": "High",
        "respiration": "High",
        "storage": "Refrigerator",
        "freshness": "1 week",
        "transport": "Normal transport",
        "type": "fresh"
    },

    {
        "moisture": "High",
        "fat": "Low",
        "oxygen": "Medium",
        "moisture_sens": "High",
        "respiration": "High",
        "storage": "Refrigerator",
        "freshness": "2 weeks",
        "transport": "Long-distance transport",
        "type": "fresh"
    },

    {
        "moisture": "High",
        "fat": "Low",
        "oxygen": "Low",
        "moisture_sens": "Medium",
        "respiration": "Very High",
        "storage": "Refrigerator",
        "freshness": "1 week",
        "transport": "Short/local transport",
        "type": "fresh"
    },

    {
        "moisture": "High",
        "fat": "Low",
        "oxygen": "Medium",
        "moisture_sens": "High",
        "respiration": "High",
        "storage": "Refrigerator",
        "freshness": "2 weeks",
        "transport": "Normal transport",
        "type": "fresh"
    },

    {
        "moisture": "High",
        "fat": "Low",
        "oxygen": "Low",
        "moisture_sens": "Medium",
        "respiration": "Medium",
        "storage": "Room / normal conditions",
        "freshness": "2-3 days",
        "transport": "Short/local transport",
        "type": "fresh"
    },


    # -----------------------------------------------------
    # Dry foods
    # -----------------------------------------------------

    {
        "moisture": "Low",
        "fat": "Low",
        "oxygen": "Low",
        "moisture_sens": "High",
        "respiration": "Low",
        "storage": "Room / normal conditions",
        "freshness": "1 month",
        "transport": "Long-distance transport",
        "type": "dry"
    },

    {
        "moisture": "Low",
        "fat": "Low",
        "oxygen": "Medium",
        "moisture_sens": "High",
        "respiration": "Low",
        "storage": "Room / normal conditions",
        "freshness": "more than 1 month",
        "transport": "Long-distance transport",
        "type": "dry"
    },

    {
        "moisture": "Low",
        "fat": "Medium",
        "oxygen": "Medium",
        "moisture_sens": "High",
        "respiration": "Low",
        "storage": "Room / normal conditions",
        "freshness": "1 month",
        "transport": "Normal transport",
        "type": "dry"
    },

    {
        "moisture": "Low",
        "fat": "High",
        "oxygen": "High",
        "moisture_sens": "High",
        "respiration": "Low",
        "storage": "Room / normal conditions",
        "freshness": "1 month",
        "transport": "Long-distance transport",
        "type": "fat"
    },

    {
        "moisture": "Low",
        "fat": "High",
        "oxygen": "High",
        "moisture_sens": "High",
        "respiration": "Low",
        "storage": "Room / normal conditions",
        "freshness": "more than 1 month",
        "transport": "Long-distance transport",
        "type": "fat"
    },


    # -----------------------------------------------------
    # Liquid foods
    # -----------------------------------------------------

    {
        "moisture": "High",
        "fat": "Low",
        "oxygen": "Medium",
        "moisture_sens": "Low",
        "respiration": "Low",
        "storage": "Refrigerator",
        "freshness": "1 week",
        "transport": "Normal transport",
        "type": "liquid"
    },

    {
        "moisture": "High",
        "fat": "Medium",
        "oxygen": "Medium",
        "moisture_sens": "Low",
        "respiration": "Low",
        "storage": "Refrigerator",
        "freshness": "2 weeks",
        "transport": "Long-distance transport",
        "type": "liquid"
    },

    {
        "moisture": "High",
        "fat": "High",
        "oxygen": "High",
        "moisture_sens": "Low",
        "respiration": "Low",
        "storage": "Room / normal conditions",
        "freshness": "1 month",
        "transport": "Long-distance transport",
        "type": "liquid"
    },


    # -----------------------------------------------------
    # Frozen foods
    # -----------------------------------------------------

    {
        "moisture": "High",
        "fat": "Medium",
        "oxygen": "High",
        "moisture_sens": "High",
        "respiration": "Low",
        "storage": "Freezer",
        "freshness": "1 month",
        "transport": "Long-distance transport",
        "type": "frozen"
    },

    {
        "moisture": "Medium",
        "fat": "High",
        "oxygen": "High",
        "moisture_sens": "High",
        "respiration": "Low",
        "storage": "Freezer",
        "freshness": "more than 1 month",
        "transport": "Long-distance transport",
        "type": "frozen"
    },


    # -----------------------------------------------------
    # Short storage foods
    # -----------------------------------------------------

    {
        "moisture": "Medium",
        "fat": "Low",
        "oxygen": "Low",
        "moisture_sens": "Low",
        "respiration": "Low",
        "storage": "Room / normal conditions",
        "freshness": "1 week",
        "transport": "Short/local transport",
        "type": "dry"
    },

    {
        "moisture": "Medium",
        "fat": "Low",
        "oxygen": "Medium",
        "moisture_sens": "Medium",
        "respiration": "Low",
        "storage": "Room / normal conditions",
        "freshness": "2 weeks",
        "transport": "Normal transport",
        "type": "dry"
    }
]


# =========================================================
# MATERIAL SCORE ADJUSTMENTS
# =========================================================

def calculate_score(profile, scenario):

    food_type = scenario["type"]

    base = profile[food_type]


    # Convert 1-5 profile to 0-100
    score = base * 18


    # -----------------------------------------------------
    # Fresh produce
    # -----------------------------------------------------

    if food_type == "fresh":

        if scenario["respiration"] == "Very High":

            if base >= 4:
                score += 12
            else:
                score -= 8

        elif scenario["respiration"] == "High":

            if base >= 4:
                score += 8
            else:
                score -= 5


    # -----------------------------------------------------
    # High oxygen sensitivity
    # -----------------------------------------------------

    if scenario["oxygen"] == "High":

        if base >= 4:
            score += 8
        elif base <= 2:
            score -= 8


    # -----------------------------------------------------
    # High moisture sensitivity
    # -----------------------------------------------------

    if scenario["moisture_sens"] == "High":

        if base >= 4:
            score += 7
        elif base <= 2:
            score -= 7


    # -----------------------------------------------------
    # Long storage
    # -----------------------------------------------------

    if scenario["freshness"] in [
        "1 month",
        "more than 1 month"
    ]:

        if base >= 4:
            score += 6
        elif base <= 2:
            score -= 6


    # -----------------------------------------------------
    # Long-distance transport
    # -----------------------------------------------------

    if scenario["transport"] == "Long-distance transport":

        if base >= 4:
            score += 5


    # -----------------------------------------------------
    # Freezer
    # -----------------------------------------------------

    if scenario["storage"] == "Freezer":

        if base >= 4:
            score += 5
        elif base <= 2:
            score -= 5


    # -----------------------------------------------------
    # Clamp score
    # -----------------------------------------------------

    return max(
        20,
        min(
            100,
            score
        )
    )


# =========================================================
# BUILD TRAINING DATASET
# =========================================================

data = []


for scenario in scenarios:

    for material, profile in material_profiles.items():

        suitability_score = calculate_score(
            profile,
            scenario
        )


        data.append([

            scenario["moisture"],

            scenario["fat"],

            scenario["oxygen"],

            scenario["moisture_sens"],

            scenario["respiration"],

            scenario["storage"],

            scenario["freshness"],

            scenario["transport"],

            material,

            suitability_score

        ])


# =========================================================
# DATAFRAME
# =========================================================

columns = [

    "moisture_level",

    "fat_level",

    "oxygen_sensitivity",

    "moisture_sensitivity",

    "respiration_level",

    "storage",

    "freshness",

    "transport",

    "material",

    "suitability_score"

]


df = pd.DataFrame(
    data,
    columns=columns
)


# =========================================================
# DISPLAY DATASET INFORMATION
# =========================================================

print()
print("========================================")
print("PackAI ML Training Dataset")
print("========================================")
print(
    f"Total training examples : {len(df)}"
)
print(
    f"Packaging materials      : {df['material'].nunique()}"
)
print(
    f"Scenarios                : {len(scenarios)}"
)
print("========================================")
print()


# =========================================================
# ENCODE CATEGORICAL FEATURES
# =========================================================

X = pd.get_dummies(
    df.drop(
        columns=["suitability_score"]
    )
)

y = df[
    "suitability_score"
]


# =========================================================
# TRAIN / TEST SPLIT
# =========================================================

X_train, X_test, y_train, y_test = train_test_split(

    X,

    y,

    test_size=0.20,

    random_state=42

)


# =========================================================
# RANDOM FOREST REGRESSOR
# =========================================================

model = RandomForestRegressor(

    n_estimators=300,

    max_depth=12,

    min_samples_leaf=2,

    random_state=42,

    n_jobs=1

)


# =========================================================
# TRAIN
# =========================================================

model.fit(
    X_train,
    y_train
)


# =========================================================
# PREDICTION
# =========================================================

predictions = model.predict(
    X_test
)


# =========================================================
# EVALUATION
# =========================================================

mae = mean_absolute_error(
    y_test,
    predictions
)

r2 = r2_score(
    y_test,
    predictions
)


# =========================================================
# TRAINING REPORT
# =========================================================

print("========================================")
print("PackAI ML Model Training Complete")
print("========================================")

print(
    f"Training samples : {len(X_train)}"
)

print(
    f"Testing samples  : {len(X_test)}"
)

print(
    f"Mean Absolute Error : {mae:.2f}"
)

print(
    f"R² Score            : {r2:.3f}"
)

print("========================================")


# =========================================================
# MODEL DIRECTORY
# =========================================================

model_directory = os.path.dirname(
    os.path.abspath(__file__)
)


# =========================================================
# SAVE MODEL
# =========================================================

model_path = os.path.join(
    model_directory,
    "packaging_model.pkl"
)

features_path = os.path.join(
    model_directory,
    "model_features.pkl"
)


joblib.dump(
    model,
    model_path
)


joblib.dump(
    list(X.columns),
    features_path
)


# =========================================================
# FINAL MESSAGE
# =========================================================

print()
print("Model files saved successfully")
print("----------------------------------------")
print(
    f"Model    : {model_path}"
)
print(
    f"Features : {features_path}"
)
print("----------------------------------------")
print()