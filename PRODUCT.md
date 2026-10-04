# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

**Primary: Japanese investors** (confirmed). They are weighing whether to put capital into central Ulaanbaatar real estate and Nest Group's non-banking finance products. They read in Japanese or English, and some visit Mongolia on one of Nest Travel's investor business tours. (Evaluating remotely from Japan is inferred from the site's investor-tour and JPY offerings, not confirmed.) Their job on the site is to judge whether the market, the company and the returns are credible enough to start a conversation.

**Secondary:** Mongolian customers of the subsidiaries (secured loans, PLATHOME rentals, the property buying service, R+LDK interior renovation), partners, media and job candidates. They are served by the site, but investor-facing decisions win when the two pull in different directions.

## Product Purpose

nest.mn is the public site of Nest Group (legal entity: VE-ST Holdings Mongolia LLC), a diversified holding group headquartered in Ulaanbaatar. The site presents the group and its subsidiaries and turns investor interest into conversations.

Success means (confirmed):

1. **Investor inquiries.** Investors use the property listings and the return calculator, then contact the team (contact form, IR contact).
2. **Group credibility.** A visitor leaves convinced that Nest Group is real, established and trustworthy, through verifiable proof: ISO certifications, bank partners, named leadership and its operating track record.

Local lead generation and recruiting are not primary goals for the site.

## Positioning

- **NEST DUP (Real Estate × Finance):** a hybrid product where rent from a central Ulaanbaatar property is reinvested monthly into the group's own non-banking finance product, compounding both. A pure real estate agency or a pure lender cannot offer this, because Nest owns both halves.
- **Japan ↔ Mongolia bridge:** the group applies a Japanese-style real estate strategy in Ulaanbaatar's ultra-central districts, offers JPY-denominated asset management, and runs investor business tours for Japanese investors.
- **One-stop property operation:** sales, leasing, mediation, full management, direct purchase of older 40k–50k district apartments, and renovation all sit under one group, with renovation financing through the group's NBFI.

## Operating Context

- Because Japanese investors are the primary audience, the Japanese-language experience is a primary path, not a translation afterthought.
- Investors evaluate via the Investment page: featured properties (from Sanity) plus a return simulator that uses live yields from Sanity and daily exchange rates from Mongolian banks.
- Inquiries go through the Web3Forms contact form (subjects include Investor Relations and Partnership) or by phone/email to the Ulaanbaatar head office (Chingeltei District, Baga Toiruu 46; Mon–Fri 9–18).
- Staff edit fixed site text via a local on-page editor that writes `js/translations.js`. News, featured properties and calculator rates are edited in Sanity Studio (hosted at nest-group.sanity.studio).
- The site is a public brochure and lead channel, not a client portal. Property-management operations (contracts, rent tracking, bank payment matching) will live in a **separate website/application**, which is out of scope for this record.

## Capabilities and Constraints

**Capabilities on the site today:** pages for home, about, companies, investment, news (list and article), contact and a 404 page. A trilingual EN / MN / JA switcher, with Mongolian as the default language. Sanity-driven news and investment properties, an investment calculator with live bank exchange rates, a contact form, and downloadable travel plan PDFs.

**Technical constraints (from the codebase):**
- Fully static HTML/CSS/JS with no build step, deployed to cPanel/Apache. `.cpanel.yml` copies an explicit allowlist of files, so any new page must be added there.
- Strict CSP: `script-src 'self'`, with no inline `<script>` and no `on*=` handlers. Third-party origins are limited to an explicit list in `.htaccess`, `_headers` and `vercel.json`.
- Every user-facing string goes through `js/translations.js` in all three languages. Mongolian headers use sentence case, not English-style Title Case.
- Content from Sanity must stay escaped (`escapeHTML`, validated image refs, validated article IDs).

**Terminology:** the public brand is "NEST" / "Nest Group". Subsidiaries are shown publicly as Nest Real Estate (NEST Property Service), Nest Mirais NBFI, Nest Travel Service, Nest Foods and Nest Career, with legal names in the form "VE-ST … LLC". "NEST DUP" is the hybrid investment product, "PLATHOME" the rental service and "R+LDK" the interior design service.

**Open decisions and unresolved facts.** Future work must not repeat these as fact until they are confirmed:
- **Number of subsidiaries.** The site says "Five Companies. One Vision." (home), "Four specialized subsidiaries" (companies) and "three subsidiaries" (about timeline). The footer lists four VE-ST LLCs, without Career.
- **Company age.** The holding is described as "operating since 2018". Property Service started in 2016 with 7 properties. The homepage stat says "7+ Years of Excellence", while the about timeline and news say "A Decade".
- **Sector framing.** The footer and about meta describe the group as "Real Estate and Non-Banking Finance" only. The hero lists eight business areas, and the pillars section lists four.
- **Default language.** The site opens in Mongolian, while the primary audience is Japanese investors. It is undecided whether the default or the language detection should change.
- **Future link to the management software.** The separate property-management app may later mark properties as leased or available on this site. Sanity's `property.isAvailable` field is the existing hook. The mechanism is not decided.

## Brand Commitments

- Name and identity: NEST / Nest Group. The word "NEST" symbolizes a bird's nest built from twigs, standing for the opportunity to reach the next level of life. Logo files are in `assets/logo.png`, `assets/loaaago.png` and `assets/favicon.png`.
- Tagline: "Towards a More Amazing Tomorrow."
- Vision: "ONE HEART, ONE TEAM", aiming to create 100 years of history that lasts for generations.
- Mission: through relationships, foster growth opportunities for customers and create new value and opportunities in society.
- Principles (5C): Challenge, Cooperation, Comfortable Place, Customer Experience and Cool NEST ("one team creating positive impact in society").
- Voice: confident, long-horizon and partnership-minded ("We don't just build assets — we build futures that endure across generations."). The site must stay fully trilingual (EN / MN / JA).

## Evidence on Hand

- **Operating figures (as published on the site):** 115+ properties under management (from 7 in 2016), 70+ investors, 30+ team members, an NBFI portfolio that grew from 1.6B to 16.4B MNT (10×) since 2018, and 2,500+ NBFI clients. Published asset-management rates are about 5% for JPY and about 13% for MNT. Calculator yields and the tax rate come from Sanity.
- **Certifications:** ISO 9001:2015 (quality management) and ISO 27001:2022 (information security), with files `assets/iso2001-logo.png` and `assets/ISO 27001 Information Security.png`, plus the award photo `assets/timeline/iso-award.jpg`.
- **Partners (with logos where present):** Trade & Development Bank, Bogd Bank, Golomt Bank, Khan Bank, World Standard Consulting, MonCertf, Idea+, NUDEN SOLUTION, Chingeltei District Kindergarten #39, Kaisei Capital and Flower Hotel.
- **Leadership:** Tugsbileg Khurelbaatar (Group CEO), Munkhbold Boldbaatar (CEO, Property Service), Enkhtur Ankhbayar (COO, Mirais NBFI) and Bayanjargal Erkhembayar (COO, Property Service). Each has a photo in `assets/`.
- **Media:** hero and subsidiary videos (`assets/hero-video.mp4`, `assets/videos/`), Ulaanbaatar photography, renovation before/after sets (`assets/renovations/`), group and timeline photography (`assets/timeline/`), the Nest Foods "Miyabi" launch poster, six travel itinerary PDFs (`assets/pdfs/`), and an example Sanity property ("PJ Yado NP18-17", a renovated 1DK in Chingeltei).
- **Absent, so do not fabricate:**
  - Annual reports or audited financial statements. The IR copy keys exist, but no PDFs are present.
  - An independent board, governance framework or ESG claims. The governance section was removed because the company is pre-IPO.
  - Investor testimonials, case studies, realized-return figures and press coverage.

## Product Principles

1. **Proof before promise.** Every claim to an investor is backed by something checkable: a certificate, a named partner, a named person, a figure with its source. Missing evidence is left out, never invented, especially while the company is pre-IPO.
2. **Japanese investors are a first-class path.** Content, flows and trust signals must work fully in Japanese, for someone deciding from abroad.
3. **Lead every surface toward a conversation.** The site's job ends when a qualified investor contacts the team, so each page should make the next step to an inquiry obvious.
4. **One group, many companies.** Present the subsidiaries as parts of a coherent group story (the Real Estate × Finance flywheel) rather than as unrelated businesses.
5. **Numbers stay live and consistent.** Rates, yields, availability and headline figures come from one source of truth (Sanity or the live rate feeds) and must agree across pages and languages.

## Accessibility & Inclusion

Three languages, three scripts (Latin, Cyrillic and Japanese) must lay out and read correctly. The site already honors `prefers-reduced-motion` for its hero videos and animations, and that support must be kept. No further product-specific accessibility standard has been set.
