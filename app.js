(function () {
  const STORAGE_KEY = "family-tree:data:v2";

  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (saved && saved.people) {
      Object.keys(saved.people).forEach((id) => {
        if (FAMILY.people[id]) Object.assign(FAMILY.people[id], saved.people[id]);
        else FAMILY.people[id] = saved.people[id];
      });
    }
    if (saved && Array.isArray(saved.unions) && saved.unions.length) {
      FAMILY.unions.length = 0;
      saved.unions.forEach((u) => FAMILY.unions.push(u));
    }
    if (saved && typeof saved.title === "string") FAMILY.title = saved.title;
  } catch (e) {}

  function migrateUnions() {
    const extra = [];
    FAMILY.unions.forEach((u) => {
      if (u.partners.length <= 2) return;
      const primary = u.partners[0];
      const rest = u.partners.slice(1);
      u.partners = [primary, rest[0]];
      rest.slice(1).forEach((pid) => {
        extra.push({
          id: nextId("u", FAMILY.unions.map((x) => x.id)),
          partners: [primary, pid],
          children: []
        });
      });
    });
    if (extra.length) {
      extra.forEach((u) => FAMILY.unions.push(u));
      return true;
    }
    return false;
  }

  if (migrateUnions()) persist();

  const canvas = document.getElementById("treeCanvas");
  const tree = new FamilyTree(canvas, FAMILY);
  let currentPersonId = null;

  const el = {
    details: document.getElementById("details"),
    search: document.getElementById("searchInput"),
    searchClear: document.getElementById("searchClear"),
    fit: document.getElementById("fitBtn"),
    center: document.getElementById("centerBtn"),
    reset: document.getElementById("resetBtn"),
    zoomIn: document.getElementById("zoomIn"),
    zoomOut: document.getElementById("zoomOut"),
    zoomReset: document.getElementById("zoomReset"),
    empty: document.getElementById("detailsEmpty"),
    content: document.getElementById("detailsContent"),
    close: document.getElementById("detailsClose"),
    avatar: document.getElementById("dAvatar"),
    name: document.getElementById("dName"),
    life: document.getElementById("dLife"),
    gender: document.getElementById("dGender"),
    info: document.getElementById("dInfo"),
    bio: document.getElementById("dBio"),
    parents: document.getElementById("dParents"),
    spouses: document.getElementById("dSpouses"),
    children: document.getElementById("dChildren"),
    siblings: document.getElementById("dSiblings"),
    focusBtn: document.getElementById("focusBtn"),
    hint: document.getElementById("hint"),
    editBtn: document.getElementById("editBtn"),
    modal: document.getElementById("editModal"),
    form: document.getElementById("editForm"),
    formError: document.getElementById("editError"),
    formNote: document.getElementById("editNote"),
    editTitle: document.getElementById("editTitle"),
    editSubmit: document.getElementById("editSubmit"),
    editCancel: document.getElementById("editCancel"),
    editCancelX: document.getElementById("editCancelX"),
    addSpouse: document.getElementById("addSpouse"),
    addChild: document.getElementById("addChild"),
    addSibling: document.getElementById("addSibling"),
    addParent: document.getElementById("addParent"),
    marriageWrap: document.getElementById("marriageWrap"),
    toast: document.getElementById("toast"),
    deleteBtn: document.getElementById("deleteBtn"),
    confirmModal: document.getElementById("confirmModal"),
    confirmTitle: document.getElementById("confirmTitle"),
    confirmMessage: document.getElementById("confirmMessage"),
    confirmOk: document.getElementById("confirmOk"),
    confirmCancel: document.getElementById("confirmCancel"),
    confirmCancelX: document.getElementById("confirmCancelX"),
    treeTitle: document.getElementById("treeTitle"),
    saveFileBtn: document.getElementById("saveFileBtn"),
    openFileBtn: document.getElementById("openFileBtn"),
    fileInput: document.getElementById("fileInput"),
    clearBtn: document.getElementById("clearBtn"),
    hubTooltip: document.getElementById("hubTooltip"),
    marriageModal: document.getElementById("marriageModal"),
    marriageTitle: document.getElementById("marriageTitle"),
    marriageNote: document.getElementById("marriageNote"),
    marriageInput: document.getElementById("marriageInput"),
    marriageError: document.getElementById("marriageError"),
    marriageSave: document.getElementById("marriageSave"),
    marriageCancel: document.getElementById("marriageCancel"),
    marriageCancelX: document.getElementById("marriageCancelX")
  };

  const RELATION_LABEL = { spouse: "Pasangan", child: "Anak", sibling: "Saudara", parent: "Orang Tua" };
  let modalMode = "edit";
  let addRelation = null;
  let addTargetId = null;
  let deleteConfirmedId = null;
  let confirmAction = null;
  let marriageEditUnionId = null;

  const GENDER_LABEL = { male: "Laki-laki", female: "Perempuan", unknown: "Tidak diketahui" };

  function fullName(id) {
    const p = FAMILY.people[id];
    return p ? p.first + " " + p.last : id;
  }

  function relationInfo(id) {
    const parents = [];
    const spouses = [];
    const children = [];
    const siblings = [];

    FAMILY.unions.forEach((u) => {
      if (u.children.includes(id)) {
        u.partners.forEach((pid) => parents.push(pid));
        u.children.forEach((cid) => {
          if (cid !== id) siblings.push(cid);
        });
      }
      if (u.partners.includes(id)) {
        u.partners.forEach((pid) => {
          if (pid !== id) spouses.push(pid);
        });
        u.children.forEach((cid) => children.push(cid));
      }
    });

    return {
      parents: [...new Set(parents)],
      spouses: [...new Set(spouses)],
      children: [...new Set(children)],
      siblings: [...new Set(siblings)]
    };
  }

  function avatarInitials(p) {
    return (p.first[0] || "") + (p.last[0] || "");
  }

  function renderChips(container, ids, emptyText, labels) {
    container.innerHTML = "";
    if (!ids.length) {
      const span = document.createElement("span");
      span.className = "chip-empty";
      span.textContent = emptyText;
      container.appendChild(span);
      return;
    }
    ids.forEach((id) => {
      const p = FAMILY.people[id];
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "chip " + (p.gender || "unknown");
      chip.innerHTML =
        '<span class="chip-avatar">' + avatarInitials(p) + "</span>" +
        fullName(id) +
        (labels && labels.get(id) ? '<span class="chip-year">\u00B7 ' + labels.get(id) + "</span>" : "");
      chip.addEventListener("click", () => {
        tree.select(id);
        tree.centerOn(id, Math.max(tree.view.scale, 0.9));
        showDetails(id);
      });
      container.appendChild(chip);
    });
  }

  function showDetails(id) {
    currentPersonId = id || null;
    if (!id) {
      el.empty.hidden = false;
      el.content.hidden = true;
      el.details.classList.remove("open");
      return;
    }
    const p = FAMILY.people[id];
    if (!p) return;
    const rel = relationInfo(id);

    el.empty.hidden = true;
    el.content.hidden = false;
    el.details.classList.add("open");

    el.avatar.textContent = avatarInitials(p);
    el.avatar.className = "avatar avatar-lg " + p.gender;
    el.name.textContent = p.first + " " + p.last;
    el.life.textContent = p.birth + (p.death ? " \u2013 " + p.death : " \u2013 sekarang");
    el.gender.textContent = GENDER_LABEL[p.gender] || GENDER_LABEL.unknown;
    el.gender.className = "badge " + p.gender;

    el.info.innerHTML = "";
    const rows = [
      ["Tempat lahir", p.birthPlace || "-"],
      ["Pekerjaan", p.occupation || "-"],
      ["Usia", p.death ? p.death - p.birth + " tahun" : new Date().getFullYear() - p.birth + " tahun"]
    ];
    rows.forEach(([k, v]) => {
      const dt = document.createElement("dt");
      dt.textContent = k;
      const dd = document.createElement("dd");
      dd.textContent = v;
      el.info.appendChild(dt);
      el.info.appendChild(dd);
    });

    el.bio.textContent = p.bio || "";

    const spouseYears = new Map();
    FAMILY.unions.forEach((u) => {
      if (!u.partners.includes(id) || !Number.isFinite(u.marriage)) return;
      u.partners.forEach((pid) => {
        if (pid !== id) spouseYears.set(pid, u.marriage);
      });
    });

    renderChips(el.parents, rel.parents, "Tidak ada data");
    renderChips(el.spouses, rel.spouses, "Belum menikah", spouseYears);
    renderChips(el.children, rel.children, "Belum memiliki anak");
    renderChips(el.siblings, rel.siblings, "Anak tunggal");

    el.focusBtn.onclick = () => {
      tree.setFocus(id);
      tree.select(id);
      showDetails(id);
      syncResetButton();
    };
  }

  function syncResetButton() {
    el.reset.disabled = !FAMILY.rootUnionId || tree.isFullTree();
  }

  function showToast(message) {
    el.toast.textContent = message;
    el.toast.hidden = false;
    requestAnimationFrame(() => el.toast.classList.add("show"));
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => {
      el.toast.classList.remove("show");
      setTimeout(() => { el.toast.hidden = true; }, 300);
    }, 2400);
  }

  function persist() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ title: FAMILY.title, people: FAMILY.people, unions: FAMILY.unions })
      );
    } catch (e) {}
  }

  function nextId(prefix, ids) {
    let max = 0;
    ids.forEach((key) => {
      const m = new RegExp("^" + prefix + "(\\d+)$").exec(key);
      if (m) max = Math.max(max, parseInt(m[1], 10));
    });
    return prefix + (max + 1);
  }

  function resetForm() {
    el.form.reset();
    el.formError.hidden = true;
    el.formNote.hidden = true;
    el.marriageWrap.hidden = true;
  }

  function openEdit(id) {
    const p = FAMILY.people[id];
    if (!p) return;
    modalMode = "edit";
    addRelation = null;
    addTargetId = null;
    const f = el.form;
    f.first.value = p.first || "";
    f.last.value = p.last || "";
    f.gender.value = p.gender || "unknown";
    f.birthPlace.value = p.birthPlace || "";
    f.birth.value = p.birth || "";
    f.death.value = p.death || "";
    f.occupation.value = p.occupation || "";
    f.bio.value = p.bio || "";
    el.formError.hidden = true;
    el.formNote.hidden = true;
    el.editTitle.textContent = "Edit Anggota Keluarga";
    el.editSubmit.textContent = "Simpan Perubahan";
    el.modal.hidden = false;
    setTimeout(() => f.first.focus(), 30);
  }

  function openAdd(relation) {
    if (!currentPersonId) return;
    if (relation === "sibling" && !FAMILY.unions.some((u) => u.children.includes(currentPersonId))) {
      showToast("Tidak dapat menambah saudara: orang tua belum diketahui.");
      return;
    }
    if (relation === "parent") {
      const cu = FAMILY.unions.find((u) => u.children.includes(currentPersonId));
      if (cu && cu.partners.length >= 2) {
        showToast("Orang tua " + fullName(currentPersonId) + " sudah lengkap.");
        return;
      }
    }
    modalMode = "add";
    addRelation = relation;
    addTargetId = currentPersonId;
    resetForm();
    el.marriageWrap.hidden = relation !== "spouse";
    el.editTitle.textContent = "Tambah " + RELATION_LABEL[relation];
    el.editSubmit.textContent = "Tambah " + RELATION_LABEL[relation];
    el.formNote.textContent = RELATION_LABEL[relation] + " baru untuk " + fullName(currentPersonId) + ".";
    el.formNote.hidden = false;
    el.modal.hidden = false;
    setTimeout(() => el.form.first.focus(), 30);
  }

  function closeEdit() {
    el.modal.hidden = true;
    resetForm();
  }

  function linkPerson(relation, targetId, newId, year) {
    const unionIds = FAMILY.unions.map((u) => u.id);
    if (relation === "spouse") {
      const u = FAMILY.unions.find((un) => un.partners.includes(targetId) && un.partners.length < 2);
      if (u) {
        u.partners.push(newId);
        if (Number.isFinite(year)) u.marriage = year;
      } else {
        const nu = { id: nextId("u", unionIds), partners: [targetId, newId], children: [] };
        if (Number.isFinite(year)) nu.marriage = year;
        FAMILY.unions.push(nu);
      }
    } else if (relation === "child") {
      const u = FAMILY.unions.find((un) => un.partners.includes(targetId));
      if (u) u.children.push(newId);
      else FAMILY.unions.push({ id: nextId("u", unionIds), partners: [targetId], children: [newId] });
    } else if (relation === "sibling") {
      const u = FAMILY.unions.find((un) => un.children.includes(targetId));
      if (u) u.children.push(newId);
    } else if (relation === "parent") {
      const u = FAMILY.unions.find((un) => un.children.includes(targetId));
      if (!u) FAMILY.unions.push({ id: nextId("u", unionIds), partners: [newId], children: [targetId] });
      else if (u.partners.length < 2) u.partners.push(newId);
    }
  }

  function collectDescendants(id) {
    const doomed = new Set([id]);
    let changed = true;
    while (changed) {
      changed = false;
      FAMILY.unions.forEach((u) => {
        if (!u.partners.some((pid) => doomed.has(pid))) return;
        const survivors = u.partners.filter((pid) => !doomed.has(pid) && FAMILY.people[pid]);
        if (survivors.length) return;
        u.children.forEach((cid) => {
          if (!doomed.has(cid)) {
            doomed.add(cid);
            changed = true;
          }
        });
      });
    }
    return doomed;
  }

  function ensureRootUnion() {
    const rootU = FAMILY.unions.find((u) => u.id === FAMILY.rootUnionId);
    const alive = rootU && rootU.partners.some((pid) => FAMILY.people[pid]);
    if (!rootU || !alive) {
      const fallback = FAMILY.unions.find((u) => u.partners.some((pid) => FAMILY.people[pid]));
      FAMILY.rootUnionId = fallback ? fallback.id : null;
    }
  }

  function deletePerson(id) {
    const doomed = collectDescendants(id);
    const extra = doomed.size - 1;
    doomed.forEach((pid) => delete FAMILY.people[pid]);
    for (let i = FAMILY.unions.length - 1; i >= 0; i--) {
      const u = FAMILY.unions[i];
      u.partners = u.partners.filter((p) => !doomed.has(p));
      u.children = u.children.filter((c) => !doomed.has(c));
      if (!u.partners.length && !u.children.length) FAMILY.unions.splice(i, 1);
    }
    ensureRootUnion();
    if (FAMILY.rootUnionId && !FAMILY.people[tree.focusPersonId]) tree.resetFocus();
    else if (!FAMILY.rootUnionId) tree.focusPersonId = null;
    persist();
    tree.rebuild();
    tree.select(null);
    showDetails(null);
    syncResetButton();
    showToast(
      "Anggota " + fullName(id) + (extra > 0 ? " beserta " + extra + " keturunannya" : "") + " berhasil dihapus."
    );
  }

  function syncTitle() {
    const t = FAMILY.title || "Silsilah Keluarga";
    el.treeTitle.value = t;
    document.title = t + " — Family Tree";
  }

  function filenameForTitle(title) {
    const base = (title || "silsilah").toLowerCase().replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "") || "silsilah";
    return base + ".tree";
  }

  function eraseTree() {
    FAMILY.people = {
      p1: {
        id: "p1",
        first: "Anggota",
        last: "Baru",
        gender: "unknown",
        birth: 1980,
        death: null,
        birthPlace: "",
        occupation: "",
        bio: "Mulai silsilah keluarga Anda dari anggota pertama ini."
      }
    };
    FAMILY.unions = [{ id: "u1", partners: ["p1"], children: [] }];
    FAMILY.rootUnionId = "u1";
    FAMILY.title = "Silsilah Keluarga Baru";
    tree.focusPersonId = "p1";
    persist();
    syncTitle();
    tree.rebuild();
    tree.select(null);
    showDetails(null);
    syncResetButton();
    tree.fit();
    showToast("Kanvas dikosongkan. Silsilah dimulai dari 1 kartu permulaan.");
  }

  function applyFile(data) {
    if (!data || typeof data !== "object" || !data.people || !Array.isArray(data.unions)) {
      throw new Error("Struktur file tidak valid.");
    }
    FAMILY.people = data.people;
    FAMILY.unions = data.unions;
    FAMILY.rootUnionId = data.rootUnionId || null;
    FAMILY.title = typeof data.title === "string" ? data.title : "";
    ensureRootUnion();
    const rootU = FAMILY.unions.find((u) => u.id === FAMILY.rootUnionId);
    tree.focusPersonId =
      (rootU && rootU.partners.find((pid) => FAMILY.people[pid])) ||
      ((FAMILY.unions.find((u) => u.partners.some((pid) => FAMILY.people[pid])) || {}).partners || [])[0] ||
      null;
    if (migrateUnions()) {}
    persist();
    syncTitle();
    tree.rebuild();
    tree.select(null);
    showDetails(null);
    syncResetButton();
    tree.fit();
  }

  function openMarriageEditor(unionId) {
    const u = FAMILY.unions.find((x) => x.id === unionId);
    if (!u) return;
    marriageEditUnionId = unionId;
    const how = u.partners.map(fullName).join(" dan ");
    el.marriageTitle.textContent = "Ubah Tahun Perkawinan";
    el.marriageNote.textContent = how ? "Tahun perkawinan untuk " + how + "." : "Tahun perkawinan union ini.";
    el.marriageInput.value = Number.isFinite(u.marriage) ? u.marriage : "";
    el.marriageError.hidden = true;
    el.marriageModal.hidden = false;
    setTimeout(() => el.marriageInput.focus(), 30);
  }

  function closeMarriageEditor() {
    el.marriageModal.hidden = true;
    marriageEditUnionId = null;
  }

  el.marriageSave.addEventListener("click", () => {
    if (!marriageEditUnionId) return;
    const u = FAMILY.unions.find((x) => x.id === marriageEditUnionId);
    if (!u) return closeMarriageEditor();
    const raw = el.marriageInput.value.trim();
    if (raw) {
      const year = parseInt(raw, 10);
      if (!Number.isFinite(year) || year < 1500 || year > 2100) {
        el.marriageError.textContent = "Tahun perkawinan harus berupa angka antara 1500\u20132100.";
        el.marriageError.hidden = false;
        return;
      }
      u.marriage = year;
    } else {
      delete u.marriage;
    }
    persist();
    closeMarriageEditor();
    tree.rebuild();
    if (currentPersonId && tree.cards.some((c) => c.personId === currentPersonId)) {
      tree.select(currentPersonId);
      tree.centerOn(currentPersonId, Math.max(tree.view.scale, 0.9));
    } else {
      tree.select(null);
    }
    syncResetButton();
    showToast("Tahun perkawinan berhasil " + (raw ? "diubah." : "dihapus."));
  });

  function openDeleteConfirm(id) {
    const p = FAMILY.people[id];
    if (!p) return;
    const doomed = collectDescendants(id);
    const extra = doomed.size - 1;
    const reassigned = FAMILY.unions.some(
      (u) =>
        u.partners.includes(id) &&
        u.children.length &&
        u.partners.some((pid) => pid !== id && FAMILY.people[pid])
    );
    openConfirm({
      title: "Hapus Anggota",
      message:
        "Apakah Anda yakin ingin menghapus " + fullName(id) + "?" +
        (reassigned
          ? " Anak-anaknya tetap menjadi anak dari pasangan yang tersisa."
          : extra > 0
            ? " Seluruh anak dan keturunannya (" + extra + " orang) ikut dihapus."
            : " Tindakan ini tidak dapat dibatalkan."),
      okLabel: "Hapus",
      action: () => deletePerson(id)
    });
  }

  function openConfirm(conf) {
    deleteConfirmedId = null;
    confirmAction = conf.action;
    el.confirmTitle.textContent = conf.title;
    el.confirmMessage.textContent = conf.message;
    el.confirmOk.textContent = conf.okLabel;
    el.confirmModal.hidden = false;
  }

  function closeConfirm() {
    el.confirmModal.hidden = true;
    deleteConfirmedId = null;
    confirmAction = null;
  }

  el.form.addEventListener("submit", (e) => {
    e.preventDefault();
    const f = el.form;
    const first = f.first.value.trim();
    const birth = parseInt(f.birth.value, 10);
    const deathRaw = f.death.value.trim();
    const death = deathRaw ? parseInt(deathRaw, 10) : null;
    const marriageRaw = f.marriage && f.marriage.value.trim();
    const marriage = marriageRaw ? parseInt(marriageRaw, 10) : null;

    if (!first) return showFormError("Nama depan wajib diisi.");
    if (!Number.isFinite(birth)) return showFormError("Tahun lahir wajib diisi dengan angka.");
    if (death !== null && !Number.isFinite(death)) return showFormError("Tahun wafat harus berupa angka.");
    if (death !== null && death < birth) return showFormError("Tahun wafat tidak boleh lebih awal dari tahun lahir.");
    if (marriage !== null && !Number.isFinite(marriage))
      return showFormError("Tahun perkawinan harus berupa angka.");
    if (marriage !== null && marriage < birth)
      return showFormError("Tahun perkawinan tidak boleh lebih awal dari tahun lahir.");

    const data = {
      first: first,
      last: f.last.value.trim(),
      gender: f.gender.value,
      birthPlace: f.birthPlace.value.trim(),
      birth: birth,
      death: death,
      occupation: f.occupation.value.trim(),
      bio: f.bio.value.trim()
    };

    if (modalMode === "edit") {
      if (!currentPersonId) return;
      Object.assign(FAMILY.people[currentPersonId], data);
      persist();
      closeEdit();
      tree.draw();
      showDetails(currentPersonId);
      showToast("Perubahan berhasil disimpan.");
      return;
    }

    const id = nextId("p", Object.keys(FAMILY.people));
    FAMILY.people[id] = Object.assign({ id: id }, data);
    linkPerson(addRelation, addTargetId, id, addRelation === "spouse" ? marriage : null);
    persist();
    closeEdit();
    tree.rebuild();
    tree.select(id);
    showDetails(id);
    tree.centerOn(id, Math.max(tree.view.scale, 0.9));
    showToast(RELATION_LABEL[addRelation] + " baru berhasil ditambahkan.");
  });

  function showFormError(message) {
    el.formError.textContent = message;
    el.formError.hidden = false;
    return false;
  }

  el.editBtn.addEventListener("click", () => {
    if (currentPersonId) openEdit(currentPersonId);
  });
  el.addSpouse.addEventListener("click", () => openAdd("spouse"));
  el.addChild.addEventListener("click", () => openAdd("child"));
  el.addSibling.addEventListener("click", () => openAdd("sibling"));
  el.addParent.addEventListener("click", () => openAdd("parent"));
  el.editCancel.addEventListener("click", closeEdit);
  el.editCancelX.addEventListener("click", closeEdit);
  el.modal.addEventListener("mousedown", (e) => {
    if (e.target === el.modal) closeEdit();
  });
  el.deleteBtn.addEventListener("click", () => {
    if (currentPersonId) openDeleteConfirm(currentPersonId);
  });
  el.confirmOk.addEventListener("click", () => {
    if (deleteConfirmedId) deletePerson(deleteConfirmedId);
    else if (confirmAction) confirmAction();
    closeConfirm();
  });
  el.confirmCancel.addEventListener("click", closeConfirm);
  el.confirmCancelX.addEventListener("click", closeConfirm);
  el.confirmModal.addEventListener("mousedown", (e) => {
    if (e.target === el.confirmModal) closeConfirm();
  });
  el.marriageCancel.addEventListener("click", closeMarriageEditor);
  el.marriageCancelX.addEventListener("click", closeMarriageEditor);
  el.marriageModal.addEventListener("mousedown", (e) => {
    if (e.target === el.marriageModal) closeMarriageEditor();
  });
  el.marriageInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") el.marriageSave.click();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !el.confirmModal.hidden) closeConfirm();
    else if (e.key === "Escape" && !el.marriageModal.hidden) closeMarriageEditor();
    else if (e.key === "Escape" && !el.modal.hidden) closeEdit();
  });

  tree.onSelect = (id) => {
    tree.select(id);
    showDetails(id);
  };

  tree.onHubHover = (hub) => {
    if (!hub) {
      el.hubTooltip.hidden = true;
      return;
    }
    el.hubTooltip.textContent = hub.text;
    el.hubTooltip.hidden = false;
    const wrap = el.hubTooltip.parentElement.getBoundingClientRect();
    el.hubTooltip.style.left = hub.x - wrap.left + "px";
    el.hubTooltip.style.top = hub.y - wrap.top - 11 + "px";
  };

  tree.onHubDblClick = (unionId) => openMarriageEditor(unionId);

  el.search.addEventListener("input", () => {
    tree.setSearch(el.search.value);
    const first = [...tree.searchIds][0];
    if (first && el.search.value.trim().length > 1) tree.centerOn(first, Math.max(tree.view.scale, 0.9));
  });

  el.searchClear.addEventListener("click", () => {
    el.search.value = "";
    tree.setSearch("");
    el.search.focus();
  });

  el.fit.addEventListener("click", () => tree.fit());
  el.reset.addEventListener("click", () => {
    tree.resetFocus();
    tree.select(null);
    showDetails(null);
    syncResetButton();
  });
  el.center.addEventListener("click", () => {
    if (tree.selectedId) tree.centerOn(tree.selectedId, Math.max(tree.view.scale, 1));
    else tree.fit();
  });
  el.zoomIn.addEventListener("click", () => tree.zoomAt(tree.cssW / 2, tree.cssH / 2, 1.2));
  el.zoomOut.addEventListener("click", () => tree.zoomAt(tree.cssW / 2, tree.cssH / 2, 1 / 1.2));
  el.zoomReset.addEventListener("click", () => tree.fit());
  el.close.addEventListener("click", () => {
    tree.select(null);
    showDetails(null);
  });

  let titleTimer;
  el.treeTitle.addEventListener("input", () => {
    FAMILY.title = el.treeTitle.value.trim();
    clearTimeout(titleTimer);
    titleTimer = setTimeout(persist, 500);
  });
  el.treeTitle.addEventListener("change", () => {
    FAMILY.title = el.treeTitle.value.trim();
    syncTitle();
    persist();
  });
  el.treeTitle.addEventListener("keydown", (e) => {
    if (e.key === "Enter") el.treeTitle.blur();
  });

  el.saveFileBtn.addEventListener("click", () => {
    const data = {
      app: "family-tree",
      version: 2,
      title: FAMILY.title || "",
      rootUnionId: FAMILY.rootUnionId || null,
      people: FAMILY.people,
      unions: FAMILY.unions
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filenameForTitle(FAMILY.title);
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    showToast("File silsilah berhasil disimpan.");
  });

  el.openFileBtn.addEventListener("click", () => el.fileInput.click());
  el.fileInput.addEventListener("change", () => {
    const file = el.fileInput.files && el.fileInput.files[0];
    el.fileInput.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        applyFile(JSON.parse(reader.result));
        showToast("File \u201C" + file.name + "\u201D berhasil dibuka.");
      } catch (e) {
        showToast("Gagal membuka file: " + (e.message || "data tidak valid."));
      }
    };
    reader.readAsText(file);
  });

  el.clearBtn.addEventListener("click", () => {
    openConfirm({
      title: "Kosongkan Silsilah",
      message:
        "Seluruh data anggota, hubungan, dan data lokal akan dihapus. Kanvas akan dikosongkan dan dimulai kembali dengan 1 kartu permulaan. Lanjutkan?",
      okLabel: "Kosongkan",
      action: eraseTree
    });
  });

  syncResetButton();
  syncTitle();
  setTimeout(() => el.hint.classList.add("fade"), 6000);
})();
