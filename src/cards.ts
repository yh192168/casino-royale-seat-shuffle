export type CardRarity = "normal" | "legendary";

export type CardContent = {
  seatLabel: string;
  name: string;
  rarity?: CardRarity;
};

export function createFlightCard(content: CardContent): HTMLDivElement {
  const rarity = content.rarity ?? "normal";
  const isLegendary = rarity === "legendary";
  const card = document.createElement("article");
  card.className = `deal-card${isLegendary ? " deal-card--legendary" : ""}`;
  card.setAttribute("aria-hidden", "true");
  card.dataset.rarity = rarity;
  card.innerHTML = `
    <div class="deal-card__inner">
      <div class="deal-card__shine"></div>
      <div class="deal-card__face deal-card__face--front">
        ${isLegendary ? '<div class="deal-card__legendary-emblem"></div><div class="deal-card__legendary-badge">LEGENDARY DRAW</div>' : ""}
        <div class="deal-card__seat">${content.seatLabel}</div>
        <div class="deal-card__name">${content.name}</div>
        <div class="deal-card__brand">${isLegendary ? "Royal Reveal" : "Seat Shuffle"}</div>
      </div>
      <div class="deal-card__face deal-card__face--back">
        <div class="deal-card__back-mark"></div>
        <div class="deal-card__back-copy">${isLegendary ? "Legendary Suit" : "Casino Royale"}</div>
      </div>
    </div>
  `;

  return card;
}

export function updateFlightCard(card: HTMLElement, content: CardContent): void {
  const seat = card.querySelector<HTMLElement>(".deal-card__seat");
  const name = card.querySelector<HTMLElement>(".deal-card__name");

  if (seat) {
    seat.textContent = content.seatLabel;
  }

  if (name) {
    name.textContent = content.name;
  }
}

export function setCardState(card: HTMLElement, state: "back" | "front"): void {
  card.dataset.face = state;
}
