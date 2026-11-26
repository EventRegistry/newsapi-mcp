# Event type taxonomy

`suggest({type: "eventTypes"})` matches a word in the path, so use the taxonomy's own words ("legal", "layoffs", "acquisition"), not synonyms ("lawsuit", "fine"). Parents cover children; the ones the skills use:

| Branch | Subtypes |
|--------|----------|
| `et/business/acquisitions-mergers` | `acquisition`, `merger` (+ `/rumor`, `/completed`, `/blocked`, `/failed`) |
| `et/business/labor-issues` | `layoffs`, `hirings`, `workers-strike`, `executive-appointment`, `executive-resignation`, `executive-firing`, `executive-scandal`, `board-member-appointment` |
| `et/business/products-services` | `product-release`, `product-recall`, `product-discontinued`, `business-contract`, `government-contract`, `market-entry`, `market-share`, `supply`, `subsidy`, `grant` |
| `et/business/equity-actions` | `initial-public-offering`, `investment`, `fundraising`, `spin-off`, `ownership`, `taxes` |
| `et/business/...` | `earnings`, `revenues`, `dividends`, `stock-prices`, `price-targets`, `analyst-ratings`, `credit-ratings`, `credit`, `bankruptcy`, `partnerships`, `regulatory/regulatory-investigation`, `industrial-accidents/{facility-accident, force-majeure, ai-incident}` |
| `et/society/legal` | `fraud`, `corruption`, `sanctions`, `economic-sanctions`, `antitrust-investigation`, `tax-evasion`, `settlement`, `copyright-infringement`, `patent-infringement`, `legal-issues` |
| `et/society/...` | `civil-unrest/{riot, state-of-emergency}`, `war-conflict/airstrike`, `military-explosions/artilery-missile-attack`, `security/cyber-attacks`, `crime/{shooting, stabbing-hacking, arsony}`, `safety/{fire, vehicle-accident}`, `transportation/transportation-disruption`, `customers/data-privacy`, `workforce/working-conditions`, `corporate-responsibility/{donation, sponsorship}` |
| `et/environment` | `natural-disasters/{earthquake, heavy-rains, heat-wave, cold-wave, landslide, famine, volcanic-eruption}`, `pollution/{oil-spill, chemical-waste, water-shortage, deforestation}`, `emissions/...` |

There is no politics branch: elections, votes and legislation are events and articles, not mentions.
