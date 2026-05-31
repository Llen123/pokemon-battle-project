const API = "https://pokeapi.co/api/v2/pokemon";

const TYPE_COLORS = {
  normal:   "#9a9a8a", fire:     "#d44020", water:    "#2e7db8", grass:    "#3d8f3d",
  electric: "#c8a000", ice:      "#5fa8c8", fighting: "#9a3020", poison:   "#7040a0",
  ground:   "#b88820", flying:   "#6870c8", psychic:  "#d82878", bug:      "#6a8820",
  rock:     "#a09038", ghost:    "#503870", dragon:   "#3820d8", dark:     "#403028",
  steel:    "#8888a8", fairy:    "#d070b8",
};

const TYPE_CHART = {
  normal:   { rock: 0.5, ghost: 0, steel: 0.5 },
  fire:     { fire: 0.5, water: 0.5, grass: 2, ice: 2, bug: 2, rock: 0.5, dragon: 0.5, steel: 2 },
  water:    { fire: 2, water: 0.5, grass: 0.5, ground: 2, rock: 2, dragon: 0.5 },
  grass:    { fire: 0.5, water: 2, grass: 0.5, poison: 0.5, ground: 2, flying: 0.5, bug: 0.5, rock: 2, dragon: 0.5, steel: 0.5 },
  electric: { water: 2, electric: 0.5, grass: 0.5, ground: 0, flying: 2, dragon: 0.5 },
  ice:      { fire: 0.5, water: 0.5, grass: 2, ice: 0.5, ground: 2, flying: 2, dragon: 2, steel: 0.5 },
  fighting: { normal: 2, ice: 2, poison: 0.5, flying: 0.5, psychic: 0.5, bug: 0.5, rock: 2, ghost: 0, dark: 2, steel: 2, fairy: 0.5 },
  poison:   { grass: 2, poison: 0.5, ground: 0.5, rock: 0.5, ghost: 0.5, steel: 0, fairy: 2 },
  ground:   { fire: 2, electric: 2, grass: 0.5, poison: 2, flying: 0, bug: 0.5, rock: 2, steel: 2 },
  flying:   { electric: 0.5, grass: 2, fighting: 2, bug: 2, rock: 0.5, steel: 0.5 },
  psychic:  { fighting: 2, poison: 2, psychic: 0.5, dark: 0, steel: 0.5 },
  bug:      { fire: 0.5, grass: 2, fighting: 0.5, flying: 0.5, ghost: 0.5, steel: 0.5, psychic: 2, dark: 2, fairy: 0.5 },
  rock:     { fire: 2, ice: 2, fighting: 0.5, ground: 0.5, flying: 2, bug: 2, steel: 0.5 },
  ghost:    { normal: 0, psychic: 2, ghost: 2, dark: 0.5 },
  dragon:   { dragon: 2, steel: 0.5, fairy: 0 },
  dark:     { fighting: 0.5, ghost: 2, psychic: 2, dark: 0.5, fairy: 0.5 },
  steel:    { fire: 0.5, water: 0.5, electric: 0.5, ice: 2, rock: 2, steel: 0.5, fairy: 2 },
  fairy:    { fire: 0.5, fighting: 2, dragon: 2, dark: 2, steel: 0.5, poison: 0.5 },
};

let battleData = [null, null];
let allPokemonNames = [];

async function preloadPokemonNames() {
  try {
    const response = await fetch("https://pokeapi.co/api/v2/pokemon?limit=1200");
    const data = await response.json();
    allPokemonNames = data.results.map(p => p.name);
  } catch (error) {
    console.error("Error precargando nombres de Pokémon:", error);
  }
}
preloadPokemonNames();

async function fetchPokemon(query) {
  const res = await fetch(`${API}/${query.toLowerCase().trim()}`);
  if (!res.ok) throw new Error("not found");
  return res.json();
}

async function fetchMoveTypeInfo(moveUrl) {
  try {
    const res = await fetch(moveUrl, { cache: "force-cache" });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.damage_class && data.damage_class.name !== "status") {
      return { name: data.name, type: data.type.name };
    }
    return null;
  } catch (err) {
    console.error("Error al obtener movimiento:", err);
    return null;
  }
}

function getOffensiveMultiplier(attackingType, defendingType) {
  const table = TYPE_CHART[attackingType];
  if (!table) return 1;
  return table[defendingType] !== undefined ? table[defendingType] : 1;
}

function typePills(types) {
  return types
    .map(t => `<span class="type-pill" style="background:${TYPE_COLORS[t] || "#666"}">${t}</span>`)
    .join("");
}

function getFullDefensiveWeaknesses(defenderTypes) {
  const results = {};
  const allTypes = Object.keys(TYPE_CHART);

  for (const atkType of allTypes) {
    let mult = 1;
    for (const defType of defenderTypes) {
       mult *= getOffensiveMultiplier(atkType, defType);
    }
    if (mult > 1) results[atkType] = mult;
  }
  return results;
}

function showWeaknesses(pokemonData) {
  const container = document.getElementById("p2-weaknesses");
  if (!container) return;

  const types = pokemonData.types.map(t => t.type.name);
  const weaknesses = getFullDefensiveWeaknesses(types);

  if (Object.keys(weaknesses).length === 0) {
    container.innerHTML = `<p class="no-advantage">No tiene debilidades conocidas.</p>`;
    container.classList.remove("hidden");
    return;
  }

  const x4 = Object.entries(weaknesses).filter(([,v]) => v >= 4);
  const x2 = Object.entries(weaknesses).filter(([,v]) => v === 2);

  let html = `<p class="advantage-text"><strong>Súper efectivo contra ${pokemonData.name.toUpperCase()}:</strong></p>`;

  if (x4.length > 0) {
    html += `<div class="defense-row">
      <span class="def-label status-weak">💥 x4:</span>
      <div class="type-list">${x4.map(([t]) => `<span class="type-pill" style="background:${TYPE_COLORS[t]||'#666'}">${t}</span>`).join("")}</div>
    </div>`;
  }
  if (x2.length > 0) {
    html += `<div class="defense-row">
      <span class="def-label status-weak">⚡ x2:</span>
      <div class="type-list">${x2.map(([t]) => `<span class="type-pill" style="background:${TYPE_COLORS[t]||'#666'}">${t}</span>`).join("")}</div>
    </div>`;
  }

  container.innerHTML = html;
  container.classList.remove("hidden");
}


function showStats(pokemonData, slot) {
  const container = document.getElementById(`b${slot}-stats`);
  if (!container) return;

  const statNames = {
    "hp": "HP", "attack": "ATK", "defense": "DEF",
    "special-attack": "Sp.ATK", "special-defense": "Sp.DEF", "speed": "SPD"
  };
  const statColors = {
    "hp": "#4caf50", "attack": "#f44336", "defense": "#2196f3",
    "special-attack": "#9c27b0", "special-defense": "#00bcd4", "speed": "#ff9800"
  };

  const MAX_STAT = 255;

  let html = `<div class="stats-box">`;
  for (const s of pokemonData.stats) {
    const key   = s.stat.name;
    const value = s.base_stat;
    const pct   = Math.round((value / MAX_STAT) * 100);
    const label = statNames[key] || key;
    const color = statColors[key] || "#888";

    html += `
      <div class="stat-row">
        <span class="stat-label">${label}</span>
        <span class="stat-value">${value}</span>
        <div class="stat-bar-bg">
          <div class="stat-bar-fill" style="width:${pct}%; background:${color};"></div>
        </div>
      </div>`;
  }
  html += `</div>`;

  container.innerHTML = html;
  container.classList.remove("hidden");
}


async function loadBattleSlot(slot) {
  const idx     = slot - 1;
  const input   = document.getElementById(`b${slot}-input`);
  const errorEl = document.getElementById(`b${slot}-error`);
  const preview = document.getElementById(`b${slot}-preview`);
  const query   = input.value.trim();

  errorEl.classList.add("hidden");
  preview.classList.add("hidden");

  if (!query) return;

  try {
    const data = await fetchPokemon(query);
    battleData[idx] = data;

    const types  = data.types.map(t => t.type.name);
    const imgSrc = data.sprites.other["official-artwork"]?.front_default || data.sprites.front_default;
    preview.innerHTML = `
      <img src="${imgSrc}" alt="${data.name}">
      <div class="battle-preview-name">
        <a class="pokemon-wiki-link" href="https://www.wikidex.net/wiki/${data.name.charAt(0).toUpperCase() + data.name.slice(1)}" target="_blank" rel="noopener noreferrer">
          ${data.name}
        </a>
      </div>>
      <div class="type-list">${typePills(types)}</div>
    `;
    preview.classList.remove("hidden");
    showStats(data, slot);
      if (slot === 2) {
    showWeaknesses(data);
  } else {
    const w = document.getElementById("p2-weaknesses");
    if (w) w.classList.add("hidden");
  }
  } catch (err) {
    battleData[idx] = null;
    document.getElementById(`b${slot}-stats`)?.classList.add("hidden");
    if (slot === 2) {
      const w = document.getElementById("p2-weaknesses");
    if (w) w.classList.add("hidden");
    }
    errorEl.classList.remove("hidden");
  }

  const bothLoaded = battleData[0] !== null && battleData[1] !== null;
  document.getElementById("battle-go").classList.toggle("hidden", !bothLoaded);
  document.getElementById("battle-result").classList.add("hidden");
}

async function runBattle() {
  const p1 = battleData[0];
  const p2 = battleData[1];
  if (!p1 || !p2) return;

  const buttonEl = document.getElementById("battle-go");
  const resultEl = document.getElementById("battle-result");

  buttonEl.textContent = "Analizando movimientos dinámicamente...";
  buttonEl.disabled = true;

  const types1 = p1.types.map(t => t.type.name);
  const types2 = p2.types.map(t => t.type.name);

  async function resolveMovesetDetails(pokemonData) {
    if (!pokemonData.moves || pokemonData.moves.length === 0) return {};

    const promises = pokemonData.moves.map(m => fetchMoveTypeInfo(m.move.url));
    const resolvedMoves = await Promise.all(promises);

    const movesFound = {};
    resolvedMoves.forEach(move => {
      if (move) {
        if (!movesFound[move.type]) movesFound[move.type] = [];
        const formattedName = move.name.replace("-", " ");
        if (!movesFound[move.type].includes(formattedName)) {
          movesFound[move.type].push(formattedName);
        }
      }
    });
    return movesFound;
  }

  const [p1MovesDetails, p2MovesDetails] = await Promise.all([
    resolveMovesetDetails(p1),
    resolveMovesetDetails(p2)
  ]);

  buttonEl.textContent = "Analizar batalla";
  buttonEl.disabled = false;

  function getOffensiveAnalysis(baseTypes, movesDetails, defenderTypes) {
    const nativeAdvantages   = [];
    const coverageAdvantages = [];
    const allOffensiveTypes  = new Set([...baseTypes, ...Object.keys(movesDetails)]);

    for (const type of allOffensiveTypes) {
      let mult = 1;
      for (const def of defenderTypes) mult *= getOffensiveMultiplier(type, def);

      if (mult > 1) {
        if (baseTypes.includes(type)) {
          nativeAdvantages.push(type);
        } else if (movesDetails[type]?.length > 0) {
          coverageAdvantages.push({ type, moves: movesDetails[type] });
        }
      }
    }
    return { native: nativeAdvantages, coverage: coverageAdvantages };
  }

  function getDefensiveAnalysis(defenderTypes, attackerBaseTypes) {
    const weaknesses  = [];
    const resistances = [];

    for (const atk of attackerBaseTypes) {
      let mult = 1;
      for (const def of defenderTypes) mult *= getOffensiveMultiplier(atk, def);

      if (mult > 1)              weaknesses.push(atk);
      else if (mult < 1 && mult > 0) resistances.push(atk);
      else if (mult === 0)       resistances.push(`${atk} (inmune)`);
    }
    return {
      weaknesses:  [...new Set(weaknesses)],
      resistances: [...new Set(resistances)],
    };
  }

  const p1Offense = getOffensiveAnalysis(types1, p1MovesDetails, types2);
  const p2Offense = getOffensiveAnalysis(types2, p2MovesDetails, types1);
  const p1Defense = getDefensiveAnalysis(types1, types2);
  const p2Defense = getDefensiveAnalysis(types2, types1);

  function customTypePills(typeArray) {
    return typeArray.map(t => `<span class="type-pill" style="background:${TYPE_COLORS[t] || "#666"}">${t}</span>`).join("");
  }

  function buildAnalysisHTML(offense, defense) {
    let html = `<p class="advantage-text"><strong>Ataque Base (STAB):</strong></p>`;
    if (offense.native.length === 0) {
      html += `<p class="no-advantage">Sus tipos nativos hacen daño neutro o poco eficaz.</p>`;
    } else {
      html += `<div class="type-list">${customTypePills(offense.native)}</div>`;
    }

    html += `<p class="advantage-text status-spacing"><strong>Movimientos de Cobertura Disponibles:</strong></p>`;
    if (offense.coverage.length === 0) {
      html += `<p class="no-advantage">No posee movimientos eficaces de cobertura en su moveset para este rival.</p>`;
    } else {
      html += `<div class="coverage-list">`;
      offense.coverage.forEach(cov => {
        html += `
          <div class="coverage-item">
            <span class="type-pill" style="background:${TYPE_COLORS[cov.type] || "#666"}">${cov.type}</span>
            <span class="coverage-moves-names">${cov.moves.join(", ")}</span>
          </div>`;
      });
      html += `</div>`;
    }

    html += `<p class="advantage-text status-spacing"><strong>Defensa frente al rival:</strong></p>`;
    if (defense.weaknesses.length === 0 && defense.resistances.length === 0) {
      html += `<p class="no-advantage">Recibe daño normal (x1) de todos los tipos del rival.</p>`;
    } else {
      if (defense.weaknesses.length > 0) {
        html += `
          <div class="defense-row">
            <span class="def-label status-weak">⚠️ Débil a:</span>
            <div class="type-list">${customTypePills(defense.weaknesses)}</div>
          </div>`;
      }
      if (defense.resistances.length > 0) {
        html += `
          <div class="defense-row">
            <span class="def-label status-resist">✅ Resiste:</span>
            <div class="type-list">${customTypePills(defense.resistances)}</div>
          </div>`;
      }
    }
    return html;
  }

  resultEl.innerHTML = `
    <div class="result-heading">Análisis Dinámico de Coberturas de la API</div>
    <div class="battle-analysis-box">
      <div class="analysis-section">
        <div class="pokemon-analysis-title">${p1.name.toUpperCase()}</div>
        ${buildAnalysisHTML(p1Offense, p1Defense)}
      </div>
      <div class="analysis-divider"></div>
      <div class="analysis-section">
        <div class="pokemon-analysis-title">${p2.name.toUpperCase()}</div>
        ${buildAnalysisHTML(p2Offense, p2Defense)}
      </div>
    </div>
  `;
  resultEl.classList.remove("hidden");
}

function setupAutocomplete(inputId, dropdownId, onSelectCallback) {
  const input    = document.getElementById(inputId);
  const dropdown = document.getElementById(dropdownId);
  if (!input || !dropdown) return;

  input.addEventListener("input", (e) => {
    const value = e.target.value.toLowerCase().trim();
    if (value.length < 1) { dropdown.classList.add("hidden"); return; }

    const filtered = allPokemonNames.filter(name => name.startsWith(value));
    if (filtered.length === 0) { dropdown.classList.add("hidden"); return; }

    dropdown.innerHTML = filtered.slice(0, 6)
      .map(name => `<div class="suggestion-item">${name}</div>`)
      .join("");
    dropdown.classList.remove("hidden");
  });

  dropdown.addEventListener("click", (e) => {
    if (e.target.classList.contains("suggestion-item")) {
      input.value = e.target.textContent;
      dropdown.classList.add("hidden");
      onSelectCallback(e.target.textContent);
    }
  });

  document.addEventListener("click", (e) => {
    if (!input.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.classList.add("hidden");
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  setupAutocomplete("b1-input", "suggestions-box-0", () => loadBattleSlot(1));
  setupAutocomplete("b2-input", "suggestions-box-1", () => loadBattleSlot(2));

  document.querySelectorAll(".slot-btn").forEach(btn => {
    btn.addEventListener("click", () => loadBattleSlot(parseInt(btn.dataset.slot)));
  });

  document.getElementById("b1-input").addEventListener("keydown", e => {
    if (e.key === "Enter") loadBattleSlot(1);
  });

  document.getElementById("b2-input").addEventListener("keydown", e => {
    if (e.key === "Enter") loadBattleSlot(2);
  });

  document.getElementById("battle-go").addEventListener("click", runBattle);
  const root        = document.documentElement;
  const toggleBtn   = document.getElementById("theme-toggle");
  const saved       = localStorage.getItem("theme");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

  // Aplicar tema inicial
  const initial = saved || (prefersDark ? "dark" : "light");
  root.setAttribute("data-theme", initial);
  toggleBtn.textContent = initial === "dark" ? "☀️" : "🌙";

  toggleBtn.addEventListener("click", () => {
  const current = root.getAttribute("data-theme");
  const next    = current === "dark" ? "light" : "dark";
  root.setAttribute("data-theme", next);
  localStorage.setItem("theme", next);
  toggleBtn.textContent = next === "dark" ? "☀️" : "🌙";
  });
});