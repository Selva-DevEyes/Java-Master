import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const root = new URL("../", import.meta.url);
const files = (await readdir(root)).filter((file) => file.endsWith(".html"));

const header = `<header class="site-header">
  <nav class="nav container" aria-label="Primary navigation">
    <a class="brand" href="index.html" aria-label="Java Master International home"><img class="brand__logo" src="assets/images/java-master-logo-updated-600.png" alt="Java Master International" width="379" height="600"></a>
    <ul class="nav__menu" id="primary-menu">
      <li><a class="nav__link" href="index.html">Home</a></li>
      <li class="dropdown"><button class="dropdown__toggle" type="button" aria-expanded="false" aria-controls="roaster-menu">Roasters</button><ul class="dropdown__menu" id="roaster-menu"><li><a href="roasters.html">Compare Roasters</a></li><li><a href="jm-1500.html">JM 1500</a></li><li><a href="profect.html">Profect 4.0</a></li></ul></li>
      <li><a class="nav__link" href="coffee.html">Coffee</a></li>
      <li><a class="nav__link" href="success-stories.html">Success Stories</a></li>
      <li><a class="nav__link" href="about.html">About</a></li>
      <li><a class="nav__link" href="contact.html">Contact</a></li>
      <li class="nav__mobile-contact"><a href="tel:+13369905051" aria-label="Call (336) 990-5051"><svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg><span>(336) 990-5051</span></a></li>
      <li class="nav__mobile-cta"><a class="button button--accent" href="contact.html#demo-form">Request a Demo</a></li>
    </ul>
    <div class="nav__actions">
      <a class="header-phone" href="tel:+13369905051" aria-label="Call Java Master at (336) 990-5051"><svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg><span>(336) 990-5051</span></a>
      <button class="search-toggle" type="button" aria-label="Open site search" aria-expanded="false" aria-controls="site-search"><svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-4-4"></path></svg></button>
      <a class="button button--small button--accent" href="contact.html#demo-form">Request a Demo</a>
    </div>
    <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="primary-menu" aria-label="Open navigation"><span></span></button>
  </nav>
  <div class="site-search" id="site-search" hidden>
    <div class="site-search__panel">
      <form class="site-search__form" role="search" novalidate>
        <label class="visually-hidden" for="site-search-input">Search Java Master</label>
        <input class="site-search__input" id="site-search-input" type="search" name="q" placeholder="Search roasters, coffee, support…" autocomplete="off">
        <button class="site-search__submit" type="submit">Search</button>
        <button class="search-close" type="button" aria-label="Close site search"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"></path></svg></button>
      </form>
      <div class="site-search__results" role="status" aria-live="polite" aria-label="Search results"></div>
    </div>
  </div>
</header>`;

const footer = `<footer class="site-footer">
  <div class="container">
    <div class="footer__grid">
      <div class="footer__intro"><a class="brand" href="index.html" aria-label="Java Master International home"><img class="brand__logo" src="assets/images/java-master-logo-updated-600.png" alt="Java Master International" width="379" height="600"></a><p>Commercial air roasters, curated green coffee and hands-on support for ambitious coffee businesses.</p><a class="button button--accent" href="contact.html#demo-form">Request a Demo</a></div>
      <div class="footer__column"><h2 class="footer__title">Explore</h2><ul class="footer__links"><li><a href="index.html">Home</a></li><li><a href="coffee.html">Coffee</a></li><li><a href="success-stories.html">Success Stories</a></li><li><a href="about.html">About</a></li><li><a href="contact.html">Contact</a></li></ul></div>
      <div class="footer__column"><h2 class="footer__title">Roasters</h2><ul class="footer__links"><li><a href="roasters.html">Compare Roasters</a></li><li><a href="jm-1500.html">JM 1500</a></li><li><a href="profect.html">Profect 4.0</a></li><li><a href="contact.html#demo-form">Request a Demo</a></li></ul></div>
      <div class="footer__column footer__contact"><h2 class="footer__title">Contact</h2><ul class="footer__links"><li><a class="footer__phone" href="tel:+13369905051">(336) 990-5051</a></li><li><a class="footer__address" href="https://www.google.com/maps/search/?api=1&amp;query=153%20Business%20Center%20Dr.%2C%20Suite%20101%2C%20North%20Wilkesboro%2C%20NC%2028659%2C%20United%20States" target="_blank" rel="noopener noreferrer" aria-label="View Java Master at 153 Business Center Drive, Suite 101, North Wilkesboro, North Carolina 28659 on Google Maps"><strong>153 Business Center Dr., Suite 101</strong><br><strong>North Wilkesboro, NC 28659</strong><br><strong>United States</strong></a></li></ul></div>
    </div>
    <div class="footer__bottom"><span>© 2026 Java Master International. All rights reserved.</span><div class="footer__legal"><span>Privacy Policy [pending]</span><span>Terms [pending]</span></div></div>
  </div>
</footer>`;

for (const file of files) {
  const path = join(root.pathname.slice(1), file);
  let html = await readFile(path, "utf8");
  html = html.replace(/<header class="site-header">[\s\S]*?<\/header>/, header);
  html = html.replace(/<footer class="site-footer">[\s\S]*?<\/footer>/, footer);
  if (file === "contact.html") html = html.replace(/<body(?: class="[^"]*")?>/, '<body class="page--contact">');
  await writeFile(path, html, "utf8");
}
