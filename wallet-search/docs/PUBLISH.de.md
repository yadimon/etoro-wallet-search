# Chrome Web Store: Veröffentlichung Schritt für Schritt

Projektstand: 25.10.2026, Version 0.6.0. Die Google-Quellen wurden am 25.10.2026 geprüft. Es wurde nichts öffentlich hochgeladen.
Die Google-Links unten sind die überprüften offiziellen Quellen.

## 1. Das richtige Paket nehmen

- Chrome Web Store: `dist/etoro-wallet-search-extension-0.6.0.zip`.
- Quellcode für ein neues Repository: `dist/etoro-wallet-search-source-0.6.0.zip`.
- Lokale Installation: `dist/chrome-extension` oder `dist/etoro-wallet-search-extension`.
- Die `.user.js` gehört zu Tampermonkey, nicht in den Chrome Web Store.

Im Store-ZIP liegt `manifest.json` direkt im Hauptverzeichnis. Keinen zusätzlichen
Ordner darum packen. Niemals den ganzen Arbeitsordner hochladen: Hier liegen auch
private Dateien und unabhängige MCP-Werkzeuge.
[Offizielle Paketvorbereitung](https://developer.chrome.com/docs/webstore/prepare).

## 2. Version bauen und selbst abnehmen

In PowerShell:

```powershell
Set-Location -LiteralPath 'C:\development\etoro'
npm ci
npx playwright install chromium
npm run test:wallet:all
npm run check:wallet:format
npm audit
npm run package:wallet:source
```

In `chrome://extensions` die bestehende Erweiterung mit **Neu laden** aktualisieren,
danach Wallet neu laden. Im Panel muss **v0.6.0** stehen. Beide entpackten Ordner
werden vom Build aktualisiert; neues Entpacken ist dort unnötig.

Prüfe Suchen, kombinierte Filter, Statistiken, Zahlungen/Überweisungen getrennt,
Cache und Hintergrundaktualisierung nach Seiten-Neuladen, Aktualisieren, Abbrechen und Ausschalten. Balance und
Finanzbuttons bleiben erhalten. Tampermonkey dabei ausgeschaltet lassen.

Beim Öffnen erscheint der Cache sofort, dann werden neue und offene Buchungen im
Hintergrund geprüft. Ältere Lücken werden dabei nicht gefüllt; der erste Start ohne
Cache lädt den Verlauf einmal. **Suchen/Enter** und Statistik-Jahrgänge laden
angefragte fehlende Zeiträume. Tippen filtert lokal. **Aktualisieren** in der
Kopfzeile prüft den ausgewählten Suchzeitraum vollständig und zeigt dabei einen
Ladeindikator. Statistiken wählt nur das Jahr, zeigt Jahressummen und Monatsdetails
beim Überfahren. Tests verwenden ausschließlich synthetische Daten.

## 3. Namen und Herausgeber festlegen

Empfohlener öffentlicher Name: **Wallet Search for eToro (Unofficial)**. Das Manifest
heißt derzeit noch **eToro Wallet Search**. Eine Umbenennung wird im Manifest
vorgenommen und erneut gebaut/getestet. Beachte dabei die Namens-Schutzprüfung für
Installationsordner im Build und die Namenssuche im Browsertest. Nach einer bereits
eingereichten Version muss die nächste Paketversion höher sein.

Nutze das eigene Wallet-Icon und folgenden Hinweis in der Beschreibung:

> Unofficial extension. Not affiliated with, endorsed by or supported by eToro.

Stelle es nicht als offizielles eToro-Produkt dar. Prüfe die Dienstbedingungen für
die geplante öffentliche Nutzung: Der interne Wallet-Adapter ist keine Zusage eines
offiziellen API-Zugangs. Chrome-Freigabe bedeutet keine eToro-Unterstützung.
[Korrekte Produktangaben](https://developer.chrome.com/docs/webstore/program-policies/listing-requirements).

## 4. Optional: Open-Source-Repository vorbereiten

1. `npm run package:wallet:source` ausführen und das Source-ZIP in einen **neuen,
   leeren Ordner** entpacken. Es hat ein eigenes minimales Paket/Lock ohne MCP.
2. Eine Lizenz wählen und deren vollständigen Text samt tatsächlichem
   Rechteinhaber hinzufügen. MIT oder Apache-2.0 sind mögliche Optionen. Sichtbarer
   Quellcode allein ersetzt keine Open-Source-Lizenz. Hier wurde keine gewählt.
3. Eigene Kontakt-/Repository-Links in README, SECURITY und Datenschutzerklärung ergänzen.
4. Erst ein privates Repository erstellen, nur diese geprüften Dateien übernehmen
   und vor dem ersten Push die komplette Dateiliste prüfen.
5. Private Schwachstellenmeldungen aktivieren. Öffentliche Issues dürfen keine
   echten Kontoauszüge verlangen. SECURITY und CONTRIBUTING liegen bei.
6. Aus dem neuen Ordner installieren/testen und das Repository danach bewusst
   öffentlich schalten. Dies geschieht nicht automatisch durch den Paketbefehl.

Nicht hochladen: `prod.env`, sonstige Umgebungsdateien, Schlüssel, echte CSV/TSV,
HAR-Dateien, Konto-Screenshots, `test-results`, `.codex`, `node_modules`, MCP-Konfiguration.

## 5. Datenschutzerklärung fertigstellen und hosten

[PRIVACY.md](PRIVACY.md) beschreibt die tatsächlichen Datenflüsse als Entwurf.
Ersetze Herausgeber, Kontakt, Datum und Produktnamen. Hoste die fertige Erklärung
unter einer öffentlichen dauerhaften HTTPS-URL, etwa auf der Projektwebsite.
Teste sie ohne Anmeldung. Eine lokale Hilfe-Datei ersetzt diese URL nicht.

Erkläre Finanz-/Transaktionsdaten, Kontomerkmale für den Cache-Schlüssel, lokale
Speicherung, Nachprüfung/Löschen und eToro-/Exportabrufe. Keine zusätzliche
Cache-Verschlüsselung behaupten. Auch rein lokale Verarbeitung ist offenzulegen.
[Datenschutz-FAQ](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq).

Eine konkrete Hosting-Möglichkeit ist GitHub Pages:

1. Unter [New repository](https://github.com/new) ein öffentliches Repository
   `wallet-search-privacy` mit README anlegen. Der Erweiterungscode muss dafür
   nicht im Repository liegen.
2. **Add file → Create new file** wählen und die Datei `index.md` nennen.
3. Oben diese drei Zeilen einfügen, darunter die fertiggestellte Datenschutzerklärung:

   ```yaml
   ---
   title: Privacy Policy
   ---
   ```

4. Nur den eigentlichen Erklärungstext aus dem Entwurf übernehmen; Herausgeber,
   Kontakt und Datum ersetzen und Vorbereitungs-/Dashboard-Hinweise weglassen.
5. **Commit changes** auf `main` wählen.
6. **Settings → Pages → Build and deployment** öffnen, **Deploy from a branch**,
   Branch `main` und Ordner `/(root)` auswählen und speichern.
7. Die dort angezeigte Website-URL nach erfolgreichem Deployment öffnen und ohne
   Anmeldung prüfen. Genau diese URL im Store verwenden.

Öffentliche Repositories unterstützen GitHub Pages im kostenlosen Tarif.
[GitHub Pages](https://docs.github.com/en/pages/quickstart),
[Veröffentlichungsquelle konfigurieren](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).

## 6. Bilder und Texte vorbereiten

Erforderlich: eigenes PNG-Icon **128 × 128** und mindestens ein Screenshot.
Verwende **1280 × 800 Pixel**, bis zu fünf Bilder. Zeige Suche/Filter, Ergebnisliste
und geöffnetes Statistik-Accordion mit **synthetischen, erkennbaren Demodaten**.
Die lokalen Live-Wallet-Aufnahmen gehören nicht in den Store.

Optional: Promo **440 × 280**, große Promo **1400 × 560**, Demovideo.
Die 20 UI-Sprachen lokalisieren den Store-Eintrag nicht automatisch; dafür sind
zusätzliche Store-/Manifest-Lokalisierungen nötig.
[Grafiken und Listing](https://developer.chrome.com/docs/webstore/cws-dashboard-listing).

Kurze englische Beschreibung, unter 132 Zeichen:

> Search eToro Wallet history by text, date, type and amount, with local caching and monthly statistics. Unofficial.

Vorschlag für den längeren deutschen Text:

> Durchsuche eToro-Wallet-Buchungen nach Händler oder Beschreibung, Datum,
> Ein-/Ausgang, Typ, Status und Betrag. Monatliche Statistiken zeigen Zahlungen,
> Überweisungen und weitere Kategorien getrennt. Geladene Buchungen bleiben lokal;
> neue und noch offene Einträge können gezielt nachgeladen werden. Oberfläche und
> Datumsformat folgen eToro-Sprache und lokaler Zeitzone. Keine Entwickler-Telemetrie,
> keine Zahlungs- oder Überweisungsfunktion. Ein angemeldetes Wallet-Konto ist
> erforderlich. eToro kann Oberfläche und Schnittstellen ändern. Inoffizielles,
> unabhängiges Produkt ohne Verbindung zu oder Unterstützung durch eToro.

## 7. Google-Entwicklerkonto registrieren

Öffne das [Developer Dashboard](https://chrome.google.com/webstore/devconsole).
Nutze dein dauerhaftes Herausgeber-Konto und aktiviere Bestätigung in zwei Schritten
samt Wiederherstellungsmöglichkeiten. 2FA ist für Veröffentlichungen/Updates nötig.
[Voraussetzungen](https://developer.chrome.com/docs/webstore/using-api).

Akzeptiere die Entwicklerbedingungen und zahle die einmalige Registrierungsgebühr
von **5 US-Dollar**. Google nennt diesen Betrag ausdrücklich in seiner Veröffentlichung
vom 28.04.2026; maßgeblich bleibt der Zahlungsdialog. Store-Mails regelmäßig lesen.
[Registrierung](https://developer.chrome.com/docs/webstore/register),
[offizielle Preisangabe](https://developer.chrome.com/blog/cws-role-expansion-developer-dashboard).

Unter **Account/Konto** Herausgebername und Kontakt-E-Mail eintragen, dann den
E-Mail-Bestätigungslink öffnen. Supportkontakt und gegebenenfalls Website vorbereiten.
[Kontoeinrichtung](https://developer.chrome.com/docs/webstore/set-up-account).

## 8. Trader-/Non-Trader-Angabe ausfüllen

Google verlangt die Selbsteinstufung von Entwicklern. Kostenlos bedeutet nicht
automatisch Non-Trader. Wähle passend zum tatsächlichen privaten/geschäftlichen
Auftreten. Als Trader werden unter anderem Name, Adresse und Telefonnummer geprüft;
entsprechende Kontaktdaten erscheinen öffentlich. Die im Dashboard verlangten
Prüfungen abschließen.
[Trader-FAQ](https://developer.chrome.com/docs/webstore/program-policies/trader-verification-faq).

## 9. Store-Element anlegen

**Add new item/Neues Element hinzufügen** → Datei wählen → **Erweiterungs-ZIP**
hochladen. Name, Version und Manifest prüfen. Kein manuelles CRX-Packen notwendig.
Manifestfehler im Quelltext korrigieren und ein neues Paket bauen; das Dashboard
bearbeitet dein Manifest nicht.
[Veröffentlichungsablauf](https://developer.chrome.com/docs/webstore/publish).

## 10. Store Listing ausfüllen

Beschreibung, passende Kategorie, Hauptsprache, Icon, Screenshots, Supportkontakt,
Projekt-/Supportseite und Datenschutz-URL eintragen. Nur vorhandene Funktionen
beschreiben. Anmeldung ist erforderlich; Hintergrundaktualisierung kann bei
Verbindungs-/Adapterfehlern scheitern und bewahrt dann den Cache. Es gibt keinen
offiziellen API-Zugang. Zusätzliche Store-Sprachen sind eine eigene Aufgabe.
[Listing-Felder](https://developer.chrome.com/docs/webstore/cws-dashboard-listing).

## 11. Privacy Practices und Rechte erklären

**Single purpose**, Vorschlag:

> Search and analyze transaction history in the user's existing eToro Wallet.

| Berechtigung                                       | Begründung für diese Version                                                                                                           |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `scripting`                                        | Popup aktiviert/zeigt/entfernt das Suchpanel und steuert die lokale Cache-Funktion auf eToro.                                          |
| `https://www.etoro.com/*`                          | Wallet-Integration samt SPA-Navigation und Abruf der bestehenden angemeldeten Buchungsliste. Funktionen laufen auf Wallet-Kontorouten. |
| `https://prodfileexportwe.blob.core.windows.net/*` | Konkreter bekannter eToro-Exportserver für den TSV-Fallback; GET ohne Cookies/Redirects.                                               |
| Optional `https://*.blob.core.windows.net/*`       | Unterstützung anderer Azure-Exportregionen; angefragt wird bei Bedarf nur der konkret beobachtete Ursprung mit Zustimmung.             |

**Remote code: No** passt zum aktuellen Paket: Alle Erweiterungsskripte liegen
lokal vor; API-/TSV-Inhalte werden als Daten gelesen. Datenverwendungs-/Limited-Use-
Angaben müssen zur Datenschutzerklärung passen. Nicht „keine Nutzerdaten“ angeben:
Finanzdaten, Website-Inhalte und identifizierende Profil-/Kontomerkmale werden
verarbeitet, obwohl kein Entwickler-Server den Bestand erhält. Wähle die im
aktuellen Formular tatsächlich zutreffenden Kategorien.
[Privacy-Felder](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy).

## 12. Review-Zugang und Testanleitung klären

**Test instructions** ist allgemein optional, für unser angemeldetes Wallet-Feature
aber sinnvoll. Ergänze genaue Schritte und ein synthetisches Demovideo:

1. Mit berechtigtem Testkonto anmelden und Wallet/EUR öffnen.
2. Suchen klicken, Text/Datum/Betrag kombinieren.
3. Statistiken aufklappen, Zahlungen/Überweisungen wählen und Monat überfahren.
4. Seite neu laden: Cache wird sofort gezeigt; neue/offene Einträge werden im Hintergrund geprüft.
5. Cache löschen und Erweiterung für die Seite ausschalten; native Kontofunktionen bleiben erhalten.

Kein privates finanziertes Hauptkonto oder dessen 2FA weitergeben. Ein zulässiges
Testkonto oder eine ausdrücklich markierte, noch zu bauende Demo-Funktion wären
Review-Hilfen. **0.6.0 enthält noch keinen Offline-Demomodus.** Die synthetischen
Entwicklungsfixtures sind kein Reviewer-Konto im Store-ZIP. Kläre den Zugriff vor
Einreichung; ein Video garantiert keine vollständige Prüfbarkeit.
[Testhinweise](https://developer.chrome.com/docs/webstore/cws-dashboard-test-instructions).

## 13. Sichtbarkeit und Länder wählen

Für die erste Beta empfiehlt sich **Unlisted/Nicht gelistet**: Installation per
Link, keine reguläre Store-Suche. **Private** begrenzt auf festgelegte Tester;
**Public** macht das Listing auffindbar. Alle Varianten werden gleich geprüft.
Wähle Länder, deren Wallet-Adapter du unterstützen kannst.
[Distribution](https://developer.chrome.com/docs/webstore/cws-dashboard-distribution).

## 14. Einreichen und Veröffentlichung steuern

Pflichtfelder speichern, Paket und Datenschutz abgleichen, **Submit for Review**
wählen. Für einen kontrollierten Start automatische Veröffentlichung nach Review
ausschalten; nach Freigabe selbst veröffentlichen.
[Einreichen und verzögerte Veröffentlichung](https://developer.chrome.com/docs/webstore/publish).

Bei verzögerter Veröffentlichung bleiben nach erfolgreichem Review bis zu 30 Tage
zum Veröffentlichen. Danach wird der Stand wieder zum Entwurf und benötigt einen
neuen Review; das Ablaufdatum steht im Dashboard.

Laut Google sind oft einige Tage nötig, manchmal Wochen. Auf konkrete Rückfragen
reagieren und korrigierte Versionen erneut einreichen. Kein festes Freigabedatum
oder Annahmeversprechen einplanen.
[Review-Verfahren](https://developer.chrome.com/docs/webstore/review-process).

## 15. Store-Version und spätere Updates prüfen

Store-Version in einem frischen Profil installieren und den Ablauf bis Suche,
Cache und Berechtigungen testen. Nutzer brauchen dann weder Entwicklermodus noch
ZIP. Der bekannte Exporthost gehört zu Installationsrechten; ein anderer Azure-
Server kann weiterhin eine konkrete Freigabe brauchen.

Die Store-ID kann sich von der lokalen Erweiterungs-ID unterscheiden und damit
einen separaten Cache beginnen. Alte entpackte Version/Tampermonkey deaktivieren.
Updates im **selben Store-Element** mit höherer `manifest.version` hochladen,
nach Build/Tests. Kein neues Element pro Version anlegen. Nutzer erhalten
veröffentlichte Store-Updates über Chrome. Source-Release und Datenschutz mitpflegen.
[Versionierung](https://developer.chrome.com/docs/webstore/prepare).

## Noch vor der ersten Einreichung zu erledigen

- Eigener Herausgeber-/Supportkontakt und fertige öffentliche Datenschutz-URL.
- Store-Bilder mit Demodaten und endgültige Produktbezeichnung.
- Praktisch nutzbare Review-Anleitung mit geklärtem Zugriff.
- Persönliche Abnahme von 0.6.0 nach Neuladen.
- Für Open Source: bewusste Lizenzwahl und echte Repository-/Kontaktlinks.

Paket und Dokumentation ersetzen diese Herausgeberentscheidungen nicht.
