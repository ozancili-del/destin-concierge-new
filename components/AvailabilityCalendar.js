import { useEffect, useRef, useState } from "react";
import styles from "../styles/AvailabilityCalendar.module.css";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default function AvailabilityCalendar({
  year,
  month,
  arrival,
  departure,
  bookedDates,
  coveredDates,
  rates,
  availableMonths,
  onSelect,
  onNav,
  onJump,
  canGoPrevious,
  canGoNext,
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef(null);
  const monthButtonRef = useRef(null);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, index) => index + 1)];
  const availableYears = [...new Set(availableMonths.map(value => Number(value.slice(0, 4))))];

  useEffect(() => {
    if (!pickerOpen) return undefined;
    const focusTimer = window.requestAnimationFrame(() => {
      (pickerRef.current?.querySelector(`.${styles.active}`) || pickerRef.current?.querySelector(`.${styles.monthGrid} button`))?.focus();
    });
    function closePicker(event) {
      if (event.key === "Escape") {
        setPickerOpen(false);
        monthButtonRef.current?.focus();
      } else if (event.type === "pointerdown" && !pickerRef.current?.contains(event.target)) {
        setPickerOpen(false);
      }
    }
    window.addEventListener("keydown", closePicker);
    window.addEventListener("pointerdown", closePicker);
    return () => {
      window.cancelAnimationFrame(focusTimer);
      window.removeEventListener("keydown", closePicker);
      window.removeEventListener("pointerdown", closePicker);
    };
  }, [pickerOpen]);

  function formatDate(day) {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  return <div className={styles.calendar}>
    <div className={styles.head}>
      <button type="button" className={styles.nav} aria-label="Previous month" onClick={() => onNav(-1)} disabled={!canGoPrevious}>‹</button>
      <div className={styles.monthPicker} ref={pickerRef}>
        <button type="button" className={styles.monthLabel} aria-label={`Choose month, current ${MONTHS[month]} ${year}`} aria-expanded={pickerOpen} aria-haspopup="dialog" onClick={() => setPickerOpen(open => !open)} ref={monthButtonRef}>
          {MONTHS[month]} {year}<span aria-hidden="true">⌄</span>
        </button>
        {pickerOpen && <div className={styles.popover} role="dialog" aria-label="Choose an available month">
          {availableYears.map(availableYear => <section key={availableYear} aria-labelledby={`available-year-${availableYear}`}>
            <h3 id={`available-year-${availableYear}`}>{availableYear}</h3>
            <div className={styles.monthGrid}>
              {MONTHS.map((monthName, monthIndex) => {
                const key = `${availableYear}-${String(monthIndex + 1).padStart(2, "0")}`;
                if (!availableMonths.includes(key)) return null;
                const active = availableYear === year && monthIndex === month;
                return <button type="button" key={key} className={active ? styles.active : ""} aria-current={active ? "date" : undefined} onClick={() => {
                  onJump(availableYear, monthIndex);
                  setPickerOpen(false);
                  monthButtonRef.current?.focus();
                }}>{monthName.slice(0, 3)}</button>;
              })}
            </div>
          </section>)}
        </div>}
      </div>
      <button type="button" className={styles.nav} aria-label="Next month" onClick={() => onNav(1)} disabled={!canGoNext}>›</button>
    </div>
    <div className={styles.legend} aria-label="Calendar legend"><span><i className={styles.openDot} />Open</span><span><i className={styles.bookedDot} />Booked</span><span><i className={styles.unknownDot} />Not confirmed</span></div>
    <div className={styles.grid}>
      {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map(day => <div key={day} className={styles.weekday}>{day}</div>)}
      {cells.map((day, index) => {
        if (!day) return <div key={`empty-${index}`} />;
        const date = formatDate(day);
        const isPast = new Date(`${date}T12:00:00`) < today;
        const isCovered = coveredDates.includes(date);
        const isBooked = bookedDates.includes(date);
        const isArrival = date === arrival;
        const isDeparture = date === departure;
        const isInRange = arrival && departure && date > arrival && date < departure;
        const disabled = isPast || isBooked || !isCovered;
        const className = [styles.day, disabled ? (isBooked ? styles.booked : styles.unknown) : styles.open, isArrival || isDeparture ? styles.selected : "", isInRange ? styles.inRange : ""].filter(Boolean).join(" ");
        const rate = !disabled ? rates[date] : null;
        return <button type="button" key={date} className={className} disabled={disabled} aria-label={`${MONTHS[month]} ${day}, ${year}${isBooked ? ", booked" : !isCovered ? ", not confirmed" : rate ? `, open, ${rate} dollars per night` : ", open"}`} onClick={() => onSelect(date)}>
          <span>{day}</span>{rate ? <small>${rate}</small> : null}
        </button>;
      })}
    </div>
  </div>;
}
