import { useEffect, useState } from "react";

export function usePanelHeight(): number | null {
	const [panelHeight, setPanelHeight] = useState<number | null>(null);

	useEffect(() => {
		if (typeof window === "undefined") {
			return;
		}
		const target = document.querySelector(
			"[data-test-config]",
		) as HTMLElement | null;
		if (!target) {
			return;
		}
		const update = () => {
			try {
				const rect = target.getBoundingClientRect();
				if (rect && rect.height > 0) {
					setPanelHeight(rect.height);
				}
			} catch {
				// Ignore getBoundingClientRect errors
			}
		};
		update();
		let ro: ResizeObserver | null = null;
		try {
			ro = new ResizeObserver(() => update());
			ro.observe(target);
		} catch {
			window.addEventListener("resize", update);
		}
		return () => {
			if (ro) {
				try {
					ro.disconnect();
				} catch {
					// Ignore disconnect errors
				}
			} else {
				window.removeEventListener("resize", update);
			}
		};
	}, []);

	useEffect(() => {
		const t = setTimeout(() => {
			const target = document.querySelector(
				"[data-test-config]",
			) as HTMLElement | null;
			if (target) {
				const rect = target.getBoundingClientRect();
				if (rect && rect.height > 0) {
					setPanelHeight(rect.height);
				}
			}
		}, 0);
		return () => clearTimeout(t);
	}, []);

	return panelHeight;
}
