export const setupTestPrintWindow = (printContent: string): Promise<Window> => {
	return new Promise((resolve, reject) => {
		try {
			const printWindow = window.open("", "_blank");
			if (!printWindow) {
				reject(new Error("Please allow popups to print the test"));
				return;
			}

			printWindow.onerror = () => {
				reject(new Error("Failed to load print window"));
			};

			const timeout = setTimeout(() => {
				reject(new Error("Print window failed to load within 10 seconds"));
			}, 10000);

			printWindow.document.write(printContent);
			printWindow.document.close();

			printWindow.onload = () => {
				setTimeout(() => {
					try {
						printWindow.focus();
						printWindow.print();
					} catch (e) {
						import("@/lib/utils/logging/logger")
							.then((m) => m.default.warn("Immediate auto-print failed", e))
							.catch(() => {
								// Ignore import errors - logger is optional for printing
							});
					}
				}, 200);

				if (printWindow.PagedPolyfill) {
					printWindow.PagedPolyfill.preview();
				} else {
					setTimeout(() => {
						const fallbackInstructions =
							printWindow.document.createElement("div");
						fallbackInstructions.innerHTML = `
              <div style="position: fixed; top: 0; left: 0; right: 0; background: #dc3545; color: white; padding: 15px; text-align: center; z-index: 9999; font-family: Arial, sans-serif;">
                <h3 style="margin: 0 0 10px 0;">Paged.js Failed to Load</h3>
                <p style="margin: 0 0 15px 0;">The test is ready but without advanced pagination. You can still print using the button below or Ctrl+P.</p>
                <button id="__print_btn__" style="padding: 10px 20px; background: white; color: #dc3545; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;">
                  🖨️ Print Anyway
                </button>
                <button id="__close_btn__" style="padding: 10px 20px; background: #333; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; margin-left: 10px;">
                  ✕ Close
                </button>
              </div>
            `;
						printWindow.document.body.appendChild(fallbackInstructions);
						const printBtn =
							printWindow.document.getElementById("__print_btn__");
						const closeBtn =
							printWindow.document.getElementById("__close_btn__");
						if (printBtn) {
							printBtn.addEventListener("click", () => printWindow.print());
						}
						if (closeBtn) {
							closeBtn.addEventListener("click", () => printWindow.close());
						}
					}, 500);
				}

				try {
					const banner = printWindow.document.createElement("div");
					banner.setAttribute("id", "__paged_banner__");
					banner.style.cssText =
						"position: fixed; top: 0; left: 0; right: 0; background: #007bff; color: white; padding: 12px; text-align: center; z-index: 99999; font-family: Arial, sans-serif;";
					banner.innerHTML = `
            <div style="display:flex; justify-content:center; align-items:center; gap:12px;">
              <div style="font-weight:600;">Ready to print — click Print or press Ctrl/Cmd+P</div>
              <button id="__paged_print_btn__" style="padding:8px 14px; background:white; color:#007bff; border:none; border-radius:6px; cursor:pointer; font-weight:700;">🖨️ Print</button>
              <button id="__paged_close_btn__" style="padding:8px 14px; background:#333; color:white; border:none; border-radius:6px; cursor:pointer; font-weight:700;">✕ Close</button>
            </div>
          `;
					printWindow.document.body.prepend(banner);
					const pbtn = printWindow.document.getElementById(
						"__paged_print_btn__",
					);
					const cbtn = printWindow.document.getElementById(
						"__paged_close_btn__",
					);
					if (pbtn) {
						pbtn.addEventListener("click", () => {
							try {
								printWindow.focus();
							} catch {
								// Ignore focus errors
							}
							printWindow.print();
						});
					}
					if (cbtn) {
						cbtn.addEventListener("click", () => printWindow.close());
					}
				} catch (e) {
					import("@/lib/utils/logging/logger")
						.then((m) =>
							m.default.error("Failed to inject banner into print window", e),
						)
						.catch(() => {
							// Ignore logger import errors
						});
				}

				try {
					printWindow.focus();
				} catch {
					// Ignore focus errors
				}
				clearTimeout(timeout);
				resolve(printWindow);
			};
		} catch (error) {
			reject(
				new Error(
					`Failed to create print window: ${error instanceof Error ? error.message : "Unknown error"}`,
				),
			);
		}
	});
};
