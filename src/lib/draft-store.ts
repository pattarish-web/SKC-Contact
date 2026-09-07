"use client";

import {
  emptyInputs,
  nextContractNo,
  STORAGE_KEY,
  type ContractInputs,
} from "@/lib/contract";
import { endDateFromStart, todayISO } from "@/lib/thai";
import { useCallback, useSyncExternalStore } from "react";

let snapshot: ContractInputs | null = null;
const listeners = new Set<() => void>();

function freshInputs(): ContractInputs {
  const today = todayISO();
  const months = 12;
  return emptyInputs({
    contract_no: nextContractNo(),
    contract_date: today,
    start_date: today,
    contract_months: String(months),
    end_date: endDateFromStart(today, months),
  });
}

function readStorage(): ContractInputs {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return freshInputs();
    const parsed = JSON.parse(raw) as Partial<ContractInputs>;
    return emptyInputs({ ...freshInputs(), ...parsed });
  } catch {
    return freshInputs();
  }
}

const SERVER_SNAPSHOT = emptyInputs();

function getSnapshot(): ContractInputs {
  if (typeof window === "undefined") {
    return SERVER_SNAPSHOT;
  }
  if (!snapshot) snapshot = readStorage();
  return snapshot;
}

function getServerSnapshot(): ContractInputs {
  return SERVER_SNAPSHOT;
}

function emit() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function writeDraft(next: ContractInputs) {
  snapshot = next;
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }
  emit();
}

export function clearDraft() {
  snapshot = freshInputs();
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(STORAGE_KEY);
  }
  emit();
}

export function useContractDraft() {
  const inputs = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );

  const setInputs = useCallback(
    (updater: ContractInputs | ((prev: ContractInputs) => ContractInputs)) => {
      const prev = getSnapshot();
      const next = typeof updater === "function" ? updater(prev) : updater;
      writeDraft(next);
    },
    []
  );

  return [inputs, setInputs] as const;
}
