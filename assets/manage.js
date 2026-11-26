/* The video manager: paste YouTube links, set titles and tags, order them, star the one shown
   large, then publish content/videos.json to GitHub in one commit (or download it).
   The draft is kept in this browser until it is published or discarded. */
(function () {
  "use strict";
  var FILE = "content/videos.json", DRAFT = "transport-videos-draft-v1";
  GH.setFallbackRepo("ShafiArch/works_transport_visualization");
  function $(s) { return document.querySelector(s); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function today() { var d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }

  var data = { title: "Transport Visualization", intro: "", videos: [] }, baseText = null;

  /* a YouTube id out of any link form, or a bare 11 character id */
  function idOf(s) {
    s = s.trim(); if (!s) return null;
    if (/^[\w-]{11}$/.test(s)) return s;
    try {
      var u = new URL(/^https?:/i.test(s) ? s : "https://" + s), h = u.hostname.replace(/^www\.|^m\.|^music\./, "");
      if (h === "youtu.be") return ok(u.pathname.split("/")[1]);
      if (/(^|\.)youtube(-nocookie)?\.com$/.test(h)) {
        if (u.searchParams.get("v")) return ok(u.searchParams.get("v"));
        var m = u.pathname.match(/^\/(shorts|embed|live|v)\/([\w-]{11})/); if (m) return m[2];
      }
    } catch (e) {}
    var m2 = s.match(/(?:v=|youtu\.be\/|shorts\/|embed\/)([\w-]{11})/); return m2 ? m2[1] : null;
    function ok(x) { return /^[\w-]{11}$/.test(x || "") ? x : null; }
  }
  /* the title from YouTube (oEmbed), with a second public service as a fallback */
  function fetchTitle(id) {
    var url = "https://www.youtube.com/watch?v=" + id;
    return fetch("https://www.youtube.com/oembed?format=json&url=" + encodeURIComponent(url)).then(function (r) { if (!r.ok) throw 0; return r.json(); })
      .catch(function () { return fetch("https://noembed.com/embed?url=" + encodeURIComponent(url)).then(function (r) { return r.json(); }); })
      .then(function (j) { return j && j.title ? String(j.title) : ""; }).catch(function () { return ""; });
  }

  /* draft */
  function saveDraft() { try { localStorage.setItem(DRAFT, JSON.stringify({ base: baseText, data: data })); } catch (e) {} status(); }
  function dirty() { return baseText !== null && text() !== baseText; }
  function status() { $("[data-status]").textContent = dirty() ? "Unsaved changes" : ""; }
  function text() { return JSON.stringify(data, null, 2) + "\n"; }
  function normalise(d) {
    return { title: d.title || "Transport Visualization", intro: d.intro || "", videos: (d.videos || []).filter(function (v) { return v && v.id; }).map(function (v) {
      var o = { id: v.id, title: v.title || "", tags: (v.tags || []).filter(Boolean) };
      if (v.featured) o.featured = true; if (v.added) o.added = v.added; return o;
    }) };
  }
  function pretty(t) { try { return JSON.stringify(normalise(JSON.parse(t)), null, 2) + "\n"; } catch (e) { return t; } }

  function load() {
    var draft = null; try { draft = JSON.parse(localStorage.getItem(DRAFT) || "null"); } catch (e) {}
    GH.read(FILE).then(function (t) {
      var remote = t ? pretty(t) : pretty('{"videos":[]}');
      if (draft && draft.data && JSON.stringify(draft.data, null, 2) + "\n" !== remote) {
        data = normalise(draft.data); baseText = draft.base || remote;
        msg(draft.base && draft.base !== remote ? "Your draft is kept. The published list has also changed since; publishing will show what differs." : "Your unpublished draft is restored.");
      } else { data = normalise(JSON.parse(remote)); baseText = remote; }
      render();
    }).catch(function (e) { msg("Could not read the list: " + e.message, true); data = normalise(draft && draft.data || {}); baseText = baseText || text(); render(); });
  }
  function msg(t, bad) { var m = $("[data-msg]"); m.textContent = t || ""; m.classList.toggle("bad", !!bad); }

  /* rows */
  function render() {
    $("[data-set=title]").value = data.title; $("[data-set=intro]").value = data.intro;
    $("[data-n]").textContent = data.videos.length ? "(" + data.videos.length + ")" : "";
    var rows = $("[data-rows]");
    if (!data.videos.length) { rows.innerHTML = '<li class="m-empty">No renders yet. Paste a YouTube link above.</li>'; status(); return; }
    rows.innerHTML = data.videos.map(function (v, i) {
      return '<li class="m-row" data-i="' + i + '" draggable="true">' +
        '<span class="m-grip" title="Drag to reorder" aria-hidden="true">&#8942;&#8942;</span>' +
        '<span class="m-num">' + String(i + 1).padStart(2, "0") + "</span>" +
        '<a class="m-thumb" href="https://www.youtube.com/watch?v=' + esc(v.id) + '" target="_blank" rel="noopener"><img src="https://i.ytimg.com/vi/' + esc(v.id) + '/mqdefault.jpg" alt="" loading="lazy"></a>' +
        '<div class="m-fields"><input class="m-title" data-f="title" value="' + esc(v.title) + '" placeholder="Title" aria-label="Title">' +
        '<input class="m-tags" data-f="tags" value="' + esc((v.tags || []).join(", ")) + '" placeholder="Tags, separated by commas (Bridge, Rain, Night)" list="tag-list" aria-label="Tags">' +
        '<span class="m-id">' + esc(v.id) + (v.added ? " · added " + esc(v.added) : "") + "</span></div>" +
        '<div class="m-tools"><button type="button" class="m-icon star" data-act="star" aria-pressed="' + (v.featured ? "true" : "false") + '" title="Show this one large at the top">&#9733;</button>' +
        '<button type="button" class="m-icon" data-act="up" title="Move up" aria-label="Move up"' + (i ? "" : " disabled") + '>&#8593;</button>' +
        '<button type="button" class="m-icon" data-act="down" title="Move down" aria-label="Move down"' + (i < data.videos.length - 1 ? "" : " disabled") + '>&#8595;</button>' +
        '<button type="button" class="m-icon del" data-act="del" title="Remove from the page" aria-label="Remove">&#215;</button></div></li>';
    }).join("");
    tagList();
    status();
  }
  function tagList() {   // suggestions for the tag fields: every tag already in use
    var tags = {}; data.videos.forEach(function (v) { (v.tags || []).forEach(function (t) { tags[t] = 1; }); });
    $("[data-tags]").innerHTML = Object.keys(tags).sort().map(function (t) { return '<option value="' + esc(t) + '">'; }).join("");
  }
  function move(i, j) { if (j < 0 || j >= data.videos.length || i === j) return; var v = data.videos.splice(i, 1)[0]; data.videos.splice(j, 0, v); saveDraft(); render(); }

  var rows = $("[data-rows]");
  rows.addEventListener("input", function (e) {
    var f = e.target.dataset.f; if (!f) return;
    var v = data.videos[+e.target.closest(".m-row").dataset.i];
    if (f === "title") v.title = e.target.value;
    else v.tags = e.target.value.split(",").map(function (t) { return t.trim(); }).filter(Boolean);
    saveDraft();
  });
  rows.addEventListener("change", function (e) { if (e.target.dataset.f === "tags") tagList(); });
  rows.addEventListener("click", function (e) {
    var b = e.target.closest("[data-act]"); if (!b) return;
    var i = +b.closest(".m-row").dataset.i, a = b.dataset.act;
    if (a === "up") move(i, i - 1);
    else if (a === "down") move(i, i + 1);
    else if (a === "del") { if (confirmDel(i)) { data.videos.splice(i, 1); saveDraft(); render(); } }
    else if (a === "star") { var on = !data.videos[i].featured; data.videos.forEach(function (v) { delete v.featured; }); if (on) data.videos[i].featured = true; saveDraft(); render(); }
  });
  var pendingDel = -1, pendingT = 0;
  function confirmDel(i) {   // a second click within 3 seconds removes; no browser dialog
    if (pendingDel === i && Date.now() - pendingT < 3000) { pendingDel = -1; return true; }
    pendingDel = i; pendingT = Date.now(); msg("Click × again to remove " + (data.videos[i].title || data.videos[i].id) + ".");
    return false;
  }
  // drag to reorder (mouse); arrows on touch screens
  var dragI = -1;
  rows.addEventListener("dragstart", function (e) { var r = e.target.closest(".m-row"); if (!r) return; dragI = +r.dataset.i; r.classList.add("drag"); e.dataTransfer.effectAllowed = "move"; try { e.dataTransfer.setData("text/plain", r.dataset.i); } catch (x) {} });
  rows.addEventListener("dragend", function () { dragI = -1; [].forEach.call(rows.children, function (r) { r.classList.remove("drag", "over"); }); });
  rows.addEventListener("dragover", function (e) { var r = e.target.closest(".m-row"); if (!r || dragI < 0) return; e.preventDefault(); [].forEach.call(rows.children, function (x) { x.classList.toggle("over", x === r); }); });
  rows.addEventListener("drop", function (e) { var r = e.target.closest(".m-row"); if (!r || dragI < 0) return; e.preventDefault(); move(dragI, +r.dataset.i); });

  /* adding */
  function add() {
    var box = $("[data-paste]"), parts = box.value.split(/[\s,]+/).filter(Boolean), added = [], bad = [], dup = 0;
    parts.forEach(function (p) {
      var id = idOf(p);
      if (!id) { bad.push(p); return; }
      if (data.videos.some(function (v) { return v.id === id; }) || added.indexOf(id) >= 0) { dup++; return; }
      added.push(id);
    });
    if (!added.length) { msg(bad.length ? "Not a YouTube link: " + bad.slice(0, 3).join(" ") : dup ? "Already on the page." : "Paste a YouTube link first.", !!bad.length); return; }
    // new renders go to the top, in the order pasted
    var fresh = added.map(function (id) { return { id: id, title: "", tags: [], added: today() }; });
    data.videos = fresh.concat(data.videos); box.value = ""; saveDraft(); render();
    msg("Added " + added.length + (added.length === 1 ? " render" : " renders") + (dup ? ", " + dup + " already on the page" : "") + (bad.length ? ", " + bad.length + " not recognised" : "") + ". Fetching titles...");
    Promise.all(fresh.map(function (v) { return fetchTitle(v.id).then(function (t) { if (t && !v.title) v.title = t; }); })).then(function () {
      saveDraft(); render();
      var missing = fresh.filter(function (v) { return !v.title; }).length;
      msg(missing ? missing + " title(s) could not be fetched; type them in." : "Titles filled in from YouTube. Add tags, then publish.");
    });
  }
  $("[data-add]").onclick = add;
  $("[data-paste]").addEventListener("keydown", function (e) { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); add(); } });
  $("[data-paste]").addEventListener("paste", function () { setTimeout(add, 0); });

  [].forEach.call(document.querySelectorAll("[data-set]"), function (el) { el.addEventListener("input", function () { data[el.dataset.set] = el.value; saveDraft(); }); });

  /* saving */
  $("[data-download]").onclick = function () {
    var a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text()], { type: "application/json" })); a.download = "videos.json"; a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
    msg("Downloaded. Upload it to the content folder of the repository, replacing videos.json.");
  };
  $("[data-publish]").onclick = function () {
    GH.publish({
      title: "Publish the videos", message: "Update the videos",
      build: function () {
        return GH.readText(FILE).then(function (t) {
          var remote = t ? pretty(t) : null, mine = text(), conflicts = [];
          if (remote === mine) return { files: [] };
          if (remote !== null && baseText !== null && remote !== baseText) conflicts.push(FILE + " was changed on GitHub after this manager loaded it.");
          return { files: [{ path: FILE, text: mine, why: data.videos.length + " renders" }], conflicts: conflicts };
        });
      },
      done: function () { baseText = text(); try { localStorage.removeItem(DRAFT); } catch (e) {} status(); msg("Published. The page shows the new list in about a minute."); }
    });
  };
  $("[data-discard]").onclick = function () {
    if (!dirty()) { msg("Nothing to discard."); return; }
    if ($("[data-discard]").dataset.armed) { try { localStorage.removeItem(DRAFT); } catch (e) {} delete $("[data-discard]").dataset.armed; msg(""); load(); return; }
    $("[data-discard]").dataset.armed = "1"; msg("Click Discard changes again to drop your draft and reload the published list.");
    setTimeout(function () { delete $("[data-discard]").dataset.armed; }, 4000);
  };
  window.addEventListener("beforeunload", function (e) { if (dirty()) { e.preventDefault(); e.returnValue = ""; } });

  GH.button($("[data-gh]"));
  load();
})();
