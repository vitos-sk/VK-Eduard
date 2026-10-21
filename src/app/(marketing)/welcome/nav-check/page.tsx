"use client";

import { useState } from "react";
import { Building2, Clock, FileText, House, Sparkles, Check, Copy } from "lucide-react";
import { FabButton } from "@/components/layout/FabButton";

interface Preset {
  id: string;
  name: string;
  desc: string;
  navBg: string;
  perfBorder: boolean;
  pillBg: string;
  pillShape: "pill" | "squircle" | "circle";
  activeText: string;
  inactiveText: string;
}

const PRESETS: Preset[] = [
  {
    id: "original-paper-pill",
    name: "1. Классика + Плашка цвета фона (Рекомендуем!)",
    desc: "Бар как было (светлый ticket + пунктир perf-t), а активная кнопка выделена цветом экрана (paper #f3ecdc)",
    navBg: "#fffdf7",
    perfBorder: true,
    pillBg: "#f3ecdc",
    pillShape: "pill",
    activeText: "#1f5a17",
    inactiveText: "#5e6049",
  },
  {
    id: "original-squircle",
    name: "2. Классика + Мягкий квадратик",
    desc: "Светлый бар, пунктир, активная иконка в аккуратном скругленном квадратике цвета бумаги",
    navBg: "#fffdf7",
    perfBorder: true,
    pillBg: "#f3ecdc",
    pillShape: "squircle",
    activeText: "#1f5a17",
    inactiveText: "#5e6049",
  },
  {
    id: "original-green-tint",
    name: "3. Классика + Нежно-зелёный тинт",
    desc: "Светлый бар, активная кнопка в мягкой пастельно-зелёной таблетке (#e9f0e1) в тон лесному зелёному",
    navBg: "#fffdf7",
    perfBorder: true,
    pillBg: "#e9f0e1",
    pillShape: "pill",
    activeText: "#1f5a17",
    inactiveText: "#5e6049",
  },
  {
    id: "light-sage",
    name: "4. Светлый шалфей (Зеленоватый бар)",
    desc: "Бар нежного пастельно-зеленого тона (#e2e8db), плашка — цвет бумаги (#f3ecdc)",
    navBg: "#e2e8db",
    perfBorder: false,
    pillBg: "#f3ecdc",
    pillShape: "pill",
    activeText: "#1f5a17",
    inactiveText: "#3b4733",
  },
  {
    id: "dark-forest",
    name: "5. Глубокий хвойный (Тёмный премиум)",
    desc: "Бар темно-зеленый (#193317), активная плашка — цвет бумаги (#f3ecdc) с темно-зеленой иконкой",
    navBg: "#193317",
    perfBorder: false,
    pillBg: "#f3ecdc",
    pillShape: "pill",
    activeText: "#1f5a17",
    inactiveText: "#9eb09a",
  },
  {
    id: "original-exact",
    name: "6. Точно как было раньше (с желтой риской)",
    desc: "Оригинальный вид до Claude: светлый ticket, сверху перфорация, сверху активной иконки желтая риска",
    navBg: "#fffdf7",
    perfBorder: true,
    pillBg: "transparent",
    pillShape: "pill",
    activeText: "#1f5a17",
    inactiveText: "#5e6049",
  },
];

export default function NavCheckPage() {
  const [selectedPresetId, setSelectedPresetId] = useState<string>("original-paper-pill");
  const [navBg, setNavBg] = useState<string>("#fffdf7");
  const [pillBg, setPillBg] = useState<string>("#f3ecdc");
  const [pillShape, setPillShape] = useState<"pill" | "squircle" | "circle">("pill");
  const [perfBorder, setPerfBorder] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<number>(0);
  const [copied, setCopied] = useState<boolean>(false);

  const applyPreset = (preset: Preset) => {
    setSelectedPresetId(preset.id);
    setNavBg(preset.navBg);
    setPillBg(preset.pillBg);
    setPillShape(preset.pillShape);
    setPerfBorder(preset.perfBorder);
  };

  const navItems = [
    { label: "Головна", icon: House },
    { label: "Об'єкти", icon: Building2 },
    { label: "Години", icon: Clock },
    { label: "Звіти", icon: FileText },
  ];

  const getShapeClass = () => {
    if (pillShape === "pill") return "h-7 w-14 rounded-full";
    if (pillShape === "squircle") return "h-8 w-11 rounded-xl";
    return "size-8 rounded-full"; // circle
  };

  // Is dark nav?
  const isDark = navBg === "#193317";

  return (
    <div className="min-h-screen bg-[#ede6d4] p-4 text-[#1c2716] md:p-8">
      <div className="mx-auto max-w-4xl">
        <header className="mb-6 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-[#1f5a17] text-white">
              <Sparkles className="size-4" />
            </span>
            <h1 className="text-xl font-bold tracking-tight md:text-2xl">
              Интерактивный подбор нижней панели навигации
            </h1>
          </div>
          <p className="text-sm text-[#5e6049]">
            Покрутите варианты в реальном времени. В окне справа/снизу отображается реальный экран на фоне{" "}
            <code className="rounded bg-[#e4d8ba] px-1 py-0.5 text-xs font-mono font-bold">paper: #f3ecdc</code>.
          </p>
        </header>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Controls column */}
          <div className="flex flex-col gap-6 lg:col-span-7">
            {/* Presets */}
            <div className="rounded-2xl border border-[#e4d8ba] bg-[#fffdf7] p-5 shadow-sm">
              <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-[#5e6049]">
                Готовые варианты
              </h2>
              <div className="flex flex-col gap-2.5">
                {PRESETS.map((p) => {
                  const isCurrent = selectedPresetId === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => applyPreset(p)}
                      className={`flex flex-col rounded-xl border p-3 text-left transition-all ${
                        isCurrent
                          ? "border-[#1f5a17] bg-[#e9f0e1]/60 shadow-sm"
                          : "border-[#e4d8ba] bg-[#fffdf7] hover:border-[#cdbf9b]"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs md:text-sm text-[#1c2716]">
                          {p.name}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span
                            className="size-4 rounded border border-black/10"
                            style={{ backgroundColor: p.navBg }}
                            title={`Фон: ${p.navBg}`}
                          />
                          <span
                            className="size-4 rounded border border-black/10"
                            style={{ backgroundColor: p.pillBg }}
                            title={`Плашка: ${p.pillBg}`}
                          />
                        </div>
                      </div>
                      <span className="mt-1 text-xs text-[#5e6049]">{p.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Fine tuning */}
            <div className="rounded-2xl border border-[#e4d8ba] bg-[#fffdf7] p-5 shadow-sm">
              <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-[#5e6049]">
                Тонкая настройка
              </h2>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Nav Background */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-[#1c2716]">
                    Цвет панели (фон бара):
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={navBg}
                      onChange={(e) => {
                        setNavBg(e.target.value);
                        setSelectedPresetId("custom");
                      }}
                      className="size-8 cursor-pointer rounded border border-[#e4d8ba]"
                    />
                    <input
                      type="text"
                      value={navBg}
                      onChange={(e) => {
                        setNavBg(e.target.value);
                        setSelectedPresetId("custom");
                      }}
                      className="w-24 rounded border border-[#e4d8ba] px-2 py-1 font-mono text-xs"
                    />
                  </div>
                </div>

                {/* Pill Background */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-[#1c2716]">
                    Цвет выделения (плашка):
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={pillBg === "transparent" ? "#f3ecdc" : pillBg}
                      onChange={(e) => {
                        setPillBg(e.target.value);
                        setSelectedPresetId("custom");
                      }}
                      className="size-8 cursor-pointer rounded border border-[#e4d8ba]"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setPillBg("#f3ecdc");
                        setSelectedPresetId("custom");
                      }}
                      className="rounded border border-[#e4d8ba] bg-[#f3ecdc] px-2 py-1 text-xs font-semibold"
                    >
                      Фон (paper)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPillBg("#e9f0e1");
                        setSelectedPresetId("custom");
                      }}
                      className="rounded border border-[#e4d8ba] bg-[#e9f0e1] px-2 py-1 text-xs font-semibold"
                    >
                      Зелёный тинт
                    </button>
                  </div>
                </div>

                {/* Shape */}
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <label className="text-xs font-semibold text-[#1c2716]">
                    Форма выделения иконки:
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { id: "pill", label: "Таблетка (Капсула)" },
                      { id: "squircle", label: "Мягкий квадратик" },
                      { id: "circle", label: "Кружок" },
                    ].map((shape) => (
                      <button
                        key={shape.id}
                        type="button"
                        onClick={() => {
                          setPillShape(shape.id as any);
                          setSelectedPresetId("custom");
                        }}
                        className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                          pillShape === shape.id
                            ? "border-[#1f5a17] bg-[#1f5a17] text-white"
                            : "border-[#e4d8ba] bg-[#fffdf7] text-[#1c2716]"
                        }`}
                      >
                        {shape.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Perforation */}
                <div className="flex items-center gap-2 sm:col-span-2">
                  <input
                    type="checkbox"
                    id="perfCheck"
                    checked={perfBorder}
                    onChange={(e) => {
                      setPerfBorder(e.target.checked);
                      setSelectedPresetId("custom");
                    }}
                    className="size-4 accent-[#1f5a17]"
                  />
                  <label htmlFor="perfCheck" className="text-xs font-medium cursor-pointer">
                    Пунктирная перфорация сверху бара (фирменный стиль талонов)
                  </label>
                </div>
              </div>
            </div>

            {/* Generated Code Snippet */}
            <div className="rounded-2xl border border-[#e4d8ba] bg-[#fffdf7] p-5 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-sm font-bold uppercase tracking-wider text-[#5e6049]">
                  Как применить этот выбор в коде
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    const text = `// src/components/layout/BottomNav.tsx\n// Фон <nav>: bg-[${navBg}] ${perfBorder ? "perf-t" : ""}\n// Плашка: ${getShapeClass()} bg-[${pillBg}]`;
                    navigator.clipboard.writeText(text);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="flex items-center gap-1 text-xs text-[#1f5a17] hover:underline"
                >
                  {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                  {copied ? "Скопировано!" : "Копировать"}
                </button>
              </div>
              <div className="rounded-lg bg-[#1c2716] p-3 text-xs font-mono text-[#f3ecdc]">
                <p className="text-[#a3b89e]">// 1. В src/components/layout/BottomNav.tsx:</p>
                <p className="mt-1">
                  &lt;nav className=&quot;{perfBorder ? "perf-t " : ""}relative z-60 shrink-0 pb-[env(safe-area-inset-bottom)]&quot; style=&#123;&#123; backgroundColor: &quot;{navBg}&quot; &#125;&#125;&gt;
                </p>
                <p className="mt-2 text-[#a3b89e]">// 2. Внутри NavTab для плашки иконки:</p>
                <p className="mt-1">
                  &lt;span className=&#123;cn(&quot;grid {getShapeClass()} place-items-center transition-colors&quot;, isActive && &quot;{pillBg === "#f3ecdc" ? "bg-paper" : pillBg === "#e9f0e1" ? "bg-primary-tint" : `bg-[${pillBg}]`}&quot;)&#125;&gt;
                </p>
              </div>
            </div>
          </div>

          {/* Phone Preview Column */}
          <div className="flex flex-col items-center lg:col-span-5">
            <div className="sticky top-6 flex flex-col items-center">
              <span className="mb-2 text-xs font-semibold text-[#5e6049]">
                Превью на экране 390 px (кликните вкладки!)
              </span>

              {/* Phone Frame */}
              <div className="relative flex h-[620px] w-[340px] sm:w-[370px] flex-col overflow-hidden rounded-[40px] border-[8px] border-[#2c2f2c] bg-[#f3ecdc] shadow-2xl">
                {/* Phone Speaker notch */}
                <div className="absolute top-2 left-1/2 z-50 h-4 w-28 -translate-x-1/2 rounded-full bg-[#1c1c1e]" />

                {/* Status Bar simulation */}
                <div className="flex h-10 w-full items-center justify-between px-6 pt-2 text-[11px] font-semibold text-[#1c2716]">
                  <span>09:41</span>
                  <div className="flex gap-1.5 items-center">
                    <span className="text-[10px]">5G</span>
                    <span className="text-[10px]">100%</span>
                  </div>
                </div>

                {/* Mock Content on screen (paper background) */}
                <div className="flex-1 overflow-y-auto px-4 pt-3 pb-6 text-[#1c2716]">
                  <div className="flex items-center justify-between pb-3">
                    <h2 className="text-xl font-bold tracking-tight">Об&apos;єкти</h2>
                    <span className="rounded-full bg-[#efe5cc] px-2.5 py-0.5 text-xs font-semibold text-[#5e6049]">
                      14 активних
                    </span>
                  </div>

                  {/* Mock card 1 */}
                  <div className="mb-3 rounded-xl border border-[#e4d8ba] bg-[#fffdf7] p-3 shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm">ЖК «Крона Парк»</span>
                      <span className="rounded bg-[#e9f0e1] px-2 py-0.5 text-[10px] font-semibold text-[#1f5a17]">
                        В роботі
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-[#5e6049]">Бровари, вул. Чорновола, 24</p>
                    <div className="mt-2.5 flex items-center justify-between border-t border-dashed border-[#cdbf9b] pt-2 text-[11px] text-[#5e6049]">
                      <span>Бригада: 6 осіб</span>
                      <span className="font-semibold text-[#1c2716]">342 год</span>
                    </div>
                  </div>

                  {/* Mock card 2 */}
                  <div className="mb-3 rounded-xl border border-[#e4d8ba] bg-[#fffdf7] p-3 shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm">ТЦ «Лавина» — Секція Б</span>
                      <span className="rounded bg-[#e9f0e1] px-2 py-0.5 text-[10px] font-semibold text-[#1f5a17]">
                        В роботі
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-[#5e6049]">Київ, вул. Берковецька, 6Д</p>
                    <div className="mt-2.5 flex items-center justify-between border-t border-dashed border-[#cdbf9b] pt-2 text-[11px] text-[#5e6049]">
                      <span>Бригада: 4 особи</span>
                      <span className="font-semibold text-[#1c2716]">188 год</span>
                    </div>
                  </div>

                  {/* Mock notice */}
                  <div className="rounded-xl border border-[#cdbf9b] bg-[#efe5cc]/60 p-3 text-xs text-[#5e6049]">
                    Тут фоновий колір екрана — <strong className="text-[#1c2716]">paper (#f3ecdc)</strong>. Зверніть увагу, як бар взаємодіє з карточками та фоном!
                  </div>
                </div>

                {/* Real interactive bottom nav simulation */}
                <nav
                  aria-label="Navigation Preview"
                  className={`relative z-20 shrink-0 pb-5 transition-colors duration-200 ${
                    perfBorder ? "border-t border-dashed border-[#cdbf9b]" : ""
                  }`}
                  style={{ backgroundColor: navBg }}
                >
                  <div className="grid min-h-[52px] grid-cols-5 items-start px-1 pt-1.5">
                    {/* Left 2 items */}
                    {navItems.slice(0, 2).map((item, idx) => {
                      const isActive = activeTab === idx;
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.label}
                          type="button"
                          onClick={() => setActiveTab(idx)}
                          className="relative flex min-h-11 flex-col items-center gap-0.5 text-[11px] leading-[13px] outline-none"
                          style={{
                            color: isActive
                              ? isDark && pillBg === "transparent"
                                ? "#ffffff"
                                : "#1f5a17"
                              : isDark
                              ? "#9eb09a"
                              : "#5e6049",
                            fontWeight: isActive ? 600 : 500,
                          }}
                        >
                          {/* Yellow top line if original exact */}
                          {selectedPresetId === "original-exact" && isActive && (
                            <span className="absolute -top-1.5 left-1/2 h-0.5 w-4 -translate-x-1/2 bg-[#f5c43c]" />
                          )}

                          <span
                            className={`grid ${getShapeClass()} place-items-center transition-all duration-150`}
                            style={{
                              backgroundColor: isActive ? pillBg : "transparent",
                            }}
                          >
                            <Icon
                              className="size-[22px]"
                              strokeWidth={isActive ? 2.2 : 1.9}
                              style={{
                                color: isActive ? (isDark && pillBg === "transparent" ? "#fff" : "#1f5a17") : "currentColor",
                              }}
                            />
                          </span>
                          <span>{item.label}</span>
                        </button>
                      );
                    })}

                    {/* FAB [+] button */}
                    <div className="-mt-2.5 flex justify-center">
                      <FabButton onClick={() => {}} />
                    </div>

                    {/* Right 2 items */}
                    {navItems.slice(2).map((item, idx) => {
                      const realIdx = idx + 2;
                      const isActive = activeTab === realIdx;
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.label}
                          type="button"
                          onClick={() => setActiveTab(realIdx)}
                          className="relative flex min-h-11 flex-col items-center gap-0.5 text-[11px] leading-[13px] outline-none"
                          style={{
                            color: isActive
                              ? isDark && pillBg === "transparent"
                                ? "#ffffff"
                                : "#1f5a17"
                              : isDark
                              ? "#9eb09a"
                              : "#5e6049",
                            fontWeight: isActive ? 600 : 500,
                          }}
                        >
                          {selectedPresetId === "original-exact" && isActive && (
                            <span className="absolute -top-1.5 left-1/2 h-0.5 w-4 -translate-x-1/2 bg-[#f5c43c]" />
                          )}

                          <span
                            className={`grid ${getShapeClass()} place-items-center transition-all duration-150`}
                            style={{
                              backgroundColor: isActive ? pillBg : "transparent",
                            }}
                          >
                            <Icon
                              className="size-[22px]"
                              strokeWidth={isActive ? 2.2 : 1.9}
                              style={{
                                color: isActive ? (isDark && pillBg === "transparent" ? "#fff" : "#1f5a17") : "#1f5a17",
                              }}
                            />
                          </span>
                          <span>{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </nav>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
