// The twenty languages present in eToro Settings > Display on 2026-10-24.
export const LOCALES = Object.freeze({
  en: 'en-GB',
  es: 'es-ES',
  it: 'it-IT',
  de: 'de-DE',
  ru: 'ru-RU',
  'zh-CN': 'zh-CN',
  fr: 'fr-FR',
  ar: 'ar',
  'zh-TW': 'zh-TW',
  pl: 'pl-PL',
  nl: 'nl-NL',
  nb: 'nb-NO',
  pt: 'pt-PT',
  sv: 'sv-SE',
  cs: 'cs-CZ',
  da: 'da-DK',
  ro: 'ro-RO',
  vi: 'vi-VN',
  fi: 'fi-FI',
  el: 'el-GR',
});
const wordKeys =
  'title|query|from|to|direction|all|incoming|outgoing|amount|any|gt|gte|lt|lte|eq|between|search|reset|statistics|year|month|net|count|type|status|payments|transferIn|transferOut|cash|refunds|fees|adjustments|otherIn|otherOut|settled|pending|failed|unknown|results|loaded|found|cancel|refresh|remove|cacheClear|openWallet|show|enable|help|allow|empty|loading|active|inactive'.split(
    '|',
  );
const words = {
  en: 'Wallet search|Merchant or description|From|To|Direction|All|Money in|Money out|Amount|Any|Greater than|At least|Less than|At most|Equal to|Between|Search|Reset|Statistics|Year|Month|Net|Transactions|Type|Status|Payments|Transfers in|Transfers out|Cash withdrawals|Refunds|Fees|Adjustments|Other money in|Other money out|Booked|Pending|Cancelled / declined|Unknown|Search results|Loaded|Found|Cancel|Refresh|Remove|Clear local cache|Open Wallet|Show panel|Enable search|Help|Allow export server|No matching transactions.|Loading transactions…|Active|Inactive',
  de: 'Wallet-Suche|Händler oder Beschreibung|Von|Bis|Richtung|Alle|Eingänge|Ausgänge|Betrag|Beliebig|Größer als|Mindestens|Kleiner als|Höchstens|Gleich|Zwischen|Suchen|Zurücksetzen|Statistiken|Jahr|Monat|Saldo|Buchungen|Typ|Status|Zahlungen|Überweisungen eingehend|Überweisungen ausgehend|Bargeldabhebungen|Erstattungen|Gebühren|Korrekturen|Sonstige Eingänge|Sonstige Ausgänge|Gebucht|Ausstehend|Abgebrochen / abgelehnt|Unbekannt|Suchergebnisse|Geladen|Gefunden|Abbrechen|Aktualisieren|Entfernen|Lokalen Cache löschen|Wallet öffnen|Panel anzeigen|Suche aktivieren|Anleitung|Dateiserver freigeben|Keine passenden Buchungen.|Buchungen werden geladen…|Aktiv|Inaktiv',
  es: 'Buscar en Wallet|Comercio o descripción|Desde|Hasta|Dirección|Todos|Entradas|Salidas|Importe|Cualquiera|Mayor que|Como mínimo|Menor que|Como máximo|Igual a|Entre|Buscar|Restablecer|Estadísticas|Año|Mes|Neto|Operaciones|Tipo|Estado|Pagos|Transferencias recibidas|Transferencias enviadas|Retiradas de efectivo|Reembolsos|Comisiones|Ajustes|Otras entradas|Otras salidas|Contabilizado|Pendiente|Cancelado / rechazado|Desconocido|Resultados de búsqueda|Cargadas|Encontradas|Cancelar|Actualizar|Quitar|Borrar caché local|Abrir Wallet|Mostrar panel|Activar búsqueda|Ayuda|Autorizar servidor de exportación|No hay operaciones coincidentes.|Cargando operaciones…|Activo|Inactivo',
  it: 'Ricerca Wallet|Esercente o descrizione|Dal|Al|Direzione|Tutti|Entrate|Uscite|Importo|Qualsiasi|Maggiore di|Almeno|Minore di|Al massimo|Uguale a|Tra|Cerca|Reimposta|Statistiche|Anno|Mese|Saldo netto|Operazioni|Tipo|Stato|Pagamenti|Bonifici ricevuti|Bonifici inviati|Prelievi di contante|Rimborsi|Commissioni|Rettifiche|Altre entrate|Altre uscite|Contabilizzato|In sospeso|Annullato / rifiutato|Sconosciuto|Risultati della ricerca|Caricate|Trovate|Annulla|Aggiorna|Rimuovi|Svuota cache locale|Apri Wallet|Mostra pannello|Attiva ricerca|Guida|Autorizza server di esportazione|Nessuna operazione corrispondente.|Caricamento delle operazioni…|Attivo|Inattivo',
  ru: 'Поиск по кошельку|Магазин или описание|С даты|По дату|Направление|Все|Поступления|Списания|Сумма|Любая|Больше|Не меньше|Меньше|Не больше|Равно|Диапазон|Найти|Сбросить|Статистика|Год|Месяц|Итог|Операции|Тип|Статус|Платежи|Входящие переводы|Исходящие переводы|Снятие наличных|Возвраты|Комиссии|Корректировки|Прочие поступления|Прочие списания|Проведено|Ожидает|Отменено / отклонено|Неизвестно|Результаты поиска|Загружено|Найдено|Отмена|Обновить|Убрать|Очистить локальный кеш|Открыть кошелёк|Показать панель|Включить поиск|Инструкция|Разрешить сервер экспорта|Подходящих операций нет.|Загрузка операций…|Включено|Выключено',
  'zh-CN':
    '钱包搜索|商家或描述|开始日期|结束日期|方向|全部|收入|支出|金额|不限|大于|至少|小于|至多|等于|介于|搜索|重置|统计|年份|月份|净额|交易|类型|状态|付款|转入|转出|现金取款|退款|费用|调整|其他收入|其他支出|已入账|待处理|已取消／已拒绝|未知|搜索结果|已加载|已找到|取消|刷新|移除|清除本地缓存|打开钱包|显示面板|启用搜索|帮助|允许导出服务器|没有匹配的交易。|正在加载交易…|已启用|未启用',
  fr: 'Recherche Wallet|Commerçant ou description|Du|Au|Sens|Tous|Entrées|Sorties|Montant|Tous|Supérieur à|Au moins|Inférieur à|Au plus|Égal à|Entre|Rechercher|Réinitialiser|Statistiques|Année|Mois|Solde net|Opérations|Type|Statut|Paiements|Virements reçus|Virements émis|Retraits d’espèces|Remboursements|Frais|Régularisations|Autres entrées|Autres sorties|Comptabilisé|En attente|Annulé / refusé|Inconnu|Résultats de recherche|Chargées|Trouvées|Annuler|Actualiser|Retirer|Vider le cache local|Ouvrir Wallet|Afficher le panneau|Activer la recherche|Aide|Autoriser le serveur d’export|Aucune opération correspondante.|Chargement des opérations…|Actif|Inactif',
  ar: 'البحث في المحفظة|التاجر أو الوصف|من|إلى|الاتجاه|الكل|الوارد|الصادر|المبلغ|أي مبلغ|أكبر من|على الأقل|أقل من|على الأكثر|يساوي|بين|بحث|إعادة تعيين|الإحصاءات|السنة|الشهر|الصافي|المعاملات|النوع|الحالة|المدفوعات|التحويلات الواردة|التحويلات الصادرة|السحب النقدي|المبالغ المستردة|الرسوم|التسويات|واردات أخرى|مصروفات أخرى|مرحّل|قيد الانتظار|ملغى / مرفوض|غير معروف|نتائج البحث|تم التحميل|النتائج|إلغاء|تحديث|إزالة|مسح ذاكرة التخزين المحلية|فتح المحفظة|عرض اللوحة|تفعيل البحث|المساعدة|السماح لخادم التصدير|لا توجد معاملات مطابقة.|جارٍ تحميل المعاملات…|مفعّل|غير مفعّل',
  'zh-TW':
    '錢包搜尋|商家或說明|開始日期|結束日期|方向|全部|收入|支出|金額|不限|大於|至少|小於|至多|等於|介於|搜尋|重設|統計|年份|月份|淨額|交易|類型|狀態|付款|轉入|轉出|現金提款|退款|費用|調整|其他收入|其他支出|已入帳|待處理|已取消／已拒絕|未知|搜尋結果|已載入|已找到|取消|重新整理|移除|清除本機快取|開啟錢包|顯示面板|啟用搜尋|說明|允許匯出伺服器|沒有符合的交易。|正在載入交易…|已啟用|未啟用',
  pl: 'Wyszukiwanie w Wallet|Sprzedawca lub opis|Od|Do|Kierunek|Wszystkie|Wpływy|Wydatki|Kwota|Dowolna|Większa niż|Co najmniej|Mniejsza niż|Co najwyżej|Równa|Pomiędzy|Szukaj|Resetuj|Statystyki|Rok|Miesiąc|Saldo|Transakcje|Typ|Status|Płatności|Przelewy przychodzące|Przelewy wychodzące|Wypłaty gotówki|Zwroty|Opłaty|Korekty|Inne wpływy|Inne wydatki|Zaksięgowane|Oczekujące|Anulowane / odrzucone|Nieznane|Wyniki wyszukiwania|Wczytano|Znaleziono|Anuluj|Odśwież|Usuń|Wyczyść lokalną pamięć|Otwórz Wallet|Pokaż panel|Włącz wyszukiwanie|Pomoc|Zezwól na serwer eksportu|Brak pasujących transakcji.|Wczytywanie transakcji…|Aktywne|Nieaktywne',
  nl: 'Wallet zoeken|Winkel of omschrijving|Van|Tot|Richting|Alle|Inkomsten|Uitgaven|Bedrag|Elk bedrag|Groter dan|Minstens|Kleiner dan|Hoogstens|Gelijk aan|Tussen|Zoeken|Resetten|Statistieken|Jaar|Maand|Netto|Transacties|Type|Status|Betalingen|Inkomende overboekingen|Uitgaande overboekingen|Geldopnames|Terugbetalingen|Kosten|Correcties|Overige inkomsten|Overige uitgaven|Geboekt|In behandeling|Geannuleerd / geweigerd|Onbekend|Zoekresultaten|Geladen|Gevonden|Annuleren|Vernieuwen|Verwijderen|Lokale cache wissen|Wallet openen|Paneel tonen|Zoeken inschakelen|Hulp|Exportserver toestaan|Geen overeenkomende transacties.|Transacties laden…|Actief|Inactief',
  nb: 'Søk i Wallet|Brukersted eller beskrivelse|Fra|Til|Retning|Alle|Innbetalinger|Utbetalinger|Beløp|Alle beløp|Større enn|Minst|Mindre enn|Høyst|Lik|Mellom|Søk|Nullstill|Statistikk|År|Måned|Netto|Transaksjoner|Type|Status|Betalinger|Overføringer inn|Overføringer ut|Kontantuttak|Refusjoner|Gebyrer|Justeringer|Andre innbetalinger|Andre utbetalinger|Bokført|Venter|Avbrutt / avvist|Ukjent|Søkeresultater|Lastet|Funnet|Avbryt|Oppdater|Fjern|Tøm lokal hurtigbuffer|Åpne Wallet|Vis panel|Aktiver søk|Hjelp|Tillat eksportserver|Ingen samsvarende transaksjoner.|Laster transaksjoner…|Aktiv|Inaktiv',
  pt: 'Pesquisa na Wallet|Comerciante ou descrição|De|Até|Direção|Todos|Entradas|Saídas|Montante|Qualquer|Maior que|Pelo menos|Menor que|No máximo|Igual a|Entre|Pesquisar|Repor|Estatísticas|Ano|Mês|Saldo líquido|Transações|Tipo|Estado|Pagamentos|Transferências recebidas|Transferências enviadas|Levantamentos de numerário|Reembolsos|Comissões|Ajustes|Outras entradas|Outras saídas|Contabilizado|Pendente|Cancelado / recusado|Desconhecido|Resultados da pesquisa|Carregadas|Encontradas|Cancelar|Atualizar|Remover|Limpar cache local|Abrir Wallet|Mostrar painel|Ativar pesquisa|Ajuda|Autorizar servidor de exportação|Nenhuma transação correspondente.|A carregar transações…|Ativo|Inativo',
  sv: 'Sök i Wallet|Handlare eller beskrivning|Från|Till|Riktning|Alla|Inbetalningar|Utbetalningar|Belopp|Valfritt|Större än|Minst|Mindre än|Högst|Lika med|Mellan|Sök|Återställ|Statistik|År|Månad|Netto|Transaktioner|Typ|Status|Betalningar|Överföringar in|Överföringar ut|Kontantuttag|Återbetalningar|Avgifter|Justeringar|Övriga inbetalningar|Övriga utbetalningar|Bokförd|Väntande|Avbruten / nekad|Okänd|Sökresultat|Inlästa|Hittade|Avbryt|Uppdatera|Ta bort|Rensa lokal cache|Öppna Wallet|Visa panel|Aktivera sökning|Hjälp|Tillåt exportserver|Inga matchande transaktioner.|Läser in transaktioner…|Aktiv|Inaktiv',
  cs: 'Hledání ve Wallet|Obchodník nebo popis|Od|Do|Směr|Vše|Příjmy|Výdaje|Částka|Libovolná|Větší než|Alespoň|Menší než|Nejvýše|Rovno|Mezi|Hledat|Obnovit výchozí|Statistiky|Rok|Měsíc|Čistý zůstatek|Transakce|Typ|Stav|Platby|Příchozí převody|Odchozí převody|Výběry hotovosti|Vrácené platby|Poplatky|Úpravy|Ostatní příjmy|Ostatní výdaje|Zaúčtováno|Čekající|Zrušeno / zamítnuto|Neznámé|Výsledky hledání|Načteno|Nalezeno|Zrušit|Aktualizovat|Odebrat|Vymazat místní mezipaměť|Otevřít Wallet|Zobrazit panel|Zapnout hledání|Nápověda|Povolit server exportu|Žádné odpovídající transakce.|Načítání transakcí…|Aktivní|Neaktivní',
  da: 'Søg i Wallet|Forretning eller beskrivelse|Fra|Til|Retning|Alle|Indbetalinger|Udbetalinger|Beløb|Alle beløb|Større end|Mindst|Mindre end|Højst|Lig med|Mellem|Søg|Nulstil|Statistik|År|Måned|Netto|Transaktioner|Type|Status|Betalinger|Overførsler ind|Overførsler ud|Kontanthævninger|Tilbagebetalinger|Gebyrer|Reguleringer|Andre indbetalinger|Andre udbetalinger|Bogført|Afventer|Annulleret / afvist|Ukendt|Søgeresultater|Indlæst|Fundet|Annuller|Opdater|Fjern|Ryd lokal cache|Åbn Wallet|Vis panel|Aktivér søgning|Hjælp|Tillad eksportserver|Ingen matchende transaktioner.|Indlæser transaktioner…|Aktiv|Inaktiv',
  ro: 'Căutare în Wallet|Comerciant sau descriere|De la|Până la|Direcție|Toate|Intrări|Ieșiri|Sumă|Oricare|Mai mare decât|Cel puțin|Mai mică decât|Cel mult|Egală cu|Între|Caută|Resetează|Statistici|An|Lună|Sold net|Tranzacții|Tip|Stare|Plăți|Transferuri primite|Transferuri trimise|Retrageri de numerar|Rambursări|Comisioane|Ajustări|Alte intrări|Alte ieșiri|Înregistrată|În așteptare|Anulată / respinsă|Necunoscută|Rezultatele căutării|Încărcate|Găsite|Anulează|Actualizează|Elimină|Șterge memoria cache locală|Deschide Wallet|Afișează panoul|Activează căutarea|Ajutor|Permite serverul de export|Nicio tranzacție corespunzătoare.|Se încarcă tranzacțiile…|Activ|Inactiv',
  vi: 'Tìm kiếm ví|Cửa hàng hoặc mô tả|Từ ngày|Đến ngày|Chiều giao dịch|Tất cả|Tiền vào|Tiền ra|Số tiền|Bất kỳ|Lớn hơn|Ít nhất|Nhỏ hơn|Tối đa|Bằng|Trong khoảng|Tìm kiếm|Đặt lại|Thống kê|Năm|Tháng|Chênh lệch|Giao dịch|Loại|Trạng thái|Thanh toán|Chuyển tiền vào|Chuyển tiền ra|Rút tiền mặt|Hoàn tiền|Phí|Điều chỉnh|Khoản thu khác|Khoản chi khác|Đã ghi sổ|Đang chờ|Đã hủy / bị từ chối|Không xác định|Kết quả tìm kiếm|Đã tải|Tìm thấy|Hủy|Làm mới|Gỡ bỏ|Xóa bộ nhớ đệm cục bộ|Mở ví|Hiện bảng|Bật tìm kiếm|Trợ giúp|Cho phép máy chủ xuất dữ liệu|Không có giao dịch phù hợp.|Đang tải giao dịch…|Đang bật|Đang tắt',
  fi: 'Wallet-haku|Kauppias tai kuvaus|Alkaen|Asti|Suunta|Kaikki|Saapuvat|Lähtevät|Summa|Mikä tahansa|Suurempi kuin|Vähintään|Pienempi kuin|Enintään|Yhtä suuri|Välillä|Hae|Tyhjennä|Tilastot|Vuosi|Kuukausi|Netto|Tapahtumat|Tyyppi|Tila|Maksut|Saapuvat tilisiirrot|Lähtevät tilisiirrot|Käteisnostot|Palautukset|Kulut|Oikaisut|Muut saapuvat|Muut lähtevät|Kirjattu|Odottaa|Peruttu / hylätty|Tuntematon|Hakutulokset|Ladattu|Löytyi|Peruuta|Päivitä|Poista|Tyhjennä paikallinen välimuisti|Avaa Wallet|Näytä paneeli|Ota haku käyttöön|Ohje|Salli vientipalvelin|Ei vastaavia tapahtumia.|Ladataan tapahtumia…|Käytössä|Ei käytössä',
  el: 'Αναζήτηση στο Wallet|Έμπορος ή περιγραφή|Από|Έως|Κατεύθυνση|Όλα|Εισροές|Εκροές|Ποσό|Οποιοδήποτε|Μεγαλύτερο από|Τουλάχιστον|Μικρότερο από|Το πολύ|Ίσο με|Μεταξύ|Αναζήτηση|Επαναφορά|Στατιστικά|Έτος|Μήνας|Καθαρό υπόλοιπο|Συναλλαγές|Τύπος|Κατάσταση|Πληρωμές|Εισερχόμενα εμβάσματα|Εξερχόμενα εμβάσματα|Αναλήψεις μετρητών|Επιστροφές|Χρεώσεις|Προσαρμογές|Λοιπές εισροές|Λοιπές εκροές|Καταχωρισμένη|Σε εκκρεμότητα|Ακυρωμένη / απορριφθείσα|Άγνωστη|Αποτελέσματα αναζήτησης|Φορτώθηκαν|Βρέθηκαν|Ακύρωση|Ανανέωση|Αφαίρεση|Εκκαθάριση τοπικής μνήμης|Άνοιγμα Wallet|Εμφάνιση πλαισίου|Ενεργοποίηση αναζήτησης|Βοήθεια|Να επιτρέπεται ο διακομιστής εξαγωγής|Δεν υπάρχουν αντίστοιχες συναλλαγές.|Φόρτωση συναλλαγών…|Ενεργό|Ανενεργό',
};
const messageKeys =
  'noData|error|badRange|tooLarge|tooMany|cacheInfo|cacheUnavailable|cacheCleared|classificationNote|statusNote|layout|permission|helpText'.split(
    '|',
  );
const messages = {
  en: 'Start a search to load transactions.|The data could not be loaded. Please try again.|Enter a valid date and amount range.|Maximum file size: 32 MiB.|Maximum 200,000 transactions.|Transactions stay local. New entries and pending transactions up to 42 days old are refreshed.|Local caching is unavailable for this account.|Local cache cleared.|Some transactions have no known type or status and are labelled Unknown.|Totals include booked amounts only. Pending and cancelled amounts are marked separately.|The original list remains visible because the page layout changed.|Allow the export server using the extension icon, then search again.|Search by text, date, direction, type, status and amount. Open Statistics to choose a month/year and switch chart layers on or off. Older data stays in this browser until you clear the local cache.',
  de: 'Suche starten, um Buchungen zu laden.|Die Daten konnten nicht geladen werden. Bitte erneut versuchen.|Bitte gültige Datums- und Betragsgrenzen eingeben.|Maximal 32 MiB pro Datei.|Maximal 200.000 Buchungen.|Buchungen bleiben lokal. Neue Einträge und offene Buchungen bis zu 42 Tage werden nachgeladen.|Für dieses Konto ist kein lokaler Cache verfügbar.|Lokaler Cache gelöscht.|Bei einigen Buchungen sind Typ oder Status unbekannt; sie sind entsprechend markiert.|Summen enthalten nur gebuchte Beträge. Ausstehende und abgebrochene Beträge sind separat markiert.|Die ursprüngliche Liste bleibt sichtbar, da sich das Seitenlayout geändert hat.|Den Dateiserver über das Erweiterungssymbol freigeben und erneut suchen.|Nach Text, Datum, Richtung, Typ, Status und Betrag suchen. Unter Statistiken Monat/Jahr wählen und Diagrammebenen ein- oder ausschalten. Ältere Daten bleiben in diesem Browser, bis der lokale Cache gelöscht wird.',
  es: 'Inicia una búsqueda para cargar operaciones.|No se pudieron cargar los datos. Inténtalo de nuevo.|Introduce un intervalo válido de fechas e importes.|Máximo 32 MiB por archivo.|Máximo 200.000 operaciones.|Las operaciones se guardan localmente. Se actualizan las nuevas y las pendientes de hasta 42 días.|La caché local no está disponible para esta cuenta.|Caché local borrada.|Algunas operaciones no tienen tipo o estado conocido y se marcan como desconocidas.|Los totales solo incluyen importes contabilizados. Los pendientes y cancelados se marcan por separado.|La lista original sigue visible porque cambió el diseño de la página.|Autoriza el servidor de exportación desde el icono de la extensión y vuelve a buscar.|Busca por texto, fecha, dirección, tipo, estado e importe. Abre Estadísticas para elegir mes/año y activar o desactivar las capas. Los datos antiguos permanecen en este navegador hasta borrar la caché local.',
  it: 'Avvia una ricerca per caricare le operazioni.|Impossibile caricare i dati. Riprova.|Inserisci un intervallo valido di date e importi.|Massimo 32 MiB per file.|Massimo 200.000 operazioni.|Le operazioni restano in locale. Si aggiornano quelle nuove e quelle in sospeso fino a 42 giorni.|La cache locale non è disponibile per questo conto.|Cache locale svuotata.|Alcune operazioni non hanno tipo o stato noto e sono indicate come sconosciute.|I totali includono solo importi contabilizzati. Quelli in sospeso o annullati sono contrassegnati separatamente.|La lista originale rimane visibile perché la struttura della pagina è cambiata.|Autorizza il server di esportazione dall’icona dell’estensione e ripeti la ricerca.|Cerca per testo, data, direzione, tipo, stato e importo. Apri Statistiche per scegliere mese/anno e attivare o disattivare i livelli. I dati meno recenti restano nel browser finché non svuoti la cache locale.',
  ru: 'Начните поиск, чтобы загрузить операции.|Не удалось загрузить данные. Повторите попытку.|Укажите корректный диапазон дат и сумм.|Максимум 32 МиБ на файл.|Максимум 200 000 операций.|Данные сохраняются локально. Догружаются новые операции и проверяются ожидающие не старше 42 дней.|Локальный кеш недоступен для этого счёта.|Локальный кеш очищен.|У некоторых операций неизвестны тип или статус; они отмечены соответствующим образом.|Итоги включают только проведённые суммы. Ожидающие и отменённые отмечаются отдельно.|Исходный список остаётся виден, поскольку разметка страницы изменилась.|Разрешите сервер экспорта через значок расширения и повторите поиск.|Ищите по тексту, дате, направлению, типу, статусу и сумме. В статистике выберите месяц/год и включайте или отключайте слои графика. Старые данные остаются в этом браузере до очистки локального кеша.',
  'zh-CN':
    '开始搜索以加载交易。|无法加载数据，请重试。|请输入有效的日期和金额范围。|每个文件最大为 32 MiB。|最多 200,000 笔交易。|交易保存在本地。刷新新增交易及过去42天内的待处理交易。|此账户无法使用本地缓存。|已清除本地缓存。|部分交易的类型或状态未知，已作相应标记。|合计仅包含已入账金额，待处理和已取消的金额会单独标记。|页面布局已更改，因此保留显示原始列表。|请通过扩展程序图标允许导出服务器，然后重新搜索。|可按文本、日期、方向、类型、状态和金额搜索。打开统计以选择月份和年份，并切换图表图层。较早的数据会保留在此浏览器中，直到清除本地缓存。',
  fr: 'Lancez une recherche pour charger les opérations.|Impossible de charger les données. Réessayez.|Saisissez une plage de dates et de montants valide.|32 MiB maximum par fichier.|200 000 opérations maximum.|Les opérations restent en local. Les nouvelles et celles en attente depuis 42 jours au maximum sont actualisées.|Le cache local n’est pas disponible pour ce compte.|Cache local vidé.|Le type ou le statut de certaines opérations est inconnu et signalé comme tel.|Les totaux incluent uniquement les montants comptabilisés. Les montants en attente ou annulés sont signalés séparément.|La liste d’origine reste visible car la disposition de la page a changé.|Autorisez le serveur d’export depuis l’icône de l’extension, puis relancez la recherche.|Recherchez par texte, date, sens, type, statut et montant. Ouvrez Statistiques pour choisir le mois et l’année et activer les couches du graphique. Les anciennes données restent dans ce navigateur jusqu’à la suppression du cache local.',
  ar: 'ابدأ البحث لتحميل المعاملات.|تعذر تحميل البيانات. يرجى المحاولة مجددًا.|أدخل نطاقًا صالحًا للتواريخ والمبالغ.|الحد الأقصى للملف 32 ميبيبايت.|الحد الأقصى 200٬000 معاملة.|تُحفظ المعاملات محليًا. تُحدّث المعاملات الجديدة والمعلّقة التي لا يزيد عمرها عن 42 يومًا.|التخزين المحلي غير متاح لهذا الحساب.|تم مسح ذاكرة التخزين المحلية.|نوع بعض المعاملات أو حالتها غير معروف وتم تمييزها بذلك.|تشمل المجاميع المبالغ المرحّلة فقط. وتُميّز المبالغ المعلقة والملغاة بشكل منفصل.|تظل القائمة الأصلية ظاهرة لأن تخطيط الصفحة تغيّر.|اسمح لخادم التصدير عبر رمز الإضافة ثم أعد البحث.|ابحث بالنص والتاريخ والاتجاه والنوع والحالة والمبلغ. افتح الإحصاءات لاختيار الشهر والسنة وإظهار طبقات الرسم أو إخفائها. تبقى البيانات القديمة في هذا المتصفح حتى تمسح ذاكرة التخزين المحلية.',
  'zh-TW':
    '開始搜尋以載入交易。|無法載入資料，請重試。|請輸入有效的日期與金額範圍。|每個檔案最大為 32 MiB。|最多 200,000 筆交易。|交易儲存在本機。更新新增交易及過去42天內的待處理交易。|此帳戶無法使用本機快取。|已清除本機快取。|部分交易的類型或狀態未知，已作相應標記。|合計僅包含已入帳金額，待處理與已取消的金額會另外標記。|頁面版面已變更，因此保留顯示原始清單。|請透過擴充功能圖示允許匯出伺服器，然後重新搜尋。|可按文字、日期、方向、類型、狀態與金額搜尋。開啟統計以選擇月份和年份，並切換圖表圖層。較早的資料會保留在此瀏覽器中，直到清除本機快取。',
  pl: 'Rozpocznij wyszukiwanie, aby wczytać transakcje.|Nie udało się wczytać danych. Spróbuj ponownie.|Podaj prawidłowy zakres dat i kwot.|Maksymalnie 32 MiB na plik.|Maksymalnie 200 000 transakcji.|Transakcje są przechowywane lokalnie. Aktualizowane są nowe oraz oczekujące nie starsze niż 42 dni.|Lokalna pamięć podręczna jest niedostępna dla tego konta.|Lokalna pamięć została wyczyszczona.|Niektóre transakcje mają nieznany typ lub status i są odpowiednio oznaczone.|Sumy obejmują tylko zaksięgowane kwoty. Kwoty oczekujące i anulowane są oznaczone osobno.|Oryginalna lista pozostaje widoczna, ponieważ zmienił się układ strony.|Zezwól na serwer eksportu przez ikonę rozszerzenia i ponów wyszukiwanie.|Szukaj według tekstu, daty, kierunku, typu, statusu i kwoty. Otwórz Statystyki, aby wybrać miesiąc i rok oraz włączać warstwy wykresu. Starsze dane pozostają w tej przeglądarce do wyczyszczenia lokalnej pamięci.',
  nl: 'Start een zoekopdracht om transacties te laden.|De gegevens konden niet worden geladen. Probeer opnieuw.|Voer een geldig datum- en bedragbereik in.|Maximaal 32 MiB per bestand.|Maximaal 200.000 transacties.|Transacties blijven lokaal. Nieuwe en openstaande transacties tot 42 dagen oud worden bijgewerkt.|Lokale opslag is niet beschikbaar voor deze rekening.|Lokale cache gewist.|Bij sommige transacties is het type of de status onbekend; dit wordt aangegeven.|Totalen bevatten alleen geboekte bedragen. Openstaande en geannuleerde bedragen worden apart gemarkeerd.|De oorspronkelijke lijst blijft zichtbaar omdat de pagina-indeling is gewijzigd.|Sta de exportserver toe via het extensiepictogram en zoek opnieuw.|Zoek op tekst, datum, richting, type, status en bedrag. Open Statistieken om maand en jaar te kiezen en grafieklagen aan of uit te zetten. Oudere gegevens blijven in deze browser totdat je de lokale cache wist.',
  nb: 'Start et søk for å laste transaksjoner.|Dataene kunne ikke lastes. Prøv igjen.|Angi et gyldig dato- og beløpsintervall.|Maksimalt 32 MiB per fil.|Maksimalt 200 000 transaksjoner.|Transaksjoner lagres lokalt. Nye og ventende transaksjoner som er opptil 42 dager gamle oppdateres.|Lokal hurtigbuffer er ikke tilgjengelig for denne kontoen.|Lokal hurtigbuffer tømt.|Noen transaksjoner har ukjent type eller status og er merket som ukjent.|Summene inkluderer bare bokførte beløp. Ventende og avbrutte beløp merkes separat.|Den opprinnelige listen er synlig fordi sideoppsettet er endret.|Tillat eksportserveren via utvidelsesikonet, og søk igjen.|Søk etter tekst, dato, retning, type, status og beløp. Åpne Statistikk for å velge måned og år og slå diagramlag av eller på. Eldre data blir i denne nettleseren til du tømmer den lokale hurtigbufferen.',
  pt: 'Inicie uma pesquisa para carregar transações.|Não foi possível carregar os dados. Tente novamente.|Introduza um intervalo válido de datas e montantes.|Máximo de 32 MiB por ficheiro.|Máximo de 200.000 transações.|As transações ficam guardadas localmente. Atualizam-se as novas e as pendentes com até 42 dias.|A cache local não está disponível para esta conta.|Cache local limpa.|Algumas transações têm tipo ou estado desconhecido e estão identificadas como tal.|Os totais incluem apenas montantes contabilizados. Os pendentes e cancelados são assinalados separadamente.|A lista original permanece visível porque a estrutura da página mudou.|Autorize o servidor de exportação no ícone da extensão e pesquise novamente.|Pesquise por texto, data, direção, tipo, estado e montante. Abra Estatísticas para escolher mês/ano e ativar ou desativar as camadas. Os dados antigos ficam neste navegador até limpar a cache local.',
  sv: 'Starta en sökning för att läsa in transaktioner.|Det gick inte att läsa in data. Försök igen.|Ange ett giltigt datum- och beloppsintervall.|Högst 32 MiB per fil.|Högst 200 000 transaktioner.|Transaktioner sparas lokalt. Nya och väntande transaktioner som är högst 42 dagar gamla uppdateras.|Lokal cache är inte tillgänglig för detta konto.|Lokal cache rensad.|Vissa transaktioner saknar känd typ eller status och markeras som okända.|Summorna innehåller endast bokförda belopp. Väntande och avbrutna belopp markeras separat.|Originallistan visas eftersom sidans layout har ändrats.|Tillåt exportservern via tilläggsikonen och sök igen.|Sök efter text, datum, riktning, typ, status och belopp. Öppna Statistik för att välja månad och år och slå av eller på diagramlager. Äldre data stannar i webbläsaren tills du rensar den lokala cachen.',
  cs: 'Spusťte hledání a načtěte transakce.|Data se nepodařilo načíst. Zkuste to znovu.|Zadejte platný rozsah dat a částek.|Nejvýše 32 MiB na soubor.|Nejvýše 200 000 transakcí.|Transakce zůstávají místně. Aktualizují se nové a čekající transakce staré nejvýše 42 dní.|Místní mezipaměť není pro tento účet dostupná.|Místní mezipaměť byla vymazána.|Některé transakce mají neznámý typ nebo stav a jsou tak označeny.|Součty zahrnují jen zaúčtované částky. Čekající a zrušené částky jsou označeny zvlášť.|Původní seznam zůstává viditelný, protože se změnilo rozložení stránky.|Povolte server exportu přes ikonu rozšíření a hledejte znovu.|Hledejte podle textu, data, směru, typu, stavu a částky. Ve Statistikách vyberte měsíc a rok a zapínejte vrstvy grafu. Starší data zůstávají v tomto prohlížeči do vymazání místní mezipaměti.',
  da: 'Start en søgning for at indlæse transaktioner.|Dataene kunne ikke indlæses. Prøv igen.|Angiv et gyldigt dato- og beløbsinterval.|Højst 32 MiB pr. fil.|Højst 200.000 transaktioner.|Transaktioner gemmes lokalt. Nye og afventende transaktioner på højst 42 dage opdateres.|Lokal cache er ikke tilgængelig for denne konto.|Lokal cache ryddet.|Nogle transaktioner har ukendt type eller status og er markeret som ukendte.|Summerne omfatter kun bogførte beløb. Afventende og annullerede beløb markeres særskilt.|Den oprindelige liste forbliver synlig, fordi sidens layout er ændret.|Tillad eksportserveren via udvidelsesikonet, og søg igen.|Søg efter tekst, dato, retning, type, status og beløb. Åbn Statistik for at vælge måned og år og slå diagramlag til eller fra. Ældre data forbliver i denne browser, indtil du rydder den lokale cache.',
  ro: 'Pornește o căutare pentru a încărca tranzacțiile.|Datele nu au putut fi încărcate. Încearcă din nou.|Introdu un interval valid de date și sume.|Maximum 32 MiB per fișier.|Maximum 200.000 de tranzacții.|Tranzacțiile sunt păstrate local. Se actualizează cele noi și cele în așteptare de cel mult 42 de zile.|Memoria cache locală nu este disponibilă pentru acest cont.|Memoria cache locală a fost ștearsă.|Unele tranzacții au tipul sau starea necunoscută și sunt marcate astfel.|Totalurile includ numai sumele înregistrate. Sumele în așteptare sau anulate sunt marcate separat.|Lista originală rămâne vizibilă deoarece aspectul paginii s-a schimbat.|Permite serverul de export din pictograma extensiei și caută din nou.|Caută după text, dată, direcție, tip, stare și sumă. Deschide Statistici pentru a alege luna și anul și a activa straturile graficului. Datele vechi rămân în acest browser până la ștergerea memoriei cache locale.',
  vi: 'Bắt đầu tìm kiếm để tải giao dịch.|Không thể tải dữ liệu. Vui lòng thử lại.|Nhập khoảng ngày và số tiền hợp lệ.|Tối đa 32 MiB mỗi tệp.|Tối đa 200.000 giao dịch.|Giao dịch được lưu cục bộ. Cập nhật giao dịch mới và giao dịch đang chờ không quá 42 ngày.|Tài khoản này không dùng được bộ nhớ đệm cục bộ.|Đã xóa bộ nhớ đệm cục bộ.|Một số giao dịch không rõ loại hoặc trạng thái và được đánh dấu tương ứng.|Tổng chỉ gồm số tiền đã ghi sổ. Khoản đang chờ và đã hủy được đánh dấu riêng.|Danh sách gốc vẫn hiển thị vì bố cục trang đã thay đổi.|Cho phép máy chủ xuất dữ liệu qua biểu tượng tiện ích rồi tìm lại.|Tìm theo văn bản, ngày, chiều giao dịch, loại, trạng thái và số tiền. Mở Thống kê để chọn tháng/năm và bật tắt các lớp biểu đồ. Dữ liệu cũ được giữ trong trình duyệt này đến khi bạn xóa bộ nhớ đệm cục bộ.',
  fi: 'Aloita haku ladataksesi tapahtumat.|Tietoja ei voitu ladata. Yritä uudelleen.|Anna kelvollinen päivämäärä- ja summaväli.|Enintään 32 MiB tiedostoa kohden.|Enintään 200 000 tapahtumaa.|Tapahtumat tallennetaan paikallisesti. Uudet ja enintään 42 päivää vanhat odottavat tapahtumat päivitetään.|Paikallinen välimuisti ei ole käytettävissä tälle tilille.|Paikallinen välimuisti tyhjennetty.|Joidenkin tapahtumien tyyppi tai tila on tuntematon ja merkitty sellaiseksi.|Summat sisältävät vain kirjatut määrät. Odottavat ja perutut määrät on merkitty erikseen.|Alkuperäinen luettelo säilyy näkyvissä, koska sivun asettelu muuttui.|Salli vientipalvelin laajennuksen kuvakkeesta ja hae uudelleen.|Hae tekstin, päivämäärän, suunnan, tyypin, tilan ja summan perusteella. Avaa Tilastot, valitse kuukausi ja vuosi ja kytke kuvaajan tasoja päälle tai pois. Vanhemmat tiedot säilyvät selaimessa, kunnes tyhjennät paikallisen välimuistin.',
  el: 'Ξεκινήστε αναζήτηση για να φορτώσετε συναλλαγές.|Δεν ήταν δυνατή η φόρτωση. Δοκιμάστε ξανά.|Εισαγάγετε έγκυρο εύρος ημερομηνιών και ποσών.|Μέγιστο μέγεθος αρχείου 32 MiB.|Έως 200.000 συναλλαγές.|Οι συναλλαγές αποθηκεύονται τοπικά. Ενημερώνονται οι νέες και οι εκκρεμείς έως 42 ημερών.|Η τοπική μνήμη δεν είναι διαθέσιμη για αυτόν τον λογαριασμό.|Η τοπική μνήμη εκκαθαρίστηκε.|Ο τύπος ή η κατάσταση ορισμένων συναλλαγών είναι άγνωστα και επισημαίνονται ανάλογα.|Τα σύνολα περιλαμβάνουν μόνο καταχωρισμένα ποσά. Τα εκκρεμή και ακυρωμένα ποσά επισημαίνονται ξεχωριστά.|Η αρχική λίστα παραμένει ορατή επειδή άλλαξε η διάταξη της σελίδας.|Επιτρέψτε τον διακομιστή εξαγωγής από το εικονίδιο της επέκτασης και αναζητήστε ξανά.|Αναζητήστε με κείμενο, ημερομηνία, κατεύθυνση, τύπο, κατάσταση και ποσό. Ανοίξτε τα Στατιστικά για μήνα/έτος και ενεργοποίηση των επιπέδων. Τα παλαιότερα δεδομένα παραμένουν στο πρόγραμμα περιήγησης μέχρι να διαγράψετε την τοπική μνήμη.',
};
const extraWords = {
  en: ['Cached', 'Time zone'],
  de: ['Lokal gespeichert', 'Zeitzone'],
  es: ['En caché', 'Zona horaria'],
  it: ['In cache', 'Fuso orario'],
  ru: ['В кеше', 'Часовой пояс'],
  'zh-CN': ['已缓存', '时区'],
  fr: ['En cache', 'Fuseau horaire'],
  ar: ['مخزّن محليًا', 'المنطقة الزمنية'],
  'zh-TW': ['已快取', '時區'],
  pl: ['W pamięci', 'Strefa czasowa'],
  nl: ['In cache', 'Tijdzone'],
  nb: ['Mellomlagret', 'Tidssone'],
  pt: ['Em cache', 'Fuso horário'],
  sv: ['Cachelagrat', 'Tidszon'],
  cs: ['V mezipaměti', 'Časové pásmo'],
  da: ['I cache', 'Tidszone'],
  ro: ['În cache', 'Fus orar'],
  vi: ['Đã lưu đệm', 'Múi giờ'],
  fi: ['Välimuistissa', 'Aikavyöhyke'],
  el: ['Στη μνήμη', 'Ζώνη ώρας'],
};
const transferWords = {
  en: 'Transfers',
  de: 'Überweisungen',
  es: 'Transferencias',
  it: 'Bonifici',
  ru: 'Переводы',
  'zh-CN': '转账',
  fr: 'Virements',
  ar: 'التحويلات',
  'zh-TW': '轉帳',
  pl: 'Przelewy',
  nl: 'Overboekingen',
  nb: 'Overføringer',
  pt: 'Transferências',
  sv: 'Överföringar',
  cs: 'Převody',
  da: 'Overførsler',
  ro: 'Transferuri',
  vi: 'Chuyển khoản',
  fi: 'Tilisiirrot',
  el: 'Μεταφορές',
};
const typedDataMessages = {
  en: 'Transaction types or statuses are unavailable. Payments cannot yet be separated from transfers. Try refreshing the period.',
  de: 'Typen oder Status fehlen. Zahlungen und Überweisungen können noch nicht zuverlässig getrennt werden. Bitte den Zeitraum erneut laden.',
  es: 'Faltan tipos o estados de las operaciones. Aún no se pueden separar pagos y transferencias. Actualiza el periodo.',
  it: 'Tipi o stati delle operazioni non disponibili. Non è ancora possibile separare pagamenti e bonifici. Aggiorna il periodo.',
  ru: 'Нет достоверных типов или статусов операций. Разделить платежи и переводы пока нельзя. Попробуйте обновить период.',
  'zh-CN': '交易类型或状态不可用，暂时无法区分付款和转账。请尝试刷新该时段。',
  fr: 'Les types ou statuts des opérations sont indisponibles. Les paiements et virements ne peuvent pas encore être distingués. Actualisez la période.',
  ar: 'أنواع المعاملات أو حالاتها غير متاحة. لا يمكن فصل المدفوعات عن التحويلات بعد. حاول تحديث الفترة.',
  'zh-TW': '交易類型或狀態無法取得，暫時無法區分付款和轉帳。請嘗試重新整理該時段。',
  pl: 'Brak typów lub statusów transakcji. Nie można jeszcze oddzielić płatności od przelewów. Odśwież okres.',
  nl: 'Transactietypen of statussen ontbreken. Betalingen en overboekingen kunnen nog niet worden gescheiden. Vernieuw de periode.',
  nb: 'Transaksjonstyper eller statuser mangler. Betalinger og overføringer kan ikke skilles ennå. Oppdater perioden.',
  pt: 'Os tipos ou estados das transações não estão disponíveis. Ainda não é possível separar pagamentos e transferências. Atualize o período.',
  sv: 'Transaktionstyper eller statusar saknas. Betalningar och överföringar kan ännu inte skiljas åt. Uppdatera perioden.',
  cs: 'Chybí typy nebo stavy transakcí. Platby a převody zatím nelze oddělit. Obnovte období.',
  da: 'Transaktionstyper eller statusser mangler. Betalinger og overførsler kan endnu ikke adskilles. Opdater perioden.',
  ro: 'Tipurile sau stările tranzacțiilor lipsesc. Plățile și transferurile nu pot fi încă separate. Actualizează perioada.',
  vi: 'Chưa có loại hoặc trạng thái giao dịch đáng tin cậy. Chưa thể tách thanh toán khỏi chuyển khoản. Hãy cập nhật lại khoảng thời gian.',
  fi: 'Tapahtumien tyypit tai tilat puuttuvat. Maksuja ja tilisiirtoja ei vielä voida erottaa. Päivitä ajanjakso.',
  el: 'Οι τύποι ή οι καταστάσεις συναλλαγών δεν είναι διαθέσιμα. Οι πληρωμές και οι μεταφορές δεν μπορούν ακόμη να διαχωριστούν. Ανανεώστε την περίοδο.',
};
// Current interaction copy is shared by the page, popup and packaged help.
const interactionKeys = ['remove', 'disableHint', 'updated', 'autoError', 'noData', 'helpText'];
const interactionMessages = {
  en: [
    'Disable extension',
    'Disable on this page until it reloads.',
    'Data ready.',
    'Automatic refresh failed. Saved data was kept. Try Refresh.',
    'History loads automatically. Search can load missing periods.',
    'Open Wallet to see cached history immediately while new and unresolved transactions refresh in the background. The first load retrieves history once. Search by text, dates, direction, type, status or amount. Refresh at the top rechecks the selected date range. Statistics shows the selected year, with monthly hover details. Disable extension affects this page until reload; the local cache is kept.',
  ],
  de: [
    'Erweiterung ausschalten',
    'Auf dieser Seite bis zum Neuladen ausschalten.',
    'Daten bereit.',
    'Automatische Aktualisierung fehlgeschlagen. Gespeicherte Daten bleiben erhalten. Mit Aktualisieren erneut versuchen.',
    'Der Verlauf lädt automatisch. Suchen lädt fehlende Zeiträume.',
    'Beim Öffnen von Wallet erscheint der Cache sofort; neue und offene Buchungen werden im Hintergrund geprüft. Beim ersten Laden wird der Verlauf einmal abgerufen. Suche nach Text, Datum, Richtung, Typ, Status oder Betrag. Aktualisieren oben prüft den gewählten Datumsbereich erneut. Statistiken zeigt das gewählte Jahr; Monatsdetails erscheinen beim Überfahren. Erweiterung ausschalten gilt bis zum Neuladen; der Cache bleibt erhalten.',
  ],
  ru: [
    'Выключить расширение',
    'Выключить на этой странице до её перезагрузки.',
    'Данные готовы.',
    'Автообновление не удалось. Сохранённые данные не изменены. Повторите кнопкой «Обновить».',
    'История загружается автоматически. Поиск догрузит недостающие периоды.',
    'При открытии Wallet кеш показывается сразу, а новые и незавершённые операции проверяются в фоне. При первом запуске история загружается один раз. Ищите по тексту, датам, направлению, типу, статусу и сумме. «Обновить» сверху перепроверяет выбранный диапазон дат. Статистика показывает выбранный год; наведение раскрывает суммы по месяцам. Выключение действует до перезагрузки страницы и сохраняет кеш.',
  ],
  es: [
    'Desactivar extensión',
    'Desactivar en esta página hasta que se vuelva a cargar.',
    'Datos listos.',
    'Falló la actualización automática. Se conservaron los datos guardados. Prueba Actualizar.',
    'El historial se carga automáticamente. Buscar carga los períodos que faltan.',
    'Al abrir Wallet, el historial guardado aparece de inmediato y las operaciones nuevas o pendientes se actualizan en segundo plano. La primera carga obtiene el historial una vez. Busca por texto, fechas, dirección, tipo, estado o importe. Actualizar, arriba, vuelve a comprobar el intervalo elegido. Las estadísticas muestran el año seleccionado y detalles mensuales al pasar el cursor. La desactivación dura hasta recargar la página y conserva la caché.',
  ],
  it: [
    'Disattiva estensione',
    'Disattiva su questa pagina fino al suo ricaricamento.',
    'Dati pronti.',
    'Aggiornamento automatico non riuscito. I dati salvati sono stati conservati. Riprova con Aggiorna.',
    'La cronologia si carica automaticamente. Cerca carica i periodi mancanti.',
    'Aprendo Wallet, la cronologia in cache appare subito mentre le operazioni nuove e in sospeso vengono aggiornate in background. Il primo caricamento recupera la cronologia una volta. Cerca per testo, date, direzione, tipo, stato o importo. Aggiorna in alto ricontrolla il periodo selezionato. Le statistiche mostrano l’anno scelto e dettagli mensili al passaggio del puntatore. La disattivazione dura fino al ricaricamento della pagina e conserva la cache.',
  ],
  'zh-CN': [
    '停用扩展程序',
    '在此页面停用，重新加载后恢复。',
    '数据已就绪。',
    '自动刷新失败。已保留缓存数据，请点击刷新重试。',
    '历史记录会自动加载。搜索可加载缺失的时间段。',
    '打开钱包后会立即显示缓存记录，并在后台更新新交易和未完成交易。首次加载会获取一次历史记录。可按文字、日期、方向、类型、状态或金额搜索。顶部的刷新按钮会重新检查所选日期范围。统计显示所选年份，悬停可查看各月详情。停用仅持续到页面重新加载，缓存会保留。',
  ],
  fr: [
    'Désactiver l’extension',
    'Désactiver sur cette page jusqu’à son rechargement.',
    'Données prêtes.',
    'Échec de l’actualisation automatique. Les données enregistrées sont conservées. Réessayez avec Actualiser.',
    'L’historique se charge automatiquement. Rechercher charge les périodes manquantes.',
    'À l’ouverture de Wallet, le cache apparaît immédiatement et les opérations nouvelles ou en attente sont vérifiées en arrière-plan. Le premier chargement récupère l’historique une fois. Recherchez par texte, dates, sens, type, statut ou montant. Actualiser en haut revérifie la période choisie. Les statistiques affichent l’année sélectionnée et les détails mensuels au survol. La désactivation dure jusqu’au rechargement de la page et conserve le cache.',
  ],
  ar: [
    'تعطيل الإضافة',
    'تعطيلها في هذه الصفحة حتى إعادة تحميلها.',
    'البيانات جاهزة.',
    'تعذر التحديث التلقائي. تم الاحتفاظ بالبيانات المحفوظة. أعد المحاولة باستخدام تحديث.',
    'يتم تحميل السجل تلقائيًا. يحمّل البحث الفترات الناقصة.',
    'عند فتح المحفظة يظهر السجل المحفوظ فورًا، وتُحدّث المعاملات الجديدة وغير المكتملة في الخلفية. يُحمّل السجل كاملًا مرة واحدة في البداية. ابحث بالنص أو التاريخ أو الاتجاه أو النوع أو الحالة أو المبلغ. يعيد زر تحديث في الأعلى فحص الفترة المختارة. تعرض الإحصاءات السنة المختارة وتفاصيل الأشهر عند تمرير المؤشر. يستمر التعطيل حتى إعادة تحميل الصفحة مع الاحتفاظ بالذاكرة المحلية.',
  ],
  'zh-TW': [
    '停用擴充功能',
    '在此頁面停用，重新載入後恢復。',
    '資料已就緒。',
    '自動重新整理失敗。已保留快取資料，請按重新整理再試一次。',
    '歷史記錄會自動載入。搜尋可載入缺少的期間。',
    '開啟錢包後會立即顯示快取記錄，並在背景更新新交易和未完成交易。首次載入會取得一次歷史記錄。可依文字、日期、方向、類型、狀態或金額搜尋。頂端的重新整理會重新檢查所選日期範圍。統計顯示所選年份，停留游標可查看各月詳細資料。停用僅持續到頁面重新載入，快取會保留。',
  ],
  pl: [
    'Wyłącz rozszerzenie',
    'Wyłącz na tej stronie do jej ponownego załadowania.',
    'Dane są gotowe.',
    'Automatyczne odświeżanie nie powiodło się. Zachowano zapisane dane. Spróbuj użyć Odśwież.',
    'Historia ładuje się automatycznie. Szukaj wczytuje brakujące okresy.',
    'Po otwarciu Wallet zapisane dane pojawiają się od razu, a nowe i nierozliczone transakcje są sprawdzane w tle. Pierwsze ładowanie pobiera historię jednorazowo. Szukaj według tekstu, dat, kierunku, typu, stanu lub kwoty. Odśwież u góry ponownie sprawdza wybrany zakres dat. Statystyki pokazują wybrany rok i szczegóły miesięczne po najechaniu. Wyłączenie trwa do ponownego załadowania strony i zachowuje pamięć podręczną.',
  ],
  nl: [
    'Extensie uitschakelen',
    'Op deze pagina uitschakelen totdat deze opnieuw wordt geladen.',
    'Gegevens gereed.',
    'Automatisch vernieuwen is mislukt. Opgeslagen gegevens zijn behouden. Probeer Vernieuwen.',
    'De geschiedenis wordt automatisch geladen. Zoeken laadt ontbrekende perioden.',
    'Bij het openen van Wallet verschijnt de cache direct en worden nieuwe en openstaande transacties op de achtergrond bijgewerkt. De eerste keer wordt de geschiedenis eenmaal opgehaald. Zoek op tekst, datums, richting, type, status of bedrag. Vernieuwen bovenaan controleert het gekozen datumbereik opnieuw. Statistieken toont het gekozen jaar en maanddetails bij aanwijzen. Uitschakelen geldt tot het herladen van de pagina; de cache blijft behouden.',
  ],
  nb: [
    'Slå av utvidelsen',
    'Slå av på denne siden til den lastes inn på nytt.',
    'Dataene er klare.',
    'Automatisk oppdatering mislyktes. Lagrede data er beholdt. Prøv Oppdater.',
    'Historikken lastes automatisk. Søk henter manglende perioder.',
    'Når Wallet åpnes, vises hurtigbufferen straks mens nye og uavklarte transaksjoner sjekkes i bakgrunnen. Første lasting henter historikken én gang. Søk etter tekst, datoer, retning, type, status eller beløp. Oppdater øverst kontrollerer valgt datoperiode på nytt. Statistikken viser valgt år og månedsdetaljer ved pekerbevegelse. Avslåing varer til siden lastes på nytt; hurtigbufferen beholdes.',
  ],
  pt: [
    'Desativar extensão',
    'Desativar nesta página até voltar a carregá-la.',
    'Dados prontos.',
    'A atualização automática falhou. Os dados guardados foram mantidos. Tente Atualizar.',
    'O histórico carrega automaticamente. Pesquisar carrega os períodos em falta.',
    'Ao abrir a Wallet, a cache aparece de imediato e as operações novas ou pendentes são verificadas em segundo plano. O primeiro carregamento obtém o histórico uma vez. Pesquise por texto, datas, direção, tipo, estado ou montante. Atualizar no topo verifica novamente o período escolhido. As estatísticas mostram o ano selecionado e detalhes mensais ao passar o cursor. A desativação dura até recarregar a página e mantém a cache.',
  ],
  sv: [
    'Stäng av tillägget',
    'Stäng av på den här sidan tills den laddas om.',
    'Data är klara.',
    'Automatisk uppdatering misslyckades. Sparade data har behållits. Försök med Uppdatera.',
    'Historiken läses in automatiskt. Sök hämtar saknade perioder.',
    'När Wallet öppnas visas cachen direkt medan nya och väntande transaktioner uppdateras i bakgrunden. Första inläsningen hämtar historiken en gång. Sök på text, datum, riktning, typ, status eller belopp. Uppdatera högst upp kontrollerar valt datumintervall på nytt. Statistiken visar valt år och månadsdetaljer vid hovring. Avstängning gäller tills sidan laddas om; cachen behålls.',
  ],
  cs: [
    'Vypnout rozšíření',
    'Vypnout na této stránce do jejího opětovného načtení.',
    'Data jsou připravena.',
    'Automatická aktualizace se nezdařila. Uložená data zůstala zachována. Zkuste Aktualizovat.',
    'Historie se načítá automaticky. Hledat doplní chybějící období.',
    'Po otevření Wallet se ihned zobrazí mezipaměť a nové či nedokončené transakce se ověřují na pozadí. První načtení stáhne historii jednou. Hledejte podle textu, data, směru, typu, stavu nebo částky. Aktualizovat nahoře znovu ověří zvolené období. Statistiky ukazují vybraný rok a podrobnosti měsíců při najetí ukazatelem. Vypnutí platí do obnovení stránky a zachová mezipaměť.',
  ],
  da: [
    'Slå udvidelsen fra',
    'Slå fra på denne side, indtil den genindlæses.',
    'Data er klar.',
    'Automatisk opdatering mislykkedes. Gemte data er bevaret. Prøv Opdater.',
    'Historikken indlæses automatisk. Søg henter manglende perioder.',
    'Når Wallet åbnes, vises cachen straks, mens nye og uafsluttede transaktioner kontrolleres i baggrunden. Første indlæsning henter historikken én gang. Søg efter tekst, dato, retning, type, status eller beløb. Opdater øverst kontrollerer det valgte datointerval igen. Statistik viser det valgte år og månedsdetaljer ved markøren. Deaktivering gælder indtil genindlæsning af siden; cachen bevares.',
  ],
  ro: [
    'Dezactivează extensia',
    'Dezactivează pe această pagină până la reîncărcare.',
    'Date pregătite.',
    'Actualizarea automată a eșuat. Datele salvate au fost păstrate. Încearcă Actualizează.',
    'Istoricul se încarcă automat. Caută aduce perioadele lipsă.',
    'La deschiderea Wallet, memoria cache apare imediat, iar tranzacțiile noi și nefinalizate sunt verificate în fundal. Prima încărcare preia istoricul o singură dată. Caută după text, date, direcție, tip, stare sau sumă. Actualizează din partea de sus verifică din nou intervalul ales. Statisticile arată anul selectat și detalii lunare la trecerea cursorului. Dezactivarea durează până la reîncărcarea paginii și păstrează memoria cache.',
  ],
  vi: [
    'Tắt tiện ích',
    'Tắt trên trang này cho đến khi tải lại.',
    'Dữ liệu đã sẵn sàng.',
    'Không thể tự động làm mới. Dữ liệu đã lưu được giữ nguyên. Hãy thử Làm mới.',
    'Lịch sử được tải tự động. Tìm kiếm sẽ tải các khoảng thời gian còn thiếu.',
    'Khi mở Wallet, dữ liệu đã lưu xuất hiện ngay trong khi giao dịch mới và chưa hoàn tất được kiểm tra ở chế độ nền. Lần đầu chỉ tải lịch sử một lần. Tìm theo văn bản, ngày, chiều tiền, loại, trạng thái hoặc số tiền. Làm mới ở trên kiểm tra lại khoảng ngày đã chọn. Thống kê hiển thị năm đã chọn và chi tiết từng tháng khi di chuột. Việc tắt chỉ kéo dài đến khi tải lại trang và giữ nguyên bộ nhớ đệm.',
  ],
  fi: [
    'Poista laajennus käytöstä',
    'Poista käytöstä tällä sivulla sen uudelleenlataukseen asti.',
    'Tiedot ovat valmiit.',
    'Automaattinen päivitys epäonnistui. Tallennetut tiedot säilytettiin. Kokeile Päivitä-painiketta.',
    'Historia latautuu automaattisesti. Haku lataa puuttuvat ajanjaksot.',
    'Walletin avautuessa välimuisti näkyy heti ja uudet sekä keskeneräiset tapahtumat tarkistetaan taustalla. Ensimmäinen lataus hakee historian kerran. Hae tekstin, päivien, suunnan, tyypin, tilan tai summan mukaan. Yläreunan Päivitä tarkistaa valitun aikavälin uudelleen. Tilastot näyttävät valitun vuoden ja kuukausitiedot osoitettaessa. Käytöstä poisto kestää sivun uudelleenlataukseen; välimuisti säilyy.',
  ],
  el: [
    'Απενεργοποίηση επέκτασης',
    'Απενεργοποίηση σε αυτή τη σελίδα μέχρι την επαναφόρτωση.',
    'Τα δεδομένα είναι έτοιμα.',
    'Η αυτόματη ανανέωση απέτυχε. Τα αποθηκευμένα δεδομένα διατηρήθηκαν. Δοκιμάστε Ανανέωση.',
    'Το ιστορικό φορτώνεται αυτόματα. Η Αναζήτηση φορτώνει περιόδους που λείπουν.',
    'Με το άνοιγμα του Wallet εμφανίζεται αμέσως η προσωρινή μνήμη και οι νέες ή εκκρεμείς συναλλαγές ελέγχονται στο παρασκήνιο. Η πρώτη φόρτωση ανακτά το ιστορικό μία φορά. Αναζητήστε με κείμενο, ημερομηνίες, κατεύθυνση, τύπο, κατάσταση ή ποσό. Η Ανανέωση επάνω ελέγχει ξανά την επιλεγμένη περίοδο. Τα στατιστικά δείχνουν το επιλεγμένο έτος και μηνιαίες λεπτομέρειες με τον δείκτη. Η απενεργοποίηση ισχύει μέχρι την επαναφόρτωση και διατηρεί την προσωρινή μνήμη.',
  ],
};
export const TRANSLATIONS = Object.freeze(
  Object.fromEntries(
    Object.keys(LOCALES).map((language) => {
      const w = words[language].split('|'),
        m = messages[language].split('|');
      if (
        w.length !== wordKeys.length ||
        m.length !== messageKeys.length ||
        interactionMessages[language]?.length !== interactionKeys.length
      )
        throw new Error(`Translation key count: ${language}`);
      return [
        language,
        Object.freeze(
          Object.fromEntries([
            ...wordKeys.map((key, i) => [key, w[i]]),
            ...messageKeys.map((key, i) => [key, m[i]]),
            ['cached', extraWords[language][0]],
            ['timeZone', extraWords[language][1]],
            ['transfers', transferWords[language]],
            ['typedDataMissing', typedDataMessages[language]],
            ...interactionKeys.map((key, i) => [key, interactionMessages[language][i]]),
          ]),
        ),
      ];
    }),
  ),
);
export function resolveLanguage(value) {
  const normalized = String(value || '')
    .toLowerCase()
    .replaceAll('_', '-');
  if (normalized.startsWith('zh')) return /tw|hk|hant/.test(normalized) ? 'zh-TW' : 'zh-CN';
  const base = normalized.split('-')[0];
  return base === 'no' || base === 'nn' ? 'nb' : Object.hasOwn(LOCALES, base) ? base : 'en';
}
export function detectSiteLanguage(document, navigator) {
  const explicit =
    document.documentElement.lang ||
    document.querySelector('meta[http-equiv="content-language"]')?.content;
  if (explicit) return resolveLanguage(explicit);
  for (const script of [...document.scripts].reverse()) {
    const match = script.src.match(/\/web-client-locales\/([\w-]+)\.js(?:[?#]|$)/i);
    if (match) return resolveLanguage(match[1]);
  }
  const academy = document
    .querySelector('a[href*="/academy"]')
    ?.getAttribute('href')
    ?.match(/\/([a-z-]+)\/academy/i);
  if (academy) return resolveLanguage(academy[1]);
  const labels = [
    document.querySelector('et-wallet-account-balance')?.textContent,
    document.querySelector('et-wallet-account-group-txn-header')?.textContent,
  ].join(' ');
  if (/Exportieren|EUR-Konto/.test(labels)) return 'de';
  if (/Экспорт|Сч[её]т/.test(labels)) return 'ru';
  return resolveLanguage(navigator.language);
}
export const translate = (language, key) => {
  const dictionary = TRANSLATIONS[resolveLanguage(language)] || TRANSLATIONS.en;
  return Object.hasOwn(dictionary, key) ? dictionary[key] : key;
};
