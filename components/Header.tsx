"use client";

import styles from "./Header.module.css";

export type TabId = "all" | "favorites";

type HeaderProps = {
  active: TabId;
  onChange: (tab: TabId) => void;
};

export function Header({ active, onChange }: HeaderProps) {
  return (
    <header className={styles.bar}>
      <button
        type="button"
        className={`${styles.tab} ${active === "all" ? styles.tabActive : ""}`}
        onClick={() => onChange("all")}
      >
        Все котики
      </button>
      <button
        type="button"
        className={`${styles.tab} ${active === "favorites" ? styles.tabActive : ""}`}
        onClick={() => onChange("favorites")}
      >
        Любимые котики
      </button>
    </header>
  );
}
