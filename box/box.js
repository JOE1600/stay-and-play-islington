// Lists upcoming JackJumpers home games from the site's fixtures.json (rebuilt from the official schedule
// every few hours) and gives each one an enquiry email with the game pre-filled.
const EMAIL = "reservations@islingtonhotel.com";

function tipoffTime(game) {
  const match = /^(\d{1,2}):(\d{2})\s*(am|pm)$/i.exec(game.tipoff || "");
  if (!match) return new Date(`${game.gameDate}T19:30:00`);
  let hour = Number(match[1]) % 12;
  if (match[3].toLowerCase() === "pm") hour += 12;
  return new Date(`${game.gameDate}T${String(hour).padStart(2, "0")}:${match[2]}:00`);
}

function enquiryLink(game) {
  const subject = `Corporate Box seats - JackJumpers vs ${game.opponent}, ${game.displayDate}`;
  const body = `Hi Islington team,\n\nI'd like Corporate Box seats ($400 per person) for JackJumpers vs ${game.opponent} on ${game.displayDate} (${game.tipoff}).\n\nNumber of seats:\nName:\nPhone:\n\nThanks`;
  return `mailto:${EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function showNextGame(game) {
  const card = document.querySelector("#next-game");
  if (!card || !game) return;
  card.querySelector("[data-next-opponent]").textContent = `vs ${game.opponent}`;
  card.querySelector("[data-next-when]").textContent = `${game.displayDate} · ${game.tipoff}`;
  const count = card.querySelector("[data-next-count]");
  const target = tipoffTime(game);
  const tick = () => {
    const ms = target - Date.now();
    if (ms <= 0) { count.textContent = "Tip-off!"; return; }
    const d = Math.floor(ms / 864e5), h = Math.floor((ms % 864e5) / 36e5), m = Math.floor((ms % 36e5) / 6e4);
    count.textContent = d > 0 ? `${d}d ${h}h ${m}m to tip-off` : `${h}h ${m}m to tip-off`;
  };
  tick();
  setInterval(tick, 30000);
  card.hidden = false;
}

async function loadGames() {
  const list = document.querySelector("#game-list");
  try {
    const response = await fetch("../fixtures.json", { cache: "no-cache" });
    if (!response.ok) throw new Error(String(response.status));
    const now = Date.now();
    const games = (await response.json())
      .filter((game) => !game.venue || /mystate/i.test(game.venue))
      .filter((game) => tipoffTime(game).getTime() > now)
      .slice(0, 6);
    if (!games.length) throw new Error("no games");
    list.replaceChildren(...games.map((game) => {
      const li = document.createElement("li");
      const date = document.createElement("div");
      date.className = "g-date";
      const [weekday, day, month] = game.displayDate.replace(",", "").split(" ");
      date.innerHTML = `<small></small><b></b><small></small>`;
      date.children[0].textContent = weekday;
      date.children[1].textContent = day;
      date.children[2].textContent = month;
      const info = document.createElement("div");
      info.className = "g-info";
      info.innerHTML = `<strong></strong><span></span>`;
      info.children[0].textContent = `JackJumpers vs ${game.opponent}`;
      info.children[1].textContent = `${game.tipoff} · ${game.venue || "MyState Bank Arena"}`;
      const link = document.createElement("a");
      link.className = "g-link";
      link.href = enquiryLink(game);
      link.textContent = "Enquire ↗";
      li.append(date, info, link);
      return li;
    }));
    showNextGame(games[0]);
  } catch {
    list.querySelector(".game-empty").textContent = "Call 03 6220 2123 or email reservations@islingtonhotel.com and we’ll tell you the next home games with seats available.";
  }
}

loadGames();
