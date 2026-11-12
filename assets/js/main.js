/* Dreemz Wealth — site behaviour (no libraries). */
(function () {
  "use strict";

  /* ---------- Menu bar: show the emblem once the banner / brand bar scrolls away ---------- */
  var hdr = document.querySelector(".site-header");
  var top = document.querySelector(".banner, .brandbar");
  if (hdr && top && "IntersectionObserver" in window) {
    new IntersectionObserver(function (e) { hdr.classList.toggle("is-stuck", !e[0].isIntersecting); }).observe(top);
  } else if (hdr) { hdr.classList.add("is-stuck"); }

  /* ---------- Mobile navigation ---------- */
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.getElementById("site-nav");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }

  /* ---------- Footer year ---------- */
  document.querySelectorAll("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });

  /* ---------- Local clocks (Kottayam IST / Dubai GST) ---------- */
  function tick() {
    document.querySelectorAll("[data-tz]").forEach(function (el) {
      try {
        el.textContent = new Intl.DateTimeFormat("en-IN", {
          timeZone: el.getAttribute("data-tz"), weekday: "short", hour: "numeric", minute: "2-digit", hour12: true
        }).format(new Date()) + " " + el.getAttribute("data-tzlabel");
      } catch (e) { /* older browsers: leave blank */ }
    });
  }
  tick(); setInterval(tick, 30000);

  /* ---------- Indian number formatting ---------- */
  var inr = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });
  function rupees(n) { return "₹" + inr.format(Math.round(n)); }
  function words(n) {
    n = Math.round(n);
    if (n >= 1e7) return "≈ ₹" + (n / 1e7).toFixed(2) + " crore";
    if (n >= 1e5) return "≈ ₹" + (n / 1e5).toFixed(2) + " lakh";
    return "";
  }

  /* Future value of a monthly SIP, invested at the start of each month. */
  function sipFV(monthly, annualRatePct, years) {
    var r = annualRatePct / 100 / 12, n = Math.round(years * 12);
    if (r === 0) return monthly * n;
    return monthly * ((Math.pow(1 + r, n) - 1) / r) * (1 + r);
  }
  /* Monthly SIP needed to reach a target. */
  function sipNeeded(target, annualRatePct, years) {
    var unit = sipFV(1, annualRatePct, years);
    return unit > 0 ? target / unit : 0;
  }

  /* Pair a range slider with a number box. */
  function bind(id, onChange) {
    var range = document.getElementById(id);
    var box = document.getElementById(id + "-n");
    if (!range || !box) return null;
    range.addEventListener("input", function () { box.value = range.value; onChange(); });
    box.addEventListener("input", function () {
      var v = parseFloat(box.value);
      if (!isNaN(v)) { range.value = v; onChange(); }
    });
    box.addEventListener("blur", function () {
      var v = parseFloat(box.value), min = parseFloat(range.min), max = parseFloat(range.max);
      if (isNaN(v)) v = parseFloat(range.value);
      v = Math.min(Math.max(v, min), max);
      box.value = v; range.value = v; onChange();
    });
    return function () { var v = parseFloat(box.value); return isNaN(v) ? parseFloat(range.value) : v; };
  }

  function setBar(el, invested, total) {
    if (!el) return;
    var inv = total > 0 ? Math.max(0, Math.min(100, invested / total * 100)) : 100;
    el.querySelector(".b-inv").style.width = inv + "%";
    el.querySelector(".b-gain").style.width = (100 - inv) + "%";
  }

  /* Year-by-year growth chart (SVG, drawn to scale). */
  function drawChart(svg, monthly, rate, years) {
    if (!svg) return;
    var W = 520, H = 220, padL = 8, padR = 8, padT = 14, padB = 26;
    var yrs = Math.max(1, Math.round(years));
    var maxV = sipFV(monthly, rate, yrs);
    var bw = (W - padL - padR) / yrs;
    var parts = [];
    for (var y = 1; y <= yrs; y++) {
      var v = sipFV(monthly, rate, y), inv = monthly * 12 * y;
      var h = maxV > 0 ? (v / maxV) * (H - padT - padB) : 0;
      var hi = maxV > 0 ? (inv / maxV) * (H - padT - padB) : 0;
      var x = padL + (y - 1) * bw + bw * 0.15, w = bw * 0.7;
      parts.push('<rect x="' + x.toFixed(1) + '" y="' + (H - padB - h).toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + h.toFixed(1) + '" fill="#d6ad55" rx="1.5"/>');
      parts.push('<rect x="' + x.toFixed(1) + '" y="' + (H - padB - hi).toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + hi.toFixed(1) + '" fill="#8e96b4" rx="1.5"/>');
      var step = yrs <= 10 ? 1 : yrs <= 20 ? 5 : 10;
      if (y === 1 || y % step === 0) {
        parts.push('<text x="' + (x + w / 2).toFixed(1) + '" y="' + (H - 8) + '" fill="#a9aec0" font-size="11" text-anchor="middle" font-family="IBM Plex Mono, monospace">Y' + y + '</text>');
      }
    }
    parts.push('<line x1="' + padL + '" x2="' + (W - padR) + '" y1="' + (H - padB) + '" y2="' + (H - padB) + '" stroke="#4a5170" stroke-width="1"/>');
    svg.setAttribute("viewBox", "0 0 " + W + " " + H);
    svg.innerHTML = parts.join("");
  }

  /* ---------- SIP calculator ---------- */
  if (document.getElementById("sip-amt")) {
    var amt, yrs, rate;
    var runSip = function () {
      if (!amt) return;
      var m = amt(), y = yrs(), r = rate();
      var fv = sipFV(m, r, y), inv = m * 12 * y;
      document.getElementById("sip-fv").textContent = rupees(fv);
      document.getElementById("sip-fv-w").textContent = words(fv);
      document.getElementById("sip-inv").textContent = rupees(inv);
      document.getElementById("sip-gain").textContent = rupees(fv - inv);
      setBar(document.getElementById("sip-bar"), inv, fv);
      drawChart(document.getElementById("sip-chart"), m, r, y);
    };
    amt = bind("sip-amt", runSip); yrs = bind("sip-yrs", runSip); rate = bind("sip-rate", runSip);
    runSip();
  }

  /* ---------- Goal planner ---------- */
  if (document.getElementById("goal-cost")) {
    var cost, gy, infl, gr;
    var runGoal = function () {
      if (!cost) return;
      var c = cost(), y = gy(), i = infl(), r = gr();
      var future = c * Math.pow(1 + i / 100, y);
      var need = sipNeeded(future, r, y);
      document.getElementById("goal-sip").textContent = rupees(need);
      document.getElementById("goal-future").textContent = rupees(future);
      document.getElementById("goal-future-w").textContent = words(future);
      document.getElementById("goal-inv").textContent = rupees(need * 12 * y);
      document.getElementById("goal-yrs-out").textContent = y + (y === 1 ? " year" : " years");
    };
    cost = bind("goal-cost", runGoal); gy = bind("goal-yrs", runGoal); infl = bind("goal-infl", runGoal); gr = bind("goal-rate", runGoal);
    runGoal();
  }

  /* ---------- Credentials lightbox ---------- */
  var openers = document.querySelectorAll("[data-full]");
  if (openers.length) {
    var box = document.createElement("div");
    box.className = "lightbox"; box.hidden = true;
    box.setAttribute("role", "dialog"); box.setAttribute("aria-modal", "true"); box.setAttribute("aria-label", "Certificate preview");
    box.innerHTML = '<button type="button" class="btn btn--gold close">Close</button><figure><img alt=""><figcaption></figcaption></figure>';
    document.body.appendChild(box);
    var img = box.querySelector("img"), cap = box.querySelector("figcaption"), closeBtn = box.querySelector(".close"), last = null;
    var close = function () { box.hidden = true; img.removeAttribute("src"); if (last) last.focus(); };
    openers.forEach(function (b) {
      b.addEventListener("click", function () {
        last = b; img.src = b.getAttribute("data-full"); img.alt = b.getAttribute("data-title") || "";
        cap.textContent = b.getAttribute("data-title") || ""; box.hidden = false; closeBtn.focus();
      });
    });
    closeBtn.addEventListener("click", close);
    box.addEventListener("click", function (e) { if (e.target === box) close(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !box.hidden) close(); });
  }

  /* ---------- Copy buttons ---------- */
  document.querySelectorAll("[data-copy]").forEach(function (b) {
    b.addEventListener("click", function () {
      var text = b.getAttribute("data-copy"), label = b.textContent;
      var done = function () { b.textContent = "Copied"; setTimeout(function () { b.textContent = label; }, 1600); };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, function () {});
      }
    });
  });

  /* ---------- Enquiry form → Google Apps Script ---------- */
  var form = document.getElementById("enquiry");
  if (form) {
    var status = document.getElementById("form-status");
    var showErr = function (field, msg) {
      var input = form.querySelector("#" + field), out = form.querySelector("#" + field + "-err");
      if (input) input.setAttribute("aria-invalid", msg ? "true" : "false");
      if (out) { out.textContent = msg || ""; out.hidden = !msg; }
    };
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var name = form.name.value.trim();
      var code = form.code.value;
      var mobile = form.mobile.value.replace(/[^\d]/g, "");
      var message = form.message.value.trim();
      var ok = true;
      showErr("name", ""); showErr("mobile", ""); showErr("message", ""); showErr("consent", "");
      if (name.length < 2) { showErr("name", "Please enter your full name."); ok = false; }
      if (mobile.length < 7 || mobile.length > 13) { showErr("mobile", "Please enter a valid mobile number."); ok = false; }
      if (message.length < 5) { showErr("message", "Please tell us a little about what you'd like help with."); ok = false; }
      if (form.consent && !form.consent.checked) { showErr("consent", "Please tick the box to agree before sending."); ok = false; }
      if (!ok) { status.hidden = true; return; }
      if (form.website.value) { return; } // spam trap

      var endpoint = (window.DREEMZ_CONFIG || {}).FORM_ENDPOINT;
      var btn = form.querySelector("button[type=submit]");
      if (!endpoint) {
        status.className = "form-status fail"; status.hidden = false;
        status.textContent = "The enquiry form isn't connected yet. Please WhatsApp or email us using the details on this page.";
        return;
      }
      btn.disabled = true; btn.textContent = "Sending…";
      var body = new URLSearchParams({
        name: name, mobile: code + " " + mobile, message: message,
        page: location.pathname, sent: new Date().toISOString(), consent: form.consent && form.consent.checked ? "yes" : "no"
      });
      fetch(endpoint, { method: "POST", mode: "no-cors", body: body })
        .then(function () {
          form.reset();
          status.className = "form-status ok"; status.hidden = false;
          status.textContent = "Thank you, " + name.split(" ")[0] + ". Your enquiry has been received. Wilfred will get back to you within one working day.";
        })
        .catch(function () {
          status.className = "form-status fail"; status.hidden = false;
          status.textContent = "We couldn't send your enquiry. Please check your connection and try again, or WhatsApp us instead.";
        })
        .then(function () { btn.disabled = false; btn.textContent = "Send enquiry"; });
    });
  }
})();
