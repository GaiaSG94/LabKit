// Chemistry HUD left column: the bench inventory.
// Four stacked sections, all visible at once: Instruments (measuring devices
// with their live readout), Material (the lab equipment standing on the bench),
// Knobs (the config sliders) and Laws (the rules the simulation applies).
import { chEsc, CH_INSTRUMENTS, CH_MATERIAL } from "./hud-shared.js";

export function buildLeftColumn({ add, config, ctx }) {
  const col = add('<aside class="ch-left ch-gx"></aside>');
  const sections = [
    buildInstruments(col, config, ctx),
    buildMaterial(col, config, ctx),
    buildKnobs(col, config, ctx),
    buildLaws(col, config, ctx),
  ];
  return {
    element: col,
    refresh() {
      sections.forEach((s) => s.refresh());
    },
  };
}

// --- instruments: a switch plus the live value of the metric it reads -------

function buildInstruments(col, config, ctx) {
  const card = section(col, "Instruments", "select your measuring devices");
  const metrics = new Map(config.metrics.map((m) => [m.source, m]));
  const rows = CH_INSTRUMENTS.map((item) => {
    const metric = metrics.get(item.metric);
    const row = switchRow(card, item, ctx);
    return { item, metric, ...row };
  });
  return {
    refresh() {
      const values = ctx.metricValues();
      rows.forEach((r) => {
        const on = ctx.instrumentActive(r.item);
        r.box.checked = on;
        r.row.classList.toggle("off", !on);
        if (!r.metric) return;
        const v = values[r.metric.id] || 0;
        r.readout.textContent = on ? format(v, r.metric) : "off";
      });
    },
  };
}

// --- material: the lab equipment standing on the bench ---------------------

function buildMaterial(col, config, ctx) {
  const card = section(col, "Material", "select the equipment on the bench");
  const rows = CH_MATERIAL.map((item) => {
    const row = switchRow(card, item, ctx);
    const entry = { item, ...row };
    if (item.id === "burette") {
      entry.quick = buretteButtons(row.row, ctx);
    }
    return entry;
  });
  return {
    refresh() {
      rows.forEach((r) => {
        const on = ctx.instrumentActive(r.item);
        r.box.checked = on;
        r.row.classList.toggle("off", !on);
        if (r.quick) r.quick.querySelectorAll("button").forEach((b) => { b.disabled = !on; });
      });
    },
  };
}

// --- knobs: the config sliders (burner power, burette volume) --------------

function buildKnobs(col, config, ctx) {
  const card = section(col, "Knobs", `${config.controls.length} settings`);
  const rows = config.controls.map((c) => {
    const wrap = document.createElement("div");
    wrap.className = "ch-ctl";
    wrap.innerHTML =
      `<label for="ch-ctl-${c.path}"><span>${chEsc(c.label)}</span><output></output></label>` +
      `<input id="ch-ctl-${c.path}" type="range" min="${c.min}" max="${c.max}" step="${c.step}">`;
    const input = wrap.querySelector("input");
    const out = wrap.querySelector("output");
    input.addEventListener("input", () => {
      ctx.setControl(c.path, parseFloat(input.value));
      out.textContent = input.value;
    });
    card.appendChild(wrap);
    return { c, input, out, last: null };
  });
  return {
    refresh() {
      rows.forEach((r) => {
        const v = ctx.getControl(r.c.path);
        if (v === r.last) return;
        r.last = v;
        r.input.value = String(v);
        r.out.textContent = String(Math.round(v * 100) / 100);
      });
    },
  };
}

// --- laws: one switch per rule, with its notice ----------------------------

function buildLaws(col, config, ctx) {
  const card = section(col, "Laws", `${config.laws.length} rules`);
  const rows = config.laws.map((l, i) => {
    const mod = ctx.catalog.laws[l.law];
    const label = mod ? mod.notice.label : l.law;
    const key = `${l.law}#${i}`;
    const row = document.createElement("div");
    row.className = "ch-law";
    row.innerHTML =
      '<label class="ch-sw"><input type="checkbox"><span></span></label>' +
      `<span class="nm">${chEsc(label)}</span>`;
    const box = row.querySelector("input");
    box.setAttribute("aria-label", `Enable ${label}`);
    box.addEventListener("change", () => {
      ctx.setActive("laws", key, box.checked);
      ctx.touch();
    });
    card.appendChild(row);
    if (mod && mod.notice) card.appendChild(notice(mod.notice, label, row));
    return { key, box };
  });
  return {
    refresh() {
      rows.forEach((r) => {
        const on = ctx.isActive("laws", r.key);
        if (r.box.checked !== on) r.box.checked = on;
      });
    },
  };
}

// --- shared bits -----------------------------------------------------------

function switchRow(card, item, ctx) {
  const row = document.createElement("div");
  row.className = "ch-instrument";
  row.innerHTML = '<label class="ch-check"><input type="checkbox"><span></span></label><span class="nm"></span><span class="readout"></span>';
  row.querySelector(".nm").textContent = item.label;
  const box = row.querySelector("input");
  box.setAttribute("aria-label", `Use ${item.label}`);
  box.addEventListener("change", () => ctx.setInstrument(item, box.checked));
  card.appendChild(row);
  return { row, box, readout: row.querySelector(".readout") };
}

function buretteButtons(row, ctx) {
  const quick = document.createElement("div");
  quick.className = "ch-instrument-quick";
  quick.innerHTML =
    '<button type="button" class="ink" data-ml="1">+1 mL</button>' +
    '<button type="button" data-ml="5">+5 mL</button>' +
    '<button type="button" data-ml="drain">Drain</button>';
  quick.querySelectorAll("button").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (btn.dataset.ml === "drain") ctx.drainBurette();
      else ctx.dispense(Number(btn.dataset.ml));
    });
  });
  row.appendChild(quick);
  return quick;
}

function notice(info, label, row) {
  const ib = document.createElement("button");
  ib.type = "button";
  ib.className = "ch-ib";
  ib.textContent = "i";
  ib.setAttribute("aria-label", `About ${label}`);
  ib.setAttribute("aria-expanded", "false");
  row.appendChild(ib);
  const nb = document.createElement("div");
  nb.className = "ch-notice";
  nb.innerHTML =
    `<b>${chEsc(label)}</b><br>Rule: ${chEsc(info.formule)}<br>` +
    `Sources: ${chEsc(info.sources)}<br>Limits: ${chEsc(info.limites)}`;
  ib.addEventListener("click", () => ib.setAttribute("aria-expanded", String(nb.classList.toggle("open"))));
  return nb;
}

function format(v, metric) {
  const n = metric.source === "precipite" ? v.toFixed(3) : Math.round(v * 10) / 10;
  return metric.unit ? `${n} ${metric.unit}` : String(n);
}

function section(parent, title, hint) {
  const card = document.createElement("section");
  card.className = "ch-lsec";
  card.innerHTML = `<h3>${chEsc(title)}${hint ? `<small>${chEsc(hint)}</small>` : ""}</h3>`;
  parent.appendChild(card);
  return card;
}
