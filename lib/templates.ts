import { ProjectFile, TemplateKey } from "./types";

const file = (name: string, content: string): ProjectFile => ({ id: crypto.randomUUID(), name, kind: "file", content, updatedAt: new Date().toISOString() });

export const templateMeta: Record<TemplateKey, { title: string; subtitle: string; glyph: string; color: string }> = {
  blank: { title: "Blank web project", subtitle: "A clean HTML, CSS & JS starter", glyph: "⌘", color: "violet" },
  portfolio: { title: "Portfolio", subtitle: "A personal site with responsive sections", glyph: "✦", color: "pink" },
  landing: { title: "Landing page", subtitle: "A compelling product launch page", glyph: "↗", color: "orange" },
  app: { title: "JavaScript app", subtitle: "An interactive task app starter", glyph: "◉", color: "blue" }
};

export function makeTemplate(template: TemplateKey): ProjectFile[] {
  if (template === "portfolio") return [
    file("index.html", `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="Mira is a designer and developer creating thoughtful identities and websites." />
    <title>Mira — Designer & developer</title>
    <link rel="stylesheet" href="style.css" />
  </head>
  <body>
    <main>
      <nav>
        <a class="brand" href="#home">mira.</a>
        <div>
          <a href="#about">About</a>
          <a href="#work">Work</a>
          <a href="#contact">Contact</a>
        </div>
      </nav>

      <section id="home" class="hero">
        <p class="eyebrow">Designer & developer</p>
        <h1>Making digital<br /><em>things matter.</em></h1>
        <a class="button" href="#work">Explore my work <span>↘</span></a>
      </section>

      <section id="about" class="split">
        <p class="eyebrow">About me</p>
        <h2>I build thoughtful identities and websites for people with a story to tell.</h2>
      </section>

      <section id="work" class="work">
        <p class="eyebrow">Selected work</p>
        <article>
          <span>01</span>
          <h3>Forma studio</h3>
          <b>Brand & web</b>
        </article>
        <article>
          <span>02</span>
          <h3>Arc journal</h3>
          <b>Editorial</b>
        </article>
      </section>

      <footer id="contact">
        <h2>Have a good idea?</h2>
        <a href="mailto:hello@example.com">Let’s talk ↗</a>
      </footer>
    </main>

    <script src="script.js"><\/script>
  </body>
</html>`),
    file("style.css", `@import url('https://fonts.googleapis.com/css2?family=DM+Mono&family=Playfair+Display:ital,wght@0,600;1,600&display=swap');

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  background: #f3f0e9;
  color: #17211f;
  font: 15px 'DM Mono', monospace;
}

main {
  max-width: 1200px;
  margin: auto;
  padding: 0 6vw;
}

nav {
  height: 100px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

nav div {
  display: flex;
}

nav a {
  color: inherit;
  text-decoration: none;
  margin-left: 24px;
}

.brand {
  font: 700 28px Georgia !important;
  margin: 0 !important;
}

.hero {
  min-height: 660px;
  padding: 130px 0;
}

.eyebrow {
  text-transform: uppercase;
  font-size: 11px;
  letter-spacing: .12em;
  color: #717a72;
}

h1,
h2 {
  font: 600 clamp(52px, 8vw, 112px) / .94 'Playfair Display', serif;
  letter-spacing: -.06em;
  margin: 20px 0 48px;
}

em {
  color: #a34f36;
}

.button {
  display: inline-flex;
  gap: 34px;
  align-items: center;
  padding: 17px 22px;
  background: #17211f;
  color: #fff;
  text-decoration: none;
}

.split {
  border-top: 1px solid #a7aaa1;
  padding: 80px 0 150px;
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 30px;
}

.split h2 {
  font-size: clamp(32px, 5vw, 65px);
  margin: 0;
}

.work {
  padding: 70px 0;
}

.work article {
  display: grid;
  grid-template-columns: 80px 1fr 180px;
  align-items: center;
  padding: 32px 0;
  border-bottom: 1px solid #a7aaa1;
}

.work h3 {
  font: 600 42px 'Playfair Display', serif;
  margin: 0;
}

footer {
  background: #cc704f;
  margin: 80px -6vw 0;
  padding: 90px 6vw;
}

footer h2 {
  font-size: clamp(45px, 7vw, 90px);
  margin: 0 0 25px;
}

footer a {
  color: #17211f;
  font-size: 20px;
}

@media (max-width: 650px) {
  nav div a {
    margin-left: 10px;
    font-size: 11px;
  }

  .split {
    grid-template-columns: 1fr;
  }

  .work article {
    grid-template-columns: 45px 1fr;
  }

  .work b {
    display: none;
  }
}`),
    file("script.js", `document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener("click", event => {
    event.preventDefault();

    document.querySelector(link.getAttribute("href")).scrollIntoView({
      behavior: "smooth"
    });
  });
});`)
  ];

  if (template === "landing") return [
    file("index.html", `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="Orbit is a calmer way to organize creative work." />
    <title>Orbit — Better ideas, beautifully organized</title>
    <link rel="stylesheet" href="style.css" />
  </head>
  <body>
    <header>
      <a class="logo" href="#top">orbit</a>
      <nav aria-label="Main navigation">
        <a href="#features">Features</a>
        <a href="#pricing">Pricing</a>
      </nav>
      <button type="button" data-waitlist>Join the waitlist</button>
    </header>

    <main id="top">
      <section class="hero">
        <p>MAKE SPACE FOR BETTER IDEAS</p>
        <h1>Your work, in<br /><i>perfect orbit.</i></h1>
        <p class="lede">Orbit is a calmer way to organize your creative work, from first spark to final share.</p>
        <button class="primary" type="button" data-waitlist>Start creating <span>→</span></button>
        <p class="signup-message" id="signup-message" role="status" hidden></p>
        <div class="planet">✦</div>
      </section>

      <section id="features" class="features">
        <p>BUILT FOR FLOW</p>
        <h2>Everything you need.<br />Nothing in your way.</h2>
        <div>
          <article>
            <b>01</b>
            <h3>Capture it all</h3>
            <p>Save every thought before it slips away.</p>
          </article>
          <article>
            <b>02</b>
            <h3>Find your focus</h3>
            <p>Make space for what deserves attention.</p>
          </article>
          <article>
            <b>03</b>
            <h3>Share beautifully</h3>
            <p>Turn your process into something tangible.</p>
          </article>
        </div>
      </section>

      <section id="pricing" class="pricing">
        <p>START SIMPLE</p>
        <h2>One plan. Plenty of room.</h2>
        <p class="pricing-lede">Everything in Orbit is designed to keep your next idea moving.</p>
        <article class="pricing-card">
          <b>ORBIT EARLY ACCESS</b>
          <strong>Free while we build</strong>
          <span>Join the waitlist to be first in line for the launch.</span>
          <button type="button" data-waitlist>Join the waitlist</button>
        </article>
      </section>
    </main>

    <footer>orbit <span>© 2024</span></footer>

    <script src="script.js"><\/script>
  </body>
</html>`),
    file("style.css", `@import url('https://fonts.googleapis.com/css2?family=DM+Mono&family=Manrope:wght@400;500;700&display=swap');

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  background: #10100f;
  color: #f4f0e9;
  font-family: Manrope, sans-serif;
}

header {
  height: 82px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 5vw;
  border-bottom: 1px solid #393936;
}

.logo {
  font: 700 24px Georgia;
  color: #f4f0e9;
  text-decoration: none;
}

nav {
  display: flex;
  gap: 30px;
}

nav a {
  color: #b2b0aa;
  text-decoration: none;
  font-size: 14px;
}

button {
  font: inherit;
  border: 0;
  padding: 12px 17px;
  background: #e3e0d6;
  color: #151512;
  cursor: pointer;
}

.hero {
  text-align: center;
  padding: 90px 20px 0;
  overflow: hidden;
}

.hero > p:first-child,
.features > p {
  font: 11px 'DM Mono';
  letter-spacing: .12em;
  color: #aca9a1;
}

.hero h1 {
  font-size: clamp(60px, 10vw, 130px);
  line-height: .91;
  letter-spacing: -.08em;
  margin: 24px 0;
}

i {
  font-family: Georgia, serif;
  font-weight: 400;
  color: #c8ff75;
}

.lede {
  color: #aeadab;
  max-width: 440px;
  margin: 0 auto 28px;
  line-height: 1.6;
}

.primary {
  background: #c8ff75;
  padding: 16px 20px;
}

.primary span {
  margin-left: 28px;
}

.signup-message {
  margin: 16px auto 0;
  color: #c8ff75;
  font-size: 13px;
}

.planet {
  width: min(64vw, 650px);
  height: min(33vw, 330px);
  margin: 80px auto -110px;
  background: radial-gradient(circle at 42% 35%, #d5ff91, #76a75e 40%, #2c472d 70%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 80px;
  color: #edffcc;
  box-shadow: 0 -20px 100px #a8e66a44;
}

.features {
  background: #e3e0d6;
  color: #151512;
  padding: 100px 7vw;
}

.features h2 {
  font-size: clamp(38px, 5vw, 70px);
  line-height: 1;
  letter-spacing: -.07em;
}

.features > div {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 40px;
  margin-top: 90px;
}

.features article {
  border-top: 1px solid #a4a198;
  padding-top: 18px;
}

.features b {
  font: 12px 'DM Mono';
}

.features h3 {
  font-size: 22px;
  margin-bottom: 7px;
}

.features article p {
  color: #64615b;
  line-height: 1.5;
}

.pricing {
  padding: 100px 7vw;
  text-align: center;
}

.pricing > p:first-child {
  font: 11px 'DM Mono';
  letter-spacing: .12em;
  color: #aca9a1;
}

.pricing h2 {
  max-width: 650px;
  margin: 20px auto 14px;
  font-size: clamp(38px, 5vw, 70px);
  line-height: 1;
  letter-spacing: -.07em;
}

.pricing-lede {
  max-width: 460px;
  margin: 0 auto;
  color: #aeadab;
  line-height: 1.6;
}

.pricing-card {
  max-width: 440px;
  margin: 42px auto 0;
  padding: 30px;
  border: 1px solid #393936;
}

.pricing-card b,
.pricing-card span {
  display: block;
}

.pricing-card b {
  font: 11px 'DM Mono';
  letter-spacing: .12em;
  color: #aca9a1;
}

.pricing-card strong {
  display: block;
  margin: 15px 0 8px;
  font-size: 24px;
}

.pricing-card span {
  color: #aeadab;
  line-height: 1.6;
}

.pricing-card button {
  margin-top: 22px;
  background: #c8ff75;
}

footer {
  padding: 25px 5vw;
  display: flex;
  justify-content: space-between;
}

@media (max-width: 600px) {
  nav {
    display: none;
  }

  .features > div {
    grid-template-columns: 1fr;
    margin-top: 50px;
  }

  .hero {
    padding-top: 80px;
  }
}`),
    file("script.js", `const waitlistButtons = document.querySelectorAll("[data-waitlist]");
const signupMessage = document.querySelector("#signup-message");

waitlistButtons.forEach(button => {
  button.addEventListener("click", () => {
    signupMessage.hidden = false;
    signupMessage.textContent = "Demo complete — connect this button to your signup form when you are ready.";
    signupMessage.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });
});`)
  ];

  if (template === "app") return [
    file("index.html", `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="A simple task list for focusing on what matters today." />
    <title>Focus Flow — Things to do</title>
    <link rel="stylesheet" href="style.css" />
  </head>
  <body>
    <main>
      <section class="app">
        <header>
          <div>
            <p class="eyebrow">FOCUS FLOW</p>
            <h1>Things to do</h1>
          </div>
          <span id="count">0 tasks</span>
        </header>

        <form id="task-form">
          <input
            id="task-input"
            placeholder="What needs your attention?"
            autocomplete="off"
          />
          <button>Add task</button>
        </form>

        <ul id="task-list"></ul>
        <p class="empty" id="empty">Your day is clear. Add your first task.</p>
      </section>
    </main>

    <script src="script.js"><\/script>
  </body>
</html>`),
    file("style.css", `@import url('https://fonts.googleapis.com/css2?family=DM+Mono&family=DM+Sans:wght@400;500;700&display=swap');

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  background: #f5f4ef;
  color: #20241f;
  font-family: 'DM Sans', sans-serif;
}

main {
  min-height: 100vh;
  padding: 10vw 20px;
  background: radial-gradient(circle at 90% 0, #d7e7bd, transparent 35%);
}

.app {
  max-width: 650px;
  margin: auto;
  background: #fffefa;
  border: 1px solid #dfded7;
  border-radius: 18px;
  padding: 42px;
  box-shadow: 0 25px 60px #26331c12;
}

header {
  display: flex;
  align-items: end;
  justify-content: space-between;
  border-bottom: 1px solid #e4e3dc;
  padding-bottom: 24px;
}

.eyebrow {
  font: 11px 'DM Mono';
  letter-spacing: .14em;
  color: #7e8c68;
  margin: 0 0 8px;
}

h1 {
  font-size: 42px;
  letter-spacing: -.06em;
  margin: 0;
}

header span {
  font: 12px 'DM Mono';
  color: #777;
}

form {
  display: flex;
  gap: 10px;
  margin: 28px 0;
}

input {
  flex: 1;
  border: 1px solid #d5d8ce;
  border-radius: 8px;
  padding: 14px;
  font: inherit;
  outline: none;
}

input:focus {
  border-color: #789452;
}

button {
  background: #26361e;
  color: white;
  border: 0;
  border-radius: 8px;
  padding: 0 18px;
  font: 500 14px inherit;
  cursor: pointer;
}

ul {
  padding: 0;
  margin: 0;
  list-style: none;
}

li {
  display: flex;
  align-items: center;
  gap: 12px;
  border-top: 1px solid #eee;
  padding: 15px 0;
}

li button {
  margin-left: auto;
  background: transparent;
  color: #849078;
  padding: 4px;
}

.done {
  text-decoration: line-through;
  color: #9b9e98;
}

.empty {
  text-align: center;
  color: #92958e;
  padding: 20px 0;
}

input[type="checkbox"] {
  flex: none;
  accent-color: #637d42;
}`),
    file("script.js", `const form = document.querySelector("#task-form");
const input = document.querySelector("#task-input");
const list = document.querySelector("#task-list");
const count = document.querySelector("#count");
const empty = document.querySelector("#empty");

let tasks = [];

function render() {
  list.innerHTML = "";

  tasks.forEach((task, index) => {
    const item = document.createElement("li");

    item.innerHTML =
      '<input type="checkbox" ' +
      (task.done ? "checked" : "") +
      '><span class="' +
      (task.done ? "done" : "") +
      '">' +
      task.text +
      "</span><button>×</button>";

    item.querySelector("input").onchange = () => {
      tasks[index].done = !tasks[index].done;
      render();
    };

    item.querySelector("button").onclick = () => {
      tasks.splice(index, 1);
      render();
    };

    list.appendChild(item);
  });

  count.textContent = tasks.length + " task" + (tasks.length === 1 ? "" : "s");
  empty.hidden = tasks.length > 0;
}

form.onsubmit = event => {
  event.preventDefault();

  if (input.value.trim()) {
    tasks.push({ text: input.value.trim(), done: false });
    input.value = "";
    render();
  }
};

render();`)
  ];

  return [
    file("index.html", `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>My Cloud IDE Project</title>
    <link rel="stylesheet" href="style.css" />
  </head>
  <body>
    <main>
      <!-- Start building your page inside this main section. -->
      <h1>Welcome to my website</h1>
      <p>Edit this page to begin building something of your own.</p>
      <button id="action">Try it</button>
    </main>

    <script src="script.js"><\/script>
  </body>
</html>`),
    file("style.css", `:root {
  font-family: Inter, system-ui, sans-serif;
  color: #eef1ff;
  background: #11142a;
}

* {
  box-sizing: border-box;
}

body {
  min-height: 100vh;
  margin: 0;
  display: grid;
  place-items: center;
}

main {
  max-width: 680px;
  padding: 3rem;
  text-align: center;
}

h1 {
  margin: 0;
  font-size: clamp(2.5rem, 7vw, 5rem);
}

p {
  color: #adb5d9;
  line-height: 1.6;
}

button {
  border: 0;
  border-radius: 999px;
  padding: .8rem 1.2rem;
  background: #8b7cff;
  color: white;
  font: inherit;
  cursor: pointer;
}`),
    file("script.js", `const actionButton = document.querySelector("#action");

actionButton.addEventListener("click", () => {
  actionButton.textContent = "Nice work!";
});`)
  ];
}
