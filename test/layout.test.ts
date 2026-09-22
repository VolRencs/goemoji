import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildLayout,
  cellFromFlatIndex,
  emojiAt,
  firstCell,
  flatIndexAt,
  lastCell,
  moveActive,
  scrollToShowRow,
  sectionAt,
  sectionOffset,
  visibleRange,
  type Emoji,
  type Section,
} from "../src/data.ts";

function emoji(value: string): Emoji {
  return { value, label: value, tags: "", category: 0 };
}

const ROW = 10;
const HEADER = 4;

/** A: [e1 e2] [e3]; B: [e4 e5] */
const sections: Section[] = [
  { label: "A", emojis: [emoji("1"), emoji("2"), emoji("3")] },
  { label: "B", emojis: [emoji("4"), emoji("5")] },
];
const layout = buildLayout(sections, 2, ROW, HEADER);

describe("buildLayout", () => {
  it("раскладывает секции по строкам с заголовками", () => {
    assert.deepEqual(
      layout.rows.map((row) => (row.kind === "header" ? `#${row.label}` : row.emojis.map((e) => e.value).join(""))),
      ["#A", "12", "3", "#B", "45"],
    );
    assert.deepEqual(layout.offsets, [0, 4, 14, 24, 28]);
    assert.equal(layout.totalHeight, 38);
    assert.deepEqual(layout.sectionRows, [0, 3]);
  });

  it("рисунок без заголовка обходится без шапки", () => {
    const bare = buildLayout([{ emojis: [emoji("1")] }], 2, ROW, HEADER);
    assert.equal(bare.rows.length, 1);
    assert.equal(bare.totalHeight, ROW);
  });

  it("пропускает пустые секции и не теряет нумерацию", () => {
    const withEmpty = buildLayout(
      [{ label: "A", emojis: [] }, { label: "B", emojis: [emoji("1")] }],
      2,
      ROW,
      HEADER,
    );
    assert.deepEqual(withEmpty.sectionRows, [-1, 0]);
    assert.equal(withEmpty.rows.length, 2);
  });
});

describe("виртуализация", () => {
  it("берёт окно строк с запасом overscan", () => {
    assert.deepEqual(visibleRange(layout, 10, 10, 0), [1, 3]);
    assert.deepEqual(visibleRange(layout, 0, 10, 0), [0, 2]);
    assert.deepEqual(visibleRange(layout, 0, 10, 1), [0, 3]);
  });

  it("на пустом списке возвращает пустой диапазон", () => {
    const empty = buildLayout([], 2, ROW, HEADER);
    assert.deepEqual(visibleRange(empty, 0, 100), [0, 0]);
    assert.equal(sectionAt(empty, 0), -1);
  });
});

describe("секции", () => {
  it("находит секцию по позиции скролла", () => {
    assert.equal(sectionAt(layout, 0), 0);
    assert.equal(sectionAt(layout, 22), 0);
    assert.equal(sectionAt(layout, 24), 1);
    assert.equal(sectionAt(layout, 999), 1);
  });

  it("отдаёт y-координату начала секции", () => {
    assert.equal(sectionOffset(layout, 0), 0);
    assert.equal(sectionOffset(layout, 1), 24);
  });
});

describe("ячейки", () => {
  it("переводит ячейку в плоский индекс и обратно", () => {
    assert.equal(flatIndexAt(layout, { row: 1, col: 1 }), 1);
    assert.equal(flatIndexAt(layout, { row: 0, col: 0 }), -1);
    assert.deepEqual(cellFromFlatIndex(layout, 2), { row: 2, col: 0 });
    assert.deepEqual(cellFromFlatIndex(layout, 4), { row: 4, col: 1 });
    assert.equal(cellFromFlatIndex(layout, 99), null);
  });

  it("возвращает эмодзи и null для заголовка", () => {
    assert.equal(emojiAt(layout, { row: 1, col: 0 })?.value, "1");
    assert.equal(emojiAt(layout, { row: 0, col: 0 }), null);
  });
});

describe("навигация клавиатурой", () => {
  it("ход по горизонтали переходит на соседнюю строку", () => {
    assert.deepEqual(moveActive(layout, { row: 1, col: 1 }, 1, 0), { row: 2, col: 0 });
    assert.deepEqual(moveActive(layout, { row: 4, col: 0 }, -1, 0), { row: 2, col: 0 });
  });

  it("ход по вертикали перепрыгивает заголовки и выравнивает колонку", () => {
    assert.deepEqual(moveActive(layout, { row: 1, col: 1 }, 0, 1), { row: 2, col: 0 });
    assert.deepEqual(moveActive(layout, { row: 1, col: 0 }, 0, 2), { row: 4, col: 0 });
  });

  it("на границе списка остаётся на месте", () => {
    assert.deepEqual(moveActive(layout, { row: 1, col: 0 }, 0, -1), { row: 1, col: 0 });
    assert.deepEqual(moveActive(layout, { row: 4, col: 1 }, 1, 0), { row: 4, col: 1 });
  });

  it("Home/End указывают на первый и последний эмодзи", () => {
    assert.deepEqual(firstCell(layout), { row: 1, col: 0 });
    assert.deepEqual(lastCell(layout), { row: 4, col: 1 });
  });
});

describe("scrollToShowRow", () => {
  it("подтягивает строку к низу окна", () => {
    assert.equal(scrollToShowRow(layout, 4, 0, 10), 28);
  });

  it("учитывает липкую шапку", () => {
    assert.equal(scrollToShowRow(layout, 1, 30, 10, HEADER), 0);
    assert.equal(scrollToShowRow(layout, 1, 30, 10), 4);
  });

  it("не двигает скролл, если строка уже видна", () => {
    assert.equal(scrollToShowRow(layout, 4, 28, 10), 28);
  });
});
