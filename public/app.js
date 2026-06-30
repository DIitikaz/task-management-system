"use strict";

const STORAGE_KEY = "taskly.tasks.v1";
const MAX_TASK_LENGTH = 120;

const state = {
  tasks: loadTasks(),
  filter: "all",
  search: "",
  editingTaskId: null,
  pendingDeleteIds: [],
};

const elements = {
  addForm: document.querySelector("#add-task-form"),
  addInput: document.querySelector("#new-task-input"),
  addError: document.querySelector("#add-task-error"),
  characterCount: document.querySelector("#character-count"),
  taskList: document.querySelector("#task-list"),
  taskTemplate: document.querySelector("#task-template"),
  emptyState: document.querySelector("#empty-state"),
  emptyTitle: document.querySelector("#empty-state-title"),
  emptyText: document.querySelector("#empty-state-text"),
  focusAddButton: document.querySelector("#focus-add-button"),
  searchInput: document.querySelector("#search-input"),
  filterButtons: [...document.querySelectorAll(".filter-button")],
  totalCount: document.querySelector("#total-count"),
  activeCount: document.querySelector("#active-count"),
  completedCount: document.querySelector("#completed-count"),
  clearCompletedButton: document.querySelector("#clear-completed-button"),
  todayLabel: document.querySelector("#today-label"),
  editDialog: document.querySelector("#edit-dialog"),
  editForm: document.querySelector("#edit-task-form"),
  editInput: document.querySelector("#edit-task-input"),
  editError: document.querySelector("#edit-task-error"),
  editCloseButton: document.querySelector(".dialog-close"),
  editCancelButton: document.querySelector(".dialog-cancel"),
  confirmDialog: document.querySelector("#confirm-dialog"),
  confirmDialogTitle: document.querySelector("#confirm-dialog-title"),
  confirmDialogText: document.querySelector("#confirm-dialog-text"),
  confirmCancelButton: document.querySelector(".confirm-cancel"),
  confirmDeleteButton: document.querySelector("#confirm-delete-button"),
  toast: document.querySelector("#toast"),
  toastMessage: document.querySelector("#toast-message"),
};

let toastTimer;

function loadTasks() {
  try {
    const savedValue = localStorage.getItem(STORAGE_KEY);
    if (!savedValue) return [];

    const parsedTasks = JSON.parse(savedValue);
    if (!Array.isArray(parsedTasks)) return [];

    return parsedTasks
      .filter((task) => task && typeof task.title === "string")
      .map((task) => ({
        id: String(task.id || createId()),
        title: task.title.trim().slice(0, MAX_TASK_LENGTH),
        completed: Boolean(task.completed),
        createdAt: isValidDate(task.createdAt) ? task.createdAt : new Date().toISOString(),
        updatedAt: isValidDate(task.updatedAt) ? task.updatedAt : null,
      }))
      .filter((task) => task.title.length > 0);
  } catch (error) {
    console.warn("Taskly could not read saved tasks:", error);
    return [];
  }
}

function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.tasks));
    return true;
  } catch (error) {
    console.error("Taskly could not save tasks:", error);
    showToast("לא הצלחנו לשמור בדפדפן. כדאי לבדוק הרשאות אחסון.");
    return false;
  }
}

function createId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function isValidDate(value) {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function sanitizeTitle(value) {
  return value.replace(/\s+/g, " ").trim().slice(0, MAX_TASK_LENGTH);
}

function addTask(title) {
  const task = {
    id: createId(),
    title,
    completed: false,
    createdAt: new Date().toISOString(),
    updatedAt: null,
  };

  state.tasks.unshift(task);
  saveTasks();
  render();
  showToast("המשימה נוספה בהצלחה");
}

function toggleTask(taskId) {
  const task = state.tasks.find((item) => item.id === taskId);
  if (!task) return;

  task.completed = !task.completed;
  task.updatedAt = new Date().toISOString();
  saveTasks();
  render();
  showToast(task.completed ? "איזה יופי — המשימה הושלמה" : "המשימה הוחזרה לרשימת הביצוע");
}

function updateTask(taskId, title) {
  const task = state.tasks.find((item) => item.id === taskId);
  if (!task) return;

  task.title = title;
  task.updatedAt = new Date().toISOString();
  saveTasks();
  render();
  showToast("השינויים נשמרו");
}

function deletePendingTasks() {
  if (state.pendingDeleteIds.length === 0) return;

  const count = state.pendingDeleteIds.length;
  const ids = new Set(state.pendingDeleteIds);
  state.tasks = state.tasks.filter((task) => !ids.has(task.id));
  state.pendingDeleteIds = [];
  saveTasks();
  render();
  elements.confirmDialog.close();
  showToast(count === 1 ? "המשימה נמחקה" : `${count} משימות נמחקו`);
}

function getVisibleTasks() {
  const query = state.search.toLocaleLowerCase("he");

  return state.tasks.filter((task) => {
    const matchesFilter =
      state.filter === "all" ||
      (state.filter === "active" && !task.completed) ||
      (state.filter === "completed" && task.completed);
    const matchesSearch = !query || task.title.toLocaleLowerCase("he").includes(query);
    return matchesFilter && matchesSearch;
  });
}

function render() {
  const visibleTasks = getVisibleTasks();
  elements.taskList.replaceChildren(...visibleTasks.map(createTaskElement));
  renderStats();
  renderEmptyState(visibleTasks);
}

function createTaskElement(task) {
  const fragment = elements.taskTemplate.content.cloneNode(true);
  const taskElement = fragment.querySelector(".task-item");
  const toggleButton = fragment.querySelector(".task-toggle");
  const title = fragment.querySelector(".task-item__title");
  const meta = fragment.querySelector(".task-item__meta");
  const status = fragment.querySelector(".task-status");
  const editButton = fragment.querySelector(".edit-button");
  const deleteButton = fragment.querySelector(".delete-button");

  taskElement.dataset.taskId = task.id;
  taskElement.classList.toggle("is-completed", task.completed);
  title.textContent = task.title;
  meta.textContent = formatTaskDate(task.createdAt);
  status.textContent = task.completed ? "הושלמה" : "לביצוע";

  toggleButton.setAttribute(
    "aria-label",
    task.completed ? `החזרת המשימה ${task.title} לרשימת הביצוע` : `סימון המשימה ${task.title} כהושלמה`,
  );
  toggleButton.setAttribute("aria-pressed", String(task.completed));
  editButton.setAttribute("aria-label", `עריכת המשימה ${task.title}`);
  deleteButton.setAttribute("aria-label", `מחיקת המשימה ${task.title}`);

  toggleButton.addEventListener("click", () => toggleTask(task.id));
  editButton.addEventListener("click", () => openEditDialog(task.id));
  deleteButton.addEventListener("click", () => openDeleteDialog([task.id]));

  return fragment;
}

function renderStats() {
  const completed = state.tasks.filter((task) => task.completed).length;
  const active = state.tasks.length - completed;

  elements.totalCount.textContent = String(state.tasks.length);
  elements.activeCount.textContent = String(active);
  elements.completedCount.textContent = String(completed);
  elements.clearCompletedButton.hidden = completed === 0;
}

function renderEmptyState(visibleTasks) {
  const isEmpty = visibleTasks.length === 0;
  elements.emptyState.hidden = !isEmpty;
  elements.taskList.hidden = isEmpty;

  if (!isEmpty) return;

  const hasTasks = state.tasks.length > 0;
  const hasSearch = state.search.length > 0;

  if (hasSearch) {
    elements.emptyTitle.textContent = "לא מצאנו משימה כזו";
    elements.emptyText.textContent = "אפשר לנסות מילת חיפוש אחרת או לנקות את החיפוש.";
    elements.focusAddButton.textContent = "ניקוי החיפוש";
    return;
  }

  if (hasTasks) {
    elements.emptyTitle.textContent = state.filter === "completed" ? "עוד אין משימות שהושלמו" : "אין משימות שממתינות";
    elements.emptyText.textContent = state.filter === "completed" ? "כשתסיים משימה, היא תופיע כאן." : "נראה שהכול בוצע. מגיע לך רגע לנשום.";
    elements.focusAddButton.textContent = state.filter === "completed" ? "הצגת כל המשימות" : "הוספת משימה חדשה";
    return;
  }

  elements.emptyTitle.textContent = "הרשימה מחכה לך";
  elements.emptyText.textContent = "הוספת המשימה הראשונה היא התחלה מצוינת.";
  elements.focusAddButton.textContent = "הוספת משימה ראשונה";
}

function formatTaskDate(isoDate) {
  const date = new Date(isoDate);
  const today = new Date();
  const isToday = date.toDateString() === today.toDateString();
  const time = new Intl.DateTimeFormat("he-IL", { hour: "2-digit", minute: "2-digit" }).format(date);

  if (isToday) return `נוספה היום, ${time}`;
  return `נוספה ${new Intl.DateTimeFormat("he-IL", { day: "numeric", month: "short" }).format(date)}`;
}

function openEditDialog(taskId) {
  const task = state.tasks.find((item) => item.id === taskId);
  if (!task) return;

  state.editingTaskId = taskId;
  elements.editInput.value = task.title;
  setInputError(elements.editInput, elements.editError, "");
  elements.editDialog.showModal();
  requestAnimationFrame(() => {
    elements.editInput.focus();
    elements.editInput.select();
  });
}

function closeEditDialog() {
  state.editingTaskId = null;
  elements.editDialog.close();
}

function openDeleteDialog(taskIds) {
  state.pendingDeleteIds = taskIds;
  const isBulkDelete = taskIds.length > 1;
  elements.confirmDialogTitle.textContent = isBulkDelete ? "למחוק את המשימות שהושלמו?" : "למחוק את המשימה?";
  elements.confirmDialogText.textContent = isBulkDelete
    ? `${taskIds.length} משימות יימחקו לצמיתות.`
    : "לא ניתן לבטל את הפעולה לאחר המחיקה.";
  elements.confirmDialog.showModal();
}

function closeDeleteDialog() {
  state.pendingDeleteIds = [];
  elements.confirmDialog.close();
}

function setInputError(input, errorElement, message) {
  input.classList.toggle("is-invalid", Boolean(message));
  input.setAttribute("aria-invalid", String(Boolean(message)));
  errorElement.textContent = message;
}

function showToast(message) {
  clearTimeout(toastTimer);
  elements.toastMessage.textContent = message;
  elements.toast.classList.add("is-visible");
  toastTimer = setTimeout(() => elements.toast.classList.remove("is-visible"), 2500);
}

elements.addForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const title = sanitizeTitle(elements.addInput.value);

  if (!title) {
    setInputError(elements.addInput, elements.addError, "כדאי לכתוב משהו לפני שמוסיפים משימה.");
    elements.addInput.focus();
    return;
  }

  setInputError(elements.addInput, elements.addError, "");
  addTask(title);
  elements.addForm.reset();
  elements.characterCount.textContent = `0/${MAX_TASK_LENGTH}`;
  elements.addInput.focus();
});

elements.addInput.addEventListener("input", () => {
  elements.characterCount.textContent = `${elements.addInput.value.length}/${MAX_TASK_LENGTH}`;
  if (elements.addInput.value.trim()) setInputError(elements.addInput, elements.addError, "");
});

elements.searchInput.addEventListener("input", () => {
  state.search = elements.searchInput.value.trim();
  render();
});

elements.filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    state.filter = button.dataset.filter;
    elements.filterButtons.forEach((filterButton) => {
      const isActive = filterButton === button;
      filterButton.classList.toggle("is-active", isActive);
      filterButton.setAttribute("aria-pressed", String(isActive));
    });
    render();
  });
});

elements.focusAddButton.addEventListener("click", () => {
  if (state.search) {
    state.search = "";
    elements.searchInput.value = "";
    render();
    elements.searchInput.focus();
    return;
  }

  if (state.filter === "completed") {
    elements.filterButtons.find((button) => button.dataset.filter === "all")?.click();
    return;
  }

  elements.addInput.focus();
  elements.addInput.scrollIntoView({ behavior: "smooth", block: "center" });
});

elements.clearCompletedButton.addEventListener("click", () => {
  const completedIds = state.tasks.filter((task) => task.completed).map((task) => task.id);
  if (completedIds.length > 0) openDeleteDialog(completedIds);
});

elements.editForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const title = sanitizeTitle(elements.editInput.value);

  if (!title) {
    setInputError(elements.editInput, elements.editError, "שם המשימה לא יכול להיות ריק.");
    elements.editInput.focus();
    return;
  }

  updateTask(state.editingTaskId, title);
  closeEditDialog();
});

elements.editInput.addEventListener("input", () => {
  if (elements.editInput.value.trim()) setInputError(elements.editInput, elements.editError, "");
});

elements.editCloseButton.addEventListener("click", closeEditDialog);
elements.editCancelButton.addEventListener("click", closeEditDialog);
elements.editDialog.addEventListener("cancel", () => {
  state.editingTaskId = null;
});

elements.confirmCancelButton.addEventListener("click", closeDeleteDialog);
elements.confirmDeleteButton.addEventListener("click", deletePendingTasks);
elements.confirmDialog.addEventListener("cancel", () => {
  state.pendingDeleteIds = [];
});

elements.todayLabel.dateTime = new Date().toISOString().slice(0, 10);
elements.todayLabel.textContent = new Intl.DateTimeFormat("he-IL", {
  weekday: "short",
  day: "numeric",
  month: "long",
}).format(new Date());

render();
