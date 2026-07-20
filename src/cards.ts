export type CardContent = {
  seatLabel: string;
  name: string;
};

export function createFlightCard(content: CardContent): HTMLDivElement {
  const card = document.createElement("article");
  card.className = "deal-card";
  card.setAttribute("aria-hidden", "true");
  card.innerHTML = `
    <div class="deal-card__inner">
      <div class="deal-card__shine"></div>
      <div class="deal-card__face deal-card__face--front">
        <div class="deal-card__seat">${content.seatLabel}</div>
        <div class="deal-card__name">${content.name}</div>
        <div class="deal-card__brand">Seat Shuffle</div>
      </div>
      <div class="deal-card__face deal-card__face--back">
        <div class="deal-card__back-mark"></div>
        <div class="deal-card__back-copy">Casino Royale</div>
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
