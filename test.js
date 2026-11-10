// Logic check for app.js without a browser: loads data.js and app.js into a stubbed page, then runs checks() in app.js's own scope.
// Run: node test.js   (prints "ok", exit 0)
const fs = require("fs"), vm = require("vm"), path = require("path");
const read = (f) => fs.readFileSync(path.join(__dirname, f), "utf8");
// html`` becomes plain text, so a component's output can be searched for a title or an exercise name.
const txt = (v) => Array.isArray(v) ? v.map(txt).join("") : v == null || v === false || typeof v === "function" ? "" : String(v);
const store = {};
const ctx = {
  console, setTimeout, assert: require("assert"),
  htmPreact: { html: (s, ...v) => s.reduce((a, x, i) => a + x + (i < v.length ? txt(v[i]) : ""), ""), render(){}, useState: (x) => [x, () => {}], useEffect(){}, useReducer: () => [0, () => {}], useRef: () => ({}) },
  localStorage: { getItem: (k) => k in store ? store[k] : null, setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } },
  addEventListener(){}, scrollTo(){}, navigator: {}, location: { protocol: "file:" },
  document: { hidden: false, addEventListener(){}, getElementById: () => null, querySelectorAll: () => [], documentElement: { dataset: {}, removeAttribute(){} } },
};
ctx.window = ctx;
vm.createContext(ctx);
vm.runInContext(read("data.js"), ctx);

function checks(){
  const planned = dayName(today()), other = Object.keys(PROGRAM).find((d) => d !== planned), nav = {go(){}, settings(){}};
  const saved = () => JSON.parse(localStorage.getItem(LS));

  // No pick: the weekday decides.
  assert.strictEqual(activeDay(), planned);

  // A pick switches Gym and Today to that session and is saved.
  pickDay(other);
  assert.strictEqual(activeDay(), other);
  assert.deepStrictEqual(saved().pick, {date: today(), day: other});
  const rec = session(activeDay());
  assert.strictEqual(rec.day, other);
  assert.deepStrictEqual(rec.exercises.map((e) => e.name), PROGRAM[other].ex.map((e) => e[0]));
  assert.ok(Gym({nav}).includes(PROGRAM[other].ex[0][0]), "Gym shows the picked session's first exercise");
  assert.ok(Gym({nav}).includes("selected=true>" + PROGRAM[other].title), "the select shows the pick");
  assert.ok(Today({nav}).includes(PROGRAM[other].title), "Today shows the picked session");

  // A ticked set is saved under today's date and the picked session.
  tick(rec, 0, 0);
  assert.ok(saved().lifts.some((s) => s.date === today() && s.day === other && s.exercises[0].sets[0].done));

  // Switching away and back keeps the ticked set.
  const third = Object.keys(PROGRAM).find((d) => d !== planned && d !== other);
  pickDay(third); assert.strictEqual(session(activeDay()).day, third);
  pickDay(other); assert.strictEqual(session(activeDay()), rec);

  // The pick survives a reload of the saved data.
  assert.deepStrictEqual(norm(saved()).pick, {date: today(), day: other});

  // Yesterday's pick, an unknown session and a cleared pick all fall back to the weekday.
  DB.pick = {date: "2000-01-01", day: other}; assert.strictEqual(activeDay(), planned);
  DB.pick = {date: today(), day: "Nope"}; assert.strictEqual(activeDay(), planned);
  pickDay(other); pickDay(""); assert.strictEqual(activeDay(), planned); assert.ok(!("pick" in saved()));

  console.log("ok");
}
vm.runInContext(read("app.js") + "\n;(" + checks + ")();", ctx);
