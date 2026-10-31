import React from "react";

import { createPasteEvent } from "../clipboard";
import { Excalidraw } from "../index";
import {
  fireEvent,
  GlobalTestState,
  render,
  screen,
  waitFor,
} from "../tests/test-utils";

const { h } = window;

const pasteSpreadsheet = (text: string) => {
  document.dispatchEvent(
    createPasteEvent({
      types: { "text/plain": text },
    }),
  );
};

describe("<PasteChartDialog />", () => {
  beforeEach(async () => {
    await render(<Excalidraw autoFocus={true} handleKeyboardGlobally={true} />);
    Object.assign(document, {
      elementFromPoint: () => GlobalTestState.canvas,
    });
  });

  it("offers a table beside the bar, line and radar charts", async () => {
    pasteSpreadsheet("time\tvalue\tother\nA\t10\t1\nB\t20\t2\nC\t30\t3");

    const dialog = await screen.findByRole("dialog");
    await waitFor(() => {
      expect(h.state.openDialog?.name).toBe("charts");
    });

    const labels = Array.from(
      dialog.querySelectorAll<HTMLElement>(".ChartPreview"),
    ).map((button) => button.getAttribute("aria-label"));

    expect(labels).toEqual(
      expect.arrayContaining(["Bar chart", "Line chart", "Table"]),
    );
    expect(labels).toContain("Radar chart");

    // the table gets a rendered preview like the other chart types
    const tableButton = screen.getByRole("button", { name: "Table" });
    await waitFor(() => {
      expect(
        tableButton.querySelector(".ChartPreview__canvas svg"),
      ).not.toBeNull();
    });
  });

  it("inserts the table elements on the canvas when chosen", async () => {
    pasteSpreadsheet("time\tvalue\nA\t10\nB\t20\nC\t30");

    const tableButton = await screen.findByRole("button", { name: "Table" });
    await waitFor(() => {
      expect(
        tableButton.querySelector(".ChartPreview__canvas svg"),
      ).not.toBeNull();
    });
    expect(h.elements.length).toBe(0);

    fireEvent.click(tableButton);

    await waitFor(() => {
      expect(h.state.openDialog).toBe(null);
    });

    const rectangles = h.elements.filter((el) => el.type === "rectangle");
    const texts = h.elements.filter((el) => el.type === "text");
    // 4 rows (header + 3 labels) x 2 columns
    expect(rectangles.length).toBe(8);
    expect(texts.length).toBe(8);
    expect(texts.map((el) => (el as { text: string }).text)).toEqual(
      expect.arrayContaining(["value", "A", "B", "C", "10", "20", "30"]),
    );
  });
});
