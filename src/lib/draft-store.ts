"use client";

import {
  ACTIVE_CONTRACT_ID_KEY,
  emptyInputs,
  peekNextContractNo,
  STORAGE_KEY,
  type ContractInputs,
} from "@/lib/contract";
import { endDateFromStart, todayISO } from "@/lib/thai";
import { useCallback, useEffect, useSyncExternalStore } from "react";

type DraftSnapshot = {
  inputs: ContractInputs;
  activeId: string | null;
  hydrated: boolean;
  storageError: string | null;
};

/** Must be a stable reference — React compares getServerSnapshot() by Object.is. */
const SERVER_SNAPSHOT: DraftSnapshot = {
  inputs: emptyInputs(),
  activeId: null,
  hydrated: false,
  storageError: null,
};

let snapshot: DraftSnapshot = SERVER_SNAPSHOT;

const listeners = new Set<() => void>();

function freshInputs(savedNos: readonly string[] = []): ContractInputs {
  const today = todayISO();
  const months = 12;
  return emptyInputs({
    contract_no: peekNextContractNo(today, savedNos),
    contract_date: today,
    start_date: today,
    contract_months: String(months),
    end_date: endDateFromStart(today, months),
  });
}

function readStorage(): Omit<DraftSnapshot, "hydrated"> {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const activeId = window.localStorage.getItem(ACTIVE_CONTRACT_ID_KEY);
    if (!raw) {
      return { inputs: freshInputs(), activeId: null, storageError: null };
    }
    const parsed = JSON.parse(raw) as Partial<ContractInputs>;
    return {
      inputs: emptyInputs({ ...parsed }),
      activeId: activeId || null,
      storageError: null,
    };
  } catch {
    return {
      inputs: freshInputs(),
      activeId: null,
      storageError: "โหลดร่างสัญญาไม่สำเร็จ",
    };
  }
}

function emit() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): DraftSnapshot {
  return snapshot;
}

function getServerSnapshot(): DraftSnapshot {
  return SERVER_SNAPSHOT;
}

function persist(next: DraftSnapshot) {
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next.inputs));
      if (next.activeId) {
        window.localStorage.setItem(ACTIVE_CONTRACT_ID_KEY, next.activeId);
      } else {
        window.localStorage.removeItem(ACTIVE_CONTRACT_ID_KEY);
      }
      snapshot = { ...next, storageError: null };
    } catch {
      snapshot = {
        ...next,
        storageError: "บันทึกร่างไม่สำเร็จ (พื้นที่เบราว์เซอร์อาจเต็ม)",
      };
    }
  } else {
    snapshot = next;
  }
  emit();
}

export function hydrateDraft() {
  if (typeof window === "undefined") return;
  if (snapshot.hydrated) return;
  const loaded = readStorage();
  snapshot = { ...loaded, hydrated: true };
  emit();
}

export function writeDraft(
  next: ContractInputs,
  activeId: string | null = snapshot.activeId
) {
  persist({
    inputs: next,
    activeId,
    hydrated: true,
    storageError: null,
  });
}

export function setActiveContractId(id: string | null) {
  persist({
    ...snapshot,
    activeId: id,
    hydrated: true,
  });
}

export function clearDraft(savedNos: readonly string[] = []) {
  persist({
    inputs: freshInputs(savedNos),
    activeId: null,
    hydrated: true,
    storageError: null,
  });
}

/** Patch contract_no on the active draft when a saved record was renumbered. */
export function patchActiveDraftContractNo(
  contractId: string,
  contractNo: string
) {
  if (snapshot.activeId !== contractId) return;
  if (snapshot.inputs.contract_no === contractNo) return;
  writeDraft(
    {
      ...snapshot.inputs,
      contract_no: contractNo,
    },
    contractId
  );
}

/** Refresh provisional number on an unsaved draft from the saved library. */
export function syncUnsavedDraftContractNo(savedNos: readonly string[]) {
  if (snapshot.activeId) return;
  const peek = peekNextContractNo(snapshot.inputs.contract_date, savedNos);
  if (snapshot.inputs.contract_no === peek) return;
  writeDraft(
    {
      ...snapshot.inputs,
      contract_no: peek,
    },
    null
  );
}

export function loadContractIntoDraft(
  id: string | null,
  inputs: ContractInputs
) {
  persist({
    inputs: emptyInputs({ ...inputs }),
    activeId: id,
    hydrated: true,
    storageError: null,
  });
}

const PRINT_PAYLOAD_KEY = "sanggan-clean-contract-print";

export function writePrintPayload(inputs: ContractInputs) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(PRINT_PAYLOAD_KEY, JSON.stringify(inputs));
  } catch {
    // ignore quota / private mode
  }
}

export function readPrintPayload(): ContractInputs | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(PRINT_PAYLOAD_KEY);
    if (!raw) {
      const draft = window.localStorage.getItem(STORAGE_KEY);
      if (!draft) return null;
      return emptyInputs(JSON.parse(draft) as Partial<ContractInputs>);
    }
    return emptyInputs(JSON.parse(raw) as Partial<ContractInputs>);
  } catch {
    return null;
  }
}

export function useContractDraft() {
  const state = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );

  useEffect(() => {
    hydrateDraft();

    function onStorage(event: StorageEvent) {
      if (event.key !== STORAGE_KEY && event.key !== ACTIVE_CONTRACT_ID_KEY) {
        return;
      }
      const loaded = readStorage();
      snapshot = { ...loaded, hydrated: true };
      emit();
    }

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setInputs = useCallback(
    (updater: ContractInputs | ((prev: ContractInputs) => ContractInputs)) => {
      const prev = snapshot.inputs;
      const next = typeof updater === "function" ? updater(prev) : updater;
      writeDraft(next, snapshot.activeId);
    },
    []
  );

  return {
    inputs: state.inputs,
    setInputs,
    activeId: state.activeId,
    hydrated: state.hydrated,
    storageError: state.storageError,
  };
}
