# Java Master International front-end

A responsive, framework-free B2B website concept built with semantic HTML, modern CSS and vanilla JavaScript.

## Project structure

```text
java-master/
├── index.html
├── roasters.html
├── jm-1500.html
├── profect.html
├── coffee.html
├── success-stories.html
├── success-story-detail.html
├── about.html
├── contact.html
├── README.md
└── assets/
    ├── css/
    │   ├── style.css
    │   └── responsive.css
    ├── js/
    │   └── main.js
    ├── images/
    │   ├── hero-coffee-business.jpg
    │   ├── hero-coffee-business-960.jpg
    │   ├── java-master-logo-updated.png
    │   ├── java-master-logo-updated-600.png
    │   ├── java-master-favicon-updated.png
    │   ├── jm-1500-placeholder.jpg
    │   ├── jm-1500-placeholder-640.jpg
    │   ├── profect-placeholder.jpg
    │   ├── profect-placeholder-640.jpg
    │   └── source PNG versions of generated placeholders and the original logo
    └── icons/
```

## Run locally

From the `java-master` directory, start any static server. For example:

```powershell
python -m http.server 8000
```

Then open `http://localhost:8000/`. The files can also be opened directly, but a local server is recommended for realistic testing.

## Implemented interactions

- Responsive navigation and keyboard-operable roaster dropdown
- Official Java Master logo in every header/footer plus a matching favicon
- Sticky-header scroll state
- Mobile menu with Escape-to-close behavior
- Accessible floating site search with a lightweight nine-page content index, live results, outside-click dismissal and focus restoration
- Active navigation state
- Accessible FAQ accordions with reduced-motion-aware transitions
- Success-story category filtering
- Client-side demo-form validation and loading/success messaging
- Progressive-enhancement-safe scroll reveal with `prefers-reduced-motion` support
- Live ROI calculators on the home and roaster overview pages, mirroring Java Master’s published currency, model, savings, retail-profit, CO₂e and payback calculations

## Maintenance and responsive QA

- `node tools/refresh-shared-layout.mjs` synchronizes the shared header and footer markup across every static HTML page.
- `node tools/responsive-qa.mjs` runs dependency-free headless-Chrome checks at 1920, 1440, 1280, 1024, 768, 760, 480, 430, 390 and 360 pixels. It verifies overflow, key element bounds, heading wrapping and fonts, equal-height card rows, minimum form text size, search behavior and mobile-menu state, then writes representative screenshots and a JSON report to `qa-screenshots/`.

## QA checklist

- [x] Nine requested pages created and linked
- [x] Shared 1280px maximum-width container
- [x] Desktop, tablet, mobile and small-mobile breakpoints
- [x] Semantic landmarks, skip links, visible focus states and labeled controls
- [x] Unique titles, descriptions, canonical placeholders and Open Graph placeholders
- [x] Organization/LocalBusiness/Product/collection schema as appropriate
- [x] Responsive image sources, intrinsic dimensions and lazy loading below the fold
- [x] JavaScript syntax check passed
- [x] All pages and primary assets returned HTTP 200 from a local static server
- [x] Internal page-link integrity check passed
- [x] No inline CSS, inline event handlers or framework dependencies
- [x] Desktop and responsive homepage rendering reviewed in a headless browser
- [ ] Run final screen-reader and keyboard testing with production content
- [ ] Run Lighthouse and cross-browser/device testing after production assets are installed

## Client approvals and integrations required

- Replace `example.com` canonical and Open Graph URLs with the production domain.
- Replace generated concept equipment images with approved, accurate product photography.
- Supply approved coffee, customer, team, facility, archive, partner-logo and social assets.
- Verify every equipment specification, certification, electrical requirement, warranty statement, price, leasing term and availability against current signed documents.
- Review the published ROI assumptions and legacy equipment-price constants against current commercial terms before production launch.
- Approve coffee availability, lot details, processing methods, tasting notes, organic/decaf claims and certifications.
- Supply consented customer names, interviews, quotations, locations, photography and documented results for success stories.
- Confirm public email, operating hours, social URLs, privacy policy and terms URLs.
- Connect the form to secure server-side validation, spam protection, CRM/email delivery, consent logging, privacy handling, success/error responses and analytics.

## Generated placeholder assets

The built-in image generation workflow created three original placeholder concepts for this project:

- `hero-coffee-business`: premium editorial café scene with an air-roasting focal point, warm ivory/espresso/olive palette and left-side copy space.
- `jm-1500-placeholder`: slim black commercial fluid-bed roaster concept on a warm ivory studio background.
- `profect-placeholder`: robust graphite commercial air-roaster concept on a muted sage studio background.

All prompts explicitly excluded logos, brand names, text and watermarks, and described the equipment images as non-exact concept artwork. They are not product documentation.

The homepage Request Demo image is a commercially usable Unsplash photograph of coffee roasting equipment. Its creator, source URL, license and optimization notes are recorded in `assets/images/ATTRIBUTION.md`.
