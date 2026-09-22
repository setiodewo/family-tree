const LAYOUT = {
  NODE_W: 180,
  NODE_H: 100,
  COUPLE_GAP: 28,
  SIB_GAP: 34,
  GEN_GAP: 104,
  CLUSTER_GAP: 46,
  RADIUS: 16
};

const COLORS = {
  male: ["#4f8ff7", "#2f6fe0"],
  female: ["#f472b6", "#db3f8f"],
  unknown: ["#94a3b8", "#64748b"]
};

class FamilyTree {
  constructor(canvas, family) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.family = family;
    this.view = { x: 0, y: 0, scale: 1 };
    this.cards = [];
    this.units = [];
    this.selectedId = null;
    this.hoverId = null;
    this.hubHoverId = null;
    this.searchIds = new Set();
    this.searchActive = false;
    this.focusPersonId = this.union(family.rootUnionId).partners[0];
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.pointer = { down: false, moved: false, startX: 0, startY: 0, viewX: 0, viewY: 0 };
    this.pinch = null;
    this.build();
    this.resize();
    this.bindEvents();
    this.fit();
  }

  person(id) {
    return this.family.people[id];
  }

  union(id) {
    return this.family.unions.find((u) => u.id === id);
  }

  build() {
    this.root = this.buildUnit(this.focusPersonId, new Set());
    this.measure(this.root);
    this.units = [];
    this.cards = [];
    this.place(this.root, 0, 0);
    this.attachAncestors();
    this.computeBounds();
    this.collectHubs();
  }

  rebuild() {
    this.root = this.buildUnit(this.focusPersonId, new Set());
    this.relayout();
  }

  buildUnit(personId, used) {
    const personUnions = this.family.unions.filter((u) => !used.has(u.id) && u.partners.includes(personId));
    const unit = {
      id: personUnions.length ? personUnions[0].id : "p-" + personId,
      primary: personId,
      marriages: []
    };
    personUnions.forEach((u) => {
      used.add(u.id);
      const spouses = u.partners.filter((pid) => pid !== personId);
      if (!spouses.length) {
        unit.marriages.push({
          unionId: u.id,
          spouseId: null,
          children: u.children.map((childId) => this.buildUnit(childId, used))
        });
        return;
      }
      spouses.forEach((spouseId, i) => {
        unit.marriages.push({
          unionId: u.id,
          spouseId,
          children: i === 0 ? u.children.map((childId) => this.buildUnit(childId, used)) : []
        });
      });
    });

    unit.marriages.sort((a, b) => {
      const ua = this.union(a.unionId);
      const ub = this.union(b.unionId);
      const year = (u) => (u && Number.isFinite(u.marriage) ? u.marriage : Infinity);
      return year(ua) - year(ub);
    });

    return unit;
  }

  measure(unit) {
    let minRel = -LAYOUT.NODE_W / 2;
    let maxRel = LAYOUT.NODE_W / 2;
    const halfW = LAYOUT.NODE_W / 2;
    const halfGap = (LAYOUT.NODE_W + LAYOUT.COUPLE_GAP) / 2;

    unit.marriages.forEach((m) => {
      m.dir = 1;
      if (m.spouseId) {
        const gPrimary = this.person(unit.primary);
        const gSpouse = this.person(m.spouseId);
        if (gPrimary && gPrimary.gender === "female" && gSpouse && gSpouse.gender === "male") m.dir = -1;
      }
      m.span = 0;
      m.children.forEach((child, i) => {
        this.measure(child);
        m.span += child.width;
        if (i > 0) m.span += LAYOUT.SIB_GAP;
      });
    });

    const withSpouse = unit.marriages.filter((m) => m.spouseId);
    const noSpouse = unit.marriages.filter((m) => !m.spouseId);

    withSpouse.forEach((m, i) => {
      m.lineDy = 16 * ((withSpouse.length - 1) / 2 - i);
    });

    noSpouse.forEach((m) => {
      m.relBus = 0;
      m.spouseRel = null;
      minRel = Math.min(minRel, -m.span / 2);
      maxRel = Math.max(maxRel, m.span / 2);
    });

    const right = withSpouse.filter((m) => m.dir === 1);
    const left = withSpouse.filter((m) => m.dir === -1);

    let childRight = null;
    let prevSpouseRelR = null;
    right.forEach((m) => {
      const baseChild = childRight === null ? 0 : childRight + m.span / 2 + LAYOUT.CLUSTER_GAP;
      const baseMate = prevSpouseRelR === null ? 0 : prevSpouseRelR + halfW + LAYOUT.COUPLE_GAP / 2;
      m.relBus = Math.max(halfGap, baseChild, baseMate);
      m.spouseRel = m.relBus + halfGap;
      childRight = m.relBus + m.span / 2;
      prevSpouseRelR = m.spouseRel;
      minRel = Math.min(minRel, m.relBus - m.span / 2);
      maxRel = Math.max(maxRel, m.relBus + m.span / 2, m.spouseRel + halfW);
    });

    let childLeft = null;
    let prevSpouseRelL = null;
    left.forEach((m) => {
      const baseChild = childLeft === null ? 0 : childLeft - m.span / 2 - LAYOUT.CLUSTER_GAP;
      const baseMate = prevSpouseRelL === null ? 0 : prevSpouseRelL - halfW - LAYOUT.COUPLE_GAP / 2;
      m.relBus = Math.min(-halfGap, baseChild, baseMate);
      m.spouseRel = m.relBus - halfGap;
      childLeft = m.relBus - m.span / 2;
      prevSpouseRelL = m.spouseRel;
      minRel = Math.min(minRel, m.relBus - m.span / 2, m.spouseRel - halfW);
      maxRel = Math.max(maxRel, m.relBus + m.span / 2);
    });

    unit.width = maxRel - minRel;
    unit.relMin = minRel;
  }

  place(unit, left, top) {
    const p = left - unit.relMin;
    unit.y = top;
    unit.primaryCenterX = p;
    unit.cards = [];
    const addCard = (personId, x) => {
      const card = { personId, x, y: top, w: LAYOUT.NODE_W, h: LAYOUT.NODE_H };
      unit.cards.push(card);
      this.cards.push(card);
      return card;
    };

    addCard(unit.primary, p - LAYOUT.NODE_W / 2);

    unit.marriages.forEach((m) => {
      if (m.spouseId) {
        m.cardIndex = unit.cards.length;
        addCard(m.spouseId, p + m.spouseRel - LAYOUT.NODE_W / 2);
      }
      if (m.children.length) {
        m.busX = p + m.relBus;
        let startLeft = m.busX - m.span / 2;
        m.children.forEach((child, i) => {
          this.place(child, startLeft, top + LAYOUT.NODE_H + LAYOUT.GEN_GAP);
          startLeft += child.width + LAYOUT.SIB_GAP;
        });
      }
    });

    this.units.push(unit);
  }

  computeBounds() {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    this.cards.forEach((c) => {
      minX = Math.min(minX, c.x);
      minY = Math.min(minY, c.y);
      maxX = Math.max(maxX, c.x + c.w);
      maxY = Math.max(maxY, c.y + c.h);
    });
    this.bounds = { minX, minY, maxX, maxY, w: maxX - minX, h: maxY - minY };
  }

  resize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    this.cssW = rect.width;
    this.cssH = rect.height;
    this.canvas.width = Math.round(rect.width * this.dpr);
    this.canvas.height = Math.round(rect.height * this.dpr);
    this.canvas.style.width = rect.width + "px";
    this.canvas.style.height = rect.height + "px";
    this.draw();
  }

  fit() {
    if (!this.bounds || !this.bounds.w) return;
    const pad = 90;
    const sx = (this.cssW - pad * 2) / this.bounds.w;
    const sy = (this.cssH - pad * 2) / this.bounds.h;
    const scale = Math.max(0.2, Math.min(sx, sy, 1.15));
    this.view.scale = scale;
    this.view.x = this.cssW / 2 - (this.bounds.minX + this.bounds.w / 2) * scale;
    this.view.y = this.cssH / 2 - (this.bounds.minY + this.bounds.h / 2) * scale;
    this.draw();
  }

  centerOn(personId, scale) {
    const card = this.cards.find((c) => c.personId === personId);
    if (!card) return;
    if (scale) this.view.scale = scale;
    const cx = card.x + card.w / 2;
    const cy = card.y + card.h / 2;
    this.view.x = this.cssW / 2 - cx * this.view.scale;
    this.view.y = this.cssH / 2 - cy * this.view.scale;
    this.draw();
  }

  zoomAt(screenX, screenY, factor) {
    const next = Math.max(0.18, Math.min(2.6, this.view.scale * factor));
    const k = next / this.view.scale;
    this.view.x = screenX - (screenX - this.view.x) * k;
    this.view.y = screenY - (screenY - this.view.y) * k;
    this.view.scale = next;
    this.draw();
  }

  screenToWorld(sx, sy) {
    return { x: (sx - this.view.x) / this.view.scale, y: (sy - this.view.y) / this.view.scale };
  }

  cardAt(sx, sy) {
    const p = this.screenToWorld(sx, sy);
    for (let i = this.cards.length - 1; i >= 0; i--) {
      const c = this.cards[i];
      if (p.x >= c.x && p.x <= c.x + c.w && p.y >= c.y && p.y <= c.y + c.h) return c;
    }
    return null;
  }

  collectHubs() {
    this.hubs = [];
    this.units.forEach((unit) => {
      const centerY = unit.y + LAYOUT.NODE_H / 2;
      const primaryX = unit.primaryCenterX;
      unit.marriages.forEach((m) => {
        if (!m.spouseId) return;
        const ankY = centerY + (m.lineDy || 0);
        this.hubs.push({ unionId: m.unionId, x: primaryX + m.relBus, y: ankY });
      });
    });
    this.links.forEach((link) => {
      if (link.parents.length < 2) return;
      const mY = link.rowTop + LAYOUT.NODE_H / 2;
      this.hubs.push({ unionId: link.unionId, x: link.cx, y: mY });
    });
  }

  hubAt(sx, sy) {
    if (!this.hubs.length) return null;
    const p = this.screenToWorld(sx, sy);
    const r = 11 / this.view.scale;
    let best = null;
    let bestD = r;
    this.hubs.forEach((h) => {
      const d = Math.hypot(p.x - h.x, p.y - h.y);
      if (d <= bestD) {
        bestD = d;
        best = h;
      }
    });
    return best;
  }

  hubInfo(hub) {
    const u = this.union(hub.unionId);
    return u && Number.isFinite(u.marriage) ? "Menikah " + u.marriage : "Tahun perkawinan belum diisi";
  }

  select(personId) {
    this.selectedId = personId;
    this.draw();
  }

  relayout() {
    this.measure(this.root);
    this.units = [];
    this.cards = [];
    this.place(this.root, 0, 0);
    this.attachAncestors();
    this.computeBounds();
    this.collectHubs();
    this.fit();
  }

  attachAncestors() {
    this.links = [];
    const known = new Set(this.cards.map((c) => c.personId));
    const queue = this.cards.slice();
    while (queue.length) {
      const card = queue.shift();
      const pu = this.family.unions.find((u) => u.children.includes(card.personId));
      if (!pu || !pu.partners.length) continue;
      if (pu.partners.some((pid) => known.has(pid))) continue;
      const halfGap = (LAYOUT.NODE_W + LAYOUT.COUPLE_GAP) / 2;
      const cx = card.x + card.w / 2;
      const rowTop = card.y - (LAYOUT.NODE_H + LAYOUT.GEN_GAP);
      const couple = pu.partners.length > 1;
      let leftP = pu.partners[0];
      let rightP = pu.partners[1];
      if (couple) {
        const gs = (pid) => (this.person(pid) || {}).gender;
        if (gs(leftP) === "female" && gs(rightP) === "male") {
          leftP = pu.partners[1];
          rightP = pu.partners[0];
        }
      }
      const p1x = cx + (couple ? -halfGap : 0) - LAYOUT.NODE_W / 2;
      const sc1 = { personId: leftP, x: p1x, y: rowTop, w: LAYOUT.NODE_W, h: LAYOUT.NODE_H };
      this.cards.push(sc1);
      known.add(leftP);
      queue.push(sc1);
      const parents = [sc1];
      if (couple) {
        const sc2 = { personId: rightP, x: cx + halfGap - LAYOUT.NODE_W / 2, y: rowTop, w: LAYOUT.NODE_W, h: LAYOUT.NODE_H };
        this.cards.push(sc2);
        known.add(rightP);
        queue.push(sc2);
        parents.push(sc2);
      }
      this.links.push({ cx, childTop: card.y, rowTop, parents, unionId: pu.id });
    }
  }

  setFocus(personId) {
    this.focusPersonId = personId;
    this.root = this.buildUnit(personId, new Set());
    this.relayout();
  }

  resetFocus() {
    this.focusPersonId = this.union(this.family.rootUnionId).partners[0];
    this.root = this.buildUnit(this.focusPersonId, new Set());
    this.relayout();
  }

  isFullTree() {
    return this.focusPersonId === this.union(this.family.rootUnionId).partners[0];
  }

  setSearch(query) {
    const q = query.trim().toLowerCase();
    this.searchIds = new Set();
    this.searchActive = q.length > 0;
    if (this.searchActive) {
      Object.values(this.family.people).forEach((p) => {
        const full = (p.first + " " + p.last).toLowerCase();
        if (full.includes(q) || String(p.birth).includes(q)) this.searchIds.add(p.id);
      });
    }
    this.draw();
  }

  draw() {
    const ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.cssW, this.cssH);
    this.drawBackground();

    ctx.save();
    ctx.translate(this.view.x, this.view.y);
    ctx.scale(this.view.scale, this.view.scale);
    this.units.forEach((u) => this.drawConnectors(u));
    this.drawAncestors();
    this.cards.forEach((c) => this.drawCard(c));
    ctx.restore();
  }

  drawAncestors() {
    const ctx = this.ctx;
    ctx.lineCap = "round";
    this.links.forEach((link) => {
      const [c1, c2] = link.parents;
      const c1cx = c1.x + c1.w / 2;
      if (c2) {
        const c2cx = c2.x + c2.w / 2;
        const mY = link.rowTop + LAYOUT.NODE_H / 2;
        if (this.hubHoverId === link.unionId) this.drawHubRing(link.cx, mY);
        ctx.strokeStyle = "#f0a6c8";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(c1cx + LAYOUT.NODE_W / 2, mY);
        ctx.lineTo(c2cx - LAYOUT.NODE_W / 2, mY);
        ctx.stroke();
        ctx.fillStyle = "#ec4899";
        ctx.beginPath();
        ctx.arc(link.cx, mY, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#c3ccda";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(link.cx, mY);
      } else {
        ctx.strokeStyle = "#c3ccda";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(c1cx, link.rowTop + LAYOUT.NODE_H);
      }
      ctx.lineTo(link.cx, link.childTop);
      ctx.stroke();
    });
  }

  drawBackground() {
    const ctx = this.ctx;
    const step = 26 * this.view.scale;
    const size = Math.max(1, 1.1 * this.view.scale);
    const ox = this.view.x % step;
    const oy = this.view.y % step;
    ctx.fillStyle = "rgba(148, 163, 184, 0.28)";
    for (let x = ox; x < this.cssW; x += step) {
      for (let y = oy; y < this.cssH; y += step) {
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  anchorX(unit) {
    return unit.primaryCenterX;
  }

  drawConnectors(unit) {
    const ctx = this.ctx;
    const paintLine = (color, width) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.lineCap = "round";
    };
    const centerY = unit.y + LAYOUT.NODE_H / 2;
    const topY = unit.y + LAYOUT.NODE_H;
    const midY = topY + LAYOUT.GEN_GAP / 2;
    const primaryX = unit.primaryCenterX;

    unit.marriages.forEach((m) => {
      const hasKids = m.children.length > 0;

      const ankY = centerY + (m.lineDy || 0);
      if (m.spouseId) {
        const spCard = unit.cards[m.cardIndex];
        const spouseX = spCard.x + spCard.w / 2;
        paintLine("#f0a6c8", 3);
        ctx.beginPath();
        ctx.moveTo(primaryX + (spouseX > primaryX ? LAYOUT.NODE_W / 2 : -LAYOUT.NODE_W / 2), ankY);
        ctx.lineTo(spouseX + (spouseX > primaryX ? -LAYOUT.NODE_W / 2 : LAYOUT.NODE_W / 2), ankY);
        ctx.stroke();
        if (this.hubHoverId === m.unionId) this.drawHubRing(primaryX + m.relBus, ankY);
        ctx.fillStyle = "#ec4899";
        ctx.beginPath();
        ctx.arc(primaryX + m.relBus, ankY, 4.5, 0, Math.PI * 2);
        ctx.fill();
      }

      if (!hasKids) return;

      paintLine("#c3ccda", 2);
      const startY = m.spouseId ? ankY : topY;
      ctx.beginPath();
      ctx.moveTo(m.busX, startY);
      ctx.lineTo(m.busX, midY);
      ctx.stroke();

      const xs = m.children.map((c) => this.anchorX(c));
      if (m.children.length > 1) {
        const minX = Math.min(m.busX, ...xs);
        const maxX = Math.max(m.busX, ...xs);
        ctx.beginPath();
        ctx.moveTo(minX, midY);
        ctx.lineTo(maxX, midY);
        ctx.stroke();
      }

      m.children.forEach((child, i) => {
        ctx.beginPath();
        ctx.moveTo(xs[i], midY);
        ctx.lineTo(xs[i], child.y);
        ctx.stroke();
      });
    });
  }

  drawHubRing(x, y) {
    const ctx = this.ctx;
    ctx.fillStyle = "rgba(236, 72, 153, 0.18)";
    ctx.beginPath();
    ctx.arc(x, y, 11 / this.view.scale, 0, Math.PI * 2);
    ctx.fill();
  }

  roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  initials(p) {
    return (p.first[0] || "") + (p.last[0] || "");
  }

  drawCard(card) {
    const ctx = this.ctx;
    const p = this.person(card.personId);
    if (!p) return;
    const isSelected = this.selectedId === card.personId;
    const isHover = this.hoverId === card.personId;
    const dimmed = this.searchActive && !this.searchIds.has(card.personId);
    const matched = this.searchActive && this.searchIds.has(card.personId);

    ctx.save();
    if (dimmed) ctx.globalAlpha = 0.25;

    ctx.shadowColor = "rgba(15, 23, 42, 0.14)";
    ctx.shadowBlur = isSelected || isHover ? 22 : 12;
    ctx.shadowOffsetY = isSelected || isHover ? 8 : 4;
    this.roundRect(ctx, card.x, card.y, card.w, card.h, LAYOUT.RADIUS);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.restore();

    ctx.save();
    if (dimmed) ctx.globalAlpha = 0.25;
    this.roundRect(ctx, card.x, card.y, card.w, card.h, LAYOUT.RADIUS);
    if (isSelected) {
      ctx.strokeStyle = "#6366f1";
      ctx.lineWidth = 2.6;
    } else if (matched) {
      ctx.strokeStyle = "#f59e0b";
      ctx.lineWidth = 2.4;
    } else {
      ctx.strokeStyle = isHover ? "#c7d2fe" : "#e6eaf2";
      ctx.lineWidth = 1.4;
    }
    ctx.stroke();

    const cx = card.x + 40;
    const cy = card.y + card.h / 2;
    const r = 24;
    const palette = COLORS[p.gender] || COLORS.unknown;
    const grad = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
    grad.addColorStop(0, palette[0]);
    grad.addColorStop(1, palette[1]);
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    if (p.death) {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255,255,255,0.9)";
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    ctx.fillStyle = "#ffffff";
    ctx.font = "700 16px Inter, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(this.initials(p), cx, cy + 0.5);

    const aliveDot = !p.death;
    ctx.beginPath();
    ctx.arc(card.x + card.w - 16, card.y + 17, 5, 0, Math.PI * 2);
    ctx.fillStyle = aliveDot ? "#22c55e" : "#334155";
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "#1e293b";
    ctx.font = "600 14.5px Inter, system-ui, sans-serif";
    const nameLines = this.wrapText(p.first + " " + p.last, 98);
    let nameBaselines;
    let lifeBaseline;
    if (nameLines.length === 1) {
      nameBaselines = [card.y + 43];
      lifeBaseline = card.y + 66;
    } else {
      nameBaselines = [card.y + 38, card.y + 55];
      lifeBaseline = card.y + 80;
    }
    nameBaselines.forEach((yb, i) => {
      const more = nameLines.length > 2 && i === nameBaselines.length - 1;
      const text = more ? this.fitText(nameLines.slice(1).join(" "), 98) : nameLines[i];
      ctx.fillText(text, card.x + 74, yb);
    });

    ctx.fillStyle = "#64748b";
    ctx.font = "500 12px Inter, system-ui, sans-serif";
    const life = p.birth + (p.death ? " \u2013 " + p.death : " \u2013 sekarang");
    ctx.fillText(life, card.x + 74, lifeBaseline);

    ctx.restore();
  }

  fitText(text, maxWidth) {
    const ctx = this.ctx;
    if (ctx.measureText(text).width <= maxWidth) return text;
    let out = text;
    while (out.length > 1 && ctx.measureText(out + "\u2026").width > maxWidth) {
      out = out.slice(0, -1);
    }
    return out + "\u2026";
  }

  wrapText(text, maxWidth) {
    const ctx = this.ctx;
    const lines = [];
    let line = "";
    const flush = () => {
      if (line) {
        lines.push(line);
        line = "";
      }
    };
    text.split(/\s+/).filter(Boolean).forEach((word) => {
      const candidate = line ? line + " " + word : word;
      if (ctx.measureText(candidate).width <= maxWidth) {
        line = candidate;
        return;
      }
      flush();
      if (ctx.measureText(word).width <= maxWidth) {
        line = word;
        return;
      }
      let sub = "";
      for (const ch of word) {
        const probe = sub + ch;
        if (ctx.measureText(probe).width <= maxWidth) sub = probe;
        else if (sub) {
          lines.push(sub);
          sub = ch;
        } else sub = ch;
      }
      line = sub;
    });
    flush();
    return lines;
  }

  bindEvents() {
    const canvas = this.canvas;

    canvas.addEventListener("pointerdown", (e) => {
      canvas.setPointerCapture(e.pointerId);
      this.pointer.down = true;
      this.pointer.moved = false;
      this.pointer.startX = e.clientX;
      this.pointer.startY = e.clientY;
      this.pointer.viewX = this.view.x;
      this.pointer.viewY = this.view.y;
    });

    canvas.addEventListener("pointermove", (e) => {
      const rect = canvas.getBoundingClientRect();
      if (this.pointer.down) {
        if (this.hubHoverId !== null) {
          this.hubHoverId = null;
          this.onHubHover && this.onHubHover(null);
        }
        const dx = e.clientX - this.pointer.startX;
        const dy = e.clientY - this.pointer.startY;
        if (Math.abs(dx) + Math.abs(dy) > 4) this.pointer.moved = true;
        if (this.pointer.moved) {
          this.view.x = this.pointer.viewX + dx;
          this.view.y = this.pointer.viewY + dy;
          this.draw();
        }
      } else {
        const sx = e.clientX - rect.left;
        const sy = e.clientY - rect.top;
        const card = this.cardAt(sx, sy);
        if (card) {
          if (this.hubHoverId !== null) {
            this.hubHoverId = null;
            this.onHubHover && this.onHubHover(null);
          }
          const id = card.personId;
          if (id !== this.hoverId) {
            this.hoverId = id;
            canvas.style.cursor = "pointer";
            this.draw();
          }
          return;
        }
        const hub = this.hubAt(sx, sy);
        if (hub) {
          this.hoverId = null;
          canvas.style.cursor = "pointer";
          if (this.hubHoverId !== hub.unionId) {
            this.hubHoverId = hub.unionId;
            this.draw();
          }
          const hs = {
            x: this.view.x + hub.x * this.view.scale + rect.left,
            y: this.view.y + hub.y * this.view.scale + rect.top
          };
          this.onHubHover &&
            this.onHubHover({ unionId: hub.unionId, x: hs.x, y: hs.y, text: this.hubInfo(hub) });
        } else {
          if (this.hubHoverId !== null) {
            this.hubHoverId = null;
            this.onHubHover && this.onHubHover(null);
            this.draw();
          }
          canvas.style.cursor = "grab";
        }
      }
    });

    const endPointer = (e) => {
      if (!this.pointer.down) return;
      this.pointer.down = false;
      if (!this.pointer.moved) {
        const rect = canvas.getBoundingClientRect();
        const sx = e.clientX - rect.left;
        const sy = e.clientY - rect.top;
        const card = this.cardAt(sx, sy);
        if (card) this.onSelect && this.onSelect(card.personId);
        else if (this.hubAt(sx, sy)) {
        } else this.onSelect && this.onSelect(null);
      }
    };
    canvas.addEventListener("pointerup", endPointer);
    canvas.addEventListener("pointercancel", () => { this.pointer.down = false; });
    canvas.addEventListener("pointerleave", () => {
      if (this.hubHoverId !== null) {
        this.hubHoverId = null;
        this.onHubHover && this.onHubHover(null);
        this.draw();
      }
    });

    canvas.addEventListener("wheel", (e) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
      this.zoomAt(e.clientX - rect.left, e.clientY - rect.top, factor);
    }, { passive: false });

    canvas.addEventListener("dblclick", (e) => {
      const rect = canvas.getBoundingClientRect();
      const hub = this.hubAt(e.clientX - rect.left, e.clientY - rect.top);
      if (hub) {
        this.onHubDblClick && this.onHubDblClick(hub.unionId);
        return;
      }
      const card = this.cardAt(e.clientX - rect.left, e.clientY - rect.top);
      if (card) this.centerOn(card.personId, Math.max(this.view.scale, 1));
    });

    canvas.addEventListener("touchstart", (e) => {
      if (e.touches.length === 2) {
        const [a, b] = e.touches;
        this.pinch = { dist: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY), scale: this.view.scale };
      }
    }, { passive: true });

    canvas.addEventListener("touchmove", (e) => {
      if (e.touches.length === 2 && this.pinch) {
        e.preventDefault();
        const [a, b] = e.touches;
        const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
        const rect = canvas.getBoundingClientRect();
        const mx = (a.clientX + b.clientX) / 2 - rect.left;
        const my = (a.clientY + b.clientY) / 2 - rect.top;
        const target = Math.max(0.18, Math.min(2.6, this.pinch.scale * (dist / this.pinch.dist)));
        this.zoomAt(mx, my, target / this.view.scale);
      }
    }, { passive: false });

    canvas.addEventListener("touchend", () => { this.pinch = null; });

    window.addEventListener("resize", () => this.resize());
  }
}
