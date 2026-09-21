(() => {
  "use strict";

  document.documentElement.classList.add("js");

  const header = document.querySelector(".site-header");
  const navToggle = document.querySelector(".nav-toggle");
  const navMenu = document.querySelector(".nav__menu");
  const dropdown = document.querySelector(".dropdown");
  const dropdownToggle = document.querySelector(".dropdown__toggle");
  const searchToggle = document.querySelector(".search-toggle");
  const searchRegion = document.querySelector(".site-search");
  const searchPanel = document.querySelector(".site-search__panel");
  const searchForm = document.querySelector(".site-search__form");
  const searchInput = document.querySelector(".site-search__input");
  const searchClose = document.querySelector(".search-close");
  const searchResults = document.querySelector(".site-search__results");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const searchIndex = [
    { title: "Build & Grow Your Coffee Business", url: "index.html", excerpt: "Air-roasting equipment, training, menu guidance, green coffee and ROI planning.", keywords: "home roi calculator support installation training" },
    { title: "Commercial Air Roasters", url: "roasters.html", excerpt: "Compare the Java Master JM 1500 and Profect 4.0 commercial roasters.", keywords: "equipment machines compare" },
    { title: "JM 1500", url: "jm-1500.html", excerpt: "A compact commercial air roaster for published batch sizes from one to four pounds.", keywords: "specifications touchpad 16 pounds hour" },
    { title: "Profect 4.0", url: "profect.html", excerpt: "Adjustable profiles, multiple roasting modes and a published 6.8-pound nominal capacity.", keywords: "specifications capacity equipment" },
    { title: "Green Coffee Catalogue", url: "coffee.html", excerpt: "Explore representative origins and discuss current green coffee availability.", keywords: "beans origins colombia ethiopia guatemala decaf" },
    { title: "Customer Success Stories", url: "success-stories.html", excerpt: "Coffee-program story frameworks for cafés, grocers, hospitality teams and entrepreneurs.", keywords: "case studies customers results" },
    { title: "Customer Story", url: "success-story-detail.html", excerpt: "A detailed framework covering a coffee business challenge, solution and outcome.", keywords: "case study implementation" },
    { title: "About Java Master", url: "about.html", excerpt: "The engineering roots, air-roasting approach and business-support story.", keywords: "history 1987 company air roasting" },
    { title: "Request a Demonstration", url: "contact.html#demo-form", excerpt: "Talk with Java Master about your coffee business, location and product needs.", keywords: "contact demo sales phone support" }
  ];

  const closeMenus = () => {
    navMenu?.classList.remove("is-open");
    navToggle?.setAttribute("aria-expanded", "false");
    navToggle?.setAttribute("aria-label", "Open navigation");
    dropdown?.classList.remove("is-open");
    dropdownToggle?.setAttribute("aria-expanded", "false");
  };

  navToggle?.addEventListener("click", () => {
    const open = navToggle.getAttribute("aria-expanded") === "true";
    navToggle.setAttribute("aria-expanded", String(!open));
    navToggle.setAttribute("aria-label", open ? "Open navigation" : "Close navigation");
    navMenu?.classList.toggle("is-open", !open);
  });

  dropdownToggle?.addEventListener("click", (event) => {
    event.stopPropagation();
    const open = dropdownToggle.getAttribute("aria-expanded") === "true";
    dropdownToggle.setAttribute("aria-expanded", String(!open));
    dropdown?.classList.toggle("is-open", !open);
  });

  document.addEventListener("click", (event) => {
    if (!dropdown?.contains(event.target)) {
      dropdown?.classList.remove("is-open");
      dropdownToggle?.setAttribute("aria-expanded", "false");
    }
  });

  dropdown?.addEventListener("focusout", () => {
    window.setTimeout(() => {
      if (!dropdown.contains(document.activeElement)) {
        dropdown.classList.remove("is-open");
        dropdownToggle?.setAttribute("aria-expanded", "false");
      }
    });
  });

  const renderSearchResults = () => {
    if (!searchInput || !searchResults) return;
    const query = searchInput.value.trim().toLocaleLowerCase();
    searchResults.replaceChildren();

    if (!query) {
      const prompt = document.createElement("p");
      prompt.className = "site-search__empty";
      prompt.textContent = "Enter a word or phrase to search the Java Master website.";
      searchResults.append(prompt);
      return;
    }

    const terms = query.split(/\s+/).filter(Boolean);
    const matches = searchIndex.filter((item) => {
      const searchable = `${item.title} ${item.excerpt} ${item.keywords}`.toLocaleLowerCase();
      return terms.every((term) => searchable.includes(term));
    });

    if (!matches.length) {
      const empty = document.createElement("p");
      empty.className = "site-search__empty";
      empty.textContent = `No results found for “${searchInput.value.trim()}”.`;
      searchResults.append(empty);
      return;
    }

    matches.forEach((item) => {
      const link = document.createElement("a");
      const title = document.createElement("strong");
      const excerpt = document.createElement("span");
      link.className = "site-search__result";
      link.href = item.url;
      title.textContent = item.title;
      excerpt.textContent = item.excerpt;
      link.append(title, excerpt);
      searchResults.append(link);
    });
  };

  const openSearch = () => {
    if (!searchRegion || !searchToggle) return;
    searchRegion.hidden = false;
    searchToggle.setAttribute("aria-expanded", "true");
    window.requestAnimationFrame(() => searchRegion.classList.add("is-open"));
    renderSearchResults();
    searchInput?.focus();
  };

  const closeSearch = (restoreFocus = true) => {
    if (!searchRegion || !searchToggle || searchRegion.hidden) return;
    searchRegion.classList.remove("is-open");
    searchToggle.setAttribute("aria-expanded", "false");
    const finish = () => {
      if (!searchRegion.classList.contains("is-open")) searchRegion.hidden = true;
    };
    if (reduceMotion) finish();
    else window.setTimeout(finish, 180);
    if (restoreFocus) searchToggle.focus();
  };

  searchToggle?.addEventListener("click", () => {
    if (searchToggle.getAttribute("aria-expanded") === "true") closeSearch();
    else openSearch();
  });
  searchClose?.addEventListener("click", () => closeSearch());
  searchForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    renderSearchResults();
  });
  searchInput?.addEventListener("input", renderSearchResults);

  document.addEventListener("pointerdown", (event) => {
    if (searchRegion?.classList.contains("is-open") && !searchPanel?.contains(event.target) && !searchToggle?.contains(event.target)) {
      closeSearch(false);
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      if (searchRegion?.classList.contains("is-open")) {
        closeSearch();
      } else if (dropdown?.classList.contains("is-open")) {
        dropdown.classList.remove("is-open");
        dropdownToggle?.setAttribute("aria-expanded", "false");
        dropdownToggle?.focus();
      } else if (navMenu?.classList.contains("is-open")) {
        closeMenus();
        navToggle?.focus();
      }
    }
  });

  navMenu?.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeMenus));
  window.addEventListener("scroll", () => header?.classList.toggle("is-scrolled", window.scrollY > 18), { passive: true });
  window.addEventListener("resize", () => {
    if (window.innerWidth > 900) closeMenus();
  });

  const pageName = window.location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".nav__link, .dropdown__menu a").forEach((link) => {
    if (link.getAttribute("href") !== pageName) return;
    link.setAttribute("aria-current", "page");
    if (link.closest(".dropdown__menu")) dropdownToggle?.classList.add("is-active");
  });

  document.querySelectorAll(".faq__button").forEach((button) => {
    button.addEventListener("click", () => {
      const panel = document.getElementById(button.getAttribute("aria-controls"));
      const open = button.getAttribute("aria-expanded") === "true";
      button.setAttribute("aria-expanded", String(!open));
      if (!panel) return;
      if (reduceMotion || typeof panel.animate !== "function") {
        panel.hidden = open;
        return;
      }

      panel.getAnimations().forEach((animation) => animation.cancel());
      if (open) {
        const animation = panel.animate(
          [{ height: `${panel.scrollHeight}px`, opacity: 1 }, { height: "0", opacity: 0 }],
          { duration: 220, easing: "ease-out" }
        );
        animation.onfinish = () => { panel.hidden = true; };
      } else {
        panel.hidden = false;
        const animation = panel.animate(
          [{ height: "0", opacity: 0 }, { height: `${panel.scrollHeight}px`, opacity: 1 }],
          { duration: 260, easing: "ease-out" }
        );
        animation.onfinish = () => animation.cancel();
      }
    });
  });

  document.querySelectorAll(".filter-button").forEach((button) => {
    button.addEventListener("click", () => {
      const filter = button.dataset.filter;
      document.querySelectorAll(".filter-button").forEach((item) => {
        item.classList.toggle("is-active", item === button);
        item.setAttribute("aria-pressed", String(item === button));
      });
      document.querySelectorAll(".story-card[data-category]").forEach((card) => {
        card.hidden = filter !== "all" && card.dataset.category !== filter;
      });
    });
  });

  // Mirrors the public Java Master ROI calculator configuration as published in September 2026.
  // Keep this isolated so commercial assumptions can be audited or updated without touching form logic.
  const roiConfig = {
    currencySymbols: { USD: "$", CAD: "CA$", GBP: "£", EUR: "€" },
    fixedPrices: {
      GBP: { ShopRoaster: 17000, ContinuousRoasting: 21000 },
      EUR: { ShopRoaster: 20000, ContinuousRoasting: 25000 }
    },
    conversionRates: { USD: 1, CAD: 1.25, GBP: .75, EUR: .85 },
    baseCostPerPound: { ShopRoaster: 6.27, ContinuousRoasting: 6.13 },
    defaultPricesUSD: { ShopRoaster: 22000, ContinuousRoasting: 27000 },
    marginPerBag: { USD: 12, CAD: 15, GBP: 9, EUR: 10 },
    defaults: {
      USD: { volume: 75, cost: 13, bags: 20 },
      CAD: { volume: 50, cost: 24, bags: 20 },
      GBP: { volume: 50, cost: 18, bags: 20 },
      EUR: { volume: 50, cost: 21, bags: 20 }
    }
  };

  const formatWhole = (value) => Math.round(value).toLocaleString("en-US");

  const initRoiCalculator = (calculator) => {
    const get = (selector) => calculator.querySelector(selector);
    const currencyField = get("[data-roi-currency]");
    const productField = get("[data-roi-product]");
    const volumeField = get("[data-roi-volume]");
    const costField = get("[data-roi-cost]");
    const bagsField = get("[data-roi-bags]");
    if (!currencyField || !productField || !volumeField || !costField || !bagsField) return;

    const updateRangeProgress = () => {
      calculator.querySelectorAll(".roi-range").forEach((range) => {
        const progress = ((Number(range.value) - Number(range.min)) / (Number(range.max) - Number(range.min))) * 100;
        range.style.setProperty("--progress", `${progress}%`);
      });
    };

    const calculate = () => {
      const currency = currencyField.value;
      const roaster = productField.value;
      const volume = Number(volumeField.value);
      const coffeeCost = Number(costField.value);
      const bags = Number(bagsField.value);
      const symbol = roiConfig.currencySymbols[currency];
      const unit = currency === "USD" ? "lb" : "kg";

      const fixedPrice = roiConfig.fixedPrices[currency]?.[roaster];
      const investment = fixedPrice ?? (roiConfig.defaultPricesUSD[roaster] * (currency === "CAD" ? roiConfig.conversionRates.CAD : 1));

      let baseCost = roiConfig.baseCostPerPound[roaster] ?? 6.27;
      if (currency !== "USD") {
        baseCost *= 2.20462;
        if (currency === "CAD") baseCost *= roiConfig.conversionRates.CAD;
      }

      const savingsPerUnit = coffeeCost - baseCost;
      const annualSavings = savingsPerUnit * volume * 52;
      const annualRetailProfit = bags * roiConfig.marginPerBag[currency] * 52;
      const totalRoi = annualSavings + annualRetailProfit;
      const monthlyRoi = totalRoi / 12;
      const payback = monthlyRoi > 0 ? Math.ceil(investment / monthlyRoi) : "Infinity";
      const co2 = volume * 52 * (currency === "USD" ? 1.78 : 3.92);
      const savingsPerCup = savingsPerUnit / (currency === "USD" ? 20 : 44);

      get("[data-roi-volume-value]").textContent = `${volume} ${unit}s`;
      get("[data-roi-cost-value]").textContent = `${symbol}${coffeeCost.toFixed(2)}`;
      get("[data-roi-bags-value]").textContent = bags;
      get("[data-roi-cost-label]").textContent = `How much do you pay per ${unit} for roasted coffee?`;
      get("[data-roi-unit-label]").textContent = `Savings per ${unit}`;
      get("[data-roi-total]").textContent = `${symbol}${formatWhole(totalRoi)}`;
      get("[data-roi-annual-savings]").textContent = `${symbol}${formatWhole(annualSavings)}`;
      get("[data-roi-unit-savings]").textContent = `${symbol}${savingsPerUnit.toFixed(2)}`;
      get("[data-roi-retail-profit]").textContent = `${symbol}${formatWhole(annualRetailProfit)}`;
      get("[data-roi-cup-savings]").textContent = `${symbol}${savingsPerCup.toFixed(2)}`;
      get("[data-roi-co2]").textContent = `${formatWhole(co2)} ${currency === "USD" ? "lbs" : "kg"}`;
      get("[data-roi-payback]").textContent = `${payback} months`;
      updateRangeProgress();
    };

    const resetForCurrency = () => {
      const values = roiConfig.defaults[currencyField.value] || roiConfig.defaults.USD;
      volumeField.value = values.volume;
      costField.value = values.cost;
      bagsField.value = values.bags;
      calculate();
    };

    [volumeField, costField, bagsField].forEach((field) => field.addEventListener("input", calculate));
    productField.addEventListener("change", calculate);
    currencyField.addEventListener("change", resetForCurrency);
    calculate();
  };

  document.querySelectorAll("[data-roi-calculator]").forEach(initRoiCalculator);

  const validateField = (field) => {
    const error = field.closest(".field")?.querySelector(".field__error");
    let message = "";
    if (field.validity.valueMissing) message = "This field is required.";
    else if (field.validity.typeMismatch) message = "Enter a valid email address.";
    else if (field.validity.patternMismatch) message = "Enter a valid phone number.";
    field.setAttribute("aria-invalid", String(Boolean(message)));
    if (error) error.textContent = message;
    return !message;
  };

  document.querySelectorAll("form[data-validate]").forEach((form) => {
    const fields = [...form.querySelectorAll("input, select, textarea")];
    fields.forEach((field) => field.addEventListener("blur", () => validateField(field)));
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const valid = fields.filter((field) => field.required).every(validateField);
      const status = form.querySelector(".form-status");
      if (!valid) {
        if (status) status.textContent = "Please correct the highlighted fields.";
        form.querySelector("[aria-invalid='true']")?.focus();
        return;
      }
      const submit = form.querySelector("button[type='submit']");
      if (submit) { submit.disabled = true; submit.textContent = "Sending…"; }
      if (status) status.textContent = "Demo request prepared. Backend delivery must be connected before launch.";
      window.setTimeout(() => {
        if (submit) { submit.disabled = false; submit.textContent = "Request my demo"; }
      }, 900);
      // Client-side demo only: server-side validation, CRM/email delivery, spam protection and privacy logging require backend integration.
    });
  });

  const revealTargets = document.querySelectorAll("main > section:not(:first-child), main > article > section:not(:first-child), .reveal");
  revealTargets.forEach((element) => element.classList.add("reveal"));

  if (!reduceMotion && "IntersectionObserver" in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: .12 });
    revealTargets.forEach((element) => observer.observe(element));
  } else {
    revealTargets.forEach((element) => element.classList.add("is-visible"));
  }
})();
