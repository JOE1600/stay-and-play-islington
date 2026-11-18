const menuToggle = document.querySelector(".menu-toggle");
const nav = document.querySelector("nav");
const hotelViewer = document.querySelector("#hotel-viewer");
const hotelPhotoRing = document.querySelector("#hotel-photo-ring");
// The hotel's own booking page. The Stay & Play rate shows there on JackJumpers home-game nights.
const bookingUrl = (window.BOXWOOD_BOOKING_URL || "https://book-directonline.com/properties/ISLINGTONHDIRECT").trim();

if (window.Lenis && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  const lenis = new window.Lenis({
    duration: 1.1,
    smoothWheel: true,
    anchors: true,
  });

  function raf(time) {
    lenis.raf(time);
    window.requestAnimationFrame(raf);
  }

  window.requestAnimationFrame(raf);
}

menuToggle?.addEventListener("click", () => {
  const open = menuToggle.getAttribute("aria-expanded") === "true";
  menuToggle.setAttribute("aria-expanded", String(!open));
  nav.classList.toggle("is-open", !open);
});

document.querySelectorAll("nav a").forEach((link) => {
  link.addEventListener("click", () => {
    nav.classList.remove("is-open");
    menuToggle?.setAttribute("aria-expanded", "false");
  });
});

if (hotelViewer && hotelPhotoRing) {
  const hotelPhotos = Array.from(hotelPhotoRing.querySelectorAll(".hotel-photo-card"));
  const title = document.querySelector("#hotel-view-title");
  const description = document.querySelector("#hotel-view-description");
  const indexLabel = document.querySelector("#hotel-view-index");
  let activePhoto = 0;
  let pointerStart = null;

  function showHotelPhoto(index) {
    activePhoto = (index + hotelPhotos.length) % hotelPhotos.length;
    hotelPhotoRing.style.transform = `rotateY(${-activePhoto * 72}deg)`;

    const photo = hotelPhotos[activePhoto];
    if (title) title.textContent = photo.dataset.title;
    if (description) description.textContent = photo.dataset.description;
    if (indexLabel) {
      indexLabel.textContent = `${String(activePhoto + 1).padStart(2, "0")} / ${String(hotelPhotos.length).padStart(2, "0")}`;
    }
  }

  hotelPhotos.forEach((photo, index) => {
    photo.style.setProperty("--photo-index", String(index));
  });

  document.querySelector("#hotel-view-previous")?.addEventListener("click", () => {
    showHotelPhoto(activePhoto - 1);
  });

  document.querySelector("#hotel-view-next")?.addEventListener("click", () => {
    showHotelPhoto(activePhoto + 1);
  });

  hotelViewer.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      showHotelPhoto(activePhoto + (event.key === "ArrowRight" ? 1 : -1));
    }
  });

  hotelViewer.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    pointerStart = event.clientX;
    hotelViewer.classList.add("is-dragging");
    hotelViewer.setPointerCapture(event.pointerId);
  });

  let dragFrame = 0;
  let dragX = 0;

  // Pointer events can fire several times per frame; only write the transform once per frame.
  hotelViewer.addEventListener("pointermove", (event) => {
    if (pointerStart === null) return;
    dragX = event.clientX;
    if (dragFrame) return;
    dragFrame = window.requestAnimationFrame(() => {
      dragFrame = 0;
      if (pointerStart === null) return;
      const rotation = -activePhoto * 72 + (dragX - pointerStart) * 0.55;
      hotelPhotoRing.style.transform = `rotateY(${rotation}deg)`;
    });
  });

  function finishHotelDrag(event) {
    if (pointerStart === null) return;
    const distance = event.clientX - pointerStart;
    pointerStart = null;
    window.cancelAnimationFrame(dragFrame);
    dragFrame = 0;
    hotelViewer.classList.remove("is-dragging");
    showHotelPhoto(activePhoto - Math.round(distance / 90));
  }

  hotelViewer.addEventListener("pointerup", finishHotelDrag);
  hotelViewer.addEventListener("pointercancel", finishHotelDrag);
  showHotelPhoto(activePhoto);
}

const revealElements = document.querySelectorAll(".reveal");
if ("IntersectionObserver" in window) {
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 }
  );

  revealElements.forEach((element, index) => {
    element.style.transitionDelay = `${Math.min(index * 70, 280)}ms`;
    revealObserver.observe(element);
  });
} else {
  revealElements.forEach((element) => element.classList.add("is-visible"));
}

document.querySelectorAll(".spotlight-card").forEach((card) => {
  let bounds = null;
  let frame = 0;
  let pointer = { x: 0, y: 0 };

  // Measure once on entry rather than on every move, and batch style writes per frame.
  card.addEventListener("pointerenter", () => {
    bounds = card.getBoundingClientRect();
  });

  card.addEventListener("pointermove", (event) => {
    pointer = { x: event.clientX, y: event.clientY };
    if (frame) return;
    frame = window.requestAnimationFrame(() => {
      frame = 0;
      bounds ??= card.getBoundingClientRect();
      const x = pointer.x - bounds.left;
      const y = pointer.y - bounds.top;
      const tiltX = ((x / bounds.width) - 0.5) * 3;
      const tiltY = ((y / bounds.height) - 0.5) * -3;
      card.style.setProperty("--spot-x", `${x}px`);
      card.style.setProperty("--spot-y", `${y}px`);
      card.style.setProperty("--tilt-x", `${tiltX}deg`);
      card.style.setProperty("--tilt-y", `${tiltY}deg`);
    });
  });

  card.addEventListener("pointerleave", () => {
    window.cancelAnimationFrame(frame);
    frame = 0;
    bounds = null;
    card.style.removeProperty("--tilt-x");
    card.style.removeProperty("--tilt-y");
  });
});

// The hotel's booking page set to the game night: check in on game day, out the next morning.
function bookingLinkFor(gameDate) {
  const params = new URLSearchParams({ locale: "en" });
  if (/^\d{4}-\d{2}-\d{2}$/.test(gameDate || "")) {
    const checkOut = new Date(`${gameDate}T12:00:00Z`);
    checkOut.setUTCDate(checkOut.getUTCDate() + 1);
    params.set("checkInDate", gameDate);
    params.set("checkOutDate", checkOut.toISOString().slice(0, 10));
  }
  params.set("items[0][adults]", "2");
  params.set("items[0][children]", "0");
  params.set("items[0][infants]", "0");
  params.set("currency", "AUD");
  return `${bookingUrl}?${params}`;
}

// Box seat only: an email to reservations with the game filled in (the booking engine only sells rooms).
function boxSeatLinkFor(game) {
  const subject = `Corporate Box seats - JackJumpers vs ${game.opponent}, ${game.displayDate}`;
  const body = `Hi Islington team,\n\nI'd like Corporate Box seats ($400 per person) for JackJumpers vs ${game.opponent} on ${game.displayDate} (${game.tipoff}).\n\nNumber of seats:\nName:\nPhone:\n\nThanks`;
  return `mailto:reservations@islingtonhotel.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function gameCard(game, isNext) {
  const date = new Date(`${game.gameDate}T12:00:00Z`);
  const fmt = (opts) => new Intl.DateTimeFormat("en-AU", { timeZone: "UTC", ...opts }).format(date);

  const card = el("li", "game-card");
  const when = el("div", "game-when");
  when.append(el("span", "game-dow", fmt({ weekday: "short" })), el("span", "game-day", fmt({ day: "numeric" })), el("span", "game-mon", fmt({ month: "short" })));

  const info = el("div", "game-info");
  if (isNext) info.append(el("span", "game-next", "Next home game"));
  info.append(el("strong", "game-opp", `vs ${game.opponent}`), el("span", "game-meta", `${game.tipoff} tip-off · ${game.venue || "MyState Bank Arena"}`));

  const actions = el("div", "game-actions");
  const stay = el("a", "pill game-book");
  stay.href = bookingLinkFor(game.gameDate);
  stay.innerHTML = 'Stay &amp; Play <span>$1,150</span>';
  stay.setAttribute("aria-label", `Book Stay and Play for JackJumpers vs ${game.opponent}, ${game.displayDate}, $1,150 for two`);
  const box = el("a", "game-box");
  box.href = boxSeatLinkFor(game);
  box.textContent = "Box seat only · $400";
  box.setAttribute("aria-label", `Email to book Corporate Box seats only for JackJumpers vs ${game.opponent}, ${game.displayDate}, $400 per person`);
  actions.append(stay, box);

  card.append(when, info, actions);
  return card;
}

// fixtures.json is published with the site and rebuilt from the official schedule every few hours.
async function fetchUpcomingGames() {
  try {
    const response = await fetch("fixtures.json", { cache: "no-cache" });
    if (response.ok) {
      // The file can be a few hours old, so drop games that have already been played (Hobart date).
      const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Hobart" }).format(new Date());
      const games = await response.json();
      if (Array.isArray(games)) return games.filter((game) => game.gameDate >= today);
    }
  } catch {
    // Handled below.
  }
  throw new Error("The official fixture feed is unavailable.");
}

// Tip-off as a real moment in time. Hobart is UTC+11 in daylight saving (Oct–Apr), otherwise UTC+10.
function tipoffTime(game) {
  const match = /^(\d{1,2}):(\d{2})\s*(am|pm)$/i.exec(game.tipoff || "");
  if (!match || !game.gameDate) return null;
  let hour = Number(match[1]) % 12;
  if (match[3].toLowerCase() === "pm") hour += 12;
  const month = Number(game.gameDate.slice(5, 7));
  const offset = month >= 10 || month <= 3 ? "+11:00" : "+10:00";
  const time = Date.parse(`${game.gameDate}T${String(hour).padStart(2, "0")}:${match[2]}:00${offset}`);
  return Number.isNaN(time) ? null : time;
}

function renderNextGame(game) {
  const card = document.querySelector("#next-game");
  if (!card || !game) return;
  card.querySelector("[data-next-opponent]").textContent = `vs ${game.opponent}`;
  card.querySelector("[data-next-when]").textContent = `${game.displayDate} · ${game.tipoff}`;
  const countdown = card.querySelector("[data-next-countdown]");
  const target = tipoffTime(game);
  const tick = () => {
    if (!target) { countdown.textContent = "Tip-off time to be confirmed"; return; }
    const left = target - Date.now();
    if (left <= 0) { countdown.textContent = "It's game day"; return; }
    const days = Math.floor(left / 86400000);
    const hours = Math.floor((left % 86400000) / 3600000);
    const minutes = Math.floor((left % 3600000) / 60000);
    countdown.textContent = `${days}d ${hours}h ${minutes}m to tip-off`;
  };
  tick();
  window.setInterval(tick, 30000);
  const book = card.querySelector("[data-next-book]");
  if (book) book.href = bookingLinkFor(game.gameDate);
  card.hidden = false;
}

async function loadUpcomingGames() {
  const list = document.querySelector("#game-list");
  if (!list) return;
  try {
    // The package is built around Hobart games; older fixture files may not list venues yet.
    const games = (await fetchUpcomingGames()).filter((game) => !game.venue || /mystate/i.test(game.venue));
    renderNextGame(games[0]);
    if (!games.length) throw new Error("No games listed");
    list.replaceChildren(...games.map((game, i) => gameCard(game, i === 0)));
  } catch {
    const empty = el("li", "game-card is-loading");
    empty.append(el("p", "", "Game dates are being updated. Choose your own dates below, or call us and we'll match you to a game."));
    list.replaceChildren(empty);
  }
}

loadUpcomingGames();
