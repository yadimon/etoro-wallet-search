# Wallet Search 0.6.0

1. Update-ZIP in den vorhandenen Installationsordner entpacken oder einen der fertigen Build-Ordner `dist/chrome-extension` und `dist/etoro-wallet-search-extension` verwenden. Beide werden bei jedem Build aktualisiert.
2. In `chrome://extensions` bei **eToro Wallet Search** auf **Neu laden** klicken. Anschließend Wallet neu laden. Im Panel muss **v0.6.0** stehen.
3. Beim Öffnen erscheint der Cache sofort. Neue und offene Buchungen werden automatisch im Hintergrund geprüft; beim ersten Start ohne Cache wird der Verlauf einmal geladen. Filter: Text, Datum, Richtung, Typ, Status und Betrag. **Suchen** lädt angefragte fehlende Zeiträume. Hintergrundfehler bewahren Daten und öffnen keinen Exportdialog.
4. **Aktualisieren** und die Zahl geladener Buchungen stehen oben. Der Knopf dreht sein Symbol während des Ladens und verhindert Doppelstarts. Unten steht nur die Zahl gefundener Buchungen. **Erweiterung ausschalten** entfernt diese Seiteninstanz und bricht Ladevorgänge ab; der Cache bleibt erhalten. Nach Neuladen ist die Erweiterung wieder aktiv.
5. **Statistiken** unten im Suchpanel öffnet sich per Klick oder Enter/Leertaste. Wähle nur das **Jahr**: Kennzahlen gelten für das ganze Jahr. Monatliche Balken zeigen beim Überfahren/Fokussieren ihre Details. **Zahlungen**, **Überweisungen** und **Alle** sind getrennte Ansichten; Kategorien und Status sind zuschaltbar. Ausstehende/abgebrochene Versuche erhöhen die gebuchten Summen nicht.

Für eine Neuinstallation das ZIP entpacken, in `chrome://extensions` den Entwicklermodus aktivieren und **Entpackte Erweiterung laden** wählen. Der gewählte Ordner muss `manifest.json` enthalten. Nach Veröffentlichung kann stattdessen die Installation aus dem Chrome Web Store verwendet werden.

Das Accordion öffnet und schließt weich in etwa 0,3 Sekunden; der Pfeil dreht sich mit. Schnelle Klicks kehren die laufende Bewegung um. Bei aktivierter Systemeinstellung „Bewegung reduzieren“ wird sofort auf- und zugeklappt.

## Cache

Geladene Buchungen bleiben lokal, einschließlich neuer und offener Einträge. Automatische Besuche laden ab dem letzten geprüften Datum und der ältesten offenen/unbekannten Buchung innerhalb von 42 Tagen nach. Ältere historische Lücken werden nur bei angefragter Suche/Statistik geladen. Die API-Grenzseite kann einige ältere Zeilen enthalten; weitere Archivseiten werden nicht erneut abgerufen. Ältere offene Buchungen behalten ihren Status. 42 Tage sind unsere automatische Prüfgrenze, keine eToro-Abschlussfrist. **Aktualisieren** prüft den ausgewählten Suchzeitraum vollständig. Konten, Währungen und Zeitzonen sind getrennt. **Lokalen Cache löschen** löscht die aktuelle lokale Kombination; nach erneutem Öffnen kann die automatische Abfrage den Verlauf wieder laden.

## Zugriff und Sprachen

Der bekannte Exportserver `prodfileexportwe.blob.core.windows.net` ist zusammen mit eToro in den Installationsberechtigungen enthalten. Ein anderer Azure-Blob-Exportserver kann eine Freigabe seiner konkreten Domain benötigen. Beliebige andere Websites sind nicht freigeschaltet; ein neuer Anbieter erfordert eine Anpassung der Erweiterung.

Die Oberfläche, das Popup und die Hilfe folgen der gewählten eToro-Sprache. Alle 20 aktuell angebotenen Sprachen sind enthalten, einschließlich Arabisch mit RTL-Darstellung. Monatsnamen, Zahlen und Währungen werden entsprechend formatiert.

Die normale Buchungsliste liefert Typ und Status. Falls nur der ältere TSV-Export verfügbar ist, bleiben nicht sicher zuordenbare Typen/Status sichtbar als unbekannt. Abgebrochene Beträge werden niemals als gebuchte Ausgaben summiert.

## Tampermonkey

Alternativ den Inhalt des vorhandenen Scripts durch `etoro-wallet-search.user.js` ersetzen, speichern und Wallet neu laden. Tampermonkey speichert ältere Buchungen über seinen lokalen Script-Speicher. Die benötigten GM-Funktionen und der bekannte Exportserver sind im Script angegeben. Nur eine Installationsmethode gleichzeitig aktivieren.

Keine finanziellen Aktionen oder Änderungen an eToro-Kontoeinstellungen. Keine Übertragung des lokalen Datenbestands an einen eigenen Server. Bis zu 200.000 Buchungen und 32 MiB pro Ladevorgang; große Listen verwenden virtuelle Bildlaufbereiche.
