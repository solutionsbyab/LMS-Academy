(function(){
  // ============================================================
  // MONTHLY TIMETABLE — driven by a published Google Sheet CSV.
  //
  // Setup (staff-facing, do this once):
  // 1. Make a Google Sheet with ONE tab, exactly these column
  //    headers in row 1 (any order, case-insensitive):
  //      Date | Title | Time | Notes | Status
  //    Date: YYYY-MM-DD (e.g. 2026-10-14) or DD/MM/YYYY.
  //    Status: leave blank for a normal session, or use
  //      Cancelled / Extra / Closed
  // 2. File > Share > Publish to web > choose that sheet/tab >
  //    format "Comma-separated values (.csv)" > Publish.
  // 3. Paste the generated URL below as SHEET_CSV_URL.
  //
  // IMPORTANT: "Publish to web" makes that sheet/tab readable by
  // anyone with the link, with no login. Use a dedicated sheet
  // for this timetable only — never a shared admin spreadsheet
  // with other tabs on it. If that's not acceptable, this needs
  // a small Cloudflare Worker proxy instead of a direct publish;
  // ask for that build if so.
  // ============================================================
  var SHEET_CSV_URL = "PASTE_YOUR_PUBLISHED_CSV_URL_HERE";

  var stateEl = document.getElementById('month-state');
  var listEl  = document.getElementById('month-list');
  var headingEl = document.getElementById('month-heading');

  function setState(msg){ if (stateEl) stateEl.textContent = msg || ''; }

  function parseCSV(text){
    var rows = [], row = [], field = '', inQuotes = false;
    for (var i = 0; i < text.length; i++){
      var c = text[i];
      if (inQuotes){
        if (c === '"'){
          if (text[i+1] === '"'){ field += '"'; i++; } else { inQuotes = false; }
        } else field += c;
      } else {
        if (c === '"') inQuotes = true;
        else if (c === ',') { row.push(field); field = ''; }
        else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
        else if (c === '\r') { /* ignore */ }
        else field += c;
      }
    }
    if (field.length || row.length){ row.push(field); rows.push(row); }
    return rows.filter(function(r){ return r.some(function(f){ return f.trim() !== ''; }); });
  }

  function parseRowDate(s){
    s = (s || '').trim();
    var iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (iso) return new Date(+iso[1], +iso[2]-1, +iso[3]);
    var uk = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (uk) return new Date(+uk[3], +uk[2]-1, +uk[1]);
    return null;
  }

  function rowsToObjects(rows){
    if (!rows.length) return [];
    var headers = rows[0].map(function(h){ return h.trim().toLowerCase(); });
    return rows.slice(1).map(function(r){
      var o = {};
      headers.forEach(function(h, idx){ o[h] = (r[idx] || '').trim(); });
      return o;
    });
  }

  function render(events){
    var now = new Date();
    if (headingEl){
      var monthName = now.toLocaleDateString('en-GB', { month: 'long' });
      headingEl.textContent = "What's on in " + monthName + ".";
    }

    var thisMonth = events
      .map(function(e){ return { data: e, d: parseRowDate(e.date) }; })
      .filter(function(x){ return x.d && x.d.getFullYear() === now.getFullYear() && x.d.getMonth() === now.getMonth(); })
      .sort(function(a, b){ return a.d - b.d; });

    if (!thisMonth.length){
      setState('No extra sessions scheduled this month — see the regular weekly programme above.');
      return;
    }
    setState('');
    listEl.innerHTML = '';
    thisMonth.forEach(function(x){
      var e = x.data, d = x.d;
      var status = (e.status || '').trim().toLowerCase();
      var li = document.createElement('li');
      li.className = 'month-row' + (status === 'cancelled' ? ' is-cancelled' : '') + (status === 'closed' ? ' is-closed' : '');

      var day = document.createElement('span');
      day.className = 'month-day';
      var weekdayShort = d.toLocaleDateString('en-GB', { weekday: 'short' });
      day.textContent = (weekdayShort + ' ' + d.getDate()).toUpperCase();

      var main = document.createElement('span');
      var title = document.createElement('h3');
      title.className = 'fixture-title';
      title.textContent = e.title || 'Session';
      var meta = document.createElement('span');
      meta.className = 'fixture-meta';
      meta.textContent = [e.time, e.notes].filter(Boolean).join(' · ');
      main.appendChild(title);
      main.appendChild(meta);

      var tag = document.createElement('span');
      var tagWord = status === 'cancelled' ? 'Cancelled' : status === 'extra' ? 'Extra' : status === 'closed' ? 'Closed' : '';
      tag.className = 'fixture-status' + (tagWord ? ' month-tag-' + status : '');
      tag.textContent = tagWord;

      li.appendChild(day); li.appendChild(main); li.appendChild(tag);
      listEl.appendChild(li);
    });
  }

  if (!SHEET_CSV_URL || SHEET_CSV_URL.indexOf('PASTE_YOUR') === 0){
    if (headingEl){
      headingEl.textContent = "What's on in " + new Date().toLocaleDateString('en-GB', { month: 'long' }) + ".";
    }
    setState("This month's calendar isn't connected yet — see the regular weekly programme above.");
  } else {
    setState('Loading this month\u2019s calendar…');
    fetch(SHEET_CSV_URL)
      .then(function(res){ if (!res.ok) throw new Error('fetch failed'); return res.text(); })
      .then(function(text){ render(rowsToObjects(parseCSV(text))); })
      .catch(function(){ setState("This month's calendar is being updated — check back soon, or see the weekly programme above."); });
  }
})();
