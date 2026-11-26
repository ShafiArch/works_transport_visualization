/* Transport Visualization: reads content/videos.json and shows the featured render large, then
   every render in a grid with tag filters. Only thumbnails load; a YouTube player (the
   privacy enhanced youtube-nocookie.com) is made when a video is opened. #v=ID opens one. */
(function () {
  "use strict";
  var root = document.documentElement;
  function $(s) { return document.querySelector(s); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }

  /* themes */
  var tb = [].slice.call(document.querySelectorAll(".themes button"));
  function mark() { tb.forEach(function (b) { b.setAttribute("aria-pressed", b.dataset.theme === root.dataset.theme ? "true" : "false"); }); }
  tb.forEach(function (b) { b.onclick = function () { root.dataset.theme = b.dataset.theme; mark(); try { localStorage.setItem("site-theme", b.dataset.theme); } catch (e) {} }; });
  mark();

  function thumb(id, big) { return "https://i.ytimg.com/vi/" + id + "/" + (big ? "maxresdefault" : "hqdefault") + ".jpg"; }
  function frameHTML(v, big, small) {
    return '<div class="frame' + (small ? " small" : "") + '" data-open="' + esc(v.id) + '" role="button" tabindex="0" aria-label="Play ' + esc(v.title) + '">' +
      '<img src="' + thumb(v.id, big) + '" alt="" loading="' + (big ? "eager" : "lazy") + '" decoding="async"' + (big ? ' data-fallback="' + thumb(v.id) + '"' : "") + '><span class="play"></span></div>';
  }
  function embed(id) {
    return '<iframe src="https://www.youtube-nocookie.com/embed/' + encodeURIComponent(id) + '?autoplay=1&rel=0&playsinline=1&modestbranding=1" title="YouTube video" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>';
  }

  var videos = [], shown = [];
  fetch("content/videos.json", { cache: "no-cache" }).then(function (r) { return r.json(); }).then(function (d) {
    videos = (d.videos || []).filter(function (v) { return v && /^[\w-]{11}$/.test(v.id); });
    [].forEach.call(document.querySelectorAll("[data-title]"), function (e) { e.textContent = d.title || "Transport Visualization"; });
    if (d.title) document.title = d.title + " · Shafiul Islam";
    $("[data-intro]").textContent = d.intro || "";
    $("[data-count]").textContent = videos.length + (videos.length === 1 ? " render" : " renders");
    render();
    openFromHash();
  }).catch(function () { $("[data-grid]").innerHTML = '<p class="empty">The list of videos could not be loaded.</p>'; });

  function render() {
    var f = videos.filter(function (v) { return v.featured; })[0] || videos[0];
    if (f) {
      $("[data-feature]").innerHTML = frameHTML(f, true);
      $("[data-now]").innerHTML = "<b>" + esc(f.title) + "</b><span>" + esc((f.tags || []).join(" · ")) + "</span>";
      var im = $("[data-feature] img");
      im.onload = function () { if (im.naturalWidth < 200 && im.dataset.fallback) { im.src = im.dataset.fallback; im.dataset.fallback = ""; } };
      im.onerror = function () { if (im.dataset.fallback) { im.src = im.dataset.fallback; im.dataset.fallback = ""; } };
    }
    var grid = $("[data-grid]");
    if (!videos.length) { grid.innerHTML = '<p class="empty">No renders yet. Add them in the video manager.</p>'; return; }
    grid.innerHTML = videos.map(function (v, i) {
      return '<article class="item" data-tags="' + esc((v.tags || []).join("|")) + '">' + frameHTML(v, false, true) +
        '<div class="meta"><span class="n">' + String(i + 1).padStart(2, "0") + '</span><div><h3>' + esc(v.title || "Untitled") + '</h3>' +
        (v.tags && v.tags.length ? '<div class="tags">' + esc(v.tags.join(" · ")) + "</div>" : "") + "</div></div></article>";
    }).join("");
    // tag filters, with counts; hidden when there is nothing to filter
    var counts = {};
    videos.forEach(function (v) { (v.tags || []).forEach(function (t) { counts[t] = (counts[t] || 0) + 1; }); });
    var tags = Object.keys(counts).sort();
    var chips = $("[data-chips]");
    chips.innerHTML = tags.length ? ['<button type="button" aria-pressed="true" data-tag="">All<i>' + videos.length + "</i></button>"].concat(tags.map(function (t) {
      return '<button type="button" aria-pressed="false" data-tag="' + esc(t) + '">' + esc(t) + "<i>" + counts[t] + "</i></button>";
    })).join("") : "";
    shown = videos.slice();
    chips.onclick = function (e) {
      var b = e.target.closest("button"); if (!b) return;
      var t = b.dataset.tag;
      [].forEach.call(chips.children, function (c) { c.setAttribute("aria-pressed", c === b ? "true" : "false"); });
      shown = [];
      [].forEach.call(grid.children, function (el, i) {
        var on = !t || el.dataset.tags.split("|").indexOf(t) >= 0;
        el.classList.toggle("is-hidden", !on); if (on) shown.push(videos[i]);
      });
    };
  }

  /* player */
  var player = $("[data-player]"), pframe = $("[data-pframe]"), cur = -1, lastFocus = null;
  function open(id) {
    var list = shown.length ? shown : videos, i = -1;
    list.forEach(function (v, k) { if (v.id === id) i = k; });
    if (i < 0) { list = videos; shown = videos.slice(); videos.forEach(function (v, k) { if (v.id === id) i = k; }); }
    if (i < 0) return;
    cur = i; var v = list[i];
    lastFocus = document.activeElement;
    pframe.innerHTML = embed(v.id);
    $("[data-ptitle]").textContent = v.title || "Untitled";
    $("[data-pmeta]").textContent = (i + 1) + " of " + list.length + ((v.tags || []).length ? " · " + v.tags.join(" · ") : "");
    $("[data-pyt]").href = "https://www.youtube.com/watch?v=" + v.id;
    player.classList.add("open"); document.body.style.overflow = "hidden";
    if (location.hash !== "#v=" + v.id) history.replaceState(null, "", "#v=" + v.id);
    $("[data-close]").focus({ preventScroll: true });
  }
  function close() {
    pframe.innerHTML = ""; player.classList.remove("open"); document.body.style.overflow = "";
    history.replaceState(null, "", location.pathname + location.search);
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }
  function step(d) { var list = shown.length ? shown : videos; if (!list.length) return; open(list[(cur + d + list.length) % list.length].id); }
  function openFromHash() { var m = location.hash.match(/^#v=([\w-]{11})$/); if (m) open(m[1]); }
  document.addEventListener("click", function (e) { var f = e.target.closest("[data-open]"); if (f) open(f.dataset.open); });
  document.addEventListener("keydown", function (e) {
    var f = e.target.closest && e.target.closest("[data-open]");
    if (f && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); open(f.dataset.open); return; }
    if (!player.classList.contains("open")) return;
    if (e.key === "Escape") close(); else if (e.key === "ArrowRight") step(1); else if (e.key === "ArrowLeft") step(-1);
  });
  $("[data-close]").onclick = close; $("[data-prev]").onclick = function () { step(-1); }; $("[data-next]").onclick = function () { step(1); };
  player.addEventListener("click", function (e) { if (e.target === player) close(); });
  // swipe on the title bar (the video itself keeps its own touches)
  var sx = null;
  $(".player .info").addEventListener("touchstart", function (e) { sx = e.touches[0].clientX; }, { passive: true });
  $(".player .info").addEventListener("touchend", function (e) { if (sx == null) return; var dx = e.changedTouches[0].clientX - sx; sx = null; if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1); });
  window.addEventListener("hashchange", openFromHash);
})();
