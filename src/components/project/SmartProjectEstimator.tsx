import { useMemo, useState } from "react";
import { Calculator, Sparkles, Wrench } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSupport } from "@/components/support/support-context";

type Mode = "tiling" | "painting" | "cleaning" | "technology";

const MODES: Array<{ id: Mode; label: string }> = [
  { id: "tiling", label: "Tiling" },
  { id: "painting", label: "Painting" },
  { id: "cleaning", label: "Cleaning" },
  { id: "technology", label: "Technology" },
];

function n(value: string, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function SmartProjectEstimator({ projectName }: { projectName: string }) {
  const { open } = useSupport();
  const [mode, setMode] = useState<Mode>("tiling");

  const [area, setArea] = useState("20");
  const [tileWidth, setTileWidth] = useState("600");
  const [tileHeight, setTileHeight] = useState("600");
  const [tileWaste, setTileWaste] = useState("10");
  const [tilesPerBox, setTilesPerBox] = useState("");

  const [wallArea, setWallArea] = useState("40");
  const [coats, setCoats] = useState("2");
  const [coverage, setCoverage] = useState("10");
  const [paintWaste, setPaintWaste] = useState("10");

  const [cleaningArea, setCleaningArea] = useState("100");
  const [rooms, setRooms] = useState("4");
  const [cleaningType, setCleaningType] = useState<"standard" | "deep">("standard");

  const [techArea, setTechArea] = useState("120");
  const [floors, setFloors] = useState("1");

  const result = useMemo(() => {
    if (mode === "tiling") {
      const floorArea = Math.max(0, n(area));
      const w = Math.max(1, n(tileWidth, 600)) / 1000;
      const h = Math.max(1, n(tileHeight, 600)) / 1000;
      const waste = Math.max(0, n(tileWaste, 10)) / 100;
      const eachArea = w * h;
      const baseTiles = eachArea > 0 ? Math.ceil(floorArea / eachArea) : 0;
      const totalTiles = Math.ceil(baseTiles * (1 + waste));
      const perBox = Math.max(0, Math.floor(n(tilesPerBox)));
      const boxes = perBox > 0 ? Math.ceil(totalTiles / perBox) : null;
      return {
        company: "Cossa Nexus Construction",
        title: `${totalTiles.toLocaleString()} tiles estimated`,
        lines: [
          `${floorArea.toLocaleString()} m² area using ${Math.round(w * 1000)} × ${Math.round(h * 1000)} mm tiles`,
          `${Math.round(waste * 100)}% waste allowance included`,
          boxes ? `${boxes.toLocaleString()} full boxes at ${perBox} tiles per box` : "Enter tiles per box to calculate full boxes",
          "Check the supplier pack coverage before ordering; site conditions and cuts can change the final quantity.",
        ],
      };
    }

    if (mode === "painting") {
      const a = Math.max(0, n(wallArea));
      const coatCount = Math.max(1, n(coats, 2));
      const cover = Math.max(0.1, n(coverage, 10));
      const waste = Math.max(0, n(paintWaste, 10)) / 100;
      const litres = (a * coatCount / cover) * (1 + waste);
      const rounded = Math.ceil(litres * 10) / 10;
      const twenties = Math.floor(rounded / 20);
      const remainder = Math.max(0, rounded - twenties * 20);
      const fives = remainder > 0 ? Math.ceil(remainder / 5) : 0;
      const containerText = [twenties ? `${twenties} × 20 L` : "", fives ? `${fives} × 5 L` : ""].filter(Boolean).join(" + ") || "less than 5 L";
      return {
        company: "Cossa Nexus Construction",
        title: `${rounded.toLocaleString()} L paint estimated`,
        lines: [
          `${a.toLocaleString()} m² wall area × ${coatCount} coat${coatCount === 1 ? "" : "s"}`,
          `Coverage assumption: ${cover.toLocaleString()} m²/L per coat`,
          `${Math.round(waste * 100)}% allowance included`,
          `Practical container estimate: ${containerText}`,
          "Peeling, damp, chalky or damaged walls may also need repairs, preparation and primer before painting.",
        ],
      };
    }

    if (mode === "cleaning") {
      const a = Math.max(0, n(cleaningArea));
      const r = Math.max(1, Math.round(n(rooms, 1)));
      const factor = cleaningType === "deep" ? 1.6 : 1;
      const hours = Math.max(1, Math.ceil(((a / 35) + r * 0.2) * factor));
      return {
        company: "Cossa Facility Services",
        title: `About ${hours} labour-hour${hours === 1 ? "" : "s"} for planning`,
        lines: [
          `${a.toLocaleString()} m² across approximately ${r} room${r === 1 ? "" : "s"}`,
          `${cleaningType === "deep" ? "Deep-clean" : "Standard-clean"} planning assumption`,
          "Actual time depends on condition, furniture, stains, access and the exact service scope.",
          "Cossa AI can also help identify cleaning products before you request a service quote.",
        ],
      };
    }

    const a = Math.max(0, n(techArea));
    const levelCount = Math.max(1, Math.round(n(floors, 1)));
    const planningZones = Math.max(1, Math.ceil(a / 120) + Math.max(0, levelCount - 1));
    return {
      company: "Cossa Tech",
      title: `${planningZones} Wi-Fi coverage zone${planningZones === 1 ? "" : "s"} to assess`,
      lines: [
        `${a.toLocaleString()} m² across ${levelCount} floor${levelCount === 1 ? "" : "s"}`,
        "This is a planning estimate, not a guaranteed router or mesh-node count.",
        "Walls, concrete, interference, fibre/router position and device density can materially change the requirement.",
        "Cossa Tech can help assess Wi-Fi, smart-home, security and workplace technology requirements.",
      ],
    };
  }, [mode, area, tileWidth, tileHeight, tileWaste, tilesPerBox, wallArea, coats, coverage, paintWaste, cleaningArea, rooms, cleaningType, techArea, floors]);

  return (
    <section className="rounded-xl border border-primary/30 bg-card p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-primary">
            <Sparkles className="h-4 w-4" /> Cossa project intelligence
          </p>
          <h2 className="mt-2 font-display text-xl font-semibold">Calculate before you buy or book</h2>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Use a planning calculator, then ask Cossa AI to refine the requirement, find products or route the job to the right Cossa company. Current project: {projectName}.
          </p>
        </div>
        <Button type="button" variant="outline" onClick={() => open("chat")}>Ask Cossa AI</Button>
      </div>

      <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="Choose project calculator">
        {MODES.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setMode(item.id)}
            className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${mode === item.id ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground hover:border-primary"}`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_.95fr]">
        <div className="grid gap-4 sm:grid-cols-2">
          {mode === "tiling" ? (
            <>
              <Field label="Area to tile (m²)" value={area} onChange={setArea} />
              <Field label="Waste allowance (%)" value={tileWaste} onChange={setTileWaste} />
              <Field label="Tile width (mm)" value={tileWidth} onChange={setTileWidth} />
              <Field label="Tile height (mm)" value={tileHeight} onChange={setTileHeight} />
              <Field label="Tiles per box (optional)" value={tilesPerBox} onChange={setTilesPerBox} />
            </>
          ) : null}

          {mode === "painting" ? (
            <>
              <Field label="Paintable wall area (m²)" value={wallArea} onChange={setWallArea} />
              <Field label="Number of coats" value={coats} onChange={setCoats} />
              <Field label="Paint coverage (m²/L/coat)" value={coverage} onChange={setCoverage} />
              <Field label="Allowance (%)" value={paintWaste} onChange={setPaintWaste} />
            </>
          ) : null}

          {mode === "cleaning" ? (
            <>
              <Field label="Area (m²)" value={cleaningArea} onChange={setCleaningArea} />
              <Field label="Rooms / work zones" value={rooms} onChange={setRooms} />
              <label className="space-y-1.5 text-sm font-medium">
                Cleaning type
                <select value={cleaningType} onChange={(e) => setCleaningType(e.target.value as "standard" | "deep")} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                  <option value="standard">Standard cleaning</option>
                  <option value="deep">Deep cleaning</option>
                </select>
              </label>
            </>
          ) : null}

          {mode === "technology" ? (
            <>
              <Field label="Property / office area (m²)" value={techArea} onChange={setTechArea} />
              <Field label="Floors" value={floors} onChange={setFloors} />
            </>
          ) : null}
        </div>

        <div className="rounded-lg border border-border bg-secondary/40 p-4">
          <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
            <Calculator className="h-4 w-4" /> Planning result
          </p>
          <h3 className="mt-2 text-lg font-semibold">{result.title}</h3>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            {result.lines.map((line) => <li key={line}>• {line}</li>)}
          </ul>
          <div className="mt-4 rounded-md border border-primary/30 bg-primary/5 p-3 text-sm">
            <p className="font-semibold">Need someone to do the work?</p>
            <p className="mt-1 text-muted-foreground">{result.company} aligns with this requirement.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" type="button" onClick={() => open("quote")}><Wrench className="mr-2 h-4 w-4" />Request service quote</Button>
              <Button size="sm" type="button" variant="outline" onClick={() => open("chat")}>Refine with Cossa AI</Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="space-y-1.5 text-sm font-medium">
      {label}
      <Input type="number" min="0" step="any" value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}
