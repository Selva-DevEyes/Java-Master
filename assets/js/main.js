(() => {
  "use strict";

  document.documentElement.classList.add("js");

  const header = document.querySelector(".site-header");
  const navToggle = document.querySelector(".nav-toggle");
  const navMenu = document.querySelector(".nav__menu");
  const dropdowns = document.querySelectorAll(".dropdown");
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
    { title: "Coffee Collections", url: "coffee.html", excerpt: "Explore custom-roasted coffees, featured selections and 39 coffee collections.", keywords: "beans origins colombia ethiopia guatemala decaf roasted arabica" },
    { title: "Coffee Chronicles", url: "coffee-chronicles.html", excerpt: "Daily Grind: learning, discoveries and insights from the coffee roasting world.", keywords: "blog articles stories learning beans roasting notes daily grind" },
    { title: "Customer Success Stories", url: "success-stories.html", excerpt: "Coffee-program story frameworks for cafés, grocers, hospitality teams and entrepreneurs.", keywords: "case studies customers results" },
    { title: "Customer Story", url: "success-story-detail.html", excerpt: "A detailed framework covering a coffee business challenge, solution and outcome.", keywords: "case study implementation" },
    { title: "About Java Master", url: "about.html", excerpt: "The engineering roots, air-roasting approach and business-support story.", keywords: "history 1987 company air roasting" },
    { title: "Request a Demonstration", url: "contact.html#demo-form", excerpt: "Talk with Java Master about your coffee business, location and product needs.", keywords: "contact demo sales phone support" }
  ];

  const closeDropdowns = () => {
    dropdowns.forEach((dd) => {
      dd.classList.remove("is-open");
      dd.querySelector(".dropdown__toggle")?.setAttribute("aria-expanded", "false");
    });
  };

  const closeMenus = () => {
    navMenu?.classList.remove("is-open");
    navToggle?.setAttribute("aria-expanded", "false");
    navToggle?.setAttribute("aria-label", "Open navigation");
    closeDropdowns();
  };

  navToggle?.addEventListener("click", () => {
    const open = navToggle.getAttribute("aria-expanded") === "true";
    navToggle.setAttribute("aria-expanded", String(!open));
    navToggle.setAttribute("aria-label", open ? "Open navigation" : "Close navigation");
    navMenu?.classList.toggle("is-open", !open);
  });

  dropdowns.forEach((dd) => {
    const toggle = dd.querySelector(".dropdown__toggle");
    toggle?.addEventListener("click", (event) => {
      event.stopPropagation();
      const open = toggle.getAttribute("aria-expanded") === "true";
      dropdowns.forEach((other) => {
        if (other !== dd) {
          other.classList.remove("is-open");
          other.querySelector(".dropdown__toggle")?.setAttribute("aria-expanded", "false");
        }
      });
      toggle.setAttribute("aria-expanded", String(!open));
      dd.classList.toggle("is-open", !open);
    });

    dd.addEventListener("focusout", () => {
      window.setTimeout(() => {
        if (!dd.contains(document.activeElement)) {
          dd.classList.remove("is-open");
          toggle?.setAttribute("aria-expanded", "false");
        }
      }, 50);
    });
  });

  document.addEventListener("click", (event) => {
    dropdowns.forEach((dd) => {
      if (!dd.contains(event.target)) {
        dd.classList.remove("is-open");
        dd.querySelector(".dropdown__toggle")?.setAttribute("aria-expanded", "false");
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
      } else {
        const openDropdown = Array.from(dropdowns).find((dd) => dd.classList.contains("is-open"));
        if (openDropdown) {
          const toggle = openDropdown.querySelector(".dropdown__toggle");
          openDropdown.classList.remove("is-open");
          toggle?.setAttribute("aria-expanded", "false");
          toggle?.focus();
        } else if (navMenu?.classList.contains("is-open")) {
          closeMenus();
          navToggle?.focus();
        }
      }
    }
  });

  navMenu?.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeMenus));
  const updateHeaderState = () => header?.classList.toggle("is-scrolled", window.scrollY > 18);
  updateHeaderState();
  window.addEventListener("scroll", updateHeaderState, { passive: true });
  window.addEventListener("resize", () => {
    if (window.innerWidth > 900) closeMenus();
  });

  const pageName = window.location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".nav__link, .dropdown__menu a").forEach((link) => {
    if (link.getAttribute("href") !== pageName) return;
    link.setAttribute("aria-current", "page");
    link.closest(".dropdown")?.querySelector(".dropdown__toggle")?.classList.add("is-active");
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

  const collectionGrid = document.querySelector("[data-collection-grid]");
  const collectionMore = document.querySelector("[data-collection-more]");
  const collectionStatus = document.querySelector("[data-collection-status]");
  if (collectionGrid && collectionMore) {
    const collections = [...collectionGrid.children];
    const pageSize = 12;
    let visibleCount = Math.min(pageSize, collections.length);

    const renderCollections = () => {
      collections.forEach((card, index) => { card.hidden = index >= visibleCount; });
      if (collectionStatus) collectionStatus.textContent = `Showing ${visibleCount} of ${collections.length} collections`;
      collectionMore.hidden = visibleCount >= collections.length;
    };

    collectionMore.hidden = false;
    collectionMore.addEventListener("click", () => {
      const firstNewCard = collections[visibleCount];
      visibleCount = Math.min(visibleCount + pageSize, collections.length);
      renderCollections();
      if (firstNewCard && reduceMotion) firstNewCard.focus?.({ preventScroll: true });
    });
    renderCollections();
  }

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
    fields.forEach((field) => field.addEventListener("input", () => {
      if (field.getAttribute("aria-invalid") === "true") validateField(field);
    }));
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const fieldsToValidate = fields.filter((field) => field.required || field.value.trim());
      const valid = fieldsToValidate.map(validateField).every(Boolean);
      const status = form.querySelector(".form-status");
      if (!valid) {
        if (status) {
          status.classList.add("is-error");
          status.textContent = "Please correct the highlighted fields.";
        }
        form.querySelector("[aria-invalid='true']")?.focus();
        return;
      }
      if (form.hasAttribute("data-integration-pending")) {
        if (status) {
          status.classList.add("is-error");
          status.textContent = "Submission is not available yet. Please call (336) 990-5051.";
        }
        return;
      }
      const submit = form.querySelector("button[type='submit']");
      status?.classList.remove("is-error");
      if (submit) { submit.disabled = true; submit.textContent = "Sending…"; }
      if (status) status.textContent = "Demo request prepared. Backend delivery must be connected before launch.";
      window.setTimeout(() => {
        if (submit) { submit.disabled = false; submit.textContent = "Request my demo"; }
      }, 900);
      // Client-side demo only: server-side validation, CRM/email delivery, spam protection and privacy logging require backend integration.
    });
  });

  document.querySelectorAll("a[href='#request-demo']").forEach((link) => {
    link.addEventListener("click", () => {
      window.setTimeout(() => document.querySelector("#request-demo [tabindex='-1']")?.focus({ preventScroll: true }), reduceMotion ? 0 : 450);
    });
  });

  // Coffee Chronicles Load More
  const chronicleGrid = document.querySelector("[data-chronicle-grid]");
  const chronicleMoreBtn = document.querySelector("[data-chronicle-more]");
  const chronicleStatus = document.querySelector("[data-chronicle-status]");
  if (chronicleGrid && chronicleMoreBtn) {
    const hiddenCards = chronicleGrid.querySelectorAll(".chronicle-card[hidden]");
    const totalCards = chronicleGrid.querySelectorAll(".chronicle-card").length;
    
    if (hiddenCards.length > 0) {
      chronicleMoreBtn.hidden = false;
      const updateStatus = () => {
        const visibleCards = chronicleGrid.querySelectorAll(".chronicle-card:not([hidden])").length;
        if (chronicleStatus) {
          chronicleStatus.textContent = `Showing ${visibleCards} of ${totalCards} articles`;
        }
        if (visibleCards >= totalCards) {
          chronicleMoreBtn.hidden = true;
        }
      };
      updateStatus();

      chronicleMoreBtn.addEventListener("click", () => {
        const nextBatch = chronicleGrid.querySelectorAll(".chronicle-card[hidden]");
        const toShow = Array.from(nextBatch).slice(0, 3);
        toShow.forEach((card) => {
          card.hidden = false;
          card.classList.add("reveal", "is-visible");
        });
        updateStatus();
        if (toShow[0]) {
          toShow[0].focus?.();
        }
      });
    } else {
      if (chronicleStatus) {
        chronicleStatus.textContent = `Showing all ${totalCards} articles`;
      }
    }
  }

  // Testimonial Slider
  const testimonialSlider = document.querySelector("[data-testimonial-slider]");
  if (testimonialSlider) {
    const track = testimonialSlider.querySelector("[data-slider-track]");
    const slides = Array.from(testimonialSlider.querySelectorAll(".testimonial-slider__slide"));
    const dots = Array.from(testimonialSlider.querySelectorAll(".testimonial-slider__dot"));
    const prevBtn = testimonialSlider.querySelector("[data-slider-prev]");
    const nextBtn = testimonialSlider.querySelector("[data-slider-next]");
    let currentIndex = 0;
    let autoPlayTimer = null;

    const goToSlide = (index) => {
      currentIndex = (index + slides.length) % slides.length;
      if (track) {
        track.style.transform = `translateX(-${currentIndex * 100}%)`;
      }
      slides.forEach((slide, i) => {
        const isActive = i === currentIndex;
        slide.classList.toggle("is-active", isActive);
        slide.setAttribute("aria-hidden", String(!isActive));
      });
      dots.forEach((dot, i) => {
        const isActive = i === currentIndex;
        dot.classList.toggle("is-active", isActive);
        dot.setAttribute("aria-selected", String(isActive));
      });
    };

    const nextSlide = () => goToSlide(currentIndex + 1);
    const prevSlide = () => goToSlide(currentIndex - 1);

    prevBtn?.addEventListener("click", () => {
      prevSlide();
      restartAutoPlay();
    });

    nextBtn?.addEventListener("click", () => {
      nextSlide();
      restartAutoPlay();
    });

    dots.forEach((dot) => {
      dot.addEventListener("click", () => {
        const idx = parseInt(dot.getAttribute("data-slide-index"), 10);
        if (!isNaN(idx)) {
          goToSlide(idx);
          restartAutoPlay();
        }
      });
    });

    testimonialSlider.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft") {
        prevSlide();
        restartAutoPlay();
      } else if (e.key === "ArrowRight") {
        nextSlide();
        restartAutoPlay();
      }
    });

    let startX = 0;
    let currentX = 0;
    let isTouching = false;

    testimonialSlider.addEventListener("touchstart", (e) => {
      if (e.touches.length === 1) {
        startX = e.touches[0].clientX;
        currentX = startX;
        isTouching = true;
        stopAutoPlay();
      }
    }, { passive: true });

    testimonialSlider.addEventListener("touchmove", (e) => {
      if (isTouching && e.touches.length === 1) {
        currentX = e.touches[0].clientX;
      }
    }, { passive: true });

    testimonialSlider.addEventListener("touchend", () => {
      if (isTouching) {
        const diffX = currentX - startX;
        if (Math.abs(diffX) > 40) {
          if (diffX < 0) {
            nextSlide();
          } else {
            prevSlide();
          }
        }
        isTouching = false;
        startAutoPlay();
      }
    });

    const startAutoPlay = () => {
      if (reduceMotion || slides.length <= 1) return;
      stopAutoPlay();
      autoPlayTimer = window.setInterval(nextSlide, 7000);
    };

    const stopAutoPlay = () => {
      if (autoPlayTimer) {
        window.clearInterval(autoPlayTimer);
        autoPlayTimer = null;
      }
    };

    const restartAutoPlay = () => {
      stopAutoPlay();
      startAutoPlay();
    };

    testimonialSlider.addEventListener("mouseenter", stopAutoPlay);
    testimonialSlider.addEventListener("mouseleave", startAutoPlay);
    testimonialSlider.addEventListener("focusin", stopAutoPlay);
    testimonialSlider.addEventListener("focusout", startAutoPlay);

    startAutoPlay();
  }

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
