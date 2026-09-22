import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { EmojiPicker, useEmojiData, type Emoji, type ServerEmoji } from "goemoji";
import "../src/styles.css";

const SERVER_EMOJIS: ServerEmoji[] = [
  { id: "100000000000000001", name: "party_parrot", animated: false },
  { id: "100000000000000002", name: "cat_jam", animated: true },
  { id: "100000000000000003", name: "blob_dance", animated: true },
  { id: "100000000000000004", name: "pepe_think", animated: false },
  { id: "100000000000000005", name: "this_is_fine", animated: false },
  { id: "100000000000000006", name: "cat_heart", animated: false },
  { id: "100000000000000007", name: "gopher_dance", animated: true },
  { id: "100000000000000008", name: "ship_it", animated: false },
];

function App() {
  const [locale, setLocale] = useState<"ru" | "en">("ru");
  const [columns, setColumns] = useState(8);
  const [withServer, setWithServer] = useState(true);
  const [picked, setPicked] = useState<Emoji | null>(null);

  const { data, error } = useEmojiData(
    () => (locale === "ru" ? import("../data/ru.json") : import("../data/en.json")),
    [locale],
  );

  return (
    <div className="wrap">
      <div className="panel">
        {error && <p>Ошибка данных: {error.message}</p>}
        {!data && !error && <p>Загружаем словарь…</p>}
        {data && (
          <EmojiPicker
            data={data}
            serverEmojis={withServer ? SERVER_EMOJIS : []}
            columns={columns}
            locale={locale}
            recentKey="demo:recent"
            onSelect={setPicked}
            serverIconUrl="https://cdn.discordapp.com/icons/0/0.png?size=64"
          />
        )}
      </div>

      <div className="controls">
        <label>
          Локаль
          <select value={locale} onChange={(event) => setLocale(event.target.value as "ru" | "en")}>
            <option value="ru">ru</option>
            <option value="en">en</option>
          </select>
        </label>
        <label>
          Колонок
          <input
            type="number"
            min={5}
            max={12}
            value={columns}
            onChange={(event) => setColumns(Number(event.target.value))}
          />
        </label>
        <label>
          <input
            type="checkbox"
            checked={withServer}
            onChange={(event) => setWithServer(event.target.checked)}
          />
          Серверные эмодзи
        </label>
        <p>
          Выбрано: <code>{picked ? picked.value : "—"}</code>
          <br />
          <code>{picked ? picked.label : ""}</code>
        </p>
      </div>
    </div>
  );
}

createRoot(document.getElementById("app")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
