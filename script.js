
const $ = (id) => document.getElementById(id);

const STORAGE_KEY = "my-expense-tracker-v1";

let state = {
  startingBalance: 0,
  dangerLine: 500,
  expenses: []
};

const money = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR"
  }).format(amount);

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (!saved) return;

    const parsed = JSON.parse(saved);

    if (
      !Number.isFinite(parsed.startingBalance) ||
      parsed.startingBalance < 0 ||
      !Number.isFinite(parsed.dangerLine) ||
      parsed.dangerLine < 0 ||
      !Array.isArray(parsed.expenses)
    ) {
      return;
    }

    const validExpenses = parsed.expenses.every((expense) =>
      typeof expense.id === "string" &&
      typeof expense.name === "string" &&
      expense.name.trim().length > 0 &&
      Number.isFinite(expense.amount) &&
      expense.amount > 0 &&
      typeof expense.date === "string"
    );

    if (!validExpenses) return;

    state = {
      startingBalance: parsed.startingBalance,
      dangerLine: parsed.dangerLine,
      expenses: parsed.expenses
    };
  } catch (error) {
    console.error("Could not load saved expenses:", error);
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch (error) {
    alert("Your browser could not save the data. Check browser storage.");
    console.error(error);
    return false;
  }
}

function getTotalSpent() {
  return state.expenses.reduce(
    (total, expense) => total + expense.amount,
    0
  );
}

function getBalance() {
  return state.startingBalance - getTotalSpent();
}

function render() {
  const spent = getTotalSpent();
  const balance = getBalance();

  $("starting-balance").value = state.startingBalance;
  $("danger-line").value = state.dangerLine;

  $("starting-display").textContent = money(state.startingBalance);
  $("spent-display").textContent = money(spent);
  $("danger-display").textContent = money(state.dangerLine);
  $("remaining").textContent = money(balance);

  const isDanger = balance <= state.dangerLine;

  $("warning").hidden = !isDanger;

  if (isDanger) {
    $("balance-status").textContent =
      balance < 0
        ? "You have spent more than your available money."
        : "Your money has reached the danger line!";
  } else {
    $("balance-status").textContent =
      money(balance - state.dangerLine) +
      " above your danger line.";
  }

  $("expense-count").textContent =
    `${state.expenses.length} ${state.expenses.length === 1 ? "item" : "items"}`;

  const list = $("expense-list");
  list.replaceChildren();

  $("empty-message").hidden = state.expenses.length > 0;

  const sortedExpenses = [...state.expenses].sort(
    (a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id)
  );

  for (const expense of sortedExpenses) {
    const row = document.createElement("div");
    row.className = "expense-row";

    const details = document.createElement("div");

    const name = document.createElement("div");
    name.className = "expense-name";
    name.textContent = expense.name;

    const date = document.createElement("div");
    date.className = "expense-date";
    date.textContent = expense.date;

    details.append(name, date);

    const right = document.createElement("div");
    right.className = "expense-right";

    const amount = document.createElement("span");
    amount.className = "expense-amount";
    amount.textContent = "−" + money(expense.amount);

    const remove = document.createElement("button");
    remove.className = "delete-button";
    remove.type = "button";
    remove.textContent = "Delete";
    remove.setAttribute("aria-label", `Delete ${expense.name}`);

    remove.addEventListener("click", () => {
      if (!confirm(`Delete "${expense.name}"? This will restore its amount to your balance.`)) {
        return;
      }

      state.expenses = state.expenses.filter(
        (item) => item.id !== expense.id
      );

      if (saveState()) render();
    });

    right.append(amount, remove);
    row.append(details, right);
    list.append(row);
  }
}

$("settings-form").addEventListener("submit", (event) => {
  event.preventDefault();

  const startingBalance = Number($("starting-balance").value);
  const dangerLine = Number($("danger-line").value);

  if (
    $("starting-balance").value.trim() === "" ||
    $("danger-line").value.trim() === "" ||
    !Number.isFinite(startingBalance) ||
    !Number.isFinite(dangerLine) ||
    startingBalance < 0 ||
    dangerLine < 0
  ) {
    alert("Enter valid amounts of zero or more.");
    return;
  }

  state.startingBalance = startingBalance;
  state.dangerLine = dangerLine;

  if (saveState()) render();
});

$("expense-form").addEventListener("submit", (event) => {
  event.preventDefault();

  const name = $("item-name").value.trim();
  const amount = Number($("item-amount").value);
  const date = $("item-date").value;

  if (!name || !date || !Number.isFinite(amount) || amount <= 0) {
    alert("Enter a purchase name, a valid amount, and a date.");
    return;
  }

  if (state.startingBalance === 0) {
    const proceed = confirm(
      "Your starting balance is ₹0. Set your actual starting money in Money Settings first if needed. Add this purchase anyway?"
    );

    if (!proceed) return;
  }

  state.expenses.push({
    id: crypto.randomUUID(),
    name,
    amount,
    date
  });

  if (saveState()) {
    $("expense-form").reset();
    $("item-date").value = new Date().toLocaleDateString("en-CA");
    render();
  } else {
    state.expenses.pop();
  }
});

loadState();
$("item-date").value = new Date().toLocaleDateString("en-CA");
render();
