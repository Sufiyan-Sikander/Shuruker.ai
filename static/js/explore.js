/* Explore page interactions: chart, city slicer, and probability helper */

let months = [];
let citySeries = {};
let exploreData = null;

const colorPalette = ['#7b61ff', '#ff6a5b', '#10b981', '#f59e0b', '#3b82f6', '#ec4899'];
let chartInstance = null;

async function loadExploreData() {
  try {
    const response = await fetch('/data/explore_data.json');
    if (!response.ok) {
      throw new Error('Failed to load data');
    }
    exploreData = await response.json();
    console.log('Loaded explore data:', exploreData);
    
    // Transform data format
    if (exploreData.categories) {
      const categories = Object.keys(exploreData.categories);
      const firstCat = exploreData.categories[categories[0]];
      months = firstCat.labels.map(label => {
        const date = new Date(label + '-01');
        return date.toLocaleDateString('en-US', { month: 'short' });
      });
      
      // Build citySeries from loaded data
      const cities = Object.keys(firstCat.cities);
      citySeries = {};
      cities.forEach(city => {
        citySeries[city] = {};
        categories.forEach(cat => {
          citySeries[city][cat] = exploreData.categories[cat].cities[city];
        });
      });
      console.log('Transformed citySeries:', citySeries);
    }
    return true;
  } catch (error) {
    console.error('Failed to load explore data:', error);
    return false;
  }
}

function averageArrays(arrays) {
  const length = arrays[0].length;
  const sums = new Array(length).fill(0);
  arrays.forEach(a => a.forEach((v, i) => { sums[i] += v; }));
  return sums.map(v => Math.round(v / arrays.length));
}

function aggregatePakistan() {
  const categories = Object.keys(citySeries[Object.keys(citySeries)[0]]);
  const aggregated = {};
  categories.forEach(cat => {
    const seriesList = Object.values(citySeries).map(city => city[cat]);
    aggregated[cat] = averageArrays(seriesList);
  });
  return aggregated;
}

function getCityData(city) {
  return city === 'all' ? aggregatePakistan() : citySeries[city];
}

function calcGrowth(series) {
  const first = series[0];
  const last = series[series.length - 1];
  return first === 0 ? 0 : ((last - first) / first);
}

function buildDatasets(city) {
  const data = getCityData(city);
  const categories = Object.keys(data);
  const ranked = categories
    .map(cat => ({ cat, growth: calcGrowth(data[cat]), last: data[cat][data[cat].length - 1] }))
    .sort((a, b) => b.last - a.last)
    .slice(0, 4);

  return ranked.map((item, idx) => ({
    label: item.cat,
    data: data[item.cat],
    borderColor: colorPalette[idx % colorPalette.length],
    backgroundColor: colorPalette[idx % colorPalette.length],
    tension: 0.35,
    pointRadius: 3,
    pointHoverRadius: 5,
    fill: false,
    borderWidth: 3
  }));
}

function renderLegend(datasets) {
  const legendEl = document.getElementById('legend');
  legendEl.innerHTML = datasets.map(ds => `
    <span class="legend-item">
      <span class="dot" style="background:${ds.borderColor}"></span>${ds.label}
    </span>
  `).join('');
}

function renderTopMovers() {
  const container = document.getElementById('topMovers');
  const data = aggregatePakistan();
  const movers = Object.keys(data)
    .map(cat => {
      const series = data[cat];
      return { cat, growth: calcGrowth(series), momentum: series[series.length - 1] };
    })
    .sort((a, b) => b.growth - a.growth)
    .slice(0, 4);

  container.innerHTML = movers.map(item => {
    const growthPct = Math.round(item.growth * 100);
    return `
      <div class="panel-row">
        <div>
          <div class="label-strong">${item.cat}</div>
          <div class="muted">Pakistan · trend score ${item.momentum}</div>
        </div>
        <span class="pill pill-green">+${growthPct}%</span>
      </div>
    `;
  }).join('');
}

function renderInsights(city) {
  const container = document.getElementById('insightList');
  const data = getCityData(city);
  const entries = Object.keys(data).map(cat => ({
    cat,
    growth: calcGrowth(data[cat]),
    last: data[cat][data[cat].length - 1]
  }));

  const hottest = [...entries].sort((a, b) => b.growth - a.growth)[0];
  const stable = [...entries].sort((a, b) => Math.abs(b.growth) - Math.abs(a.growth)).slice(-1)[0];
  const volume = [...entries].sort((a, b) => b.last - a.last)[0];

  container.innerHTML = `
    <div class="insight">
      <div class="pill pill-green">High momentum</div>
      <p>${hottest.cat} is the fastest riser here with ~${Math.round(hottest.growth * 100)}% growth over the last 6 months.</p>
    </div>
    <div class="insight">
      <div class="pill pill-amber">Steady</div>
      <p>${stable.cat} is growing steadily; good for operators who prefer predictable demand.</p>
    </div>
    <div class="insight">
      <div class="pill pill-ghost">High volume</div>
      <p>${volume.cat} shows the highest demand score right now—competition will be higher, so differentiate on niche and experience.</p>
    </div>
  `;
}

function updateChart(city) {
  const datasets = buildDatasets(city);
  const ctx = document.getElementById('trendChart');

  if (chartInstance) {
    chartInstance.data.labels = months;
    chartInstance.data.datasets = datasets;
    chartInstance.update();
  } else {
    chartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: months,
        datasets
      },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: false,
            grid: { color: 'rgba(0,0,0,0.05)' },
            ticks: { color: '#4b5563' }
          },
          x: {
            ticks: { color: '#4b5563' },
            grid: { display: false }
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.dataset.label}: ${ctx.formattedValue}`
            }
          }
        }
      }
    });
  }

  renderLegend(datasets);
  renderInsights(city);
  const cityPulse = document.getElementById('cityPulse');
  cityPulse.textContent = city === 'all' ? 'Pakistan view' : `${city} view`;
}

// Probability helper
function clamp(num, min, max) { return Math.min(Math.max(num, min), max); }

function categoryHeat(category, city) {
  const data = getCityData(city === 'all' ? 'all' : city);
  const series = data[category] || Object.values(data)[0];
  const growth = calcGrowth(series);
  const latest = series[series.length - 1];
  return clamp((growth * 0.6) + (latest / 150) * 0.4, 0, 1); // scale to 0-1
}

function cityWeight(city) {
  const weights = {
    Karachi: 0.1,
    Lahore: 0.08,
    Islamabad: 0.07,
    Rawalpindi: 0.06,
    Faisalabad: 0.05,
    Multan: 0.05
  };
  return weights[city] || 0.05;
}

function budgetWeight(budget) {
  if (budget === 'high') return 0.1;
  if (budget === 'mid') return 0.05;
  return -0.08;
}

function advantageWeight(values) {
  let total = 0;
  values.forEach(v => {
    if (v === 'experience') total += 0.06;
    if (v === 'location') total += 0.04;
    if (v === 'audience') total += 0.05;
  });
  return total;
}

function labelForScore(score) {
  if (score >= 0.78) return { title: 'High potential', tone: 'green' };
  if (score >= 0.62) return { title: 'Promising with focus', tone: 'amber' };
  if (score >= 0.48) return { title: 'Medium — test and validate', tone: 'amber' };
  return { title: 'Caution — validate more', tone: 'red' };
}

function buildRecommendations(score, category, city, advantages, budget) {
  const recs = [];
  if (score >= 0.62) {
    recs.push('Lock a niche within the category (audience, ticket size, or service level).');
    recs.push('Pilot with a 4-week budget and track CAC, repeat purchase, and payback time.');
  } else {
    recs.push('Run a small test (landing page + ads or WhatsApp lead form) before committing capital.');
    recs.push('Collect 50-100 leads to see conversion and pricing tolerance.');
  }

  if (budget === 'low') recs.push('Start asset-light: sublet kitchens, consignment inventory, or pre-orders to de-risk cash.');
  if (!advantages.includes('audience')) recs.push('Partner with micro-creators or local communities to get your first 200 customers.');
  if (!advantages.includes('location') && category === 'Cloud Kitchen') recs.push('Use delivery-only ghost kitchens or shared kitchens to avoid lease risk.');
  recs.push(`Watch competitors in ${city}: pricing, delivery time, and offers — differentiate with speed or specialization.`);
  return recs.slice(0, 4);
}

function handleProbabilitySubmit(e) {
  e.preventDefault();
  const idea = document.getElementById('ideaInput').value.trim();
  const category = document.getElementById('categorySelect').value;
  const city = document.getElementById('probCitySelect').value;
  const budget = document.getElementById('budgetSelect').value;
  const advantageChecks = Array.from(document.querySelectorAll('.checkbox-group input:checked')).map(i => i.value);

  const base = 0.48;
  const heat = categoryHeat(category === 'Other' ? 'Cloud Kitchen' : category, city);
  const scoreRaw = base + heat * 0.22 + cityWeight(city) + budgetWeight(budget) + advantageWeight(advantageChecks);
  const score = clamp(scoreRaw, 0.18, 0.92);

  const percent = Math.round(score * 100);
  const label = labelForScore(score);

  const scoreEl = document.getElementById('score');
  const labelEl = document.getElementById('scoreLabel');
  const noteEl = document.getElementById('scoreNote');
  const recEl = document.getElementById('recommendations');

  scoreEl.textContent = `${percent}%`;
  labelEl.textContent = label.title;
  noteEl.textContent = `${idea ? idea : 'Your idea'} in ${city}: based on trend heat, budget, and your edges.`;

  recEl.innerHTML = buildRecommendations(score, category, city, advantageChecks, budget)
    .map(item => `<div class="rec-item">${item}</div>`)
    .join('');
}

function initProbabilityForm() {
  const form = document.getElementById('probabilityForm');
  form.addEventListener('submit', handleProbabilitySubmit);
}

function initChart() {
  console.log('initChart called');
  console.log('citySeries:', citySeries);
  console.log('months:', months);
  
  if (!citySeries || Object.keys(citySeries).length === 0) {
    console.error('citySeries is empty!');
    return;
  }
  
  updateChart('all');
  renderTopMovers();
}

function bindCitySelector() {
  const select = document.getElementById('citySelect');
  select.addEventListener('change', () => updateChart(select.value));
}

async function initializeExplore() {
  console.log('DOM loaded, starting data fetch...');
  const loaded = await loadExploreData();
  console.log('Data loaded:', loaded);
  
  if (loaded) {
    initChart();
    bindCitySelector();
    renderInsights('all');
    initProbabilityForm();
  } else {
    console.error('Failed to load data, chart not initialized');
  }
}

window.exploreInit = initializeExplore;
window.addEventListener('DOMContentLoaded', initializeExplore);
