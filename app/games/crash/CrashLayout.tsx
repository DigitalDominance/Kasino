"use client";

import { PropsWithChildren } from "react";
import styles from "./CrashLayout.module.css";

export type CrashLayoutProps = PropsWithChildren;

export default function CrashLayout({ children }: CrashLayoutProps) {
  return <div className={styles.crashLayout}>{children}</div>;
}
