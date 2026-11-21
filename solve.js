// Fast drop-in for csv-reader 1.0.0 (make.fun csv-reader-speed-01).
// Same answer for every input {text, header}: {columns, rows, errors}.
// Method: one left-to-right pass. Plain fields are taken with native
// indexOf/slice (no per-character loop, no per-character string
// concatenation); quoted fields are taken with indexOf('"') and slices,
// only building pieces when a doubled quote or a CR/LF inside quotes
// forces it. Slow work runs only on the rare broken bits: a stray CR
// in an unquoted field, a CR/LF inside a quoted field.
// Every search is bounded by the field/record being read: no
// indexOf is ever allowed to run past the next comma or line break,
// which is what makes the naive version slow on LF files.
// Nothing is cached from one case to the next; run() is pure.

const COMMA = 0;
const LINE = 1;
const END = 2;

export function run(input) {
  const text = String(input.text);
  const header = input.header === true;
  const len = text.length;
  const errors = [];
  const rows = [];
  let columns = null;
  let width = -1;
  let pos = 0;
  let line = 1;
  if (len !== 0 && text.charCodeAt(0) === 0xfeff) pos = 1;

  // The record being read, for error records.
  let recordLine = 1;
  let recordRow = null;
  // Result of the last field read, set by readUnquoted/readQuoted
  // (no per-field array allocation).
  let fValue = '';
  let fEnded = END;
  let fAdded = 0;
  // Position of the next LF at or after pos, -1 when unknown.
  // Valid across the unquoted fields of one record: a quoted field
  // may cross it, so quoted reads invalidate it.
  let nextNL = -1;

  // Convert a quoted-field slice: CRLF and lone CR each become one
  // LF, LF stays LF. Returns [string, lineDelta]. Only called when
  // the slice holds a CR or an LF (rare).
  function convertStr(s) {
    let out = '';
    let delta = 0;
    let start = 0;
    let i = 0;
    while (i < s.length) {
      const c = s.charCodeAt(i);
      if (c === 13) {
        out += s.slice(start, i);
        out += '\n';
        delta += 1;
        i += i + 1 < s.length && s.charCodeAt(i + 1) === 10 ? 2 : 1;
        start = i;
      } else if (c === 10) {
        delta += 1;
        i += 1;
      } else {
        i += 1;
      }
    }
    out += s.slice(start);
    return [out, delta];
  }

  // Read an unquoted field starting at pos, with initial value `init`.
  // Sets fValue, fEnded, fAdded.
  function readUnquoted(init) {
    const comma = text.indexOf(',', pos);
    if (nextNL === -1 || nextNL < pos) nextNL = text.indexOf('\n', pos);
    const nl = nextNL;
    let end;
    let ended;
    if (comma === -1 && nl === -1) {
      end = len;
      ended = END;
    } else if (comma === -1) {
      end = nl;
      ended = LINE;
    } else if (nl === -1) {
      end = comma;
      ended = COMMA;
    } else if (comma < nl) {
      end = comma;
      ended = COMMA;
    } else {
      end = nl;
      ended = LINE;
    }
    const slice = text.slice(pos, end);
    const cr = slice.indexOf('\r');
    let value;
    let added;
    if (cr === -1) {
      value = init === '' ? slice : init + slice;
      added = slice.length;
    } else if (ended === LINE && cr === slice.length - 1 && slice.indexOf('\r', cr + 1) === -1) {
      // CRLF terminator: the trailing CR is the terminator, not data.
      value = init === '' ? slice.slice(0, -1) : init + slice.slice(0, -1);
      added = slice.length - 1;
    } else {
      // Stray CRs inside the field: drop each (error), except a
      // trailing CR that is a CRLF terminator (not an error).
      const trailingCr = ended === LINE && slice.length > 0 && slice.charCodeAt(slice.length - 1) === 13;
      const limit = trailingCr ? slice.length - 1 : slice.length;
      let out = '';
      let start = 0;
      let i = 0;
      while (i < limit) {
        const j = slice.indexOf('\r', i);
        if (j === -1 || j >= limit) break;
        out += slice.slice(start, j);
        errors.push({ code: 'stray_cr', line: recordLine, row: recordRow });
        i = j + 1;
        start = i;
      }
      out += slice.slice(start, limit);
      value = init === '' ? out : init + out;
      added = out.length;
    }
    if (ended === LINE) {
      pos = end + 1;
      line += 1;
      nextNL = -1;
    } else if (ended === COMMA) {
      pos = end + 1;
    } else {
      pos = end;
      nextNL = -1;
    }
    fValue = value;
    fEnded = ended;
    fAdded = added;
  }

  // Read a quoted field whose opening quote is at pos.
  // Sets fValue, fEnded, fAdded.
  function readQuoted() {
    nextNL = -1;
    const open = pos;
    const openLine = line;
    let qLine = line;
    let pieces = null;
    let segStart = pos + 1;
    let cur = pos + 1;
    let value;
    for (;;) {
      const q = text.indexOf('"', cur);
      if (q === -1) {
        // Never closes: the quote is literal, text after it is
        // read again as unquoted.
        pos = open + 1;
        line = openLine;
        errors.push({ code: 'unterminated_quote', line: recordLine, row: recordRow });
        readUnquoted('"');
        return;
      }
      if (q + 1 < len && text.charCodeAt(q + 1) === 34) {
        // Doubled quote: one literal quote, keep scanning.
        const seg = text.slice(segStart, q);
        if (seg.indexOf('\r') === -1 && seg.indexOf('\n') === -1) {
          if (pieces === null) pieces = [];
          pieces.push(seg + '"');
        } else {
          const [conv, delta] = convertStr(seg);
          qLine += delta;
          if (pieces === null) pieces = [];
          pieces.push(conv + '"');
        }
        segStart = q + 2;
        cur = q + 2;
        continue;
      }
      // Closing quote at q.
      const seg = text.slice(segStart, q);
      if (seg.indexOf('\r') === -1 && seg.indexOf('\n') === -1) {
        value = pieces === null ? seg : pieces.join('') + seg;
      } else {
        const [conv, delta] = convertStr(seg);
        qLine += delta;
        value = pieces === null ? conv : pieces.join('') + conv;
      }
      line = qLine;
      pos = q + 1;
      break;
    }
    if (pos >= len) {
      fValue = value;
      fEnded = END;
      fAdded = 0;
      return;
    }
    const c = text.charCodeAt(pos);
    if (c === 44) {
      pos += 1;
      fValue = value;
      fEnded = COMMA;
      fAdded = 0;
      return;
    }
    if (c === 10) {
      pos += 1;
      line += 1;
      fValue = value;
      fEnded = LINE;
      fAdded = 0;
      return;
    }
    if (c === 13 && pos + 1 < len && text.charCodeAt(pos + 1) === 10) {
      pos += 2;
      line += 1;
      fValue = value;
      fEnded = LINE;
      fAdded = 0;
      return;
    }
    // Junk after the closing quote, appended as it stands.
    readUnquoted(value);
    if (fAdded > 0) errors.push({ code: 'quote_junk', line: recordLine, row: recordRow });
  }

  for (;;) {
    while (pos < len) {
      const c = text.charCodeAt(pos);
      if (c === 10) {
        pos += 1;
        line += 1;
      } else if (c === 13 && pos + 1 < len && text.charCodeAt(pos + 1) === 10) {
        pos += 2;
        line += 1;
      } else {
        break;
      }
    }
    if (pos >= len) break;

    recordLine = line;
    recordRow = header && columns === null ? null : rows.length;
    const fields = [];
    let quoted = false;
    // Fast record path: no quote and no stray CR in this record.
    // One slice + two bounded indexOf calls per record, then plain
    // comma splits, instead of a function call per field.
    {
      if (nextNL === -1 || nextNL < pos) nextNL = text.indexOf('\n', pos);
      const nl = nextNL;
      const recEnd = nl === -1 ? len : nl;
      const rec = text.slice(pos, recEnd);
      // A trailing CR is a CRLF terminator only when an LF follows
      // it; at the end of the text it is a stray CR, not a terminator.
      const crlf = nl !== -1 && rec.length > 0 && rec.charCodeAt(rec.length - 1) === 13;
      const body = crlf ? rec.slice(0, -1) : rec;
      if (body.indexOf('"') === -1 && body.indexOf('\r') === -1) {
        let start = 0;
        for (;;) {
          const comma = body.indexOf(',', start);
          if (comma === -1) {
            fields.push(body.slice(start));
            break;
          }
          fields.push(body.slice(start, comma));
          start = comma + 1;
        }
        pos = nl === -1 ? len : nl + 1;
        if (nl !== -1) line += 1;
        nextNL = -1;
      } else {
        nextNL = nl;
        do {
          quoted = text.charCodeAt(pos) === 34;
          if (quoted) readQuoted();
          else readUnquoted('');
          fields.push(fValue);
        } while (fEnded === COMMA);
      }
    }

    // A line left with no characters (only stray CRs) is no record.
    if (fields.length === 1 && fields[0] === '' && !quoted) continue;

    if (width < 0) width = fields.length;
    if (header && columns === null) {
      columns = fields;
      continue;
    }
    if (fields.length < width) {
      errors.push({ code: 'short_row', line: recordLine, row: recordRow, fields: fields.length });
      while (fields.length < width) fields.push('');
    } else if (fields.length > width) {
      errors.push({ code: 'long_row', line: recordLine, row: recordRow, extra: fields.splice(width) });
    }
    rows.push(fields);
  }
  return { columns: header ? columns ?? [] : null, rows, errors };
}
