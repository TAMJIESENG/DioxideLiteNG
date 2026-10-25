/* =========================================================
   实机画廊页交互
   主题切换 / 滚动进度 / 入场动效 / 媒体懒加载 / 视频自动播放
   无第三方依赖，无网络请求。
   ========================================================= */
(function () {
  "use strict";

  var root = document.documentElement;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- 主题 ---------- */
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

  /* ---------- 滚动进度 ---------- */
  var bar = document.querySelector(".scroll-progress");
  var ticking = false;

  function updateProgress() {
    ticking = false;
    if (!bar) return;
    var max = document.documentElement.scrollHeight - window.innerHeight;
    var p = max > 0 ? window.scrollY / max : 0;
    bar.style.width = Math.min(100, Math.max(0, p * 100)) + "%";
  }

  window.addEventListener("scroll", function () {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(updateProgress);
  }, { passive: true });
  window.addEventListener("resize", updateProgress);
  updateProgress();

  /* ---------- 导航吸顶 ---------- */
  var nav = document.querySelector(".nav");
  function onScroll() {
    if (nav) nav.classList.toggle("is-stuck", window.scrollY > 8);
  }
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  var toggle = document.querySelector(".nav-toggle");
  if (toggle) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }

  function inView(el, ratio) {
    var r = el.getBoundingClientRect();
    if (!r.height) return false;
    var visible = Math.min(r.bottom, window.innerHeight) - Math.max(r.top, 0);
    return visible / r.height >= (ratio || 0.4);
  }

  /* ---------- 媒体懒加载 ---------- */
  var shells = Array.prototype.slice.call(document.querySelectorAll(".media-shell"));

  function loadMedia(shell) {
    if (shell.dataset.loaded) return;
    shell.dataset.loaded = "1";
    var media = shell.querySelector("[data-src]");
    if (!media) {
      shell.classList.add("ready");
      return;
    }
    var src = media.getAttribute("data-src");
    media.removeAttribute("data-src");

    var done = function () { shell.classList.add("ready"); };

    if (media.tagName === "VIDEO") {
      media.src = src;
      media.addEventListener("loadeddata", done, { once: true });
      media.addEventListener("error", done, { once: true });
      media.load();
      if (!reduceMotion) {
        var play = media.play && media.play();
        if (play && play.catch) play.catch(function () {});
        if (inView(media, 0.2)) {
          var again = media.play && media.play();
          if (again && again.catch) again.catch(function () {});
        }
      }
    } else {
      media.addEventListener("load", done, { once: true });
      media.addEventListener("error", done, { once: true });
      media.src = src;
      if (media.complete && media.naturalWidth) done();
    }
  }

  if ("IntersectionObserver" in window) {
    var loader = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        loadMedia(entry.target);
        loader.unobserve(entry.target);
      });
    }, { rootMargin: "600px 0px" });
    shells.forEach(function (s) { loader.observe(s); });
  } else {
    shells.forEach(loadMedia);
  }

  /* ---------- 视频：入镜播放 / 出镜暂停 ---------- */
  var videos = Array.prototype.slice.call(document.querySelectorAll("video.reel-video"));

  function setPlayingUI(video, playing) {
    var card = video.closest(".reel-media");
    if (!card) return;
    var btn = card.querySelector("[data-act='play']");
    if (!btn) return;
    btn.setAttribute("aria-pressed", playing ? "true" : "false");
    btn.querySelector("span").textContent = playing ? "暂停" : "播放";
    btn.querySelector("svg").style.opacity = playing ? "0.55" : "1";
  }

  videos.forEach(function (video) {
    var card = video.closest(".reel-media");
    var playBtn = card ? card.querySelector("[data-act='play']") : null;
    var muteBtn = card ? card.querySelector("[data-act='mute']") : null;

    if (playBtn) {
      playBtn.addEventListener("click", function () {
        if (video.paused) {
          video.play().catch(function () {});
        } else {
          video.pause();
        }
      });
    }

    if (muteBtn) {
      muteBtn.addEventListener("click", function () {
        var willUnmute = video.muted;
        videos.forEach(function (other) {
          if (other === video) return;
          other.muted = true;
          var otherCard = other.closest(".reel-media");
          var otherBtn = otherCard ? otherCard.querySelector("[data-act='mute']") : null;
          if (otherBtn) {
            otherBtn.setAttribute("aria-pressed", "false");
            otherBtn.querySelector("span").textContent = "声音";
          }
        });
        video.muted = !willUnmute;
        muteBtn.setAttribute("aria-pressed", video.muted ? "false" : "true");
        muteBtn.querySelector("span").textContent = video.muted ? "声音" : "静音";
        if (!video.muted && video.paused) video.play().catch(function () {});
      });
    }

    video.addEventListener("play", function () { setPlayingUI(video, true); });
    video.addEventListener("pause", function () { setPlayingUI(video, false); });
    setPlayingUI(video, !video.paused);
  });

  if ("IntersectionObserver" in window && !reduceMotion) {
    var autoplay = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var video = entry.target;
        if (entry.intersectionRatio >= 0.3 || inView(entry.target, 0.45)) {
          if (video.dataset.loaded !== "0") {
            var p = video.play && video.play();
            if (p && p.catch) p.catch(function () {});
          }
        } else if (!video.paused) {
          video.pause();
        }
      });
    }, { threshold: [0, 0.3, 0.6] });
    videos.forEach(function (v) { autoplay.observe(v); });
  }

  /* ---------- 入场动效 ---------- */
  var reveals = Array.prototype.slice.call(document.querySelectorAll(".reveal"));

  if ("IntersectionObserver" in window && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("in");
        io.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -60px 0px" });
    reveals.forEach(function (el) { io.observe(el); });

    requestAnimationFrame(function () {
      reveals.forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.top < window.innerHeight * 0.9 && r.bottom > 0) el.classList.add("in");
      });
    });
  } else {
    reveals.forEach(function (el) { el.classList.add("in"); });
  }

  /* ---------- 侧边索引 ---------- */
  var rails = Array.prototype.slice.call(document.querySelectorAll(".rail-nav a"));
  var reels = Array.prototype.slice.call(document.querySelectorAll(".reel[id]"));

  if ("IntersectionObserver" in window && rails.length && reels.length) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var id = entry.target.id;
        rails.forEach(function (a) {
          a.classList.toggle("active", a.getAttribute("href") === "#" + id);
        });
      });
    }, { rootMargin: "-42% 0px -50% 0px" });
    reels.forEach(function (r) { spy.observe(r); });
  }
})();
