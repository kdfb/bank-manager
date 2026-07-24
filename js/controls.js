(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.BankControls = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const BUTTONS = Object.freeze({
    primary: 0,
    cancel: 1,
    build: 2,
    ledger: 3,
    operations: 4,
    strategy: 5,
    sell: 6,
    rotate: 7,
    guide: 8,
    menu: 9,
    up: 12,
    down: 13,
    left: 14,
    right: 15,
  });
  const ACTION_NAMES = Object.freeze(Object.keys(BUTTONS));
  const DEAD_ZONE = 0.22;
  const NAV_REPEAT_DELAY = 320;
  const NAV_REPEAT_INTERVAL = 115;

  let initialized = false;
  let currentPad = null;
  let previousButtons = {};
  let previousDirections = {};
  let nextDirectionAt = {};
  let movement = { x: 0, y: 0 };
  let inputMode = "keyboard";
  let previousContext = "";

  function pressed(button) {
    return Boolean(button && (button.pressed || Number(button.value) >= 0.55));
  }

  function normalizeAxis(value, deadZone = DEAD_ZONE) {
    const number = Number(value) || 0;
    if (Math.abs(number) <= deadZone) return 0;
    return Math.sign(number) * Math.min(1, (Math.abs(number) - deadZone) / (1 - deadZone));
  }

  function snapshotGamepad(gamepad, deadZone = DEAD_ZONE) {
    const axes = gamepad?.axes || [];
    const buttons = gamepad?.buttons || [];
    const state = {};
    ACTION_NAMES.forEach(name => { state[name] = pressed(buttons[BUTTONS[name]]); });
    const x = normalizeAxis(axes[0], deadZone);
    const y = normalizeAxis(axes[1], deadZone);
    return {
      id: String(gamepad?.id || "Gamepad"),
      index: Number.isInteger(gamepad?.index) ? gamepad.index : 0,
      mapping: gamepad?.mapping || "",
      movement: { x, y },
      buttons: state,
      directions: {
        up: state.up || y < -0.55,
        down: state.down || y > 0.55,
        left: state.left || x < -0.55,
        right: state.right || x > 0.55,
      },
    };
  }

  function edgeTransitions(current, previous = {}) {
    const edges = {};
    Object.keys(current).forEach(key => { edges[key] = Boolean(current[key] && !previous[key]); });
    return edges;
  }

  function browserRoot() {
    return typeof window !== "undefined" ? window : null;
  }

  function setInputMode(mode) {
    if (inputMode === mode) return;
    inputMode = mode;
    const doc = typeof document !== "undefined" ? document : null;
    if (doc) doc.documentElement.dataset.inputMode = mode;
    renderStatus();
  }

  function renderStatus() {
    const doc = typeof document !== "undefined" ? document : null;
    const status = doc?.getElementById("controllerStatus");
    if (!status) return;
    status.classList.toggle("show", Boolean(currentPad));
    status.textContent = currentPad
      ? inputMode === "gamepad" ? "Controller active · A select · B back" : "Controller connected"
      : "";
  }

  function firstConnectedPad() {
    const nav = typeof navigator !== "undefined" ? navigator : null;
    if (!nav?.getGamepads) return null;
    return [...nav.getGamepads()].find(Boolean) || null;
  }

  function visible(element) {
    if (!element) return false;
    if (element.hidden) return false;
    return element.classList.contains("show") || element.getClientRects().length > 0;
  }

  function currentScope() {
    if (typeof document === "undefined") return null;
    const dialogs = [...document.querySelectorAll('.overlay[role="dialog"].show')];
    if (dialogs.length) return dialogs[dialogs.length - 1];
    const decision = document.getElementById("decisionLayer");
    if (decision?.classList.contains("show")) return decision;
    const build = document.getElementById("buildPanel");
    if (build?.classList.contains("show") && build.contains(document.activeElement)) return build;
    return null;
  }

  function focusables(scope) {
    if (!scope) return [];
    return [...scope.querySelectorAll('button:not(:disabled), select:not(:disabled), input:not(:disabled):not([type="hidden"]), [tabindex]:not([tabindex="-1"])')]
      .filter(visible);
  }

  function focusFirst(scope = currentScope()) {
    const target = focusables(scope)[0];
    if (target) target.focus({ preventScroll: true });
    return Boolean(target);
  }

  function adjustSelect(select, direction) {
    if (!(select instanceof HTMLSelectElement) || !direction) return false;
    const next = Math.max(0, Math.min(select.options.length - 1, select.selectedIndex + direction));
    if (next === select.selectedIndex) return false;
    select.selectedIndex = next;
    select.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  }

  function moveFocus(direction, scope = currentScope()) {
    const items = focusables(scope);
    if (!items.length) return false;
    const active = document.activeElement;
    if ((direction === "left" || direction === "right") && active?.tagName === "SELECT") {
      return adjustSelect(active, direction === "right" ? 1 : -1);
    }
    const current = items.indexOf(active);
    const delta = direction === "left" || direction === "up" ? -1 : 1;
    const next = current < 0 ? 0 : (current + delta + items.length) % items.length;
    items[next].focus({ preventScroll: true });
    return true;
  }

  function activateFocused(scope = currentScope()) {
    if (!scope) return false;
    if (!scope.contains(document.activeElement) && !focusFirst(scope)) return false;
    const active = document.activeElement;
    if (active?.tagName === "SELECT") return adjustSelect(active, 1);
    if (typeof active?.click === "function") {
      const selectedBuildItem = active.classList?.contains("shop-item");
      active.click();
      if (selectedBuildItem && browserRoot()?.selectedUpgradeId !== null) focusGameplay();
      return true;
    }
    return false;
  }

  function focusGameplay() {
    const canvas = typeof document !== "undefined" ? document.getElementById("gameCanvas") : null;
    canvas?.focus({ preventScroll: true });
  }

  function call(name, ...args) {
    const fn = browserRoot()?.[name];
    return typeof fn === "function" ? fn(...args) : undefined;
  }

  function buildModeActive() {
    return Boolean(typeof document !== "undefined" && document.getElementById("buildPanel")?.classList.contains("show"));
  }

  function decisionActive() {
    return Boolean(typeof document !== "undefined" && document.getElementById("decisionLayer")?.classList.contains("show"));
  }

  function anyDialogActive() {
    return Boolean(typeof document !== "undefined" && document.querySelector('.overlay[role="dialog"].show'));
  }

  function pulse(duration = 45, magnitude = 0.22) {
    const enabled = call("controllerVibrationEnabled") !== false;
    const actuator = currentPad?.vibrationActuator;
    if (!enabled || !actuator?.playEffect) return false;
    actuator.playEffect("dual-rumble", {
      duration,
      weakMagnitude: Math.max(0, Math.min(1, magnitude)),
      strongMagnitude: Math.max(0, Math.min(1, magnitude * 0.65)),
    }).catch(() => {});
    return true;
  }

  function handleAction(name) {
    const scope = currentScope();
    if (name === "primary") {
      if (scope) activateFocused(scope);
      else if (buildModeActive()) call("activateControllerBuildCursor");
      else call("interactWithCustomer");
    } else if (name === "cancel") {
      call("closeTopMode");
    } else if (name === "build" && !anyDialogActive() && !decisionActive()) {
      call("toggleBuildMode");
      if (buildModeActive()) {
        const panel = document.getElementById("buildPanel");
        const shop = panel?.querySelector(".shop-item:not(:disabled)");
        (shop || focusables(panel)[0])?.focus({ preventScroll: true });
      } else focusGameplay();
    } else if (name === "ledger" && !anyDialogActive() && !decisionActive()) {
      call("toggleLedger");
    } else if (name === "operations" && !anyDialogActive() && !decisionActive()) {
      if (buildModeActive()) call("setBuildMode", false);
      call("openOperations");
    } else if (name === "strategy" && !anyDialogActive() && !decisionActive()) {
      if (buildModeActive()) call("setBuildMode", false);
      call("openStrategy");
    } else if (name === "guide" && !anyDialogActive() && !decisionActive()) {
      call("openGuide");
    } else if (name === "menu" && !anyDialogActive()) {
      if (buildModeActive()) call("setBuildMode", false);
      call("openMenu");
    } else if (name === "sell" && buildModeActive() && !anyDialogActive()) {
      call("toggleSellMode");
      focusGameplay();
    } else if (name === "rotate" && buildModeActive() && !anyDialogActive()) {
      call("rotateBuildItem");
      focusGameplay();
    }
    pulse();
  }

  function handleDirection(direction) {
    const scope = currentScope();
    if (scope) moveFocus(direction, scope);
    else if (buildModeActive()) call("moveControllerBuildCursor", direction);
  }

  function syncContextFocus() {
    if (inputMode !== "gamepad") return;
    const scope = currentScope();
    const context = scope?.id || "";
    if (context && context !== previousContext && !scope.contains(document.activeElement)) focusFirst(scope);
    previousContext = context;
  }

  function update(timestamp = 0) {
    if (debugAllowed() && typeof document !== "undefined") {
      const root = document.documentElement;
      const debugAction = root.getAttribute("data-controller-debug-action");
      const debugDirectionValue = root.getAttribute("data-controller-debug-direction");
      if (debugAction) {
        root.removeAttribute("data-controller-debug-action");
        debugPress(debugAction);
      }
      if (debugDirectionValue) {
        root.removeAttribute("data-controller-debug-direction");
        debugDirection(debugDirectionValue);
      }
    }
    const pad = firstConnectedPad();
    if (!pad) {
      currentPad = null;
      movement = { x: 0, y: 0 };
      previousButtons = {};
      previousDirections = {};
      renderStatus();
      return;
    }
    currentPad = pad;
    const snapshot = snapshotGamepad(pad);
    const actionEdges = edgeTransitions(snapshot.buttons, previousButtons);
    const directionEdges = edgeTransitions(snapshot.directions, previousDirections);
    const meaningful = Math.abs(snapshot.movement.x) > 0.15
      || Math.abs(snapshot.movement.y) > 0.15
      || Object.values(actionEdges).some(Boolean)
      || Object.values(directionEdges).some(Boolean);
    if (meaningful) setInputMode("gamepad");
    movement = inputMode === "gamepad" && !currentScope() && !buildModeActive()
      ? snapshot.movement
      : { x: 0, y: 0 };

    Object.keys(actionEdges).forEach(name => { if (actionEdges[name]) handleAction(name); });
    for (const direction of ["up", "down", "left", "right"]) {
      if (!snapshot.directions[direction]) {
        delete nextDirectionAt[direction];
        continue;
      }
      if (directionEdges[direction]) {
        handleDirection(direction);
        nextDirectionAt[direction] = timestamp + NAV_REPEAT_DELAY;
      } else if (timestamp >= (nextDirectionAt[direction] || Infinity)) {
        handleDirection(direction);
        nextDirectionAt[direction] = timestamp + NAV_REPEAT_INTERVAL;
      }
    }
    previousButtons = snapshot.buttons;
    previousDirections = snapshot.directions;
    syncContextFocus();
    renderStatus();
  }

  function init() {
    if (initialized || typeof window === "undefined") return;
    initialized = true;
    document.documentElement.dataset.inputMode = inputMode;
    window.addEventListener("gamepadconnected", renderStatus);
    window.addEventListener("gamepaddisconnected", renderStatus);
    window.addEventListener("keydown", () => setInputMode("keyboard"), { passive: true });
    document.addEventListener("pointerdown", () => setInputMode("pointer"), { passive: true });
    if (debugAllowed()) {
      document.addEventListener("bank-controller-debug", event => {
        const detail = event.detail || {};
        if (detail.type === "direction") debugDirection(detail.value);
        else debugPress(detail.value);
      });
      const panel = document.createElement("div");
      panel.id = "controllerDebugPanel";
      panel.className = "controller-debug-panel";
      panel.setAttribute("aria-label", "Controller QA controls");
      panel.innerHTML = `
        <button type="button" data-controller-action="build">X Build</button>
        <button type="button" data-controller-direction="right">D-pad Right</button>
        <button type="button" data-controller-action="primary">A Select</button>
        <button type="button" data-controller-action="menu">Menu</button>
        <button type="button" data-controller-action="cancel">B Back</button>`;
      let debugFocus = document.activeElement;
      document.addEventListener("focusin", event => {
        if (!panel.contains(event.target)) debugFocus = event.target;
      });
      panel.addEventListener("pointerdown", event => event.preventDefault());
      panel.addEventListener("click", event => {
        const button = event.target.closest("button");
        if (!button) return;
        debugFocus?.focus({ preventScroll: true });
        if (button.dataset.controllerDirection) debugDirection(button.dataset.controllerDirection);
        else if (button.dataset.controllerAction) debugPress(button.dataset.controllerAction);
      });
      document.body.appendChild(panel);
    }
    renderStatus();
  }

  function getMovement() {
    return { ...movement };
  }

  function usesGamepad() {
    return inputMode === "gamepad";
  }

  function debugAllowed() {
    if (typeof location === "undefined") return false;
    return new URLSearchParams(location.search).get("debugController") === "1";
  }

  function debugPress(action) {
    if (!debugAllowed() || !ACTION_NAMES.includes(action)) return false;
    setInputMode("gamepad");
    handleAction(action);
    syncContextFocus();
    return true;
  }

  function debugDirection(direction) {
    if (!debugAllowed() || !["up", "down", "left", "right"].includes(direction)) return false;
    setInputMode("gamepad");
    handleDirection(direction);
    return true;
  }

  return Object.freeze({
    BUTTONS,
    DEAD_ZONE,
    normalizeAxis,
    snapshotGamepad,
    edgeTransitions,
    init,
    update,
    getMovement,
    usesGamepad,
    focusFirst,
    focusGameplay,
    pulse,
    debugPress,
    debugDirection,
  });
});
