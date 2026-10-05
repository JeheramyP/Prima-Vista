/**
 * Kind chip with a number menu.
 *
 * The same kind and number means the same part. In the paste roadmap that
 * reuses one pasted paragraph. Options are the numbers already in use for
 * this kind, plus the next new number.
 */
import { kindName, kindTone } from "../lib/slides";
import type { SectionKind } from "../types";

/** Section name chip with a number picker, e.g. "Chorus [2]". */
export default function SectionNumberSelect({
  kind,
  value,
  options,
  onChange,
}: {
  kind: SectionKind;
  value: number;
  options: number[];
  onChange: (number: number) => void;
}) {
  const name = kindName(kind);
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border py-0.5 pl-2 pr-0.5 text-[10px] font-medium uppercase tracking-wide ${kindTone(kind)}`}
    >
      {name}
      <select
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        aria-label={`${name} number`}
        title={`Same number as another ${name.toLowerCase()} means the same lyrics`}
        className="cursor-pointer rounded-full bg-black/25 py-0 pl-1.5 pr-0.5 text-[10px] font-semibold text-inherit outline-none focus:ring-1 focus:ring-gold-400/40"
      >
        {options.map((option) => (
          <option key={option} value={option} className="bg-sanctuary-900 text-stone-100">
            {option}
          </option>
        ))}
      </select>
    </span>
  );
}
