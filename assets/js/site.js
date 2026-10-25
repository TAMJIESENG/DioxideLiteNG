/* =========================================================
   DioxideLiteNG 功能页交互
   数据：assets/js/feature-data.js（由 tools/build_feature_data.py 从源码生成）
   无第三方依赖，无网络请求。
   ========================================================= */
(function () {
  "use strict";

  var DATA = window.DLX_FEATURES || { categories: {}, counts: {}, total: 0 };
  var ORDER = ["COMBAT", "MOVEMENT", "PLAYER", "MISC", "VISUAL"];
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var root = document.documentElement;

  /* ---------- 1. 主题切换 ---------- */
  var themeBtn = document.getElementById("theme-toggle");
  var themeTimer = null;

  function currentTheme() {
    return root.getAttribute("data-theme") === "light" ? "light" : "dark";
  }

  function syncThemeButton() {
    if (!themeBtn) return;
    var light = currentTheme() === "light";
    themeBtn.setAttribute("aria-pressed", light ? "true" : "false");
    themeBtn.setAttribute("aria-label", light ? "切换到暗色主题" : "切换到亮色主题");
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", light ? "#f5f5fa" : "#07080d");
  }

  function applyTheme(next, animate) {
    if (animate && !reduceMotion) {
      root.classList.add("theming");
      window.clearTimeout(themeTimer);
      themeTimer = window.setTimeout(function () {
        root.classList.remove("theming");
      }, 620);
    }
    root.setAttribute("data-theme", next);
    try { localStorage.setItem("dlx-theme", next); } catch (e) {}
    syncThemeButton();
  }

  syncThemeButton();

  if (themeBtn) {
    themeBtn.addEventListener("click", function () {
      applyTheme(currentTheme() === "light" ? "dark" : "light", true);
    });
  }

  /* 跟随系统切换（用户没有手动选过时） */
  if (window.matchMedia) {
    var mq = window.matchMedia("(prefers-color-scheme: light)");
    var onScheme = function (e) {
      var saved = null;
      try { saved = localStorage.getItem("dlx-theme"); } catch (err) {}
      if (saved === "light" || saved === "dark") return;
      applyTheme(e.matches ? "light" : "dark", true);
    };
    if (mq.addEventListener) mq.addEventListener("change", onScheme);
  }

  /* ---------- 2. 导航 ---------- */
  var nav = document.querySelector(".nav");
  var toggle = document.querySelector(".nav-toggle");

  function onScroll() {
    if (nav) nav.classList.toggle("is-stuck", window.scrollY > 8);
  }
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  if (toggle) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }
  document.querySelectorAll(".nav-links a").forEach(function (link) {
    link.addEventListener("click", function () {
      if (nav) nav.classList.remove("open");
      if (toggle) toggle.setAttribute("aria-expanded", "false");
    });
  });

  var sections = Array.prototype.slice.call(document.querySelectorAll("main section[id]"));
  var navLinks = Array.prototype.slice.call(document.querySelectorAll(".nav-links a[href^='#']"));

  if ("IntersectionObserver" in window && sections.length) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var id = entry.target.id;
        navLinks.forEach(function (link) {
          link.classList.toggle("active", link.getAttribute("href") === "#" + id);
        });
      });
    }, { rootMargin: "-45% 0px -50% 0px", threshold: 0 });
    sections.forEach(function (s) { spy.observe(s); });
  }

  /* ---------- 3. 入场 ---------- */
  var revealables = Array.prototype.slice.call(document.querySelectorAll("[data-reveal]"));

  function revealNow(el) { el.classList.add("in"); }

  if ("IntersectionObserver" in window && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        revealNow(entry.target);
        io.unobserve(entry.target);
      });
    }, { threshold: 0.1, rootMargin: "0px 0px -40px 0px" });
    revealables.forEach(function (el) { io.observe(el); });

    requestAnimationFrame(function () {
      revealables.forEach(function (el) {
        if (el.classList.contains("in")) return;
        var r = el.getBoundingClientRect();
        if (r.top < window.innerHeight && r.bottom > 0) revealNow(el);
      });
    });
    window.setTimeout(function () {
      if (document.querySelectorAll("[data-reveal].in").length === 0) {
        revealables.forEach(revealNow);
      }
    }, 2500);
  } else {
    revealables.forEach(revealNow);
  }

  /* ---------- 4. 数字 ---------- */
  function format(n) {
    return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

  function animateNumber(el) {
    var target = parseFloat(el.getAttribute("data-count"));
    if (isNaN(target)) return;
    if (reduceMotion) { el.textContent = format(target); return; }
    var start = performance.now();
    var dur = 1000;
    function frame(now) {
      var p = Math.min(1, (now - start) / dur);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = format(Math.round(target * eased));
      if (p < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  var counters = Array.prototype.slice.call(document.querySelectorAll("[data-count]"));
  if ("IntersectionObserver" in window) {
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        animateNumber(entry.target);
        cio.unobserve(entry.target);
      });
    }, { threshold: 0.5 });
    counters.forEach(function (el) { cio.observe(el); });
  } else {
    counters.forEach(animateNumber);
  }

  /* ---------- 5. 模块清单 ---------- */
  var tabsWrap = document.getElementById("mod-tabs");
  var tableBody = document.getElementById("mod-rows");
  var emptyRow = document.getElementById("mod-empty");
  var searchInput = document.getElementById("mod-search");
  var catTitle = document.getElementById("cat-title");
  var catMeta = document.getElementById("cat-meta");
  var hint = document.getElementById("mod-hint");

  var currentCat = "COMBAT";
  var query = "";

  function cat(key) {
    return (DATA.categories && DATA.categories[key]) || { label: key, dir: "", modules: [] };
  }

  function renderTabs() {
    if (!tabsWrap) return;
    tabsWrap.innerHTML = "";
    ORDER.forEach(function (key) {
      var c = cat(key);
      if (!c.modules.length) return;
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "tab";
      btn.setAttribute("role", "tab");
      btn.setAttribute("aria-selected", key === currentCat ? "true" : "false");
      btn.innerHTML = c.label + ' <span class="count">' + c.modules.length + "</span>";
      btn.addEventListener("click", function () {
        currentCat = key;
        query = "";
        if (searchInput) searchInput.value = "";
        renderTabs();
        renderAll();
      });
      tabsWrap.appendChild(btn);
    });
  }

  function renderHead() {
    var c = cat(currentCat);
    var loc = c.modules.reduce(function (sum, m) { return sum + (m.loc || 0); }, 0);
    if (catTitle) catTitle.textContent = c.label;
    if (catMeta) {
      catMeta.textContent = c.dir + " · " + c.modules.length + " 个模块 · " + format(loc) + " 行";
    }
  }

  function chips(settings) {
    if (!settings || !settings.length) return '<span class="muted" style="font-size:11px">—</span>';
    return settings.slice(0, 3).map(function (s) {
      return "<span>" + s.label + "</span>";
    }).join("");
  }

  function renderRows() {
    if (!tableBody) return;
    var modules = cat(currentCat).modules;
    var q = query.trim().toLowerCase();
    var rows = !q ? modules : modules.filter(function (m) {
      var hay = (m.cn + " " + m.name + " " + m.cls + " " + m.desc + " " +
        (m.settings || []).map(function (s) { return s.label; }).join(" ")).toLowerCase();
      return hay.indexOf(q) !== -1;
    });

    tableBody.innerHTML = "";
    rows.forEach(function (m) {
      var tr = document.createElement("tr");
      tr.title = m.file;
      tr.innerHTML =
        '<td class="cn">' + m.cn + '<br><span class="cls">' + m.cls + "</span></td>" +
        '<td class="desc">' + m.desc + "</td>" +
        '<td class="set">' + chips(m.settings) + "</td>" +
        '<td class="loc">' + format(m.loc || 0) + "</td>";
      tableBody.appendChild(tr);
    });

    if (emptyRow) {
      emptyRow.hidden = rows.length !== 0;
      if (!rows.length) emptyRow.firstElementChild.textContent = "未匹配到：" + query;
    }
    if (hint) {
      hint.textContent = q ? rows.length + " / " + modules.length + " 匹配"
        : modules.length + " 个模块 · 共 " + format(DATA.total || 0) + " 个";
    }
  }

  function renderAll() {
    renderHead();
    renderRows();
  }

  if (tabsWrap) {
    renderTabs();
    renderAll();
  }

  if (searchInput) {
    searchInput.addEventListener("input", function () {
      query = searchInput.value || "";
      renderRows();
    });
    searchInput.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        searchInput.value = "";
        query = "";
        renderRows();
      }
    });
  }

  /* ---------- 6. 代码复制 ---------- */
  document.querySelectorAll(".code .copy").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var shell = btn.closest(".code");
      var pre = shell ? shell.querySelector("pre") : null;
      if (!pre) return;
      var text = pre.innerText;
      var done = function () {
        var old = btn.textContent;
        btn.textContent = "已复制";
        setTimeout(function () { btn.textContent = old; }, 1400);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, function () { fallback(text, done); });
      } else {
        fallback(text, done);
      }
    });
  });

  function fallback(text, done) {
    try {
      var ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      done();
    } catch (e) {}
  }
})();
