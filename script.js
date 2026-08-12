const A = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const R1 = "EKMFLGDQVZNTOWYHXUSPAIBRCJ";
const R2 = "AJDKSIRUXBLHWTMCQGZNPYFVOE";
const R3 = "BDFHJLCPRTXVZNYEIWGAKMUSQO";

const mirror = {
  A:"M",M:"A", B:"N",N:"B", C:"O",O:"C", D:"P",P:"D", E:"Q",Q:"E",
  F:"R",R:"F", G:"S",S:"G", H:"T",T:"H", I:"U",U:"I", J:"V",V:"J",
  K:"W",W:"K", L:"X",X:"L", Y:"Z",Z:"Y"
};

const polish = {
  Ą:"A",Ć:"C",Ę:"E",Ł:"L",Ń:"N",Ó:"O",Ś:"S",Ź:"Z",Ż:"Z"
};

function clean(s) {
  s = [...s.toUpperCase()].map(c => polish[c] || c).join("");
  return [...s].filter(c => A.includes(c)).join("");
}

function invRotor(r) {
  let inv = Array(26);
  [...r].forEach((c,i) => inv[A.indexOf(c)] = A[i]);
  return inv.join("");
}

function shift(c,n) {
  return A[(A.indexOf(c) + n + 260) % 26];
}

class Rotor {
  constructor(wiring, pos) {
    this.w = wiring;
    this.inv = invRotor(wiring);
    this.pos = A.indexOf(pos);
  }
  rotate(n=1) { this.pos = (this.pos + n + 26) % 26; }
  forward(c) {
    const i = (A.indexOf(c) + this.pos) % 26;
    const m = this.w[i];
    return A[(A.indexOf(m) - this.pos + 26) % 26];
  }
  backward(c) {
    const i = (A.indexOf(c) + this.pos) % 26;
    const m = this.inv[i];
    return A[(A.indexOf(m) - this.pos + 26) % 26];
  }
}

function parseKey(key) {
  const m = key.trim().toUpperCase().match(/^([A-Z]{3})-(\d{3})-(\d{2})$/);
  if (!m) throw new Error("Klucz musi mieć format AAA-000-00, np. KOT-731-04.");
  const step = Number(m[3]);
  if (step === 0) throw new Error("Skok Feniksa nie może wynosić 00.");
  return { pos:m[1], shifts:[+m[2][0], +m[2][1], +m[2][2]], step };
}

function transform(text, key, decrypting) {
  const k = parseKey(key);
  const r1 = new Rotor(R1, k.pos[0]);
  const r2 = new Rotor(R2, k.pos[1]);
  const r3 = new Rotor(R3, k.pos[2]);
  let dir = 1, n = 0, r1c = 0, r2c = 0, out = [];

  for (const c0 of text.toUpperCase()) {
    if (!A.includes(c0)) continue;
    r1.rotate(dir); r1c++;
    if (r1c >= 26) {
      r1c = 0; r2.rotate(dir); r2c++;
      if (r2c >= 26) { r2c = 0; r3.rotate(dir); }
    }

    let c = c0;
    if (decrypting) {
      c = mirror[c];
      c = shift(c, -k.shifts[n % 3]);
      c = r3.backward(c); c = r2.backward(c); c = r1.backward(c);
    } else {
      c = r1.forward(c); c = r2.forward(c); c = r3.forward(c);
      c = shift(c, k.shifts[n % 3]);
      c = mirror[c];
    }

    out.push(c); n++;
    if (n % k.step === 0) dir *= -1;
  }
  return out.join("");
}

const input = document.querySelector("#input");
const output = document.querySelector("#output");
const key = document.querySelector("#key");
const status = document.querySelector("#status");

function run(fn) {
  try {
    if (!input.value.trim()) throw new Error("Wpisz wiadomość.");
    output.value = fn(input.value, key.value);
    status.textContent = "Gotowe ✓";
  } catch(e) {
    status.textContent = "";
    alert(e.message);
  }
}

document.querySelector("#encrypt").onclick = () => run(transform);
document.querySelector("#decrypt").onclick = () => run((t,k) => transform(t,k,true));

document.querySelector("#clear").onclick = () => {
  input.value = ""; output.value = ""; status.textContent = "";
};

document.querySelector("#copy").onclick = async () => {
  if (!output.value) return alert("Najpierw wygeneruj wynik.");
  await navigator.clipboard.writeText(output.value);
  status.textContent = "Skopiowano ✓";
};

document.querySelector("#share").onclick = async () => {
  if (!output.value) return alert("Najpierw zaszyfruj wiadomość.");
  const url = new URL(location.href);
  url.hash = new URLSearchParams({
    m: output.value,
    k: key.value.toUpperCase()
  }).toString();

  try {
    await navigator.clipboard.writeText(url.toString());
    status.textContent = "Link skopiowany ✓";
  } catch {
    prompt("Skopiuj ten link:", url.toString());
  }
};

(function loadFromLink() {
  if (!location.hash) return;
  try {
    const p = new URLSearchParams(location.hash.slice(1));
    if (p.get("m")) output.value = p.get("m");
    if (p.get("k")) key.value = p.get("k");
    if (p.get("m")) status.textContent = "Wczytano wiadomość z linku ✓";
  } catch {}
})();
