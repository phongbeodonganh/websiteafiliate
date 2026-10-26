"use client";

import { Children, isValidElement, useEffect, useId, useRef, useState, type ReactNode, type SelectHTMLAttributes } from "react";
import { createPortal } from "react-dom";
import { autoUpdate, computePosition, offset, shift, size } from "@floating-ui/dom";
import { Check, ChevronDown } from "lucide-react";
import styles from "./Select.module.css";

type Option = { value: string; label: string; disabled: boolean };
function text(node: ReactNode): string {
  return Children.toArray(node).map(child => isValidElement<{ children?: ReactNode }>(child) ? text(child.props.children) : String(child)).join("");
}
function optionsFrom(children: ReactNode, disabled = false): Option[] {
  return Children.toArray(children).flatMap(child => {
    if (!isValidElement<{ value?: string | number; label?: string; disabled?: boolean; children?: ReactNode }>(child)) return [];
    const props = child.props;
    return child.type === "option"
      ? [{ value: String(props.value ?? text(props.children)), label: props.label ?? text(props.children), disabled: disabled || !!props.disabled }]
      : optionsFrom(props.children, disabled || !!props.disabled);
  });
}

/** A native form value with a consistently positioned, keyboard accessible menu. */
export default function Select({ children, className, style, onChange, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  const id = useId();
  const native = useRef<HTMLSelectElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const typeahead = useRef({ text: "", time: 0 });
  const options = optionsFrom(children);
  const [localValue, setLocalValue] = useState(String(props.defaultValue ?? options[0]?.value ?? ""));
  const value = String(props.value ?? localValue);
  const selected = options.find(option => option.value === value) ?? options[0];
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [label, setLabel] = useState<string>();
  const [validationMessage, setValidationMessage] = useState("");

  useEffect(() => {
    const element = native.current;
    if (!element) return;
    const labels = Array.from(element.labels ?? []).map(item => {
      const copy = item.cloneNode(true) as HTMLElement;
      copy.querySelectorAll("select, button").forEach(child => child.remove());
      return copy.textContent?.trim();
    }).filter(Boolean).join(" ");
    const sibling = element.previousElementSibling;
    const siblingLabel = sibling?.tagName === "LABEL" ? sibling.textContent?.trim() : undefined;
    if (labels || siblingLabel) setLabel(labels || siblingLabel);
    const form = element.form;
    const reset = () => { setLocalValue(String(props.defaultValue ?? optionsFrom(children)[0]?.value ?? "")); setOpen(false); setValidationMessage(""); };
    form?.addEventListener("reset", reset);
    return () => form?.removeEventListener("reset", reset);
  }, [children, props.defaultValue]);

  useEffect(() => {
    if (!open || !trigger.current || !menu.current) return;
    const button = trigger.current, popup = menu.current;
    if (innerHeight - button.getBoundingClientRect().bottom < 150) button.scrollIntoView({ block: "center", behavior: "instant" });
    const color = getComputedStyle(button).color;
    const channels = color.match(/\d+/g)?.slice(0, 3).map(Number) ?? [0, 0, 0];
    popup.dataset.dark = String(channels.reduce((a, b) => a + b, 0) / 3 > 170);
    let alive = true;
    const stop = autoUpdate(button, popup, () => {
      void computePosition(button, popup, {
        placement: "bottom-start", strategy: "fixed",
        middleware: [offset(6), shift({ padding: 8 }), size({ apply({ rects, elements }) {
          elements.floating.style.width = `${rects.reference.width}px`;
          elements.floating.style.maxHeight = `${Math.max(60, Math.min(280, innerHeight - button.getBoundingClientRect().bottom - 14))}px`;
        } })],
      }).then(({ x, y }) => { if (alive) Object.assign(popup.style, { left: `${x}px`, top: `${y}px`, visibility: "visible" }); });
    });
    const dismiss = (event: PointerEvent) => {
      if (!button.contains(event.target as Node) && !popup.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", dismiss);
    return () => { alive = false; stop(); document.removeEventListener("pointerdown", dismiss); };
  }, [open]);
  useEffect(() => {
    const popup = menu.current;
    const option = popup?.querySelector<HTMLElement>(`[data-index="${active}"]`);
    if (!open || !popup || !option) return;
    if (option.offsetTop < popup.scrollTop) popup.scrollTop = option.offsetTop;
    else if (option.offsetTop + option.offsetHeight > popup.scrollTop + popup.clientHeight) {
      popup.scrollTop = option.offsetTop + option.offsetHeight - popup.clientHeight;
    }
  }, [active, open]);

  function choose(index: number) {
    const option = options[index];
    if (!option || option.disabled || !native.current) return;
    const element = native.current;
    Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")?.set?.call(element, option.value);
    element.dispatchEvent(new Event("change", { bubbles: true }));
    setOpen(false);
    trigger.current?.focus();
  }
  function move(direction: number) {
    let next = active;
    for (let i = 0; i < options.length; i++) {
      next = (next + direction + options.length) % options.length;
      if (!options[next].disabled) { setActive(next); break; }
    }
  }
  return <>
    <select {...props} ref={native} className={styles.native} tabIndex={-1} aria-hidden="true" onFocus={() => trigger.current?.focus()}
      onInvalid={event => { event.preventDefault(); setValidationMessage(event.currentTarget.validationMessage); trigger.current?.focus(); }}
      onChange={event => { setLocalValue(event.target.value); setValidationMessage(""); onChange?.(event); }}>{children}</select>
    <button ref={trigger} type="button" data-select-trigger className={`${className ?? ""} ${styles.trigger}`} style={style}
      role="combobox" aria-label={props["aria-label"] ?? label} aria-labelledby={props["aria-labelledby"]}
      aria-expanded={open} aria-haspopup="listbox" aria-controls={open ? id : undefined}
      aria-invalid={props["aria-invalid"] ?? (validationMessage ? true : undefined)}
      aria-describedby={[props["aria-describedby"], validationMessage ? `${id}-error` : ""].filter(Boolean).join(" ") || undefined}
      aria-activedescendant={open ? `${id}-${active}` : undefined} aria-required={props.required} disabled={props.disabled}
      onClick={() => { setActive(Math.max(0, options.findIndex(option => option.value === value))); setOpen(!open); }}
      onBlur={event => { if (!menu.current?.contains(event.relatedTarget as Node | null)) setOpen(false); }}
      onKeyDown={event => {
        if (event.key === "Tab") { setOpen(false); return; }
        if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); setOpen(false); return; }
        if (["ArrowDown", "ArrowUp", "Home", "End", "Enter", " "].includes(event.key)) {
          event.preventDefault();
          if (!open) { setActive(Math.max(0, options.findIndex(option => option.value === value))); setOpen(true); }
          else if (event.key === "ArrowDown" || event.key === "ArrowUp") move(event.key === "ArrowDown" ? 1 : -1);
          else if (event.key === "Home") setActive(options.findIndex(option => !option.disabled));
          else if (event.key === "End") setActive(options.findLastIndex(option => !option.disabled));
          else choose(active);
        } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
          event.preventDefault();
          const now = Date.now();
          typeahead.current = { text: (now - typeahead.current.time < 700 ? typeahead.current.text : "") + event.key.toLowerCase(), time: now };
          const next = options.findIndex(option => !option.disabled && option.label.toLowerCase().startsWith(typeahead.current.text));
          if (next >= 0) { setActive(next); setOpen(true); }
        }
      }}>
      <span className={styles.value}>{selected?.label ?? ""}</span><ChevronDown size={15} className={styles.arrow} aria-hidden="true" />
    </button>
    {validationMessage && <span id={`${id}-error`} className={styles.error} role="alert">{validationMessage}</span>}
    {open && createPortal(<div ref={menu} id={id} role="listbox" aria-label={props["aria-label"] ?? label} className={styles.menu}
      onMouseDown={event => event.preventDefault()}>
      {options.map((option, index) => <div key={`${option.value}:${index}`} id={`${id}-${index}`} role="option" aria-selected={option.value === value}
        aria-disabled={option.disabled} data-index={index} data-active={index === active} className={styles.option}
        onPointerMove={() => { if (!option.disabled) setActive(index); }} onClick={() => choose(index)}>
        <span>{option.label}</span>{option.value === value && <Check size={15} aria-hidden="true" />}
      </div>)}
    </div>, document.body)}
  </>;
}
