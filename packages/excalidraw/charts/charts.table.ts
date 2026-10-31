import {
  FONT_SIZES,
  ROUGHNESS,
  getFontString,
  getLineHeight,
  randomId,
} from "@excalidraw/common";

import {
  measureText,
  newElementWith,
  newElement,
  newTextElement,
} from "@excalidraw/element";

import type { RenderEnvironment } from "@excalidraw/element";

import type { NonDeletedExcalidrawElement } from "@excalidraw/element/types";

import {
  TABLE_CELL_PADDING_X,
  TABLE_CELL_PADDING_Y,
  TABLE_MIN_COLUMN_WIDTH,
  commonProps,
} from "./charts.constants";
import {
  getBackgroundColor,
  getColorOffset,
  isSpreadsheetValidForChartType,
} from "./charts.helpers";

import type { ChartElements, Spreadsheet } from "./charts.types";

/**
 * Converts a spreadsheet into a plain grid of strings. The first row is the
 * header row (series titles). When the spreadsheet has labels, the first
 * column holds them (the top-left cell holds the spreadsheet title, if any).
 */
export const getTableCells = (spreadsheet: Spreadsheet): string[][] => {
  const { labels, series } = spreadsheet;
  const rowCount = labels?.length ?? series[0]?.values.length ?? 0;

  const header = series.map(
    (seriesItem, index) => seriesItem.title?.trim() || `Series ${index + 1}`,
  );
  const rows = Array.from({ length: rowCount }, (_, rowIndex) =>
    series.map((seriesItem) => {
      const value = seriesItem.values[rowIndex];
      return value === undefined ? "" : String(value);
    }),
  );

  if (!labels) {
    return [header, ...rows];
  }

  return [
    [spreadsheet.title ?? "", ...header],
    ...rows.map((row, rowIndex) => [labels[rowIndex], ...row]),
  ];
};

export const renderTable = (
  spreadsheet: Spreadsheet,
  x: number,
  y: number,
  colorSeed?: number,
  renderEnvironment?: RenderEnvironment,
): ChartElements | null => {
  if (!isSpreadsheetValidForChartType(spreadsheet, "table")) {
    return null;
  }

  const cells = getTableCells(spreadsheet);
  const columnCount = cells[0].length;

  const fontFamily = commonProps.fontFamily;
  const fontSize = FONT_SIZES.md;
  const lineHeight = getLineHeight(fontFamily);
  const fontString = getFontString({ fontFamily, fontSize });

  const metrics = cells.map((row) =>
    row.map((text) =>
      text
        ? measureText(text, fontString, lineHeight, renderEnvironment)
        : { width: 0, height: 0 },
    ),
  );

  // size columns to fit the widest text in each of them
  const columnWidths = Array.from({ length: columnCount }, (_, column) =>
    Math.max(
      TABLE_MIN_COLUMN_WIDTH,
      Math.ceil(
        Math.max(...metrics.map((row) => row[column].width)) +
          TABLE_CELL_PADDING_X * 2,
      ),
    ),
  );
  const rowHeights = metrics.map((row) =>
    Math.ceil(
      Math.max(
        measureText("M", fontString, lineHeight, renderEnvironment).height,
        ...row.map((cell) => cell.height),
      ) +
        TABLE_CELL_PADDING_Y * 2,
    ),
  );

  const headerBackgroundColor = getBackgroundColor(getColorOffset(colorSeed));

  // the whole table shares one group so it moves and selects as one
  const groupIds = [randomId()];

  const elements: NonDeletedExcalidrawElement[] = [];
  let cellY = y;
  cells.forEach((row, rowIndex) => {
    let cellX = x;
    row.forEach((text, columnIndex) => {
      const width = columnWidths[columnIndex];
      const height = rowHeights[rowIndex];
      const isHeader = rowIndex === 0;

      const cell = newElement({
        ...commonProps,
        type: "rectangle",
        x: cellX,
        y: cellY,
        width,
        height,
        fillStyle: "solid",
        // the header row is visually distinct from the body rows
        backgroundColor: isHeader ? headerBackgroundColor : "transparent",
        roughness: ROUGHNESS.artist,
        groupIds,
      });

      // empty cells (e.g. top-left corner) get no text element
      if (text) {
        // the text is bound to its cell as a container, so double-clicking
        // the cell edits the text
        const cellText = newTextElement({
          ...commonProps,
          text,
          originalText: text,
          // text is anchored at its center (center/middle aligned)
          x: cellX + width / 2,
          y: cellY + height / 2,
          fontFamily,
          fontSize,
          lineHeight,
          textAlign: "center",
          verticalAlign: "middle",
          containerId: cell.id,
          groupIds,
          renderEnvironment,
        });
        elements.push(
          newElementWith(cell, {
            boundElements: [{ type: "text", id: cellText.id }],
          }),
          cellText,
        );
      } else {
        elements.push(cell);
      }

      cellX += width;
    });
    cellY += rowHeights[rowIndex];
  });

  return elements;
};
