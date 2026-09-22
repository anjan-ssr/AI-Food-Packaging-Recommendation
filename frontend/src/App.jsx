import { useEffect, useState } from "react";

const API = "http://127.0.0.1:8000";

function App() {
  const [commodities, setCommodities] = useState([]);
  const [packagingMaterials, setPackagingMaterials] = useState([]);

  const [search, setSearch] = useState("");
  const [selectedCommodity, setSelectedCommodity] = useState(null);

  const [freshness, setFreshness] = useState("");
  const [storage, setStorage] = useState("");
  const [transport, setTransport] = useState("");
  const [priority, setPriority] = useState("");

  const [analysisResult, setAnalysisResult] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [showAll, setShowAll] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // HISTORY
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [expandedHistory, setExpandedHistory] = useState(null);

  // MATERIAL DETAILS
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [showMaterialDetails, setShowMaterialDetails] = useState(false);

  // MATERIAL COMPARISON
  const [showComparison, setShowComparison] = useState(false);


  // =========================================================
  // LOAD COMMODITIES
  // =========================================================

  useEffect(() => {
    fetch(`${API}/commodities`)
      .then((response) => {
        if (!response.ok) {
          throw new Error("Backend connection failed");
        }

        return response.json();
      })
      .then((data) => {
        setCommodities(data);
        setError("");
      })
      .catch((err) => {
        console.error("Commodities:", err);
        setError("Unable to connect to the backend.");
      });
  }, []);


  // =========================================================
  // LOAD PACKAGING MATERIALS
  // =========================================================

  useEffect(() => {
    fetch(`${API}/packaging-materials`)
      .then((response) => {
        if (!response.ok) {
          throw new Error(
            "Failed to load packaging materials"
          );
        }

        return response.json();
      })
      .then((data) => {
        setPackagingMaterials(data);
      })
      .catch((err) => {
        console.error(
          "Packaging materials:",
          err
        );
      });
  }, []);


  // =========================================================
  // SEARCH COMMODITY
  // =========================================================

  const handleSearch = () => {
    const query = search.trim().toLowerCase();

    if (!query) {
      setError(
        "Please enter a food commodity."
      );
      return;
    }

    // Exact match first
    const exactMatch = commodities.find(
      (commodity) =>
        commodity.name.toLowerCase() === query
    );

    // Partial match second
    const partialMatch = commodities.find(
      (commodity) =>
        commodity.name
          .toLowerCase()
          .includes(query)
    );

    const found =
      exactMatch || partialMatch;

    if (found) {
      setSearch(found.name);
      setSelectedCommodity(found);

      setError("");
      setAnalysisResult(null);
      setRecommendations([]);

      setShowAll(false);
      setShowComparison(false);

      // Close any open material modal
      setShowMaterialDetails(false);
      setSelectedMaterial(null);
    } else {
      setSelectedCommodity(null);

      setError(
        "Commodity not found. Try another food commodity."
      );
    }
  };


  // =========================================================
  // SELECT COMMODITY FROM SUGGESTION
  // =========================================================

  const selectCommodity = (commodity) => {
    setSearch(commodity.name);
    setSelectedCommodity(commodity);

    setError("");
    setAnalysisResult(null);
    setRecommendations([]);

    setShowAll(false);
    setShowComparison(false);

    setShowMaterialDetails(false);
    setSelectedMaterial(null);
  };


  // =========================================================
  // LOAD HISTORY
  // =========================================================

  const loadHistory = async () => {
    setHistoryLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${API}/history`
      );

      if (!response.ok) {
        throw new Error(
          "Failed to load history"
        );
      }

      const data = await response.json();

      setHistory(
        Array.isArray(data.history)
          ? data.history
          : []
      );

      setShowHistory(true);
      setExpandedHistory(null);

    } catch (err) {
      console.error(
        "History:",
        err
      );

      setError(
        "Unable to load recommendation history."
      );

    } finally {
      setHistoryLoading(false);
    }
  };


  // =========================================================
  // CLOSE HISTORY
  // =========================================================

  const closeHistory = () => {
    setShowHistory(false);
    setExpandedHistory(null);
  };


  // =========================================================
  // OPEN MATERIAL DETAILS
  // =========================================================

  const openMaterialDetails = (item) => {
    if (!item) {
      return;
    }

    const material = packagingMaterials.find(
      (material) =>
        Number(material.id) ===
        Number(item.material_id)
    );

    if (material) {
      setSelectedMaterial(material);

      // Important:
      // Details is an independent modal.
      // It will appear above comparison/history.
      setShowMaterialDetails(true);
    } else {
      console.warn(
        "Material not found:",
        item.material_id
      );
    }
  };


  // =========================================================
  // CLOSE MATERIAL DETAILS
  // =========================================================

  const closeMaterialDetails = () => {
    setShowMaterialDetails(false);
    setSelectedMaterial(null);
  };


  // =========================================================
  // ANALYZE + RECOMMEND
  // =========================================================

  const handleAnalyze = async () => {
    if (
      !selectedCommodity ||
      !freshness ||
      !storage ||
      !transport ||
      !priority
    ) {
      setError(
        "Please complete all requirements before analyzing."
      );

      return;
    }

    setLoading(true);
    setError("");

    // Clear previous result
    setRecommendations([]);
    setAnalysisResult(null);

    setShowAll(false);
    setShowComparison(false);

    // Close details if somehow open
    setShowMaterialDetails(false);
    setSelectedMaterial(null);


    // ---------------------------------------------------------
    // Convert frontend values → backend values
    // ---------------------------------------------------------

    const backendFreshness = {
      "2–3 days": "2-3 days",
      "1 week": "1 week",
      "2 weeks": "2 weeks",
      "1 month": "1 month",
      "more than 1 month":
        "more than 1 month",
    }[freshness];


    const backendStorage = {
      "Room / normal conditions":
        "room",

      Refrigerator:
        "refrigerator",

      Freezer:
        "freezer",
    }[storage];


    const backendTransport = {
      "Short/local transport":
        "short",

      "Normal transport":
        "normal",

      "Long-distance transport":
        "long",
    }[transport];


    const backendPriority = {
      "Longer shelf life":
        "shelf-life",

      "Lower cost":
        "cost",

      "Eco-friendly packaging":
        "eco-friendly",

      Balanced:
        "balanced",
    }[priority];


    const requestBody = {
      commodity_id:
        selectedCommodity.id,

      freshness:
        backendFreshness,

      storage:
        backendStorage,

      transport:
        backendTransport,

      priority:
        backendPriority,
    };


    try {

      // =======================================================
      // STEP 1 — ANALYZE REQUIREMENTS
      // =======================================================

      const analyzeResponse =
        await fetch(
          `${API}/analyze`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify(
                requestBody
              ),
          }
        );


      if (!analyzeResponse.ok) {

        const errorText =
          await analyzeResponse.text();

        console.error(
          "Analyze API error:",
          errorText
        );

        throw new Error(
          "Analysis failed"
        );
      }


      const analysis =
        await analyzeResponse.json();


      setAnalysisResult(
        analysis
      );


      // =======================================================
      // STEP 2 — GET RANKED MATERIALS
      // =======================================================

      const recommendationResponse =
        await fetch(
          `${API}/recommendations`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify(
                requestBody
              ),
          }
        );


      if (!recommendationResponse.ok) {

        const errorText =
          await recommendationResponse.text();

        console.error(
          "Recommendation API error:",
          errorText
        );

        throw new Error(
          "Recommendation failed"
        );
      }


      const recommendationData =
        await recommendationResponse.json();


      const backendRecommendations =
        Array.isArray(
          recommendationData.recommendations
        )
          ? recommendationData.recommendations
          : [];


      // -------------------------------------------------------
      // Defensive frontend sorting
      //
      // Backend already ranks everything.
      // We simply make sure the UI receives:
      //
      // #1 → #2 → #3 → ... → #28
      //
      // without changing the score itself.
      // -------------------------------------------------------

      const sortedRecommendations =
        [...backendRecommendations]
          .sort(
            (a, b) =>
              Number(b.score) -
              Number(a.score)
          )
          .map(
            (item, index) => ({
              ...item,
              rank: index + 1,
            })
          );


      setRecommendations(
        sortedRecommendations
      );


      if (
        sortedRecommendations.length === 0
      ) {
        setError(
          "No packaging recommendations were generated."
        );
      }

    } catch (err) {

      console.error(
        "PackAI analysis error:",
        err
      );

      setAnalysisResult(null);
      setRecommendations([]);

      setError(
        "Something went wrong while generating recommendations. Please check that the backend is running."
      );

    } finally {

      setLoading(false);

    }
  };


  // =========================================================
  // SCORE LABEL
  // =========================================================

  const getScoreLabel = (score) => {

    if (score >= 90) {
      return "Excellent Match";
    }

    if (score >= 80) {
      return "Very Good Match";
    }

    if (score >= 70) {
      return "Good Match";
    }

    if (score >= 60) {
      return "Moderate Match";
    }

    return "Low Match";
  };


  // =========================================================
  // SCORE WIDTH
  // =========================================================

  const getScoreWidth = (score) => {

    const safeScore = Math.max(
      0,
      Math.min(
        Number(score) || 0,
        100
      )
    );

    return `${safeScore}%`;
  };


  // =========================================================
  // MAIN UI
  // =========================================================

  return (
    <div className="min-h-screen bg-slate-950 text-white">


      {/* =====================================================
          HEADER
      ===================================================== */}

      <header className="border-b border-slate-800 bg-slate-950/95">

        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">

          <div className="flex items-center gap-3">

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500 text-2xl shadow-lg shadow-emerald-500/20">
              📦
            </div>

            <div>

              <h1 className="text-xl font-bold tracking-tight">
                PackAI
              </h1>

              <p className="text-xs text-slate-400">
                Intelligent Food Packaging Recommendation
              </p>

            </div>

          </div>


          <div className="flex items-center gap-3">

            <button
              onClick={loadHistory}
              disabled={historyLoading}
              className="rounded-full border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-300 transition hover:border-emerald-500 hover:text-emerald-400 disabled:opacity-60"
            >
              {historyLoading
                ? "Loading..."
                : "📋 History"}
            </button>


            <div className="hidden rounded-full border border-slate-700 bg-slate-900 px-4 py-2 text-xs text-slate-400 sm:block">
              AI-Powered Decision Support
            </div>

          </div>

        </div>

      </header>


      {/* =====================================================
          MAIN
      ===================================================== */}

      <main className="mx-auto max-w-7xl px-6 py-10">


        {/* =====================================================
            HERO
        ===================================================== */}

        <section className="mb-10 text-center">

          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-400">
            ✨ Smart Packaging Intelligence
          </div>


          <h2 className="mx-auto max-w-4xl text-4xl font-extrabold tracking-tight sm:text-5xl">

            Find the right packaging for your{" "}

            <span className="text-emerald-400">
              food commodity
            </span>

          </h2>


          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-400">

            Enter a food commodity and your storage requirements.
            PackAI evaluates available packaging materials and ranks
            them according to compatibility, protection, cost and
            sustainability.

          </p>

        </section>


        {/* =====================================================
            SEARCH
        ===================================================== */}

        <section className="mx-auto max-w-4xl rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl shadow-black/20 sm:p-8">

          <div className="mb-6">

            <p className="text-sm font-semibold text-emerald-400">
              STEP 01
            </p>

            <h3 className="mt-1 text-2xl font-bold">
              Select food commodity
            </h3>

            <p className="mt-2 text-sm text-slate-400">
              Search for the commodity you want to package.
            </p>

          </div>


          <div className="flex flex-col gap-3 sm:flex-row">

            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(
                  e.target.value
                );
                setError("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSearch();
                }
              }}
              placeholder="e.g. Apple, Rice, Milk, Chips..."
              className="flex-1 rounded-xl border border-slate-700 bg-slate-950 px-5 py-4 text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            />


            <button
              onClick={handleSearch}
              className="rounded-xl bg-emerald-500 px-7 py-4 font-semibold text-slate-950 transition hover:bg-emerald-400 active:scale-[0.98]"
            >
              Search
            </button>

          </div>


          {/* SUGGESTIONS */}

          {search &&
            !selectedCommodity && (

              <div className="mt-3 flex flex-wrap gap-2">

                {commodities
                  .filter(
                    (commodity) =>
                      commodity.name
                        .toLowerCase()
                        .includes(
                          search.toLowerCase()
                        )
                  )
                  .slice(0, 6)
                  .map(
                    (commodity) => (

                      <button
                        key={
                          commodity.id
                        }
                        onClick={() =>
                          selectCommodity(
                            commodity
                          )
                        }
                        className="rounded-full border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-300 transition hover:border-emerald-500 hover:text-emerald-400"
                      >
                        {commodity.name}
                      </button>

                    )
                  )}

              </div>

            )}


          {/* ERROR */}

          {error && (

            <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              ⚠️ {error}
            </div>

          )}

        </section>


        {/* =====================================================
            FOOD PROFILE
        ===================================================== */}

        {selectedCommodity && (

          <section className="mx-auto mt-8 max-w-4xl rounded-3xl border border-slate-800 bg-slate-900 p-6 sm:p-8">

            <div className="mb-6 flex items-center justify-between">

              <div>

                <p className="text-sm font-semibold text-emerald-400">
                  FOOD PROFILE
                </p>

                <h3 className="mt-1 text-2xl font-bold">
                  {selectedCommodity.name}
                </h3>

              </div>


              <div className="rounded-xl bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-400">
                Profile detected ✓
              </div>

            </div>


            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

              <ProfileItem
                label="Category"
                value={
                  selectedCommodity.category
                }
              />

              <ProfileItem
                label="Moisture"
                value={
                  selectedCommodity.moisture_level
                }
              />

              <ProfileItem
                label="Fat / Oil"
                value={
                  selectedCommodity.fat_level
                }
              />

              <ProfileItem
                label="pH Category"
                value={
                  selectedCommodity.ph_category
                }
              />

              <ProfileItem
                label="Respiration"
                value={
                  selectedCommodity.respiration_level
                }
              />

              <ProfileItem
                label="Oxygen Sensitivity"
                value={
                  selectedCommodity.oxygen_sensitivity
                }
              />

              <ProfileItem
                label="Moisture Sensitivity"
                value={
                  selectedCommodity.moisture_sensitivity
                }
              />

            </div>

          </section>

        )}


        {/* =====================================================
            REQUIREMENTS
        ===================================================== */}

        {selectedCommodity && (

          <section className="mx-auto mt-8 max-w-4xl rounded-3xl border border-slate-800 bg-slate-900 p-6 sm:p-8">

            <div className="mb-7">

              <p className="text-sm font-semibold text-emerald-400">
                STEP 02
              </p>

              <h3 className="mt-1 text-2xl font-bold">
                Tell us about your requirements
              </h3>

              <p className="mt-2 text-sm text-slate-400">

                You don't need to know technical packaging parameters.
                PackAI will infer them automatically.

              </p>

            </div>


            <div className="grid gap-5 sm:grid-cols-2">

              <SelectField
                label="Desired freshness duration"
                value={freshness}
                onChange={setFreshness}
                options={[
                  "2–3 days",
                  "1 week",
                  "2 weeks",
                  "1 month",
                  "more than 1 month",
                ]}
              />


              <SelectField
                label="Storage condition"
                value={storage}
                onChange={setStorage}
                options={[
                  "Room / normal conditions",
                  "Refrigerator",
                  "Freezer",
                ]}
              />


              <SelectField
                label="Transportation"
                value={transport}
                onChange={setTransport}
                options={[
                  "Short/local transport",
                  "Normal transport",
                  "Long-distance transport",
                ]}
              />


              <SelectField
                label="Primary priority"
                value={priority}
                onChange={setPriority}
                options={[
                  "Longer shelf life",
                  "Lower cost",
                  "Eco-friendly packaging",
                  "Balanced",
                ]}
              />

            </div>


            <button
              onClick={handleAnalyze}
              disabled={loading}
              className="mt-7 w-full rounded-xl bg-emerald-500 px-6 py-4 text-base font-bold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
            >

              {loading
                ? "Analyzing packaging options..."
                : "🤖 Analyze & Recommend Packaging"}

            </button>

          </section>

        )}


        {/* =====================================================
            AI ANALYSIS
        ===================================================== */}

        {analysisResult && (

          <section className="mx-auto mt-10 max-w-6xl">

            <div className="mb-6">

              <p className="text-sm font-semibold text-emerald-400">
                AI ANALYSIS
              </p>

              <h3 className="mt-1 text-3xl font-bold">
                Packaging requirements identified
              </h3>

              <p className="mt-2 text-slate-400">

                Based on the food profile and your selected storage
                requirements.

              </p>

            </div>


            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

              <RequirementCard
                icon="🫧"
                title="Oxygen Protection"
                value={
                  analysisResult
                    .packaging_requirements
                    ?.oxygen_protection
                }
              />


              <RequirementCard
                icon="💧"
                title="Moisture Protection"
                value={
                  analysisResult
                    .packaging_requirements
                    ?.moisture_protection
                }
              />


              <RequirementCard
                icon="🛡️"
                title="Mechanical Protection"
                value={
                  analysisResult
                    .packaging_requirements
                    ?.mechanical_protection
                }
              />


              <RequirementCard
                icon="⏳"
                title="Shelf Life"
                value={
                  analysisResult
                    .packaging_requirements
                    ?.shelf_life_demand
                }
              />

            </div>

          </section>

        )}


        {/* =====================================================
            RESULTS
        ===================================================== */}

        {recommendations.length > 0 && (

          <section className="mx-auto mt-12 max-w-6xl">

            <div className="mb-8 text-center">

              <div className="mb-3 inline-flex rounded-full bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-400">
                🏆 PACKAGING RANKING
              </div>


              <h3 className="text-3xl font-extrabold sm:text-4xl">
                Best packaging options
              </h3>


              <p className="mx-auto mt-3 max-w-2xl text-slate-400">

                All {recommendations.length} available packaging
                options were evaluated and ranked from best to worst.

              </p>

            </div>


            {/* =================================================
                TOP 3 COMPARISON BUTTON
            ================================================= */}

            {recommendations.length >= 3 && (

              <div className="mb-6 flex justify-center">

                <button
                  onClick={() => {
                    setShowMaterialDetails(false);
                    setSelectedMaterial(null);
                    setShowComparison(true);
                  }}
                  className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-3 text-sm font-semibold text-emerald-400 transition hover:border-emerald-500 hover:bg-emerald-500/20 hover:text-emerald-300"
                >
                  ⚖️ Compare Top 3 Materials →
                </button>

              </div>

            )}


            {/* =================================================
                TOP 3
            ================================================= */}

            <div className="mb-10 grid gap-6 lg:grid-cols-3">

              {recommendations
                .slice(0, 3)
                .map(
                  (item, index) => (

                    <RecommendationCard
                      key={
                        item.material_id
                      }
                      item={item}
                      top
                      position={
                        index + 1
                      }
                      getScoreLabel={
                        getScoreLabel
                      }
                      getScoreWidth={
                        getScoreWidth
                      }
                      onDetails={
                        openMaterialDetails
                      }
                    />

                  )
                )}

            </div>


            {/* =================================================
                RANK 4–6
            ================================================= */}

            <div className="mb-8">

              <div className="mb-4 flex items-center justify-between">

                <h4 className="text-xl font-bold">
                  Other top alternatives
                </h4>

                <span className="text-sm text-slate-500">
                  Ranks #4–#6
                </span>

              </div>


              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

                {recommendations
                  .slice(3, 6)
                  .map(
                    (item) => (

                      <RecommendationCard
                        key={
                          item.material_id
                        }
                        item={item}
                        position={
                          item.rank
                        }
                        getScoreLabel={
                          getScoreLabel
                        }
                        getScoreWidth={
                          getScoreWidth
                        }
                        onDetails={
                          openMaterialDetails
                        }
                      />

                    )
                  )}

              </div>

            </div>


            {/* =================================================
                VIEW ALL
            ================================================= */}

            <button
              onClick={() =>
                setShowAll(
                  !showAll
                )
              }
              className="mb-8 w-full rounded-xl border border-slate-700 bg-slate-900 px-6 py-4 font-semibold text-slate-200 transition hover:border-emerald-500 hover:text-emerald-400"
            >

              {showAll
                ? "Hide Full Ranking ↑"
                : `View All ${recommendations.length} Alternatives ↓`}

            </button>


            {/* =================================================
                FULL RANKING
            ================================================= */}

            {showAll && (

              <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">

                <div className="grid grid-cols-[60px_1fr_100px] gap-4 border-b border-slate-800 px-5 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">

                  <span>
                    Rank
                  </span>

                  <span>
                    Packaging Material
                  </span>

                  <span className="text-right">
                    Score
                  </span>

                </div>


                {recommendations.map(
                  (item) => (

                    <button
                      key={
                        item.material_id
                      }
                      onClick={() =>
                        openMaterialDetails(
                          item
                        )
                      }
                      className="grid w-full grid-cols-[60px_1fr_100px] items-center gap-4 border-b border-slate-800/70 px-5 py-4 text-left last:border-0 hover:bg-slate-800/40"
                    >

                      <span className="font-bold text-slate-500">
                        #{item.rank}
                      </span>


                      <div>

                        <p className="font-semibold text-white">
                          {item.material_name}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {item.material_type}
                        </p>

                      </div>


                      <div className="text-right">

                        <span className="font-bold text-emerald-400">
                          {Number(
                            item.score
                          ).toFixed(1)}
                        </span>

                        <span className="text-xs text-slate-600">
                          /100
                        </span>

                      </div>

                    </button>

                  )
                )}

              </div>

            )}

          </section>

        )}

      </main>


      {/* =====================================================
          HOW PACKAI DECIDES
      ===================================================== */}

      {recommendations.length > 0 && (

        <section className="mx-auto mb-16 max-w-6xl px-6">

          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl sm:p-8">

            <div className="mb-8 text-center">

              <div className="mb-3 inline-flex rounded-full bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-400">
                🧠 DECISION ENGINE
              </div>


              <h3 className="text-3xl font-extrabold">
                How PackAI decides
              </h3>


              <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-400">

                PackAI combines machine learning with transparent
                packaging compatibility analysis to evaluate and rank
                all available materials.

              </p>

            </div>


            <div className="grid gap-5 md:grid-cols-3">

              <DecisionStep
                number="01"
                icon="🍎"
                title="Food Profile"
                description="The selected commodity provides properties such as moisture, fat level, pH category, respiration and sensitivity to oxygen and moisture."
              />


              <DecisionStep
                number="02"
                icon="🤖"
                title="ML Prediction"
                description="A Random Forest model predicts the suitability of each packaging material for the selected food and storage requirements."
              />


              <DecisionStep
                number="03"
                icon="🏆"
                title="Final Ranking"
                description="The ML prediction is combined with compatibility factors such as oxygen, moisture, gas suitability, mechanical protection and shelf-life suitability."
              />

            </div>


            <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/70 p-5">

              <h4 className="text-lg font-bold text-white">
                Final score
              </h4>


              <p className="mt-2 text-sm leading-6 text-slate-400">

                Each packaging material receives a final score out of
                100. Higher scores indicate stronger overall suitability
                for the selected food and user requirements.

              </p>


              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">

                <ScoreFactor
                  title="ML Prediction"
                  description="Machine learning suitability"
                />


                <ScoreFactor
                  title="Compatibility"
                  description="Food–material compatibility"
                />


                <ScoreFactor
                  title="Protection"
                  description="Oxygen, moisture & mechanical"
                />


                <ScoreFactor
                  title="Requirements"
                  description="Storage, shelf life & priority"
                />

              </div>

            </div>


            <div className="mt-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">

              <div className="flex gap-3">

                <div className="text-xl">
                  💡
                </div>


                <div>

                  <h4 className="font-semibold text-emerald-400">
                    Transparent recommendation
                  </h4>


                  <p className="mt-1 text-sm leading-6 text-slate-400">

                    PackAI does not simply select one material. All{" "}
                    {recommendations.length} available packaging options
                    are evaluated, scored and ranked from best to worst.
                    This allows users to compare alternatives before
                    making a packaging decision.

                  </p>

                </div>

              </div>

            </div>

          </div>

        </section>

      )}


      {/* =====================================================
          FOOTER
      ===================================================== */}

      <footer className="mt-16 border-t border-slate-800">

        <div className="mx-auto max-w-7xl px-6 py-8 text-center text-sm text-slate-500">

          <p>
            PackAI — AI-Based Intelligent Food Packaging Material
            Recommendation System
          </p>

          <p className="mt-2 text-xs text-slate-600">
            Software decision-support system for food packaging selection
          </p>

        </div>

      </footer>


      {/* =====================================================
          HISTORY MODAL
      ===================================================== */}

      {showHistory && (

        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 px-4 py-8 backdrop-blur-sm">

          <div className="mx-auto max-w-6xl rounded-3xl border border-slate-700 bg-slate-950 shadow-2xl">

            {/* HISTORY HEADER */}

            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-800 bg-slate-950 px-6 py-5 sm:px-8">

              <div>

                <p className="text-sm font-semibold text-emerald-400">
                  RECOMMENDATION HISTORY
                </p>

                <h2 className="mt-1 text-2xl font-extrabold">
                  Previous packaging analyses
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Click an analysis to view its complete ranking.
                </p>

              </div>


              <button
                onClick={closeHistory}
                className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-300 hover:border-emerald-500 hover:text-emerald-400"
              >
                Close
              </button>

            </div>


            {/* HISTORY CONTENT */}

            <div className="p-6 sm:p-8">

              {history.length === 0 ? (

                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-10 text-center">

                  <div className="text-4xl">
                    📋
                  </div>

                  <h3 className="mt-4 text-xl font-bold">
                    No analysis history yet
                  </h3>

                  <p className="mt-2 text-sm text-slate-500">
                    Run a packaging analysis and it will appear here.
                  </p>

                </div>

              ) : (

                <div className="space-y-5">

                  {history.map(
                    (analysis) => {

                      const isExpanded =
                        expandedHistory ===
                        analysis.analysis_id;

                      const rankings =
                        Array.isArray(
                          analysis.rankings
                        )
                          ? analysis.rankings
                          : [];

                      const best =
                        rankings[0];

                      const second =
                        rankings[1];

                      const third =
                        rankings[2];


                      return (

                        <div
                          key={
                            analysis.analysis_id
                          }
                          className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900"
                        >

                          {/* SUMMARY */}

                          <button
                            onClick={() =>
                              setExpandedHistory(
                                isExpanded
                                  ? null
                                  : analysis.analysis_id
                              )
                            }
                            className="w-full p-5 text-left transition hover:bg-slate-800/50 sm:p-6"
                          >

                            <div className="flex flex-col gap-5">

                              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                                <div>

                                  <div className="flex flex-wrap items-center gap-3">

                                    <h3 className="text-xl font-bold text-white">
                                      {analysis.commodity}
                                    </h3>


                                    <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-400">

                                      {rankings.length} options evaluated

                                    </span>

                                  </div>


                                  <p className="mt-2 text-sm text-slate-400">

                                    {formatHistoryValue(
                                      analysis.freshness
                                    )}

                                    {" • "}

                                    {formatHistoryValue(
                                      analysis.storage
                                    )}

                                    {" • "}

                                    {formatHistoryValue(
                                      analysis.transport
                                    )}

                                  </p>


                                  <p className="mt-1 text-xs text-slate-500">

                                    Priority:{" "}

                                    {formatHistoryValue(
                                      analysis.priority
                                    )}

                                  </p>

                                </div>


                                <div className="flex items-center gap-4">

                                  {best && (

                                    <div className="text-right">

                                      <p className="text-xs uppercase tracking-wide text-slate-600">
                                        Best Score
                                      </p>


                                      <p className="text-2xl font-extrabold text-emerald-400">

                                        {Number(
                                          best.score
                                        ).toFixed(1)}

                                        <span className="ml-1 text-xs text-slate-600">
                                          /100
                                        </span>

                                      </p>

                                    </div>

                                  )}


                                  <span className="text-xl text-slate-500">

                                    {isExpanded
                                      ? "▲"
                                      : "▼"}

                                  </span>

                                </div>

                              </div>


                              {/* TOP 3 */}

                              {rankings.length > 0 && (

                                <div className="grid gap-3 md:grid-cols-3">

                                  <HistoryMaterialPreview
                                    rank="🥇 #1"
                                    item={best}
                                    highlight
                                  />


                                  <HistoryMaterialPreview
                                    rank="🥈 #2"
                                    item={second}
                                  />


                                  <HistoryMaterialPreview
                                    rank="🥉 #3"
                                    item={third}
                                  />

                                </div>

                              )}


                              <div className="flex items-center justify-between border-t border-slate-800 pt-4">

                                <div>

                                  <p className="text-sm font-semibold text-slate-300">
                                    Complete packaging ranking
                                  </p>

                                  <p className="mt-1 text-xs text-slate-500">

                                    {rankings.length} packaging options evaluated

                                  </p>

                                </div>


                                <span className="text-xs font-semibold text-emerald-400">

                                  {isExpanded
                                    ? "HIDE RANKING ↑"
                                    : "VIEW FULL RANKING →"}

                                </span>

                              </div>

                            </div>

                          </button>


                          {/* COMPLETE HISTORY RANKING */}

                          {isExpanded &&
                            rankings.length > 0 && (

                              <div className="border-t border-slate-800 bg-slate-950/50 p-5 sm:p-6">

                                <div className="mb-5 flex items-center justify-between">

                                  <div>

                                    <p className="text-sm font-semibold text-emerald-400">
                                      COMPLETE PACKAGING RANKING
                                    </p>

                                    <h4 className="mt-1 text-lg font-bold text-white">
                                      Best → Worst
                                    </h4>

                                  </div>


                                  <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-400">

                                    {rankings.length} options

                                  </span>

                                </div>


                                <div className="space-y-3">

                                  {rankings.map(
                                    (item) => (

                                      <button
                                        key={
                                          item.material_id
                                        }
                                        onClick={() =>
                                          openMaterialDetails(
                                            item
                                          )
                                        }
                                        className={`w-full rounded-xl border p-4 text-left transition hover:border-emerald-500/40 ${
                                          item.rank === 1
                                            ? "border-emerald-500/30 bg-emerald-500/5"
                                            : "border-slate-800 bg-slate-900"
                                        }`}
                                      >

                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

                                          <div className="flex items-center gap-4">

                                            <div
                                              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${
                                                item.rank === 1
                                                  ? "bg-emerald-500 text-slate-950"
                                                  : "bg-slate-800 text-slate-400"
                                              }`}
                                            >
                                              #{item.rank}
                                            </div>


                                            <div>

                                              <p className="font-semibold text-white">
                                                {item.material_name}
                                              </p>

                                              <p className="mt-1 text-xs text-slate-500">
                                                {item.material_type}
                                              </p>

                                            </div>

                                          </div>


                                          <div className="text-left sm:text-right">

                                            <span className="text-xl font-extrabold text-emerald-400">

                                              {Number(
                                                item.score
                                              ).toFixed(1)}

                                            </span>


                                            <span className="ml-1 text-xs text-slate-600">
                                              /100
                                            </span>

                                          </div>

                                        </div>


                                        {item.reason && (

                                          <div className="mt-3 rounded-lg bg-slate-950/70 px-4 py-3">

                                            <p className="text-xs leading-5 text-slate-500">
                                              {item.reason}
                                            </p>

                                          </div>

                                        )}

                                      </button>

                                    )
                                  )}

                                </div>

                              </div>

                            )}


                          {isExpanded &&
                            rankings.length === 0 && (

                              <div className="border-t border-slate-800 p-6 text-center">

                                <p className="text-sm text-slate-500">

                                  No packaging rankings were stored for this analysis.

                                </p>

                              </div>

                            )}

                        </div>

                      );

                    }
                  )}

                </div>

              )}

            </div>

          </div>

        </div>

      )}


      {/* =====================================================
          MATERIAL DETAILS MODAL
      ===================================================== */}

      {showMaterialDetails &&
        selectedMaterial && (

          <MaterialDetailsModal
            material={
              selectedMaterial
            }
            onClose={
              closeMaterialDetails
            }
          />

        )}


      {/* =====================================================
          MATERIAL COMPARISON MODAL
      ===================================================== */}

      {showComparison &&
        recommendations.length >= 3 && (

          <MaterialComparisonModal
            recommendations={
              recommendations.slice(0, 3)
            }
            packagingMaterials={
              packagingMaterials
            }
            onClose={() =>
              setShowComparison(
                false
              )
            }
            onDetails={
              openMaterialDetails
            }
          />

        )}

    </div>
  );
}


/* =========================================================
   FORMAT HISTORY VALUES
========================================================= */

function formatHistoryValue(value) {

  if (!value) {
    return "Not specified";
  }

  const map = {

    room:
      "room",

    refrigerator:
      "refrigerator",

    freezer:
      "freezer",

    short:
      "short transport",

    normal:
      "normal transport",

    long:
      "long-distance transport",

    "shelf-life":
      "longer shelf life",

    cost:
      "lower cost",

    "eco-friendly":
      "eco-friendly",

    balanced:
      "balanced",

    "2-3 days":
      "2–3 days",

    "1 week":
      "1 week",

    "2 weeks":
      "2 weeks",

    "1 month":
      "1 month",

    "more than 1 month":
      "more than 1 month",

  };

  return map[value] || value;
}


/* =========================================================
   PROFILE ITEM
========================================================= */

function ProfileItem({
  label,
  value,
}) {

  return (

    <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">

      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p className="mt-2 font-semibold text-slate-200">
        {value || "Not available"}
      </p>

    </div>

  );
}


/* =========================================================
   SELECT FIELD
========================================================= */

function SelectField({
  label,
  value,
  onChange,
  options,
}) {

  return (

    <label className="block">

      <span className="mb-2 block text-sm font-medium text-slate-300">
        {label}
      </span>


      <select
        value={value}
        onChange={(e) =>
          onChange(
            e.target.value
          )
        }
        className="w-full appearance-none rounded-xl border border-slate-700 bg-slate-950 px-4 py-3.5 text-sm text-white outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
      >

        <option value="">
          Select an option
        </option>


        {options.map(
          (option) => (

            <option
              key={option}
              value={option}
            >
              {option}
            </option>

          )
        )}

      </select>

    </label>

  );
}


/* =========================================================
   REQUIREMENT CARD
========================================================= */

function RequirementCard({
  icon,
  title,
  value,
}) {

  return (

    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">

      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-xl">
        {icon}
      </div>


      <p className="text-sm text-slate-500">
        {title}
      </p>


      <p className="mt-1 text-xl font-bold text-white">
        {value || "Not specified"}
      </p>

    </div>

  );

}


/* =========================================================
   RECOMMENDATION CARD
========================================================= */

function RecommendationCard({
  item,
  top = false,
  position,
  getScoreLabel,
  getScoreWidth,
  onDetails,
}) {

  const finalScore =
    Number(item.score);

  const mlScore =
    Number(item.ml_score);

  const ruleScore =
    Number(item.rule_score);


  return (

    <div
      className={`relative overflow-hidden rounded-3xl border bg-slate-900 p-6 transition hover:-translate-y-1 ${
        top
          ? "border-emerald-500/40 shadow-xl shadow-emerald-500/5"
          : "border-slate-800"
      }`}
    >


      {top && (

        <div className="absolute right-4 top-4 rounded-full bg-emerald-500 px-3 py-1 text-xs font-bold text-slate-950">
          TOP {position}
        </div>

      )}


      <div className="mb-5 flex items-center gap-4">

        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-800 text-lg font-bold text-slate-400">
          #{position}
        </div>


        <div className="pr-12">

          <p className="text-lg font-bold text-white">
            {item.material_name}
          </p>


          <p className="mt-1 text-xs text-slate-500">
            {item.material_type}
          </p>

        </div>

      </div>


      <div className="mb-4">

        <div className="mb-2 flex items-end justify-between">

          <div>

            <span className="text-3xl font-extrabold text-emerald-400">
              {Number.isFinite(
                finalScore
              )
                ? finalScore.toFixed(1)
                : "—"}
            </span>


            <span className="ml-1 text-sm text-slate-600">
              /100
            </span>

          </div>


          <span className="text-xs font-medium text-slate-400">
            {Number.isFinite(
              finalScore
            )
              ? getScoreLabel(
                  finalScore
                )
              : "Not available"}
          </span>

        </div>


        <div className="h-2 overflow-hidden rounded-full bg-slate-800">

          <div
            className="h-full rounded-full bg-emerald-500 transition-all duration-700"
            style={{
              width:
                getScoreWidth(
                  finalScore
                ),
            }}
          />

        </div>

      </div>


      <div className="mb-4 grid grid-cols-2 gap-2">

        <div className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2">

          <p className="text-[10px] uppercase tracking-wide text-slate-600">
            ML Prediction
          </p>


          <p className="mt-1 text-sm font-bold text-cyan-400">

            {Number.isFinite(
              mlScore
            )
              ? mlScore.toFixed(1)
              : "—"}

          </p>

        </div>


        <div className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2">

          <p className="text-[10px] uppercase tracking-wide text-slate-600">
            Compatibility
          </p>


          <p className="mt-1 text-sm font-bold text-emerald-400">

            {Number.isFinite(
              ruleScore
            )
              ? ruleScore.toFixed(1)
              : "—"}

          </p>

        </div>

      </div>


      <div className="rounded-xl bg-slate-950/70 p-4">

        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
          Why this material?
        </p>


        <p className="text-sm leading-6 text-slate-400">
          {item.reason ||
            "No explanation available."}
        </p>

      </div>


      {/* MATERIAL DETAILS */}

      <button
        onClick={() =>
          onDetails(item)
        }
        className="mt-4 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm font-semibold text-slate-300 transition hover:border-emerald-500 hover:text-emerald-400"
      >
        View Material Details →
      </button>

    </div>

  );
}


/* =========================================================
   HISTORY MATERIAL PREVIEW
========================================================= */

function HistoryMaterialPreview({
  rank,
  item,
  highlight = false,
}) {

  if (!item) {

    return (

      <div className="rounded-xl border border-dashed border-slate-800 bg-slate-950/30 p-4">

        <p className="text-xs text-slate-600">
          No ranking available
        </p>

      </div>

    );

  }


  return (

    <div
      className={`rounded-xl border p-4 ${
        highlight
          ? "border-emerald-500/20 bg-emerald-500/5"
          : "border-slate-800 bg-slate-950/60"
      }`}
    >

      <div className="flex items-center justify-between">

        <span
          className={`text-xs font-bold ${
            highlight
              ? "text-emerald-400"
              : "text-slate-400"
          }`}
        >
          {rank}
        </span>


        <span className="text-sm font-extrabold text-emerald-400">

          {Number(
            item.score
          ).toFixed(1)}

        </span>

      </div>


      <p className="mt-2 font-semibold text-white">
        {item.material_name}
      </p>


      <p className="mt-1 text-xs text-slate-500">
        {item.material_type}
      </p>

    </div>

  );

}


/* =========================================================
   MATERIAL DETAILS MODAL
========================================================= */

function MaterialDetailsModal({
  material,
  onClose,
}) {

  const detailItems = [

    {
      label: "Oxygen Barrier",
      value:
        material.oxygen_barrier,
      icon: "🫧",
    },

    {
      label: "Moisture Barrier",
      value:
        material.moisture_barrier,
      icon: "💧",
    },

    {
      label: "Gas Permeability",
      value:
        material.gas_permeability,
      icon: "🌬️",
    },

    {
      label: "Sealability",
      value:
        material.sealability,
      icon: "🔒",
    },

    {
      label: "Mechanical Strength",
      value:
        material.mechanical_strength,
      icon: "💪",
    },

    {
      label: "MAP Suitable",
      value:
        material.map_suitable,
      icon: "🧪",
    },

    {
      label: "Recyclability",
      value:
        material.recyclability,
      icon: "♻️",
    },

    {
      label: "Cost Level",
      value:
        material.cost_level,
      icon: "💰",
    },

    {
      label: "Flexibility",
      value:
        material.flexibility,
      icon: "📐",
    },

    {
      label: "Fresh Produce Suitability",
      value:
        material.fresh_produce_suitability,
      icon: "🥬",
    },

    {
      label: "Dry Food Suitability",
      value:
        material.dry_food_suitability,
      icon: "🌾",
    },

    {
      label: "Liquid Food Suitability",
      value:
        material.liquid_food_suitability,
      icon: "🥛",
    },

    {
      label: "High-Fat Food Suitability",
      value:
        material.high_fat_food_suitability,
      icon: "🫒",
    },

    {
      label: "Long Storage Suitability",
      value:
        material.long_storage_suitability,
      icon: "⏳",
    },

  ];


  return (

    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 px-4 py-6 backdrop-blur-sm">

      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-3xl border border-slate-700 bg-slate-950 shadow-2xl">

        {/* HEADER */}

        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-800 bg-slate-950 px-6 py-5 sm:px-8">

          <div>

            <p className="text-sm font-semibold text-emerald-400">
              PACKAGING MATERIAL
            </p>


            <h2 className="mt-1 text-2xl font-extrabold text-white sm:text-3xl">
              {material.material_name}
            </h2>


            <p className="mt-1 text-sm text-slate-500">
              {material.material_type}
            </p>

          </div>


          <button
            onClick={onClose}
            className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-lg text-slate-400 transition hover:border-red-500/50 hover:text-red-400"
          >
            ✕
          </button>

        </div>


        {/* CONTENT */}

        <div className="p-6 sm:p-8">

          {/* OVERVIEW */}

          <div className="mb-7 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">

            <div className="flex gap-4">

              <div className="text-3xl">
                📦
              </div>


              <div>

                <h3 className="font-bold text-white">
                  Material overview
                </h3>


                <p className="mt-1 text-sm leading-6 text-slate-400">

                  Technical and application properties available
                  in the PackAI packaging material database.

                </p>

              </div>

            </div>

          </div>


          {/* TECHNICAL PROPERTIES */}

          <h3 className="mb-4 text-lg font-bold text-white">
            Technical & application properties
          </h3>


          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">

            {detailItems.map(
              (item) => (

                <MaterialDetailItem
                  key={
                    item.label
                  }
                  icon={
                    item.icon
                  }
                  label={
                    item.label
                  }
                  value={
                    item.value
                  }
                />

              )
            )}

          </div>


          {/* BARRIER DATA */}

          <div className="mt-8">

            <h3 className="mb-4 text-lg font-bold text-white">
              Barrier data
            </h3>


            <div className="grid gap-4 md:grid-cols-2">

              <BarrierData
                title="OTR"
                value={
                  material.otr_value
                }
                unit={
                  material.otr_unit
                }
                description="Oxygen Transmission Rate"
              />


              <BarrierData
                title="WVTR"
                value={
                  material.wvtr_value
                }
                unit={
                  material.wvtr_unit
                }
                description="Water Vapor Transmission Rate"
              />

            </div>

          </div>


          {/* THICKNESS + CONDITIONS */}

          <div className="mt-8 grid gap-4 md:grid-cols-2">

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">

              <p className="text-xs uppercase tracking-wide text-slate-600">
                Typical Thickness
              </p>


              <p className="mt-2 text-lg font-bold text-white">

                {material.typical_thickness ||
                  "Not specified"}

              </p>

            </div>


            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">

              <p className="text-xs uppercase tracking-wide text-slate-600">
                Test Conditions
              </p>


              <p className="mt-2 text-sm leading-6 text-slate-300">

                {material.test_conditions ||
                  "Not specified"}

              </p>

            </div>

          </div>


          {/* SOURCE */}

          <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-900 p-5">

            <p className="text-xs uppercase tracking-wide text-slate-600">
              Data Source
            </p>


            <p className="mt-2 text-sm leading-6 text-slate-400">

              {material.data_source ||
                "Database record / source not specified"}

            </p>

          </div>


          {/* CLOSE */}

          <button
            onClick={onClose}
            className="mt-7 w-full rounded-xl bg-emerald-500 px-6 py-4 font-bold text-slate-950 transition hover:bg-emerald-400"
          >
            Done
          </button>

        </div>

      </div>

    </div>

  );

}


/* =========================================================
   MATERIAL DETAIL ITEM
========================================================= */

function MaterialDetailItem({
  icon,
  label,
  value,
}) {

  return (

    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">

      <div className="flex items-center gap-3">

        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-800">
          {icon}
        </div>


        <p className="text-xs uppercase tracking-wide text-slate-500">
          {label}
        </p>

      </div>


      <p className="mt-3 text-base font-bold text-white">
        {value || "Not specified"}
      </p>

    </div>

  );

}


/* =========================================================
   BARRIER DATA
========================================================= */

function BarrierData({
  title,
  value,
  unit,
  description,
}) {

  const hasValue =
    value !== null &&
    value !== undefined &&
    value !== "";


  return (

    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">

      <div className="flex items-center justify-between">

        <div>

          <p className="text-xs uppercase tracking-wide text-slate-600">
            {title}
          </p>


          <p className="mt-1 text-sm font-semibold text-slate-300">
            {description}
          </p>

        </div>


        <div className="text-right">

          {hasValue ? (

            <>

              <span className="text-2xl font-extrabold text-emerald-400">
                {value}
              </span>


              {unit && (

                <p className="mt-1 text-[10px] text-slate-500">
                  {unit}
                </p>

              )}

            </>

          ) : (

            <span className="text-sm font-semibold text-slate-500">
              Not available
            </span>

          )}

        </div>

      </div>

    </div>

  );

}


/* =========================================================
   MATERIAL COMPARISON MODAL
========================================================= */

function MaterialComparisonModal({
  recommendations,
  packagingMaterials,
  onClose,
  onDetails,
}) {

  const materials =
    recommendations.map(
      (recommendation) => {

        const material =
          packagingMaterials.find(
            (item) =>
              Number(item.id) ===
              Number(
                recommendation.material_id
              )
          );

        return {
          recommendation,
          material,
        };

      }
    );


  const getValue = (
    material,
    field
  ) => {

    return (
      material?.[field] ||
      "Not specified"
    );

  };


  const comparisonRows = [

    {
      label: "Final Score",

      getValue: (
        recommendation
      ) =>
        `${Number(
          recommendation.score
        ).toFixed(1)} / 100`,

      score: true,
    },

    {
      label: "ML Prediction",

      getValue: (
        recommendation
      ) =>
        Number.isFinite(
          Number(
            recommendation.ml_score
          )
        )
          ? Number(
              recommendation.ml_score
            ).toFixed(1)
          : "Not available",
    },

    {
      label: "Compatibility",

      getValue: (
        recommendation
      ) =>
        Number.isFinite(
          Number(
            recommendation.rule_score
          )
        )
          ? Number(
              recommendation.rule_score
            ).toFixed(1)
          : "Not available",
    },

    {
      label: "Oxygen Barrier",
      field: "oxygen_barrier",
    },

    {
      label: "Moisture Barrier",
      field: "moisture_barrier",
    },

    {
      label: "Gas Permeability",
      field: "gas_permeability",
    },

    {
      label: "Mechanical Strength",
      field: "mechanical_strength",
    },

    {
      label: "Sealability",
      field: "sealability",
    },

    {
      label: "MAP Suitable",
      field: "map_suitable",
    },

    {
      label: "Recyclability",
      field: "recyclability",
    },

    {
      label: "Cost Level",
      field: "cost_level",
    },

    {
      label: "Flexibility",
      field: "flexibility",
    },

    {
      label: "Fresh Produce",
      field:
        "fresh_produce_suitability",
    },

    {
      label: "Dry Food",
      field:
        "dry_food_suitability",
    },

    {
      label: "Liquid Food",
      field:
        "liquid_food_suitability",
    },

    {
      label: "High-Fat Food",
      field:
        "high_fat_food_suitability",
    },

    {
      label: "Long Storage",
      field:
        "long_storage_suitability",
    },

    {
      label: "Typical Thickness",
      field:
        "typical_thickness",
    },

  ];


  return (

    <div className="fixed inset-0 z-[80] overflow-y-auto bg-black/80 px-4 py-6 backdrop-blur-sm">

      <div className="mx-auto max-w-7xl rounded-3xl border border-slate-700 bg-slate-950 shadow-2xl">

        {/* HEADER */}

        <div className="sticky top-0 z-20 flex items-start justify-between border-b border-slate-800 bg-slate-950 px-6 py-5 sm:px-8">

          <div>

            <p className="text-sm font-semibold text-emerald-400">
              MATERIAL COMPARISON
            </p>


            <h2 className="mt-1 text-2xl font-extrabold text-white sm:text-3xl">
              Compare the Top 3 Materials
            </h2>


            <p className="mt-2 text-sm text-slate-500">
              Compare the highest-ranked packaging options side-by-side.
            </p>

          </div>


          <button
            onClick={onClose}
            className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-lg text-slate-400 transition hover:border-red-500/50 hover:text-red-400"
          >
            ✕
          </button>

        </div>


        {/* CONTENT */}

        <div className="overflow-x-auto p-6 sm:p-8">

          <div className="min-w-[900px]">

            {/* MATERIAL HEADERS */}

            <div className="grid grid-cols-[180px_repeat(3,minmax(220px,1fr))] gap-3">

              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">

                <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Compare
                </p>


                <p className="mt-2 text-lg font-bold text-white">
                  Top 3
                </p>

              </div>


              {materials.map(
                (
                  {
                    recommendation,
                    material,
                  },
                  index
                ) => (

                  <div
                    key={
                      recommendation.material_id
                    }
                    className={`rounded-2xl border p-5 ${
                      index === 0
                        ? "border-emerald-500/40 bg-emerald-500/5"
                        : "border-slate-800 bg-slate-900"
                    }`}
                  >

                    <div className="flex items-center justify-between">

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${
                          index === 0
                            ? "bg-emerald-500 text-slate-950"
                            : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        #{recommendation.rank}
                      </span>


                      {index === 0 && (

                        <span className="text-xs font-bold text-emerald-400">
                          BEST MATCH
                        </span>

                      )}

                    </div>


                    <h3 className="mt-4 text-lg font-bold text-white">
                      {recommendation.material_name}
                    </h3>


                    <p className="mt-1 text-xs text-slate-500">
                      {recommendation.material_type}
                    </p>


                    <div className="mt-4">

                      <span className="text-3xl font-extrabold text-emerald-400">

                        {Number(
                          recommendation.score
                        ).toFixed(1)}

                      </span>


                      <span className="ml-1 text-xs text-slate-600">
                        /100
                      </span>

                    </div>


                    <button
                      onClick={() =>
                        onDetails(
                          recommendation
                        )
                      }
                      className="mt-4 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-xs font-semibold text-slate-300 transition hover:border-emerald-500 hover:text-emerald-400"
                    >
                      View Details →
                    </button>

                  </div>

                )
              )}

            </div>


            {/* COMPARISON ROWS */}

            <div className="mt-4 space-y-2">

              {comparisonRows.map(
                (row) => (

                  <div
                    key={
                      row.label
                    }
                    className="grid grid-cols-[180px_repeat(3,minmax(220px,1fr))] gap-3"
                  >

                    <div className="flex items-center rounded-xl border border-slate-800 bg-slate-900 px-4 py-3">

                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {row.label}
                      </span>

                    </div>


                    {materials.map(
                      (
                        {
                          recommendation,
                          material,
                        },
                        index
                      ) => {

                        const value =
                          row.getValue
                            ? row.getValue(
                                recommendation
                              )
                            : getValue(
                                material,
                                row.field
                              );


                        return (

                          <div
                            key={`${row.label}-${recommendation.material_id}`}
                            className={`flex min-h-[52px] items-center rounded-xl border px-4 py-3 ${
                              row.score
                                ? index === 0
                                  ? "border-emerald-500/30 bg-emerald-500/5"
                                  : "border-slate-800 bg-slate-900"
                                : "border-slate-800 bg-slate-900"
                            }`}
                          >

                            <span
                              className={`text-sm font-semibold ${
                                row.score
                                  ? "text-emerald-400"
                                  : "text-slate-300"
                              }`}
                            >
                              {value}
                            </span>

                          </div>

                        );

                      }
                    )}

                  </div>

                )
              )}

            </div>


            {/* REASONS */}

            <div className="mt-6">

              <h3 className="mb-3 text-lg font-bold text-white">
                Why these materials ranked highly
              </h3>


              <div className="grid grid-cols-3 gap-3">

                {materials.map(
                  ({
                    recommendation,
                  }) => (

                    <div
                      key={
                        recommendation.material_id
                      }
                      className="rounded-2xl border border-slate-800 bg-slate-900 p-5"
                    >

                      <p className="text-sm font-semibold text-emerald-400">

                        #{recommendation.rank}{" "}

                        {recommendation.material_name}

                      </p>


                      <p className="mt-2 text-sm leading-6 text-slate-400">

                        {recommendation.reason ||
                          "No explanation available."}

                      </p>

                    </div>

                  )
                )}

              </div>

            </div>


            {/* INSIGHT */}

            <div className="mt-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">

              <div className="flex gap-3">

                <div className="text-xl">
                  💡
                </div>


                <div>

                  <h4 className="font-semibold text-emerald-400">
                    Comparison insight
                  </h4>


                  <p className="mt-1 text-sm leading-6 text-slate-400">

                    The highest score represents the material with the
                    strongest overall suitability for the selected food,
                    storage conditions, transport requirements and priority.
                    A lower-ranked material may still be preferable when
                    factors such as cost or sustainability are more important.

                  </p>

                </div>

              </div>

            </div>


            {/* CLOSE */}

            <button
              onClick={onClose}
              className="mt-6 w-full rounded-xl bg-emerald-500 px-6 py-4 font-bold text-slate-950 transition hover:bg-emerald-400"
            >
              Done Comparing
            </button>

          </div>

        </div>

      </div>

    </div>

  );

}


/* =========================================================
   DECISION STEP
========================================================= */

function DecisionStep({
  number,
  icon,
  title,
  description,
}) {

  return (

    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">

      <div className="mb-5 flex items-center justify-between">

        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-xl">
          {icon}
        </div>


        <span className="text-xs font-bold tracking-widest text-slate-600">
          STEP {number}
        </span>

      </div>


      <h4 className="text-lg font-bold text-white">
        {title}
      </h4>


      <p className="mt-2 text-sm leading-6 text-slate-400">
        {description}
      </p>

    </div>

  );

}


/* =========================================================
   SCORE FACTOR
========================================================= */

function ScoreFactor({
  title,
  description,
}) {

  return (

    <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">

      <p className="text-sm font-semibold text-emerald-400">
        {title}
      </p>


      <p className="mt-1 text-xs leading-5 text-slate-500">
        {description}
      </p>

    </div>

  );

}


export default App;