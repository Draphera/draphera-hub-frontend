# Changelog

## [1.2.0] — 2026-07-20

### Added
- Supporto estensione `.HP` per file HPGL plotter (Sidebar + Admin upload)
- `origin: {x, y}` nel meta response del parser HPGL per future normalizzazioni
- Landing page copy: tiered access system (20 Founder + 30 Beta Tester)
- `CHANGELOG.md` tracciamento modifiche

### Fixed
- **Scheda Tecnica**: coordinate HPGL assolute non venivano normalizzate — path renderizzati fuori viewBox per file con origine ≠ (0,0). Aggiunta sottrazione di minX/minY in `toSvg`
- **Backend SVG export**: stesso bug in `build_svg` — coordinate normalizzate via `_compute_bounds()` e offset `ox/oy` in tutti gli elementi SVG (path, archi, cerchi, label, marker pezzi)
- **Stroke width**: path interni nella scheda tecnica 0.15→0.5, contorni pezzi 0.5→0.8 per migliore visibilità a stampa

### Changed
- Bump versione a 1.2.0
- Rendering order in ViewerCanvas: piece hit-test polygons ora sono in topo a tutti i path HPGL — fix selezione pezzi quando una cucitura si sovrappone al bordo

## [1.1.1] — 2026-07-14

### Added
- Vista Pulita (Clean View) mode: pezzi in `#00AEEF` a 0.6 opacity, placement rect in `#CCCCCC` a 0.4 opacity, label/grid/notch/measurement nascosti, fill spento
- Toggle Vista Pulita in FooterActions (icona occhio)
- Vista Pulita state propagato: `page.tsx` → `ViewerCanvas` + `InfoPanel`
- Starting point markers per pezzo (visibili in vista Tecnica)
- Toggle mostra/nascondi starting points
- Freccette direzionali e numeri sequenza sulla linea di cut-order
- Cut-order line: usa `real cut_order` dal backend
- `filteredContours` overlay: placement rect (rosso tratteggiato) + block fuse (blu puntinato)
- Checkbox toggle per piazzamento e block fuse nella sidebar
- Badge curvatura % e badge compattezza (pieno/medio/vuoto) nella scheda tecnica
- Sezioni scheda tecnica: geo/topo/semantica, fibra visualizzata, lin/cur

### Fixed
- Training samples non salvati per `file_id` UUID vuoto — `save_training_features` omette `file_id` quando vuoto
- InfoPanel UI compattata: padding `p-4`→`p-3`, `space-y-5`→`space-y-3`, testi a `text-[9px]`/`text-[8px]`, metadati `py-1.5`→`py-0.5`
- Rimossa vista InfoPanel da InfoPanel, spostata in FooterActions

### Changed
- Versione bumpata a 1.1.1 (frontend + backend)
- InfoPanel density pass globale

## [1.1.0] — 2026-07-XX

### Added
- Piece Detection: pulsante + bounding box su canvas
- Hover + click pezzo: evidenzia contorno reale, tooltip, pannello info
- Piece detail modal: doppio click apre scheda tecnica (area, perimetro, bbox, intagli, fibra)
- Seam lines nella piece detail modal (SVG preview + conteggio)
- SVG Hit-Test Debug Toolkit (Alt+D)
- Starting points su main canvas
- `/pieces` API con version info

### Fixed
- Hit-test: split overlay in hit polygon invisibile (`pointerEvents: all`) + fill visibile (`pointerEvents: none`)
- Piece hover/selection: usa `document.elementsFromPoint` + `data-piece-id`
- Coordinate space mismatch con flipX per label pezzi
- `vector-effect: non-scaling-stroke` nel DebugOverlay

### Changed
- Piece rendering da `contour_points` (non piú `contour_idx`)
- Rimosso `showBounds` toggle (clone di placement rect)

## [1.0.0] — 2026-07-XX

### Added
- HPGL Viewer con rendering multi-penna, polilinee, figure chiuse, supporto EA/ER/RA/RR/LB
- InfoPanel: metadati file, CAD rilevato, colonna sonora, penne
- Sidebar: toggle visibilità penne, colore personalizzato, modalità unificata
- Selezione path con evidenziazione, tooltip hover, pannello dettagli, copia coordinate
- Misure interattive: click-to-measure distanza e angolo, guide linee, snap
- Notch visualization: marker, legenda, toggle
- Multi-file tabs con confronto side-by-side e overlay con slider opacità
- Viewport culling + LOD + limite comandi (Performance block)
- Rotazione sinistra/destra + flip X/Y vista
- Menu contestuale tasto destro (ruota/flip/reset)
- OCR testi per HPGL/1 con tesserocr
- Export potenziato (CSV, ZIP)
- Mini-mappa, coordinate bar, pan fluido, zoom centrato
- Admin panel: utenti, uploads, training pipeline, analytics, founders, waitlist, sistema
- Training batch UI: select multipli, progress, summary, errori
- Early Access gating: signup registration + waitlist
- Onboarding ufficio: selezione ufficio, filtro tool
- i18n completo (IT/EN)
- Autenticazione: Google + GitHub OAuth
- Dashboard: tool per ufficio, profilo, upload history, gamification
- Home page: stats, CAD supportati, Early Access counter, Founder badge
- Legal pages (Termini, Privacy, Cancellazione Dati)

### Fixed
- Session persistence: BrowserCookieAuthStorageAdapter per middleware
- OAuth callback: client-side page per cookie/session affidabili
- Pan coordinate: screen→viewBox con left-click drag
- Zoom rotellina centrato sul puntatore
- Scaling auto-fit contenuto con bounding box
- Varie fix Vercel build (Suspense, env, iterator)

### Changed
- UI/UX industrial-grade: layout, colori, tipografia, spaziatura
- Admin UI: paginazione, filtri, refresh
- Viewer: spessore linee variabile per contorni
