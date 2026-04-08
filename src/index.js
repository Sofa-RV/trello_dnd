import "./styles.css";

// --- 1. Структура состояния
const DEFAULT_STATE = {
  columns: [
    { id: 0, title: "Todo", cards: [] },
    { id: 1, title: "In Progress", cards: [] },
    { id: 2, title: "Done", cards: [] },
  ],
};

function loadState() {
  const raw = localStorage.getItem("trelloBoardState");
  return raw ? JSON.parse(raw) : DEFAULT_STATE;
}

function saveState(state) {
  localStorage.setItem("trelloBoardState", JSON.stringify(state));
}

// --- 2. renderBoard — рисуем доску с DnD + кнопкой удаления
function renderBoard(state) {
  const app = document.getElementById("app");
  app.innerHTML = "";

  const board = document.createElement("div");
  board.className = "board";

  state.columns.forEach((col) => {
    const colEl = document.createElement("div");
    colEl.className = "column";
    colEl.dataset.columnId = col.id;

    const title = document.createElement("h2");
    title.textContent = col.title;

    const addBtn = document.createElement("button");
    addBtn.className = "add-card";
    addBtn.textContent = "Add another card";
    addBtn.dataset.colId = col.id;
    addBtn.addEventListener("click", () => addCardToColumn(col.id));

    const cardsContainer = document.createElement("div");
    cardsContainer.className = "cards";

    col.cards.forEach((card) => {
      const cardEl = document.createElement("div");
      cardEl.className = "card";
      cardEl.dataset.cardId = card.id;

      // текст карточки
      const textEl = document.createElement("span");
      textEl.textContent = card.text;
      cardEl.appendChild(textEl);

      // крестик для удаления
      const closeBtn = document.createElement("span");
      closeBtn.className = "close-card";
      closeBtn.textContent = "×";
      closeBtn.style.float = "right";
      closeBtn.style.cursor = "pointer";
      closeBtn.style.fontSize = "14px";
      closeBtn.style.color = "#888";

      closeBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        removeCard(card.id);
      });

      cardEl.appendChild(closeBtn);

      // DnD
      cardEl.draggable = true;
      cardEl.addEventListener("dragstart", handleDragStart);
      cardEl.addEventListener("dragend", handleDragEnd);

      cardsContainer.appendChild(cardEl);
    });

    // --- виртуальный элемент внизу колонки ---
    const dropZone = document.createElement("div");
    dropZone.className = "drop-zone";
    dropZone.style.height = "40px";
    dropZone.style.backgroundColor = "rgba(0, 0, 0, 0.1)";
    dropZone.draggable = true;

    dropZone.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";

      dropZone.style.backgroundColor = "#e0e0e0";

      console.log("DRAGOVER on dropZone", dropZone);
    });

    dropZone.addEventListener("drop", (e) => {
      e.preventDefault();
      dropZone.style.backgroundColor = "";

      console.log("DROP on dropZone", dropZone);
      handleDrop(e, col.id);
    });

    cardsContainer.appendChild(dropZone);

    // Делаем колонку зоной для дропа
    cardsContainer.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      cardsContainer.style.backgroundColor = "#e0e0e0";
    });

    cardsContainer.addEventListener("dragleave", () => {
      cardsContainer.style.backgroundColor = "";
    });

    cardsContainer.addEventListener("drop", (e) => {
      e.preventDefault();
      cardsContainer.style.backgroundColor = "";

      handleDrop(e, col.id);
    });

    colEl.appendChild(title);
    colEl.appendChild(addBtn);
    colEl.appendChild(cardsContainer);
    board.appendChild(colEl);
  });

  app.appendChild(board);
}

// --- 3. Добавление карточки
function addCardToColumn(columnId) {
  const text = prompt("Введите текст карточки:");
  if (!text?.trim()) return;

  const state = loadState();
  const column = state.columns.find((col) => col.id === columnId);
  if (!column) return;

  const id = Date.now().toString();
  column.cards.push({ id, text: text.trim() });

  saveState(state);
  renderBoard(state);
}

// --- 4. Удаление карточки
function removeCard(cardId) {
  const state = loadState();

  for (const col of state.columns) {
    const index = col.cards.findIndex((c) => c.id === cardId);
    if (index !== -1) {
      col.cards.splice(index, 1);
      saveState(state);
      renderBoard(state);
      return;
    }
  }
}

// --- 5. DnD: dragstart / dragend
function handleDragStart(e) {
  const cardEl = e.target;
  const fromColId = parseInt(cardEl.closest(".column").dataset.columnId, 10);
  const cardId = cardEl.dataset.cardId;

  e.dataTransfer.setData("text/plain", `${fromColId}:${cardId}`);
  e.dataTransfer.effectAllowed = "move";

  console.log("DRAG START", { fromColId, cardId, text: cardEl.textContent });
}

function handleDragEnd(e) {
  // можно добавить подсветку/эффекты после отпускания при желании
}

// --- 6. handleDrop — перемещение карточки между/внутри колонок
function handleDrop(e, toColId) {
  e.preventDefault();

  const data = e.dataTransfer.getData("text/plain").split(":");
  const fromColId = parseInt(data[0], 10);
  const cardId = data[1];

  console.log("DROP", { fromColId, toColId, cardId });

  const state = loadState();
  const fromCol = state.columns.find((col) => col.id === fromColId);
  const toCol = state.columns.find((col) => col.id === toColId);

  if (!fromCol || !toCol) return;

  const fromCardIndex = fromCol.cards.findIndex((c) => c.id === cardId);
  if (fromCardIndex === -1) return;

  const movedCard = fromCol.cards.splice(fromCardIndex, 1)[0];

  const cards = Array.from(e.currentTarget.querySelectorAll(".card"));

  let insertIndex = toCol.cards.length;

  for (let i = 0; i < cards.length; i++) {
    const rect = cards[i].getBoundingClientRect();
    const y = e.clientY;

    if (y < rect.top + rect.height / 2) {
      const cardDataId = cards[i].dataset.cardId;
      const targetIndex = toCol.cards.findIndex((c) => c.id === cardDataId);
      if (targetIndex !== -1) {
        insertIndex = targetIndex;
      } else {
        insertIndex = toCol.cards.length;
      }
      break;
    }
  }

  toCol.cards.splice(insertIndex, 0, movedCard);

  console.log("UPDATED STATE", state);

  saveState(state);
  renderBoard(state);
}

// --- 7. Старт
const boardState = loadState();
renderBoard(boardState);